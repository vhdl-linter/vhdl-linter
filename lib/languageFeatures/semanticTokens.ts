import { SemanticTokenModifiers, SemanticTokens, SemanticTokensBuilder, SemanticTokensLegend, SemanticTokenTypes } from "vscode-languageserver";
import { implementsIHasDefinitions, implementsIHasLexerToken, implementsIHasReferenceToken } from "../parser/interfaces";
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

function pushToken(builder: SemanticTokensBuilder, range: O.OIRange, type: SemanticTokenTypes, modifiers: SemanticTokenModifiers[]) {
  const line = range.start.line;
  const char = range.start.character;
  const length = range.end.i - range.start.i;
  builder.push(line, char, length, tokenType(type), tokenModifier(modifiers));
}


function findDefinition(obj: O.ObjectBase) {
  if (implementsIHasDefinitions(obj) && obj.definitions.length > 0) {
    return obj.definitions[0];
  }
}

function pushCorrectToken(builder: SemanticTokensBuilder, obj: O.ObjectBase, range: O.OIRange, fixedModifiers: SemanticTokenModifiers[]) {
  if (obj instanceof O.OArchitecture || obj instanceof O.OEntity || obj instanceof O.OPackage) {
    pushToken(builder, obj.lexerToken.range, SemanticTokenTypes.class, [...fixedModifiers]);
  } else if (obj instanceof O.OEnum) {
    pushToken(builder, range, SemanticTokenTypes.enum, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof O.ORecord) {
    pushToken(builder, range, SemanticTokenTypes.struct, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof O.ORecordChild) {
    pushToken(builder, range, SemanticTokenTypes.property, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof O.OType) {
    pushToken(builder, range, SemanticTokenTypes.type, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof O.OEnumLiteral) {
    pushToken(builder, range, SemanticTokenTypes.enumMember, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof O.OPort && obj.direction === 'in') {
    pushToken(builder, range, SemanticTokenTypes.variable, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof O.OConstant || obj instanceof O.OGeneric) {
    pushToken(builder, range, SemanticTokenTypes.parameter, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof O.OSignal || obj instanceof O.OVariable) {
    const modifiers = obj instanceof O.OWrite ? [SemanticTokenModifiers.modification] : [];
    pushToken(builder, range, SemanticTokenTypes.variable, [...fixedModifiers, ...modifiers]);
  } else if (obj instanceof O.OEntity) {
    pushToken(builder, range, SemanticTokenTypes.class, fixedModifiers);
  } else if (obj instanceof O.OSubprogram) {
    pushToken(builder, range, SemanticTokenTypes.function, fixedModifiers);
  }
}

export function semanticTokens(linter: VhdlLinter): SemanticTokens {

  const tokensBuilder = new SemanticTokensBuilder();

  for (const obj of linter.file.objectList) {
    const definition = findDefinition(obj);
    if (definition !== undefined && implementsIHasReferenceToken(obj)) {
      pushCorrectToken(tokensBuilder, definition, obj.referenceToken.range, []);
    } else if (implementsIHasLexerToken(obj)) { // is the definition itself?
      pushCorrectToken(tokensBuilder, obj, obj.lexerToken.range, [SemanticTokenModifiers.declaration]);
    } else if (obj instanceof O.OInstantiation) {
      if (obj.type === 'subprogram') {
        pushToken(tokensBuilder, obj.componentName.range, SemanticTokenTypes.function, []);
      } else {
        pushToken(tokensBuilder, obj.componentName.range, SemanticTokenTypes.class, []);
      }
    }
  }

  return tokensBuilder.build();
}