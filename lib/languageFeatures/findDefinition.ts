import { DefinitionLink, Position } from "vscode-languageserver";
import { implementsIHasDefinitions, implementsIHasLexerToken } from "../parser/interfaces";
import { OArchitecture, ObjectBase, OConfigurationDeclaration, OPackage, OPackageBody, ORecordChild, OSubprogram } from "../parser/objects";
import { VhdlLinter } from "../vhdlLinter";
import { findObjectByDesignator } from "./findObjects";
import { getTokenFromPosition, SetAdd } from "./findReferencesHandler";

export function findDefinitions(linter: VhdlLinter, position: Position): ObjectBase[] {
  const token = getTokenFromPosition(linter, position);
  if (!token) {
    return [];
  }
  const candidates = findObjectByDesignator(linter, token);
  // Get unique definitions
  const definitions = new SetAdd<ObjectBase>();
  // find all possible definitions for the lexerToken
  for (const candidate of candidates) {
    if (candidate instanceof OConfigurationDeclaration) {
      // OConfiguration has two thing to rename.
      // The name of the entity and the configuration itself.
      // We need to add the actual definition of the token(not of the candidation, which only maybe is the same)
      if (candidate.entityName === token) {
        definitions.add(...candidate.definitions);
      } else {
        definitions.add(candidate);
      }
    } else if (implementsIHasDefinitions(candidate)) {
      definitions.add(...candidate.definitions);
    }
    if (candidate instanceof OArchitecture && candidate.correspondingEntity && candidate.entityName === token) {
      definitions.add(candidate.correspondingEntity);
    } else if (implementsIHasLexerToken(candidate)) {
      definitions.add(candidate);
    }
  }
  // find all definitions of subprograms
  for (const definition of definitions) {
    if (definition instanceof OSubprogram) {
      definitions.add(...definition.parent.declarations
        .filter(subprogram => subprogram instanceof OSubprogram && subprogram.lexerToken.getLText() == definition.lexerToken.getLText()));
      if (definition.parent instanceof OPackage) {
        definitions.add(...definition.parent.correspondingPackageBodies.flatMap(packageBodies => packageBodies.declarations
          .filter(subprogram => subprogram instanceof OSubprogram && subprogram.lexerToken.getLText() == definition.lexerToken.getLText())));
      }
      if (definition.parent instanceof OPackageBody) {
        definitions.add(...((definition.parent as OPackageBody).correspondingPackage?.declarations
          .filter(subprogram => subprogram instanceof OSubprogram && subprogram.lexerToken.getLText() == definition.lexerToken.getLText()) ?? []));
      }
    }
  }

  return [...definitions].map(definition => {
    if (definition instanceof OPackageBody && definition.correspondingPackage) {
      return definition.correspondingPackage;
    }
    return definition;
  });
}

export function findDefinitionLinks(linter: VhdlLinter, position: Position): (DefinitionLink & { text: string; })[] {
  const definitions = findDefinitions(linter, position);
  return definitions.map(definition => {
    const targetRange = (definition instanceof ORecordChild)
      ? definition.parent.range.copyWithNewEnd(definition.range.end).getLimitedRange(5, true)
      : definition.range.copyExtendBeginningOfLine().getLimitedRange(5);
    const targetSelectionRange = definition.lexerToken?.range ?? definition.range.copyExtendBeginningOfLine().getLimitedRange(1);
    return {
      targetRange,
      targetSelectionRange,
      text: definition.rootFile.originalText,
      targetUri: definition.rootFile.uri.toString()
    };
  });
}