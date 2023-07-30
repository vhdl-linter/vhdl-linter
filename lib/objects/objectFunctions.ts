import { ElaborateNames } from '../elaborate/elaborateNames';
import * as I from '../parser/interfaces';
import * as O from './objectsIndex';
// Iterate through all context and use clauses of the object recursively
function* iterateContexts(object: ObjectBase & I.IHasContextReference, directlyVisible: boolean): Generator<[ObjectBase, boolean]> {
  const handleContextReference = (contextReference: OContextReference, recursionLimit: number, parentContextReferences: OContextReference[] = []) => {
    if (recursionLimit === 0) {
      throw new Error(`Infinite Recursion`);
    }
    let definitions: ObjectBase[] = [];
    for (const definition of contextReference.names.at(-1)?.definitions ?? []) {
      definitions.push(definition);
      if (I.implementsIHasContextReference(definition)) {
        for (const contextReference of definition.contextReferences) {
          if (parentContextReferences.includes(contextReference) === false) {
            const newDefinitions = handleContextReference(contextReference, recursionLimit - 1, [...parentContextReferences, contextReference]);
            definitions = definitions.concat(newDefinitions);
          }
        }
      }
      if (I.implementsIHasUseClause(definition)) {
        for (const useClause of definition.useClauses) {
          for (const definition of useClause.names.at(-1)?.definitions ?? []) {
            definitions.push(definition);
          }
        }
      }
    }
    return definitions;
  };

  for (const contextReference of object.contextReferences) {
    for (const definition of handleContextReference(contextReference, 20)) {
      yield [definition, directlyVisible];
    }
  }
}
// Returns all object visible starting from the startObjects scope.
// The second parameter defines if the object is directly visible.
export function* scope(startObject: ObjectBase, elaborateNames: ElaborateNames | undefined = undefined): Generator<[ObjectBase, boolean]> {
  let current = startObject;
  let directlyVisible = true;
  while (true) {
    yield [current, directlyVisible];
    if (current instanceof OArchitecture && current.correspondingEntity) {
      yield [current.correspondingEntity, directlyVisible];
      directlyVisible = false;
      if (elaborateNames) {
        elaborateNames.elaborateUseClauses(current.correspondingEntity.useClauses);
      }
      for (const useClause of current.correspondingEntity.useClauses) {
        for (const definition of useClause.names.at(-1)?.definitions ?? []) {
          yield [definition, false];
        }
      }
      yield* iterateContexts(current.correspondingEntity, directlyVisible);
    }
    if (current instanceof OPackageBody && current.correspondingPackage) {
      yield [current.correspondingPackage, directlyVisible];
      directlyVisible = false;
      if (elaborateNames) {
        elaborateNames.elaborateUseClauses(current.correspondingPackage.useClauses);
      }
      for (const useClause of current.correspondingPackage.useClauses) {
        for (const definition of useClause.names.at(-1)?.definitions ?? []) {
          yield [definition, false];
        }
      }
      yield* iterateContexts(current.correspondingPackage, directlyVisible);
    }
    if (I.implementsIHasUseClause(current)) {
      if (elaborateNames) {
        elaborateNames.elaborateUseClauses(current.useClauses);
      }
      for (const useClause of current.useClauses) {
        for (const definition of useClause.names.at(-1)?.definitions ?? []) {
          yield [definition, false];
        }
      }
    }
    if (I.implementsIHasContextReference(current)) {
      yield* iterateContexts(current, directlyVisible);
    }
    if (current.parent instanceof OFile) {
      break;
    }
    current = current.parent;
  }
}
export function getTheInnermostNameChildren(name: OName) {
  let nameChild = name;
  let recursionLimit = 1000;
  while (nameChild.children[0] && nameChild.children[0].length > 0) {
    nameChild = nameChild.children[0].at(-1)!;
    if (recursionLimit-- <= 0) {
      throw new Error("Infinite Recursion");
    }
  }
  return nameChild;
}
export function getNameParent(name: OName) {
  let nameParent: ObjectBase = name;
  let recursionLimit = 1000;
  while (nameParent instanceof OName) {
    nameParent = nameParent.parent as OName;
    if (recursionLimit-- <= 0) {
      throw new Error("Infinite Recursion");
    }
  }
  return nameParent;

}