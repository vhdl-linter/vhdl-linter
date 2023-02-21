import { implementsIHasDeclarations } from "../parser/interfaces";
import { OAliasWithSignature, OComponent, OConfiguration, OEntity, OFile, OInstantiation, OSubprogram, OType, ParserError, scope } from "../parser/objects";
import { ProjectParser } from "../project-parser";

export function elaborateInstantiations(file: OFile, projectParser: ProjectParser) {
  for (const instantiation of file.objectList.filter(object => object instanceof OInstantiation) as OInstantiation[]) {
    switch (instantiation.type) {
      case 'component':
        instantiation.definitions.push(...getComponents(instantiation));
        break;
      case 'entity':
        instantiation.definitions.push(...getEntities(instantiation, projectParser));
        break;
      case 'subprogram':
        instantiation.definitions.push(...getSubprograms(instantiation, projectParser));
        break;
      case 'configuration':
        instantiation.definitions.push(...getConfiguration(instantiation, projectParser));
        break;
      // Instantiations syntax does not have to give hints for the types if it has neither parameters nor ports nor generics
      // In that case it may be component or subprogram instantiation
      case 'unknown':
        instantiation.definitions.push(...getComponents(instantiation));
        instantiation.definitions.push(...getSubprograms(instantiation, projectParser));
        break;
    }
    for (const subprogram of instantiation.definitions) {
      subprogram.referenceLinks.push(instantiation);
    }
  }
}
function getComponents(instantiation: OInstantiation): OComponent[] {
  const components: OComponent[] = [];
  if (instantiation.type !== 'component') {
    return components;
  }
  // find all defined components in current scope
  for (const [iterator] of scope(instantiation)) {
    if (implementsIHasDeclarations(iterator)) {
      for (const component of iterator.declarations) {
        if (component instanceof OComponent) {
          components.push(component);
        }
      }
    }
  }
  const name = instantiation.componentName;
  return components.filter(e => e.lexerToken.getLText() === name.text.toLowerCase());
}
export function getEntities(instantiation: OInstantiation | OComponent, projectParser: ProjectParser): OEntity[] {
  const entities: OEntity[] = [];
  if (instantiation instanceof OInstantiation && instantiation.type === 'component') {
    return [];
  }
  // The selected name for the instantiation gets split up into library{.prefix}.componentName
  // If there is a prefix this is not a valid entity name
  if (instantiation instanceof OInstantiation && instantiation.prefix.length > 0) {
    return [];
  }
  // find project entities
  const projectEntities = projectParser.entities;
  if (instantiation instanceof OInstantiation && instantiation.library !== undefined) {
    entities.push(...projectEntities.filter(entity => {
      if (instantiation.library!.referenceToken.getLText() !== 'work') {
        if (typeof entity.targetLibrary !== 'undefined') {
          return entity.targetLibrary.toLowerCase() === instantiation.library?.referenceToken.getLText() ?? '';
        }
      } else if (entity.targetLibrary !== undefined && instantiation.getRootElement().targetLibrary !== undefined) {
        return entity.targetLibrary.toLowerCase() === instantiation.getRootElement().targetLibrary!.toLowerCase();

      }
      return true;

    }));
  } else {
    entities.push(...projectEntities);
  }
  const name = (instantiation instanceof OInstantiation) ? instantiation.componentName : instantiation.lexerToken;
  return entities.filter(e => e.lexerToken.getLText() === name.text.toLowerCase());
}
export function getConfiguration(instantiation: OInstantiation, projectParser: ProjectParser): OConfiguration[] {
  const configurations: OConfiguration[] = [];
  // The selected name for the instantiation gets split up into library{.prefix}.componentName
  // If there is a prefix this is not a valid entity name
  if (instantiation.prefix.length > 0) {
    return [];
  }
  // find project entities
  const projectConfigurations = projectParser.configurations;
  if (typeof instantiation.library !== 'undefined') {
    configurations.push(...projectConfigurations.filter(configuration => {
      if (instantiation.library!.referenceToken.getLText() !== 'work') {
        if (typeof configuration.targetLibrary !== 'undefined') {
          return configuration.targetLibrary.toLowerCase() === instantiation.library?.referenceToken.getLText() ?? '';
        }
      } else if (configuration.targetLibrary !== undefined && instantiation.getRootElement().targetLibrary !== undefined) {
        return configuration.targetLibrary.toLowerCase() === instantiation.getRootElement().targetLibrary!.toLowerCase();

      }
      return true;

    }));
  } else {
    configurations.push(...projectConfigurations);
  }
  return configurations.filter(e => e.lexerToken.getLText() === instantiation.componentName.text.toLowerCase());

}
function getSubprograms(instantiation: OInstantiation, projectParser: ProjectParser): (OSubprogram | OAliasWithSignature)[] {
  const subprograms: (OSubprogram | OAliasWithSignature)[] = [];
  const addTypes = (types: OType[], recursionCounter: number) => {
    subprograms.push(...types.flatMap(t => t.declarations.filter(a => a instanceof OSubprogram) as OSubprogram[]));
    if (recursionCounter > 0) {
      const children = types.flatMap(t => t.declarations.filter(a => a instanceof OType) as OType[]);
      if (children.length > 0) {
        addTypes(children, recursionCounter - 1);
      }
    } else {
      throw new ParserError('Recursion Limit reached', instantiation.range);
    }
  };

  for (const [iterator] of scope(instantiation)) {
    if (implementsIHasDeclarations(iterator)) {
      for (const declaration of iterator.declarations) {
        if (declaration instanceof OSubprogram) {
          subprograms.push(declaration);
        } else if (declaration instanceof OAliasWithSignature) {
          subprograms.push(declaration);
        } else if (declaration instanceof OType) {
          addTypes([declaration], 500);

        }

      }
    }
  }
  // Direct call via library.package.function
  if (instantiation.library !== undefined && instantiation.package !== undefined) {
    subprograms.push(...projectParser.packages.filter(pkg => pkg.lexerToken.getLText() === instantiation.package?.text.toLowerCase()).map(pkg => pkg.declarations.filter(a => a instanceof OSubprogram) as OSubprogram[]).flat());
  }
  return subprograms.filter(e => e.lexerToken.getLText() === instantiation.componentName.getLText());
}