import { readFileSync } from 'fs';
import { ErrorCodes, Location, Position, ResponseError } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { Elaborate } from '../elaborate/elaborate';
import { OLexerToken } from '../lexer';
import { IHasEndingLexerToken, implementsIHasEndingLexerToken, implementsIHasLexerToken, implementsIHasReference } from '../parser/interfaces';
import { OArchitecture, ObjectBase, OEntity, OPackage, OPackageBody, OReference } from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';
export async function getTokenFromPosition(linter: VhdlLinter, position: Position): Promise<OLexerToken | undefined> {
  const posI = linter.getIFromPosition(position);

  const candidateTokens = linter.file.lexerTokens.filter(token => token.isDesignator())
    .filter(object => object.range.start.i <= posI + 1 && posI <= object.range.end.i);
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
  if (definition instanceof OPackageBody && definition.correspondingPackage) {
    definition = definition.correspondingPackage;
  }
  if (definition) {
    if (definition.rootFile !== linter.file) {
      // The file of the definition is not the current file. Running re-elaborate do get consistent result.
      const subLinter = new VhdlLinter(definition.rootFile.file, readFileSync(definition.rootFile.file, {encoding: 'utf8'}), linter.projectParser, linter.settingsGetter);
      await Elaborate.elaborate(subLinter);
      definition = subLinter.file.objectList.find(obj => obj.range.start.i == (definition as ObjectBase).range.start.i && obj.range.end.i == (definition as ObjectBase).range.end.i);
      if (definition === undefined) {
        throw new ResponseError(ErrorCodes.InternalError, 'Error while finding references', 'Error while finding references');
      }
    }
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
      if (definition instanceof OPackage) {
        for (const correspondingPackageBody of definition.correspondingPackageBodies) {
          tokens.push(correspondingPackageBody.lexerToken);
          if (correspondingPackageBody.endingLexerToken) {
            tokens.push(correspondingPackageBody.endingLexerToken);
          }
        }
      }
      return tokens;
    }
  }

  return undefined;
}
export async function findReferencesHandler(linter: VhdlLinter, position: Position) {

  return (await findReferenceAndDefinition(linter, position))?.map(object => Location.create(URI.file(object.file.file).toString(), object.range));
}
