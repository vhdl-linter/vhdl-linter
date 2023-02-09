import { CompletionItem, CompletionItemKind, Position } from 'vscode-languageserver';
import { reservedWords } from '../lexer';
import { IHasLexerToken, implementsIHasAliases, implementsIHasConstants, implementsIHasGenerics, implementsIHasSignals, implementsIHasSubprograms, implementsIHasTypes, implementsIHasVariables } from '../parser/interfaces';
import { OAliasWithSignature, ObjectBase, OEntity, OEnum, OGenericAssociationList, ORecord, scope } from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';
import { findObjectFromPosition } from './findObjects';
import { findParentInstantiation } from './helper/findParentInstantiation';

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
    if (object instanceof OEntity) {
      for (const port of object.ports) {
        addCompletion(port, CompletionItemKind.Field);
      }
      for (const port of object.generics) {
        addCompletion(port, CompletionItemKind.Constant);
      }
      for (const signal of object.signals) {
        addCompletion(signal, CompletionItemKind.Variable);
      }
      for (const constant of object.constants) {
        addCompletion(constant, CompletionItemKind.Variable);
      }
      for (const variable of object.variables) {
        addCompletion(variable, CompletionItemKind.Variable);
      }
      for (const subprogram of object.subprograms) {
        addCompletion(subprogram, CompletionItemKind.Function);
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