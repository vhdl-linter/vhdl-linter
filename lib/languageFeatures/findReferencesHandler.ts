import { ErrorCodes, Location, Position, ResponseError } from 'vscode-languageserver';
import { OLexerToken } from '../lexer';
import { implementsIHasEndingLexerToken, implementsIHasLexerToken, implementsIHasReference } from '../parser/interfaces';
import { OArchitecture, ObjectBase, OEntity, OGeneric, OInstantiation, OPackage, OPackageBody, OPort, OReference, OSubprogram, OUseClause } from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';
import { findDefinitions } from './findDefinition';
export function getTokenFromPosition(linter: VhdlLinter, position: Position): OLexerToken | undefined {

  const candidateTokens = linter.file.lexerTokens.filter(token => token.isDesignator())
    .filter(token => token.range.start.line === position.line
      && token.range.start.character <= position.character
      && token.range.end.character >= position.character);
  return candidateTokens[0];
}
export class SetAdd<T> extends Set<T> {
  add(... values: T[]) {
    for (const value of values) {
      super.add(value);
    }
    return this;
  }
}
export async function findReferenceAndDefinition(oldLinter: VhdlLinter, position: Position) {
  const linter = oldLinter.projectParser.cachedFiles.find(cachedFile => cachedFile.uri.toString() === oldLinter.file.uri.toString())?.linter;
  if (!linter) {
    throw new ResponseError(ErrorCodes.InvalidRequest, 'Error during find reference operation', 'Error during find reference operation');
  }
  const token = getTokenFromPosition(linter, position);
  if (!token) {
    // no definitions for something that isn't a token
    return [];
  }
  await linter.projectParser.elaborateAll(token.getLText());
  const definitions = findDefinitions(linter, position);
  // find all tokens that are references to the definition
  const referenceTokens: OLexerToken[] = [];
  for (const definition of definitions) {
    if (implementsIHasReference(definition)) {
      if (definition.lexerToken) {
        referenceTokens.push(definition.lexerToken);
      }
      referenceTokens.push(...definition.referenceLinks.map(ref => ref.referenceToken).filter(token => token.getLText() === definition.lexerToken?.getLText()));
      if (definition instanceof OEntity) {
        referenceTokens.push(...definition.correspondingArchitectures.map(arch => arch.entityName));
        referenceTokens.push(...definition.referenceLinks.flatMap(link => link instanceof OInstantiation ? link.componentName : []));
      }
      if (definition instanceof OPort) {
        referenceTokens.push(...definition.parent.referenceLinks
          .flatMap(link => {
            if (link instanceof OInstantiation) {
              return link.portAssociationList?.children.flatMap(child => {
                return child.formalPart
                  .filter(formal => formal.referenceToken.getLText() === definition.lexerToken.getLText())
                  .map(formal => formal.referenceToken);
              }) ?? [];
            }
            return [];
          }));
      }
      if (definition instanceof OGeneric) {
        referenceTokens.push(...definition.parent.referenceLinks
          .flatMap(link => {
            if (link instanceof OInstantiation) {
              return link.genericAssociationList?.children.flatMap(child => {
                return child.formalPart
                  .filter(formal => formal.referenceToken.getLText() === definition.lexerToken.getLText())
                  .map(formal => formal.referenceToken);
              }) ?? [];
            }
            return [];
          }));
      }
      if (definition instanceof OPackage) {
        for (const correspondingPackageBody of definition.correspondingPackageBodies) {
          referenceTokens.push(correspondingPackageBody.lexerToken);
          if (correspondingPackageBody.endingLexerToken) {
            referenceTokens.push(correspondingPackageBody.endingLexerToken);
          }
        }
      }
    }
    if (implementsIHasEndingLexerToken(definition)) {
      referenceTokens.push(definition.endingLexerToken);
    }

  }
  // make sure to only return one reference per range
  const map = new Map<string, OLexerToken>();
  for (const token of referenceTokens) {
    map.set(`${token.file.uri.toString()}-${token.range.start.i}-${token.range.end.i}`, token);
  }
  return [...map.values()];

}
export async function findReferencesHandler(linter: VhdlLinter, position: Position) {

  return (await findReferenceAndDefinition(linter, position)).map(object => Location.create(object.file.uri.toString(), object.range));
}
