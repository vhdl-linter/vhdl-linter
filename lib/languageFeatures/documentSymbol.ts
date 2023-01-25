import { DocumentSymbol, SymbolKind } from 'vscode-languageserver';
import { OBlock, OCase, OCaseGenerate, OElseGenerateClause, OForGenerate, OForLoop, OIf, OIfGenerate, OIfGenerateClause, OInstantiation, OProcess, OSequentialStatement, OStatementBody, OWhenGenerateClause } from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';

function parseArchitecture(statementBody: OStatementBody, linter: VhdlLinter): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  for (const statement of statementBody.statements) {
    if (statement instanceof OInstantiation) {
      symbols.push({
        name: (statement.label !== undefined ? (statement.label.text + ': ') : '') + statement.componentName,
        detail: 'instantiation',
        kind: SymbolKind.Module,
        range: statement.range,
        selectionRange: statement.range
      });
    }
    if (statement instanceof OBlock) {
      symbols.push({
        name: statement.label.text,
        detail: 'block',
        kind: SymbolKind.Object,
        range: statement.range,
        selectionRange: statement.range,
        children: parseArchitecture(statement, linter)
      });
    }
    if (statement instanceof OProcess) {
      symbols.push({
        name: statement.label?.text || 'no label',
        detail: 'process',
        kind: SymbolKind.Function,
        range: statement.range,
        selectionRange: statement.range,
        children: statement.statements.map(statement => parseSequentialStatements(statement)).flat()
          .concat(statement.subprograms.map(procedure => ({
            name: procedure.lexerToken.text,
            detail: 'procedure',
            kind: SymbolKind.Method,
            range: procedure.range,
            selectionRange: procedure.range,
          }))).sort((a, b) => a.range.start.line - b.range.start.line)
      });

    }
    if (statement instanceof OIfGenerate) {
      for (const clause of statement.ifGenerateClauses) {
        symbols.push(formatGenerate(clause, linter));
      }
      if (statement.elseGenerateClause) {
        symbols.push(formatGenerate(statement.elseGenerateClause, linter));
      }
    }
    if (statement instanceof OCaseGenerate) {
      for (const clause of statement.whenGenerateClauses) {
        symbols.push(formatGenerate(clause, linter));

      }
    }
    if (statement instanceof OForGenerate) {
      symbols.push(formatGenerate(statement, linter));
    }
  }
  return symbols;
}
function formatGenerate(statement: OIfGenerate | OForGenerate | OWhenGenerateClause
  | OCaseGenerate | OIfGenerateClause | OElseGenerateClause, linter: VhdlLinter) {
  return {
    name: linter.text.split('\n')[statement.range.start.line].trim(),
    kind: SymbolKind.Enum,
    range: statement.range,
    selectionRange: statement.range,
    children: statement instanceof OStatementBody ? parseArchitecture(statement, linter) : []
  };
}
function parseSequentialStatements(statement: OSequentialStatement): DocumentSymbol[] {
  // OCase | OAssignment | OIf | OForLoop
  if (statement instanceof OCase) {
    const result = [{
      name: statement.expression.map(read => read.referenceToken.text).join(' '),
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
          children: whenClause.statements.map(statement => parseSequentialStatements(statement)).flat()
        };
      }).flat()
    }];
    return result;
  } else if (statement instanceof OIf) {
    const symbols: DocumentSymbol[] = [];
    symbols.push(...statement.clauses.map(clause => clause.statements.map(parseSequentialStatements)).flat(2));
    if (statement.else) {
      for (const statement_ of statement.else.statements) {
        symbols.push(...parseSequentialStatements(statement_));
      }
    }
    return symbols;
  } else if (statement instanceof OForLoop) {
    return statement.statements.map(statement => parseSequentialStatements(statement)).flat();
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
