import { ErrorCodes, Location, Position, ResponseError } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { OLexerToken } from '../lexer';
import { IHasEndingLexerToken, implementsIHasEndingLexerToken, implementsIHasLexerToken, implementsIHasReference } from '../parser/interfaces';
import { OArchitecture, ObjectBase, OEntity, OPackage, OPackageBody, OReference, OSubprogram, OUseClause } from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';
export async function getTokenFromPosition(linter: VhdlLinter, position: Position): Promise<OLexerToken | undefined> {

  const candidateTokens = linter.file.lexerTokens.filter(token => token.isDesignator())
    .filter(token => token.range.start.line === position.line
      && token.range.start.character <= position.character
      && token.range.end.character >= position.character);
  return candidateTokens[0];
}
export async function findReferenceAndDefinition(oldLinter: VhdlLinter, position: Position) {
  const linter = oldLinter.projectParser.cachedFiles.find(cachedFile => cachedFile.path === oldLinter.file.file)?.linter;
  if (!linter) {
    throw new ResponseError(ErrorCodes.InvalidRequest, 'Error during find reference operation', 'Error during find reference operation');
  }
  const token = await getTokenFromPosition(linter, position);
  if (!token) {
    throw new ResponseError(ErrorCodes.InvalidRequest, 'Error during find reference operation', 'Error during find reference operation');
  }
  await linter.projectParser.elaborateAll(token.getLText());
  const definitions = new Set<ObjectBase>();
  for (const obj of linter.file.objectList) {
    if (obj instanceof OReference && obj.referenceToken === token) {
      if (obj.parent instanceof OUseClause) {
        definitions.add(obj.parent.definitions[0]);
      } else {
        definitions.add(obj.definitions[0]);

      }
    }
    if (implementsIHasLexerToken(obj) && obj.lexerToken === token) {
      definitions.add(obj);
    }
    if (implementsIHasEndingLexerToken(obj) && obj.endingLexerToken === token) {
      definitions.add(obj);
    }
    if (obj instanceof OArchitecture && obj.entityName === token) {
      if (obj.correspondingEntity) {
        definitions.add(obj.correspondingEntity);
      }
    }
  }

  for (const definition of definitions) {

    if (definition instanceof OSubprogram) {
      const subprograms = [definition];
      definition.parent.subprograms
        .filter(subprogram => subprogram.lexerToken.getLText() == definition.lexerToken?.getLText()).forEach(def => definitions.add(def));
      if (definition.parent instanceof OPackage) {
        definition.parent.correspondingPackageBodies.flatMap(packageBodies => packageBodies.subprograms
          .filter(subprogram => subprogram.lexerToken.getLText() == definition.lexerToken?.getLText())).forEach(def => definitions.add(def));
      }
      if (definition.parent instanceof OPackageBody) {
        ((definition.parent as OPackageBody).correspondingPackage?.subprograms
          .filter(subprogram => subprogram.lexerToken.getLText() == definition.lexerToken?.getLText()) ?? []).forEach(def => definitions.add(def));
      }


    }
  }
  const definitionsNew =  [...definitions].map(definition => {
    if (definition instanceof OPackageBody && definition.correspondingPackage) {
      return definition.correspondingPackage;
    }
    return definition;

  });
  const tokens = [];
  for (const definition of definitionsNew) {
    if (implementsIHasReference(definition)) {
      if (definition.lexerToken) {
        tokens.push(definition.lexerToken);
      }
      tokens.push(...definition.referenceLinks.map(ref => ref.referenceToken).filter(token => token.getLText() === definition.lexerToken?.getLText()));
      if (definition instanceof OEntity) {
        tokens.push(...definition.correspondingArchitectures.map(arch => arch.entityName));
      }
      if (definition instanceof OPackage) {
        for (const correspondingPackageBody of definition.correspondingPackageBodies) {
          tokens.push(correspondingPackageBody.lexerToken);
          if (correspondingPackageBody.endingLexerToken) {
            tokens.push(correspondingPackageBody.endingLexerToken);
          }
        }
      }
    }
    if (implementsIHasEndingLexerToken(definition)) {
      tokens.push((definition as IHasEndingLexerToken).endingLexerToken as OLexerToken);
    }

  }
  const map = new Map<string, OLexerToken>();
  for (const token of tokens) {
    map.set(`${token.file.file}-${token.range.start.i}-${token.range.end.i}`, token);
  }
  return [...map.values()];

}
export async function findReferencesHandler(linter: VhdlLinter, position: Position) {

  return (await findReferenceAndDefinition(linter, position))?.map(object => Location.create(URI.file(object.file.file).toString(), object.range));
}
