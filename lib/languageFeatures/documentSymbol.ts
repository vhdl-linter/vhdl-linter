import { DocumentSymbol, SymbolKind } from 'vscode-languageserver';
import { implementsIHasDeclarations, implementsIHasStatements } from '../parser/interfaces';
import { OAlias, OArchitecture, ObjectBase, OBlock, OCase, OCaseGenerate, OConstant, OElseGenerateClause, OEntity, OFile, OForGenerate, OIf, OIfGenerate, OIfGenerateClause, OInstantiation, OPackage, OPackageBody, OProcess, ORecord, OSequentialStatement, OStatementBody, OSubprogram, OType, OWhenClause, OWhenGenerateClause } from '../parser/objects';
import { VhdlLinter } from '../vhdlLinter';
import { TokenType } from '../lexer';


export class DocumentSymbols {
  public static get(linter: VhdlLinter) {
    return new DocumentSymbols(linter.file).getAll();
  }
  private constructor(private file: OFile) {

  }

  getAll() {
    const returnValue: DocumentSymbol[] = [];

    for (const entity of this.file.entities) {
      returnValue.push(this.getEntity(entity));
    }
    for (const architecture of this.file.architectures) {
      returnValue.push(this.getStatementBody(architecture));
    }
    for (const pkg of this.file.packages) {
      returnValue.push(this.getPackage(pkg));
    }
    return returnValue;
  }

  getProcess(process: OProcess): DocumentSymbol {
    const children: DocumentSymbol[] = [];
    children.push(...process.statements.map(statement => this.getSequentialStatement(statement)).flat());
    children.push(...this.getDefinitions(process) ?? []);
    return {
      name: process.label?.text ?? 'no label',
      detail: 'process',
      kind: SymbolKind.Function,
      range: process.range,
      selectionRange: (process.label ?? process).range,
      children
    };
  }

  getStatementBody(statementBody: OStatementBody): DocumentSymbol {
    const children: DocumentSymbol[] = [];
    for (const statement of statementBody.statements) {
      if (statement instanceof OInstantiation) {
        children.push({
          name: `${(statement.label !== undefined ? (`${statement.label.text}: `) : '')}${statement.instantiatedUnit.map(name => name.nameToken.text).join('.')}`,
          detail: 'instantiation',
          kind: SymbolKind.Module,
          range: statement.range,
          selectionRange: statement.range
        });
      }
      if (statement instanceof OStatementBody) {
        children.push(this.getStatementBody(statement));
      }
      if (statement instanceof OProcess) {
        children.push(this.getProcess(statement));
      }
      if (statement instanceof OIfGenerate) {
        const ifGenChildren = statement.ifGenerateClauses.flatMap(c => this.getStatementBody(c));
        if (statement.elseGenerateClause) {
          ifGenChildren.push(this.getStatementBody(statement.elseGenerateClause));
        }
        children.push({
          name: statement.label.text,
          detail: 'if generate',
          kind: SymbolKind.Enum,
          range: statement.range,
          selectionRange: statement.label.range,
          children: ifGenChildren
        });
      }
      if (statement instanceof OCaseGenerate) {
        children.push({
          name: `${statement.label.text}: ${statement.expressionTokens.join(' ')}`,
          detail: 'case generate',
          kind: SymbolKind.Enum,
          range: statement.range,
          selectionRange: statement.label.range,
          children: statement.whenGenerateClauses.map(c => this.getStatementBody(c))
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
        children
      };
    }
    if (statementBody instanceof OBlock) {
      return {
        name: statementBody.label.text,
        detail: 'block',
        kind: SymbolKind.Object,
        range: statementBody.range,
        selectionRange: statementBody.label.range,
        children
      };
    }
    if (statementBody instanceof OForGenerate) {
      return {
        name: `${statementBody.label.text}: ${statementBody.iterationConstant.text} in ${statementBody.iterationRangeTokens.map(t => t.text).join(' ')}`,
        detail: 'for generate',
        kind: SymbolKind.Enum,
        range: statementBody.range,
        selectionRange: statementBody.label.range,
        children
      };
    }
    if (statementBody instanceof OWhenGenerateClause) {
      return {
        name: statementBody.conditionTokens.map(t => t.text).join(' '),
        detail: 'when clause',
        kind: SymbolKind.EnumMember,
        range: statementBody.range,
        selectionRange: statementBody.range,
        children
      };
    }
    if (statementBody instanceof OIfGenerateClause) {
      const detail = statementBody.parent.ifGenerateClauses[0] === statementBody ? 'if' : 'elsif';
      let name = statementBody.conditionTokens.map(t => t.text).join(' ');
      if (statementBody.label !== undefined) {
        name = `${statementBody.label.text}: ${name}`;
      }
      return {
        name,
        detail,
        kind: SymbolKind.EnumMember,
        range: statementBody.range,
        selectionRange: (statementBody.label ?? statementBody.conditionTokens[0] ?? statementBody).range,
        children
      };
    }
    if (statementBody instanceof OElseGenerateClause) {
      return {
        name: statementBody.label?.text ?? 'else',
        detail: 'else',
        kind: SymbolKind.EnumMember,
        range: statementBody.range,
        selectionRange: (statementBody.label ?? statementBody).range,
        children
      };
    }
    // All statement bodies should be implemented
    throw new Error('Other statement bodies not implemented.');
  }
  getClause(clause: OWhenClause): DocumentSymbol {
    const name = clause.whenTokens.filter(token => !token.isWhitespace()).join('');
    return {
      name,
      detail: 'when clause',
      kind: SymbolKind.EnumMember,
      range: clause.range,
      selectionRange: clause.range,
      children: clause.statements.map(s => this.getSequentialStatement(s)).flat()
    };
  }
  getSequentialStatement(statement: OSequentialStatement): DocumentSymbol[] {
    if (statement instanceof OCase) {
      const name = statement.caseTokens.filter(token => !token.isWhitespace()).join('');
      return [{
        name,
        detail: 'case',
        kind: SymbolKind.Enum,
        range: statement.range,
        selectionRange: statement.range,
        children: statement.whenClauses.map(when => this.getClause(when))
      }];
    } else if (statement instanceof OIf) {
      // don't create symbol for if, just search for cases
      const symbols: DocumentSymbol[] = [];
      for (const clause of statement.clauses) {
        symbols.push(...clause.statements.flatMap(s => this.getSequentialStatement(s)));
      }
      if (statement.else) {
        symbols.push(...statement.else.statements.flatMap(s => this.getSequentialStatement(s)));
      }
      return symbols;
    } else if (implementsIHasStatements(statement)) {
      return statement.statements.flatMap(s => this.getSequentialStatement(s));
    }
    return [];
  }
  getEntity(entity: OEntity): DocumentSymbol {
    return {
      name: entity.lexerToken.text,
      detail: 'entity',
      kind: SymbolKind.Interface,
      range: entity.range,
      selectionRange: entity.lexerToken.range,
      children: this.getDefinitions(entity)
    };
  }
  getPackage(pkg: OPackage | OPackageBody): DocumentSymbol {
    return {
      name: pkg.lexerToken.text,
      detail: pkg instanceof OPackage ? 'package' : 'package body',
      kind: SymbolKind.Class,
      range: pkg.range,
      selectionRange: pkg.lexerToken.range,
      children: this.getDefinitions(pkg)
    };
  }
  getType(type: OType): DocumentSymbol {
    let kind: SymbolKind = SymbolKind.Enum;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    let detail: string = Object.getPrototypeOf(type).constructor?.name?.slice(1);
    if (type instanceof ORecord) {
      kind = SymbolKind.Struct;
    }
    if (type.protected || type.protectedBody) {
      kind = SymbolKind.Class;
      detail = 'protected type';
    }
    return {
      name: type.lexerToken.text,
      kind,
      detail,
      range: type.range,
      selectionRange: type.lexerToken.range,
      children: this.getDefinitions(type)
    };
  }
  getDefinitions(obj: ObjectBase): DocumentSymbol[] | undefined {
    const children: DocumentSymbol[] = [];
    if (implementsIHasDeclarations(obj)) {
      for (const decl of obj.declarations) {
        if (decl instanceof OType) {
          children.push(this.getType(decl));
        }
        if (decl instanceof OSubprogram && decl.lexerToken.type !== TokenType.implicit) {
          children.push({
            name: decl.lexerToken.text,
            kind: SymbolKind.Function,
            range: decl.range,
            selectionRange: decl.lexerToken.range
          });
        }
        if (decl instanceof OConstant) {
          children.push({
            name: decl.lexerToken.text,
            kind: SymbolKind.Constant,
            range: decl.range,
            selectionRange: decl.lexerToken.range
          });
        }
        if (decl instanceof OAlias) {
          children.push({
            name: decl.lexerToken.text,
            kind: SymbolKind.Field,
            range: decl.range,
            selectionRange: decl.lexerToken.range
          });
        }
      }
    }
    if (obj instanceof ORecord) {
      children.push(...obj.children.map(child => ({
        name: child.lexerToken.text,
        kind: SymbolKind.Field,
        range: child.range,
        selectionRange: child.lexerToken.range
      })));
    }

    if (children.length > 0) {
      return children;
    }
    return undefined;
  }
}