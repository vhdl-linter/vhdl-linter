import { CompletionItem, CompletionItemKind, Position } from 'vscode-languageserver';
import { reservedWords } from '../lexer';
import { IHasLexerToken, IHasTypeReference, implementsIHasAliases, implementsIHasConstants, implementsIHasGenerics, implementsIHasPorts, implementsIHasSignals, implementsIHasSubprograms, implementsIHasTypeReference, implementsIHasTypes, implementsIHasVariables } from '../parser/interfaces';
import { OAliasWithSignature, ObjectBase, OEnum, OGenericAssociationList, ORecord, OReference, OSelectedNameRead, OSelectedNameWrite, OSubprogram, OType, scope } from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';
import { findObjectFromPosition } from './findObjects';
import { getTokenFromPosition } from './findReferencesHandler';
import { findParentInstantiation } from './helper/findParentInstantiation';

function getSelectedNameCompletions(prefix: OReference) {
  const result: {
    label: string,
    kind: CompletionItemKind
  }[] = [];
  // if last prefix's definition is a record or protected type (i.e. its typeReferences contain a record or protected type)
  const prefixDefinitions = prefix.definitions.filter(def => implementsIHasTypeReference(def)) as (ObjectBase & IHasTypeReference)[];
  const typeDefinitions = prefixDefinitions.flatMap(def => def.typeReference).flatMap(ref => ref.definitions);
  const recordTypes = typeDefinitions.filter(type => type instanceof ORecord) as ORecord[];
  result.push(...recordTypes.flatMap(type => type.children.map(child => ({
    label: child.lexerToken.text,
    kind: CompletionItemKind.Field
  }))));
  const protectedTypes = typeDefinitions.filter(type => type instanceof OType && type.protected) as OType[];
  result.push(...protectedTypes.flatMap(type => (type.subprograms as (ObjectBase & IHasLexerToken)[]).concat(type.attributeSpecifications).map(child => ({
    label: child.lexerToken.text,
    kind: (child instanceof OSubprogram) ? CompletionItemKind.Function : CompletionItemKind.Field
  }))));
  return result;
}

export async function getCompletions(linter: VhdlLinter, position: Position): Promise<CompletionItem[]> {
  const completions: CompletionItem[] = [];
  const ieeeCasingLowercase = (await linter.settingsGetter(linter.uri)).style.ieeeCasing === 'lowercase';
  const addCompletion = (item: ObjectBase & IHasLexerToken, kind?: CompletionItemKind) => {
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
  if (completionObject instanceof OSelectedNameRead || completionObject instanceof OSelectedNameWrite) {
    // special case: if current token is '.', a new selected name is started -> the completionObject is the actual prefix
    const actualPrefix = token?.text === '.' ? completionObject : completionObject.prefixTokens[completionObject.prefixTokens.length - 1]!;
    const result = getSelectedNameCompletions(actualPrefix);
    if (result.length > 0) {
      return result;
    }
  } else if (completionObject instanceof OReference && token?.text === '.') {
    // special case: if completionObject is OReference and current token is '.', a selected name is started -> treat like one
    const result = getSelectedNameCompletions(completionObject);
    if (result) {
      return result;
    }
  }


  for (const [object] of scope(completionObject)) {
    if (implementsIHasSignals(object)) {
      for (const signal of object.signals) {
        addCompletion(signal, CompletionItemKind.Variable);
      }
    }
    if (implementsIHasConstants(object)) {
      for (const constant of object.constants) {
        addCompletion(constant, CompletionItemKind.Variable);
      }
    }
    if (implementsIHasVariables(object)) {
      for (const variable of object.variables) {
        addCompletion(variable, CompletionItemKind.Variable);
      }
    }
    if (implementsIHasSubprograms(object)) {
      for (const subprogram of object.subprograms) {
        addCompletion(subprogram, CompletionItemKind.Function);
      }
    }
    if (implementsIHasTypes(object)) {
      for (const type of object.types) {
        addCompletion(type, CompletionItemKind.TypeParameter);
        if (type instanceof OEnum) {
          for (const literal of type.literals) {
            addCompletion(literal, CompletionItemKind.EnumMember);
          }
        } else if (type instanceof ORecord) {
          for (const child of type.children) {
            addCompletion(child, CompletionItemKind.Field);
          }
        }
      }
    }
    if (implementsIHasAliases(object)) {
      for (const alias of object.aliases) {
        addCompletion(alias, CompletionItemKind.Reference);
      }
    }
    if (implementsIHasPorts(object)) {
      for (const port of object.ports) {
        addCompletion(port, CompletionItemKind.Field);
      }
    }
    if (implementsIHasGenerics(object)) {
      for (const port of object.generics) {
        addCompletion(port, CompletionItemKind.Constant);
      }
    }
  }

  // Add formals
  const result = findParentInstantiation(linter, position);
  if (result) {
    const [instantiation, associationList] = result;
    for (const definition of instantiation.definitions) {
      if (definition instanceof OAliasWithSignature) {
        // TODO Handle aliases for completion
      } else {
        const portsOrGenerics = associationList instanceof OGenericAssociationList && implementsIHasGenerics(definition) ? definition.generics : definition.ports;
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