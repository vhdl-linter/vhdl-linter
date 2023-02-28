import { CompletionItem, CompletionItemKind, Position } from 'vscode-languageserver';
import { reservedWords } from '../lexer';
import * as I from '../parser/interfaces';
import * as O from '../parser/objects';
import { VhdlLinter } from '../vhdlLinter';
import { findObjectFromPosition } from './findObjects';
import { getTokenFromPosition } from './findReferencesHandler';
import { findParentInstantiation } from './helper/findParentInstantiation';

function getSelectedNameCompletions(prefix: O.OReference) {
  const result: {
    label: string,
    kind: CompletionItemKind
  }[] = [];
  // if last prefix's definition is a record or protected type (i.e. its typeReferences contain a record or protected type)
  const prefixDefinitions = prefix.definitions.filter(def => I.implementsIHasTypeReference(def)) as (O.ObjectBase & I.IHasTypeReference)[];
  const typeDefinitions = prefixDefinitions.flatMap(def => def.typeReference).flatMap(ref => ref.definitions);
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

export async function getCompletions(linter: VhdlLinter, position: Position): Promise<CompletionItem[]> {
  const completions: CompletionItem[] = [];
  const ieeeCasingLowercase = (await linter.settingsGetter(linter.uri)).style.ieeeCasing === 'lowercase';
  const addCompletion = (item: O.ObjectBase & I.IHasLexerToken, kind?: CompletionItemKind) => {
    const lowercase = item.rootFile.uri.toString().match(/ieee2008/) && ieeeCasingLowercase;
    completions.push({ label: lowercase ? item.lexerToken.getLText() : item.lexerToken.text, kind });
  };


  const lines = linter.text.split('\n');
  const line = lines[position.line] ?? '';

  const matchUse = line.match(/^\s*use\s+/i);
  if (matchUse) {
    for (const pkg of linter.projectParser.packages) {
      addCompletion(pkg);
      pkg.targetLibrary && completions.push({ label: pkg.targetLibrary });
    }
  }

  completions.push(...reservedWords.map(reservedWord => ({ label: reservedWord })));
  completions.push({ label: 'work' });
  const objects = findObjectFromPosition(linter, position);
  const completionObject = objects[0];
  if (!completionObject) {
    return completions;
  }

  const token = getTokenFromPosition(linter, position, false);
  // if completing selected name and found a record definition -> only show its elements as completion
  if (completionObject instanceof O.OSelectedName || completionObject instanceof O.OSelectedNameWrite || completionObject instanceof O.OSelectedName) {
    // special case: if current token is '.', a new selected name is started -> the completionObject is the actual prefix
    const actualPrefix = token?.text === '.' ? completionObject : completionObject.prefixTokens[completionObject.prefixTokens.length - 1]!;
    const result = getSelectedNameCompletions(actualPrefix);
    if (result.length > 0) {
      return result;
    }
  } else if (completionObject instanceof O.OReference && token?.text === '.') {
    // special case: if completionObject is O.OReference and current token is '.', a selected name is started -> treat like one
    const result = getSelectedNameCompletions(completionObject);
    if (result) {
      return result;
    }
  }


  for (const [object] of O.scope(completionObject)) {
    if (I.implementsIHasDeclarations(object)) {
      for (const declaration of object.declarations) {

        if (declaration instanceof O.OSignal) {
          addCompletion(declaration, CompletionItemKind.Variable);
        } else if (declaration instanceof O.OConstant) {
          addCompletion(declaration, CompletionItemKind.Variable);
        } else if (declaration instanceof O.OVariable || declaration instanceof O.OFileVariable) {
          addCompletion(declaration, CompletionItemKind.Variable);
        } else if (declaration instanceof O.OSubprogram) {
          addCompletion(declaration, CompletionItemKind.Function);
        } else if (declaration instanceof O.OType) {
          addCompletion(declaration, CompletionItemKind.TypeParameter);
          if (declaration instanceof O.OEnum) {
            for (const literal of declaration.literals) {
              addCompletion(literal, CompletionItemKind.EnumMember);
            }
          } else if (declaration instanceof O.ORecord) {
            for (const child of declaration.children) {
              addCompletion(child, CompletionItemKind.Field);
            }
          }
        } else if (declaration instanceof O.OAlias) {
          addCompletion(declaration, CompletionItemKind.Reference);
        } else if (I.implementsIHasLexerToken(declaration)) {
          addCompletion(declaration);
        }
      }

      if (I.implementsIHasPorts(object)) {
        for (const port of object.ports) {
          addCompletion(port, CompletionItemKind.Field);
        }
      }
      if (I.implementsIHasGenerics(object)) {
        for (const port of object.generics) {
          addCompletion(port, CompletionItemKind.Constant);
        }
      }
    }
  }

  // Add formals
  const result = findParentInstantiation(linter, position);
  if (result) {
    const [instantiation, associationList] = result;
    for (const definition of instantiation.definitions) {
      if (definition instanceof O.OAliasWithSignature || definition instanceof O.OConfigurationDeclaration) {
        // TODO Handle aliases and Configuration for completion
      } else {
        const portsOrGenerics = associationList instanceof O.OGenericAssociationList && I.implementsIHasGenerics(definition) ? definition.generics : definition.ports;
        for (const portOrGeneric of portsOrGenerics) {
          completions.push({
            label: portOrGeneric.lexerToken.text,
            kind: CompletionItemKind.Field
          });
        }
      }
    }
  }
  const uniqueSet = new Set();
  const completionsUnique: CompletionItem[] = [];
  for (const completion of completions) {
    if (!uniqueSet.has(completion.label.toLowerCase())) {
      completionsUnique.push(completion);
      uniqueSet.add(completion.label.toLowerCase());
    }
  }

  return completionsUnique;
}