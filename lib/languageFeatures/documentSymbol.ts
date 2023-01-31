import { DocumentSymbol, SymbolKind } from 'vscode-languageserver';
import { OArchitecture, OBlock, OCase, OPackage, OPackageBody, OEntity, OForGenerate, OForLoop, OIf, OIfGenerate, OIfGenerateClause, OInstantiation, OProcess, OSequentialStatement, OStatementBody, OWhenGenerateClause } from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';

function parseStatementBody(statementBody: OStatementBody, linter: VhdlLinter): DocumentSymbol {
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
    if (statement instanceof OStatementBody) {
      symbols.push(parseStatementBody(statement, linter));
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
  }

  if (statementBody instanceof OArchitecture) {
    return {
      name: statementBody.entityName.text,
      detail: 'architecture',
      kind: SymbolKind.Class,
      range: statementBody.range,
      selectionRange: statementBody.entityName.range,
      children: symbols
    };
  } else if (statementBody instanceof OBlock) {
    return {
      name: statementBody.label.text,
      detail: 'block',
      kind: SymbolKind.Object,
      range: statementBody.range,
      selectionRange: statementBody.label.range,
      children: symbols
    };
  } else if (statementBody instanceof OForGenerate) {
    return {
      name: linter.text.split('\n')[statementBody.range.start.line].trim(),
      kind: SymbolKind.Enum,
      range: statementBody.range,
      selectionRange: statementBody.label.range,
      children: symbols
    };
  }
  // if generate, else generate or when generate:
  return {
    name: linter.text.split('\n')[statementBody.range.start.line].trim(),
    kind: SymbolKind.Enum,
    range: statementBody.range,
    selectionRange: statementBody.range,
    children: symbols
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
function parseEntity(entity: OEntity): DocumentSymbol {
  return {
    name: entity.lexerToken.text,
    detail: 'entity',
    kind: SymbolKind.Interface,
    range: entity.range,
    selectionRange: entity.lexerToken.range
  };
}
function parsePackage(pkg: OPackage | OPackageBody): DocumentSymbol {
  const children: DocumentSymbol[] = [];
  children.push(...pkg.types.map(type => DocumentSymbol.create(type.lexerToken.text, undefined, SymbolKind.Enum, type.range, type.range)));
  children.push(...pkg.subprograms.map(subprogram => DocumentSymbol.create(subprogram.lexerToken.text, undefined, SymbolKind.Function, subprogram.range, subprogram.range)));
  children.push(...pkg.constants.map(constants => DocumentSymbol.create(constants.lexerToken.text, undefined, SymbolKind.Constant, constants.range, constants.range)));
  return {
    name: pkg.lexerToken.text,
    detail: pkg instanceof OPackage ? 'package' : 'package body',
    kind: SymbolKind.Class,
    range: pkg.range,
    selectionRange: pkg.lexerToken.range,
    children
  };
}
export function getDocumentSymbol(linter: VhdlLinter) {
  const returnValue: DocumentSymbol[] = [];

  for (const entity of linter.file.entities) {
    returnValue.push(parseEntity(entity));
  }
  for (const architecture of linter.file.architectures) {
    returnValue.push(parseStatementBody(architecture, linter));
  }
  for (const pkg of linter.file.packages) {
    returnValue.push(parsePackage(pkg));
  }
  return returnValue;
}
