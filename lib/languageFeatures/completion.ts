import { CompletionItem, CompletionItemKind, Position } from 'vscode-languageserver';
import { reservedWords } from '../lexer';
import * as I from '../parser/interfaces';
import * as O from '../parser/objects';
import { VhdlLinter } from '../vhdlLinter';
import { findObjectFromPosition } from './findObjects';
import { getTokenFromPosition } from './findReferencesHandler';
import { findParentInstantiation } from './helper/findParentInstantiation';
import { scope } from '../parser/scopeIterator';

export class Completions {
  private completions: CompletionItem[] = [];
  constructor(private linter: VhdlLinter) { }

  getSelectedNameCompletions(prefix: O.OName) {
    const result: {
      label: string,
      kind: CompletionItemKind
    }[] = [];
    // if last prefix's definition is a record or protected type (i.e. its typeReferences contain a record or protected type)
    const prefixDefinitions = prefix.definitions.filter(I.implementsIHasSubTypeIndication);
    const typeDefinitions = prefixDefinitions.flatMap(def => def.subtypeIndication.typeNames).flatMap(ref => ref.definitions);
    const recordTypes = typeDefinitions.filter(type => type instanceof O.ORecord) as O.ORecord[];
    result.push(...recordTypes.flatMap(type => type.children.map(child => ({
      label: child.lexerToken.text,
      kind: CompletionItemKind.Field
    }))));
    const protectedTypes = typeDefinitions.filter(type => type instanceof O.OType && type.protected) as O.OType[];
    result.push(...protectedTypes.flatMap(type => (type.declarations.filter(decl => decl instanceof O.OSubprogram || decl instanceof O.OAttributeSpecification) as O.OSubprogram[]).map(child => ({
      label: child.lexerToken.text,
      kind: (child instanceof O.OSubprogram) ? CompletionItemKind.Function : CompletionItemKind.Field
    }))));
    return result;
  }

  addCompletion(item: O.ObjectBase & I.IHasLexerToken, kind?: CompletionItemKind) {
    const ieeeCasingLowercase = this.linter.settings.style.ieeeCasing === 'lowercase';
    const lowercase = item.rootFile.uri.toString().match(/ieee2008/) && ieeeCasingLowercase;
    this.completions.push({ label: lowercase ? item.lexerToken.getLText() : item.lexerToken.text, kind });
  }

  addCorrectCompletion(object: O.ObjectBase) {
    if (object instanceof O.OSignal) {
      this.addCompletion(object, CompletionItemKind.Variable);
    } else if (object instanceof O.OConstant) {
      this.addCompletion(object, CompletionItemKind.Variable);
    } else if (object instanceof O.OVariable || object instanceof O.OFileVariable) {
      this.addCompletion(object, CompletionItemKind.Variable);
    } else if (object instanceof O.OSubprogram) {
      this.addCompletion(object, CompletionItemKind.Function);
    } else if (object instanceof O.OType) {
      this.addCompletion(object, CompletionItemKind.TypeParameter);
      if (object instanceof O.OEnum) {
        for (const literal of object.literals) {
          this.addCompletion(literal, CompletionItemKind.EnumMember);
        }
      } else if (object instanceof O.ORecord) {
        for (const child of object.children) {
          this.addCompletion(child, CompletionItemKind.Field);
        }
      }
    } else if (object instanceof O.OAlias) {
      this.addCompletion(object, CompletionItemKind.Reference);
    } else if (I.implementsIHasLexerToken(object)) {
      this.addCompletion(object);
    }
  }

  public getCompletions(position: Position): CompletionItem[] {
    this.completions = [];
    const lines = this.linter.text.split('\n');
    const line = lines[position.line] ?? '';

    const matchUse = line.match(/^\s*use\s+/i);
    if (matchUse) {
      for (const pkg of this.linter.projectParser.packages) {
        this.addCompletion(pkg);
        if (pkg.rootFile.targetLibrary !== undefined) {
          this.completions.push({ label: pkg.rootFile.targetLibrary });
        }
      }
    }

    this.completions.push(...reservedWords.map(reservedWord => ({ label: reservedWord })));
    this.completions.push({ label: 'work' });
    const objects = findObjectFromPosition(this.linter, position);
    const completionObject = objects[0];
    if (!completionObject) {
      return this.completions;
    }

    const token = getTokenFromPosition(this.linter, position, false);
    // if completing selected name and found a record definition -> only show its elements as completion
    if (completionObject instanceof O.OSelectedName) {
      // special case: if current token is '.', a new selected name is started -> the completionObject is the actual prefix
      const actualPrefix = token?.text === '.' ? completionObject : completionObject.prefixTokens[completionObject.prefixTokens.length - 1]!;
      const result = this.getSelectedNameCompletions(actualPrefix);
      if (result.length > 0) {
        return result;
      }
    } else if (completionObject instanceof O.OName && token?.text === '.') {
      // special case: if completionObject is O.OReference and current token is '.', a selected name is started -> treat like one
      const result = this.getSelectedNameCompletions(completionObject);
      return result;
    }


    for (const [object] of scope(completionObject)) {
      this.addCorrectCompletion(object);
      if (I.implementsIHasDeclarations(object)) {
        for (const declaration of object.declarations) {
          this.addCorrectCompletion(declaration);
        }
      }
      if (I.implementsIHasPorts(object)) {
        for (const port of object.ports) {
          this.addCompletion(port, CompletionItemKind.Field);
        }
      }
      if (I.implementsIHasGenerics(object)) {
        for (const port of object.generics) {
          this.addCompletion(port, CompletionItemKind.Constant);
        }
      }
    }

    // Add formals
    const result = findParentInstantiation(this.linter, position);
    if (result) {
      const [instantiation, associationList] = result;
      for (const definition of instantiation.definitions) {
        if (definition instanceof O.OAliasWithSignature || definition instanceof O.OConfigurationDeclaration) {
          // TODO Handle aliases and Configuration for completion
        } else {
          const portsOrGenerics = associationList instanceof O.OGenericAssociationList && I.implementsIHasGenerics(definition) ? definition.generics : definition.ports;
          for (const portOrGeneric of portsOrGenerics) {
            this.completions.push({
              label: portOrGeneric.lexerToken.text,
              kind: CompletionItemKind.Field
            });
          }
        }
      }
    }
    const uniqueSet = new Set();
    const completionsUnique: CompletionItem[] = [];
    for (const completion of this.completions) {
      if (!uniqueSet.has(completion.label.toLowerCase())) {
        completionsUnique.push(completion);
        uniqueSet.add(completion.label.toLowerCase());
      }
    }

    return completionsUnique;
  }
}