import { Location, Position } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { OLexerToken } from '../lexer';
import { IHasEndingLexerToken, implementsIHasEndingLexerToken, implementsIHasLexerToken, implementsIHasReference } from '../parser/interfaces';
import { OArchitecture, ObjectBase, OEntity, OReference } from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';
export async function getTokenFromPosition(linter: VhdlLinter, position: Position): Promise<OLexerToken | undefined> {
  const startI = linter.getIFromPosition(position);

  const candidateTokens = linter.file.lexerTokens.filter(token => token.isDesignator())
    .filter(object => object.range.start.i <= startI + 1 && startI < object.range.end.i);
  return candidateTokens[0];
}
export async function findReferenceAndDefinition(linter: VhdlLinter, position: Position) {
  const token = await getTokenFromPosition(linter, position);
  let definition: ObjectBase | undefined;
  for (const obj of linter.file.objectList) {
    if (obj instanceof OReference && obj.referenceToken === token) {
      definition = obj.definitions[0];
    }
    if (implementsIHasLexerToken(obj) && obj.lexerToken === token) {
      definition = obj;
    }
    if (implementsIHasEndingLexerToken(obj) && obj.endingLexerToken === token) {
      definition = obj;
    }
    if (obj instanceof OArchitecture && obj.entityName === token) {
      definition = obj.correspondingEntity;
    }
  }
  if (definition) {
    if (implementsIHasReference(definition)) {
      const tokens = [];
      if (definition.lexerToken) {
        tokens.push(definition.lexerToken);
      }
      tokens.push(...definition.referenceLinks.map(ref => ref.referenceToken));
      if (definition instanceof OEntity) {
        tokens.push(...definition.correspondingArchitectures.map(arch => arch.entityName));
      }
      if (implementsIHasEndingLexerToken(definition)) {
        tokens.push((definition as IHasEndingLexerToken).endingLexerToken as OLexerToken);
      }
      return tokens;
    }
  }

  return undefined;
}
export async function findReferencesHandler(linter: VhdlLinter, position: Position) {

  return (await findReferenceAndDefinition(linter, position))?.map(object => Location.create(URI.file(linter.file.file).toString(), object.range));
}
