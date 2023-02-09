import { implementsIHasComponents, implementsIHasSubprograms, implementsIHasAliases, implementsIHasTypes } from "../parser/interfaces";
import { OFile, OInstantiation, OComponent, scope, OEntity, OSubprogram, OAliasWithSignature, OType, ParserError } from "../parser/objects";
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
    if (implementsIHasComponents(iterator)) {
      components.push(...iterator.components);
    }
  }
  const name = instantiation.componentName;
  return components.filter(e => e.referenceToken.getLText() === name.text.toLowerCase());
}
// TODO: To fit with the style of packages and architectures I think this should be linked during elaboration
export function getEntities(instantiation: OInstantiation | OComponent, projectParser: ProjectParser): OEntity[] {
  const entities: OEntity[] = [];
  if (instantiation instanceof OInstantiation && instantiation.type === 'component') {
    return [];
  }
  // find project entities
  const projectEntities = projectParser.entities;
  if (instantiation instanceof OInstantiation && typeof instantiation.library !== 'undefined' && instantiation.library.referenceToken.getLText() !== 'work') {
    entities.push(...projectEntities.filter(entity => {
      if (typeof entity.targetLibrary !== 'undefined') {
        return entity.targetLibrary.toLowerCase() === instantiation.library?.referenceToken.getLText() ?? '';
      }
      return true;

    }));
  } else {
    entities.push(...projectEntities);
  }
  const name = (instantiation instanceof OInstantiation) ? instantiation.componentName : instantiation.referenceToken;
  return entities.filter(e => e.lexerToken.getLText() === name.text.toLowerCase());
}
function getSubprograms(instantiation: OInstantiation, projectParser: ProjectParser): (OSubprogram | OAliasWithSignature)[] {
  const subprograms: (OSubprogram | OAliasWithSignature)[] = [];
  const addTypes = (types: OType[], recursionCounter: number) => {
    subprograms.push(...types.flatMap(t => t.subprograms));
    if (recursionCounter > 0) {
      const children = types.flatMap(t => t.types);
      if (children.length > 0) {
        addTypes(children, recursionCounter - 1);
      }
    } else {
      throw new ParserError('Recursion Limit reached', instantiation.range);
    }
  };

  for (const [iterator] of scope(instantiation)) {
    if (implementsIHasSubprograms(iterator)) {
      subprograms.push(...iterator.subprograms);
    }
    if (implementsIHasAliases(iterator)) {
      subprograms.push(...iterator.aliases.filter(a => a instanceof OAliasWithSignature) as OAliasWithSignature[]);
    }
    if (implementsIHasTypes(iterator)) {
      addTypes(iterator.types, 500);
    }
  }
  // Direct call via library.package.function
  if (instantiation.library !== undefined && instantiation.package !== undefined) {
    subprograms.push(...projectParser.packages.filter(pkg => pkg.lexerToken.getLText() === instantiation.package?.text.toLowerCase()).map(pkg => pkg.subprograms).flat());
  }
  return subprograms.filter(e => e.lexerToken.getLText() === instantiation.componentName.getLText());
}