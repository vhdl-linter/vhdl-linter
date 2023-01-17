import { SemanticTokenModifiers, SemanticTokens, SemanticTokensBuilder, SemanticTokensLegend, SemanticTokensParams, SemanticTokenTypes } from "vscode-languageserver";
import { getDocumentSettings, initialization, linters } from "../language-server";
import { implementsIHasDefinitions, implementsIHasLexerToken } from "../parser/interfaces";
import { OIRange, ObjectBase, OEnum, ORecord, ORecordChild, OType, OEnumLiteral, OPort, OConstant, OGeneric, OSignal, OVariable, OWrite, OEntity, OSubprogram, OInstantiation } from "../parser/objects";

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

function pushToken(builder: SemanticTokensBuilder, range: OIRange, type: SemanticTokenTypes, modifiers: SemanticTokenModifiers[]) {
  const line = range.start.line;
  const char = range.start.character;
  const length = range.end.i - range.start.i;
  builder.push(line, char, length, tokenType(type), tokenModifier(modifiers));
}


function findDefinition(obj: ObjectBase) {
  if (implementsIHasDefinitions(obj) && obj.definitions.length > 0) {
    return obj.definitions[0];
  }
}

function pushCorrectToken(builder: SemanticTokensBuilder, obj: ObjectBase, range: OIRange, fixedModifiers: SemanticTokenModifiers[]) {
  if (obj instanceof OEnum) {
    pushToken(builder, range, SemanticTokenTypes.enum, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof ORecord) {
    pushToken(builder, range, SemanticTokenTypes.struct, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof ORecordChild) {
    pushToken(builder, range, SemanticTokenTypes.property, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof OType) {
    pushToken(builder, range, SemanticTokenTypes.type, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof OEnumLiteral) {
    pushToken(builder, range, SemanticTokenTypes.enumMember, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof OPort && obj.direction === 'in') {
    pushToken(builder, range, SemanticTokenTypes.variable, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof OConstant || obj instanceof OGeneric) {
    pushToken(builder, range, SemanticTokenTypes.parameter, [...fixedModifiers, SemanticTokenModifiers.readonly]);
  } else if (obj instanceof OSignal || obj instanceof OVariable) {
    const modifiers = obj instanceof OWrite ? [SemanticTokenModifiers.modification] : [];
    pushToken(builder, range, SemanticTokenTypes.variable, [...fixedModifiers, ...modifiers]);
  } else if (obj instanceof OEntity) {
    pushToken(builder, range, SemanticTokenTypes.class, fixedModifiers);
  } else if (obj instanceof OSubprogram) {
    pushToken(builder, range, SemanticTokenTypes.function, fixedModifiers);
  }
}

export async function handleSemanticTokens(params: SemanticTokensParams): Promise<SemanticTokens> {

  const tokensBuilder = new SemanticTokensBuilder();
  if (!(await getDocumentSettings(params.textDocument.uri)).semanticTokens) {
    return tokensBuilder.build();
  }

  await initialization;
  const linter = linters.get(params.textDocument.uri);
  if (typeof linter === 'undefined') {
    return tokensBuilder.build();
  }

  for (const obj of linter.file.objectList) {
    const definition = findDefinition(obj);
    if (typeof definition !== 'undefined' && implementsIHasLexerToken(obj)) {
      pushCorrectToken(tokensBuilder, definition, obj.lexerToken.range, []);
    } else if (implementsIHasLexerToken(obj)) { // is the definition itself?
      pushCorrectToken(tokensBuilder, obj, obj.lexerToken.range, [SemanticTokenModifiers.declaration]);
    } else if (obj instanceof OInstantiation) {
      if (obj.type === 'subprogram') {
        pushToken(tokensBuilder, obj.componentName.range, SemanticTokenTypes.function, []);
      } else {
        pushToken(tokensBuilder, obj.componentName.range, SemanticTokenTypes.class, []);
      }
    }
  }

  return tokensBuilder.build();
}