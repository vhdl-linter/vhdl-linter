import { ElaborateNames } from "../elaborate/elaborateNames";
import * as I from "../parser/interfaces";
import * as O from "../parser/objects";

export function* scope(startObject: O.ObjectBase, elaborateNames: ElaborateNames | undefined = undefined): Generator<[O.ObjectBase, boolean]> {
  // make sure stuff is only yielded once
  const alreadyYieldedDirectlyVisible: O.ObjectBase[] = [];
  const alreadyYieldedNoneDirectlyVisible: O.ObjectBase[] = [];
  for (const [obj, directlyVisible] of innerScope(startObject, elaborateNames)) {
    if (directlyVisible) {
      if (!alreadyYieldedDirectlyVisible.includes(obj)) {
        alreadyYieldedDirectlyVisible.push(obj);
        yield [obj, directlyVisible];
      }
    } else {
      if (!alreadyYieldedNoneDirectlyVisible.includes(obj)) {
        alreadyYieldedNoneDirectlyVisible.push(obj);
        yield [obj, directlyVisible];
      }
    }
  }
}
// Returns all object visible starting from the startObjects scope.
// The second parameter defines if the object is directly visible.
function* innerScope(startObject: O.ObjectBase, elaborateNames: ElaborateNames | undefined = undefined): Generator<[O.ObjectBase, boolean]> {
  let current = startObject;
  let directlyVisible = true;
  while (true) {
    yield [current, directlyVisible];
    if (current instanceof O.OArchitecture && current.correspondingEntity) {
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
    if (current instanceof O.OPackageBody && current.correspondingPackage) {
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
    if (current.parent instanceof O.OFile) {
      break;
    }
    current = current.parent;
  }
}
// Iterate through all context and use clauses of the object recursively
function* iterateContexts(object: O.ObjectBase & I.IHasContextReference, directlyVisible: boolean): Generator<[O.ObjectBase, boolean]> {
  const handleContextReference = (contextReference: O.OContextReference, recursionLimit: number, parentContextReferences: O.OContextReference[] = []) => {
    if (recursionLimit === 0) {
      throw new Error(`Infinite Recursion`);
    }
    let definitions: O.ObjectBase[] = [];
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