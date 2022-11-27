import { DocumentSymbol, SymbolKind } from 'vscode-languageserver';
import { OArchitecture, OCase, OForLoop, OIf, OSequentialStatement } from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';

function parseArchitecture(architecture: OArchitecture, linter: VhdlLinter): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  symbols.push(...architecture.instantiations.map(instantiation => ({
    name: (instantiation.label !== undefined ? (instantiation.label + ': ') : '') + instantiation.componentName,
    detail: 'instantiation',
    kind: SymbolKind.Module,
    range: instantiation.range,
    selectionRange: instantiation.range
  })));
  symbols.push(...architecture.blocks.map(block => ({
    name: block.label?.text,
    detail: 'block',
    kind: SymbolKind.Object,
    range: block.range,
    selectionRange: block.range,
    children: parseArchitecture(block, linter)
  })));
  symbols.push(...architecture.processes.map(process => ({
    name: process.label?.text || 'no label',
    detail: 'process',
    kind: SymbolKind.Function,
    range: process.range,
    selectionRange: process.range,
    children: process.statements.map(statement => parseStatements(statement)).flat()
      .concat(process.subprograms.map(procedure => ({
        name: procedure.lexerToken.text,
        detail: 'procedure',
        kind: SymbolKind.Method,
        range: procedure.range,
        selectionRange: procedure.range,
      }))).sort((a, b) => a.range.start.line - b.range.start.line)
  })));
  for (const generate of architecture.generates) {
    symbols.push({
      name: linter.text.split('\n')[generate.range.start.line].trim(),
      kind: SymbolKind.Enum,
      range: generate.range,
      selectionRange: generate.range,
      children: parseArchitecture(generate, linter)
    });
  }
  return symbols;
}
function parseStatements(statement: OSequentialStatement): DocumentSymbol[] {
  // OCase | OAssignment | OIf | OForLoop
  if (statement instanceof OCase) {
    const result = [{
      name: statement.variable.map(read => read.referenceToken.text).join(' '),
      kind: SymbolKind.Enum,
      range: statement.range,
      selectionRange: statement.range,
      children: statement.whenClauses.map(whenClause => {
        let name = whenClause.condition.map(read => read.referenceToken.text).join(' ');
        if (name === '') {
          name = 'others';
        }
        return {
          name,
          kind: SymbolKind.EnumMember,
          range: whenClause.range,
          selectionRange: whenClause.range,
          children: whenClause.statements.map(statement => parseStatements(statement)).flat()
        };
      }).flat()
    }];
    return result;
  } else if (statement instanceof OIf) {
    const symbols: DocumentSymbol[] = [];
    symbols.push(...statement.clauses.map(clause => clause.statements.map(parseStatements)).flat(2));
    if (statement.else) {
      for (const statement_ of statement.else.statements) {
        symbols.push(...parseStatements(statement_));
      }
    }
    return symbols;
  } else if (statement instanceof OForLoop) {
    return statement.statements.map(statement => parseStatements(statement)).flat();
  }
  return [];
}
export function getDocumentSymbol(linter: VhdlLinter) {
  const returnValue: DocumentSymbol[] = [];

  returnValue.push(...linter.file.packages.map(pkg => pkg.types).flat().map(type => DocumentSymbol.create(type.lexerToken.text, undefined, SymbolKind.Enum, type.range, type.range)));
  returnValue.push(...linter.file.packages.map(pkg => pkg.subprograms).flat().map(subprogram => DocumentSymbol.create(subprogram.lexerToken.text, undefined, SymbolKind.Function, subprogram.range, subprogram.range)));
  returnValue.push(...linter.file.packages.map(pkg => pkg.constants).flat().map(constants => DocumentSymbol.create(constants.lexerToken.text, undefined, SymbolKind.Constant, constants.range, constants.range)));
  for (const architecture of linter.file.architectures) {
    returnValue.push(...parseArchitecture(architecture, linter));
  }
  return returnValue;
}
