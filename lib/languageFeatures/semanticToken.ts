import { SemanticTokenModifiers, SemanticTokens, SemanticTokensBuilder, SemanticTokensLegend, SemanticTokenTypes } from "vscode-languageserver";
import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
import { VhdlLinter } from "../vhdlLinter";
export const semanticTokensLegend: SemanticTokensLegend = {
  tokenTypes: Object.values(SemanticTokenTypes),
  tokenModifiers: Object.values(SemanticTokenModifiers)
};
function tokenType(type: SemanticTokenTypes) {
  return semanticTokensLegend.tokenTypes.indexOf(type);
}

function tokenModifier(modifiers: SemanticTokenModifiers[]) {
  let result = 0;
  for (const modifier of modifiers) {
    const index = semanticTokensLegend.tokenModifiers.indexOf(modifier);
    if (index > 0) {
      result |= 1 << index;
    }
  }
  return result;
}
type BuilderParams = [number, number, number, number, number];
function pushToken(buffer: BuilderParams[], range: O.OIRange, type: SemanticTokenTypes, modifiers: SemanticTokenModifiers[]) {
  const line = range.start.line;
  const char = range.start.character;
  const length = range.end.i - range.start.i;
  // Ignore tokens without length (this is only some implicit declared libraries etc.)
  if (length === 0) {
    return;
  }
  buffer.push([line, char, length, tokenType(type), tokenModifier(modifiers)]);
}


function findDefinition(obj: O.ObjectBase) {
  if (I.implementsIHasDefinitions(obj) && obj.definitions.length > 0) {
    return obj.definitions[0];
  }
}

function pushCorrectToken(buffer: BuilderParams[], obj: O.ObjectBase, definition: O.ObjectBase, range: O.OIRange, fixedModifiers: SemanticTokenModifiers[], colorInputs: boolean) {
  if (definition instanceof O.OArchitecture || definition instanceof O.OEntity || definition instanceof O.OPackage
    || definition instanceof O.OPackageBody || definition instanceof O.OConfigurationDeclaration || definition instanceof O.OLibrary) {
    pushToken(buffer, range, SemanticTokenTypes.class, [...fixedModifiers]);
  } else if (definition instanceof O.OEnum) {
    pushToken(buffer, range, SemanticTokenTypes.enum, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (definition instanceof O.ORecord) {
    pushToken(buffer, range, SemanticTokenTypes.struct, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (definition instanceof O.ORecordChild) {
    pushToken(buffer, range, SemanticTokenTypes.property, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (definition instanceof O.OType) {
    pushToken(buffer, range, SemanticTokenTypes.type, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (definition instanceof O.OEnumLiteral && definition.lexerToken?.isLiteral() !== true) {
    pushToken(buffer, range, SemanticTokenTypes.enumMember, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (colorInputs && definition instanceof O.OPort && definition.direction === 'in') {
    pushToken(buffer, range, SemanticTokenTypes.variable, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (definition instanceof O.OPort) {
    pushToken(buffer, range, SemanticTokenTypes.variable, [...fixedModifiers]);
  } else if (definition instanceof O.OConstant || definition instanceof O.OGeneric) {
    pushToken(buffer, range, SemanticTokenTypes.variable, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (definition instanceof O.OSignal || definition instanceof O.OVariable || definition instanceof O.OFileVariable) {
    const modifiers = obj instanceof O.OWrite ? [SemanticTokenModifiers.modification] : [];
    pushToken(buffer, range, SemanticTokenTypes.variable, [...fixedModifiers, ...modifiers]);
  } else if (definition instanceof O.OSubprogram) {
    pushToken(buffer, range, SemanticTokenTypes.function, fixedModifiers);
  } else if (definition instanceof O.OAttributeDeclaration) {
    pushToken(buffer, range, SemanticTokenTypes.macro, fixedModifiers);
  } else if (definition instanceof O.OAlias) {
    const aliasDefinition = definition.aliasDefinitions[0];
    if (aliasDefinition) {
      pushCorrectToken(buffer, obj, aliasDefinition, range, fixedModifiers, colorInputs);
    } else {
      pushToken(buffer, range, SemanticTokenTypes.interface, [...fixedModifiers, SemanticTokenModifiers.deprecated]);

    }
  } else {
    console.log(definition.constructor.name);
  }

}

export function semanticToken(linter: VhdlLinter, colorInputs: boolean): SemanticTokens {
  const buffer: BuilderParams[] = [];
  for (const obj of linter.file.objectList) {
    const definition = findDefinition(obj);
    if (definition !== undefined && I.implementsIHasReferenceToken(obj)) {
      pushCorrectToken(buffer, obj, definition, obj.referenceToken.range, [], colorInputs);
    } else if (I.implementsIHasLexerToken(obj)) { // is the definition itself?
      pushCorrectToken(buffer, obj, obj, obj.lexerToken.range, [SemanticTokenModifiers.declaration], colorInputs);
      if (I.implementsIHasEndingLexerToken(obj)) {
        pushCorrectToken(buffer, obj, obj, obj.endingLexerToken.range, [SemanticTokenModifiers.declaration], colorInputs);
      }
    }
    if (obj instanceof O.OArchitecture || obj instanceof O.OInstantiation) {
      pushToken(buffer, obj.entityName.range, SemanticTokenTypes.class, []);
    }
  }
  // Sort tokens
  buffer.sort((a, b) => {
    if (a[0] !== b[0]) {
      return a[0] - b[0];
    }
    return a[1] - b[1];
  });
  const tokensBuilder = new SemanticTokensBuilder();

  for (const row of buffer) {
    tokensBuilder.push(...row);
  }
  return tokensBuilder.build();
}