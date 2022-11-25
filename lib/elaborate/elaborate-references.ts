import { OReference, scope, implementsIHasSignals, implementsIHasConstants, implementsIHasSubprograms, implementsIHasSubprogramAlias, implementsIHasTypes, OEnum, ORecord, implementsIHasVariables, implementsIHasFileVariables, implementsIHasPorts, implementsIHasGenerics, implementsIHasPackageInstantiations, OPackage, OPackageBody, OEntity, OArchitecture, OSubprogram, OType, OSubType, OConstant, OSignal, OVariable, OComponent, implementsIReferencable } from "../parser/objects";

export function elaborateReferences(reference: OReference) {
  const text = reference.lexerToken.text;
  for (const [object, directlyVisible] of scope(reference)) {
    if (implementsIHasSignals(object)) {
      for (const signal of object.signals) {
        if (signal.lexerToken.getLText() === text.toLowerCase()) {
          reference.definitions.push(signal);
          signal.references.push(reference);
        }
      }
    }
    if (implementsIHasConstants(object)) {
      for (const constant of object.constants) {
        if (constant.lexerToken.getLText() === text.toLowerCase()) {
          reference.definitions.push(constant);
          constant.references.push(reference);
        }
      }
    }
    if (implementsIHasSubprograms(object)) {
      for (const subprogram of object.subprograms) {
        if (subprogram.lexerToken.getLText() === text.toLowerCase()) {
          reference.definitions.push(subprogram);
          subprogram.references.push(reference);
        }
      }
    }
    if (implementsIHasSubprogramAlias(object)) {
      for (const subprogramAlias of object.subprogramAliases) {
        if (subprogramAlias.lexerToken.getLText() === text.toLowerCase()) {
          reference.definitions.push(subprogramAlias);
          subprogramAlias.references.push(reference);
        }
      }
    }
    if (implementsIHasTypes(object)) {
      for (const type of object.types) {
        if (type.lexerToken.getLText() === text.toLowerCase()) {
          reference.definitions.push(type);
          type.references.push(reference);
        }
        if (type instanceof OEnum) {
          for (const state of type.literals) {
            if (state.lexerToken.getLText() === text.toLowerCase()) {
              reference.definitions.push(state);
              state.references.push(reference);
            }
          }
        }
        if (type instanceof ORecord) {
          for (const child of type.children) {
            if (child.lexerToken.getLText() === text.toLowerCase()) {
              reference.definitions.push(child);
              child.references.push(reference);
            }
          }
        }
      }
    }
    if (implementsIHasVariables(object)) {
      for (const variable of object.variables) {
        if (variable.lexerToken.getLText() === text.toLowerCase()) {
          reference.definitions.push(variable);
          variable.references.push(reference);
        }
      }
    }
    if (implementsIHasFileVariables(object)) {
      for (const file of object.files) {
        if (file.lexerToken.getLText() === text.toLowerCase()) {
          reference.definitions.push(file);
          file.references.push(reference);
        }
      }
    }
    if (implementsIHasPorts(object)) {
      for (const port of object.ports) {
        if (port.lexerToken.getLText() === text.toLowerCase()) {
          reference.definitions.push(port);
          port.references.push(reference);
        }
      }
    }
    if (implementsIHasGenerics(object)) {
      for (const generic of object.generics) {
        if (generic.lexerToken.getLText() === text.toLowerCase()) {
          reference.definitions.push(generic);
          generic.references.push(reference);
        }
      }
    }
    if (implementsIHasPackageInstantiations(object)) {
      for (const inst of object.packageInstantiations) {
        if (inst.lexerToken?.text?.toLowerCase() === text.toLowerCase()) {
          reference.definitions.push(inst);
          inst.references.push(reference);
        }
      }
    }

    // package names are only referencable in direct visibility
    if (directlyVisible && (object instanceof OPackage || object instanceof OPackageBody)) {
      if (object.lexerToken && object.lexerToken.getLText() === text.toLowerCase()) {
        reference.definitions.push(object);
      }
    }
    // Handling for Attributes e.g. 'INSTANCE_name or 'PATH_NAME
    // TODO: check better if actual Attribute is following
    // Possible entities (objects where attributes are valid):
    /*
      entity ✓
      architecture ✓
      configuration
      procedure✓
      function✓
      package ✓
      type ✓
      subtype ✓
      constant ✓
      signal✓
      variable✓
      component✓
      label
      literal
      units
      group
      file ✓
      property
      sequence
      */
    const relevantTypes = [
      OEntity,
      OArchitecture,
      OSubprogram, // Procedure, Function
      // OPackage, OPackageBody,
      OType,
      OSubType,
      OConstant,
      OSignal,
      OVariable,
      OComponent];
    for (const relevantType of relevantTypes) {
      if (object instanceof relevantType) {
        if (object.lexerToken && object.lexerToken.getLText() === text.toLowerCase()) {
          reference.definitions.push(object);
          if (implementsIReferencable(object)) {
            object.references.push(reference);
          }
        }
      }

    }
  }
}