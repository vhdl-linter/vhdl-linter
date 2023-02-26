import { ErrorCodes, Location, Position, ResponseError } from 'vscode-languageserver';
import { Elaborate } from '../elaborate/elaborate';
import { OLexerToken } from '../lexer';
import { implementsIHasEndingLexerToken, implementsIHasReferenceLinks } from '../parser/interfaces';
import { OArchitecture, ObjectBase, OComponent, OConfigurationDeclaration, OEntity, OGeneric, OInstantiation, OPackage, OPackageBody, OPort, OSubprogram, OVariable } from '../parser/objects';
import { VhdlLinter } from '../vhdlLinter';
import { findDefinitions } from './findDefinition';
export function getTokenFromPosition(linter: VhdlLinter, position: Position, onlyDesignator = true): OLexerToken | undefined {

  const candidateTokens = linter.file.lexerTokens.filter(token => !onlyDesignator || token.isDesignator())
    .filter(token => token.range.start.line === position.line
      && token.range.start.character <= position.character
      && token.range.end.character >= position.character);
  return candidateTokens[0];
}
export class SetAdd<T> extends Set<T> {
  add(...values: T[]) {
    for (const value of values) {
      super.add(value);
    }
    return this;
  }
}


function isPrivate(obj: ObjectBase) {
  const rootObj = obj.getRootElement();
  // everything in architectures and package bodies is private
  if (rootObj instanceof OArchitecture || rootObj instanceof OPackageBody) {
    return true;
  }
  // variables in subprograms are private
  if (obj instanceof OVariable && obj.parent instanceof OSubprogram) {
    return true;
  }
  // default to not private
  return false;
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
  await Elaborate.elaborate(linter);
  let definitions = findDefinitions(linter, position);
  // if no definitions found or at least one definition is in another file or at least one definition is not private -> elaborate the project and try again
  if (definitions.length === 0 || definitions.some(def => def.rootFile.uri !== linter.file.uri) || definitions.some(def => !isPrivate(def))) {
    await linter.projectParser.elaborateAll(token.getLText());
    definitions = findDefinitions(linter, position);
  }
  const compDefinitions = definitions.filter(def => def instanceof OComponent) as OComponent[];
  for (const component of compDefinitions) {
    definitions.push(...component.definitions);
  }

  // find all tokens that are references to the definition
  const referenceTokens: OLexerToken[] = [];
  for (const definition of definitions) {
    if (definition instanceof OEntity) {
      for (const link of definition.referenceComponents) {
        if (link instanceof OComponent) {
          if (link.endingReferenceToken) {
            referenceTokens.push(link.endingReferenceToken);
          }
          referenceTokens.push(link.lexerToken);
          referenceTokens.push(...link.referenceLinks.flatMap(link => link instanceof OInstantiation ? link.entityName : []));
        }
      }
    }
    if (implementsIHasReferenceLinks(definition)) {
      if (definition.lexerToken) {
        if (definition instanceof OConfigurationDeclaration) {
          // Configuration has lexer token (its identifier) and the name of the entity.
          if (definition.lexerToken.getLText() === token.getLText()) {
            referenceTokens.push(definition.lexerToken);
          }
        } else {
          referenceTokens.push(definition.lexerToken);

        }
      }
      referenceTokens.push(...definition.referenceLinks.map(ref => ref.referenceToken).filter(token => token.getLText() === definition.lexerToken?.getLText()));
      if (definition instanceof OEntity) {
        referenceTokens.push(...definition.correspondingArchitectures.map(arch => arch.entityName));
        for (const link of definition.referenceLinks) {
          if (link instanceof OInstantiation) {
            referenceTokens.push(link.entityName);
          }
        }
        for (const link of definition.referenceConfigurations) {
          referenceTokens.push(link.entityName);
        }
      } else if (definition instanceof OConfigurationDeclaration && token.getLText() === definition.lexerToken.getLText()) {
        for (const link of definition.referenceLinks) {
            referenceTokens.push(link.entityName);
        }
      }
      if (definition instanceof OComponent && definition.endingReferenceToken) {
        referenceTokens.push(definition.endingReferenceToken);
      }
      if (definition instanceof OPort) {
        if (definition.parent instanceof OEntity) {
          for (const configurations of definition.parent.referenceConfigurations) {
            referenceTokens.push(...configurations.referenceLinks
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

        }
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
