import { DiagnosticSeverity } from "vscode-languageserver";
import { IHasLexerToken, IHasReferences, implementsIHasAliases, implementsIHasConstants, implementsIHasFileVariables, implementsIHasGenerics, implementsIHasLibraries, implementsIHasPackageInstantiations, implementsIHasPorts, implementsIHasSignals, implementsIHasSubprograms, implementsIHasTypes, implementsIHasVariables } from "../parser/interfaces";
import { OArchitecture, OAttributeReference, ObjectBase, OEntity, OEnum, OFile, OInstantiation, OInterfacePackage, OLibrary, OPackage, OPackageBody, OPackageInstantiation, ORead, ORecord, OReference, OSelectedName, OSelectedNameRead, OWrite, scope } from "../parser/objects";
import { VhdlLinter } from "../vhdl-linter";
export class ElaborateReferences {
  file: OFile;

  private constructor(public vhdlLinter: VhdlLinter) {
    this.file = vhdlLinter.file;
  }
  public static elaborate(vhdlLinter: VhdlLinter) {
    const elaborator = new ElaborateReferences(vhdlLinter);
    for (const obj of vhdlLinter.file.objectList) {
      if (obj instanceof OReference && obj instanceof OInstantiation === false) {
        if (obj instanceof OSelectedName) {
          elaborator.elaborateSelectedNames(obj);
        } else if (obj instanceof OAttributeReference) {
          // elaborateAttributeReferences(obj);
        } else {
          elaborator.elaborateReference(obj);
        }
      }
    }
  }
  castToRead(reference: OReference) {
    if (reference instanceof OWrite === false) {
      if (reference instanceof OSelectedName) {
        Object.setPrototypeOf(reference, OSelectedNameRead.prototype);
      } else {
        Object.setPrototypeOf(reference, ORead.prototype);
      }
    }
  }
  evaluateDefinition(reference: OReference, definition: (ObjectBase & IHasReferences & IHasLexerToken) | (ObjectBase & IHasReferences & IHasLexerToken)[], enableCastToRead: boolean) {
    if (Array.isArray(definition)) {
      for (const def of definition) {
        this.evaluateDefinition(reference, def, enableCastToRead);
      }
    } else {
      if (reference instanceof OSelectedName) {
        if (definition.lexerToken.getLText() === reference.prefixTokens[0].getLText()) {
          reference.definitions.push(definition);
          definition.references.push(reference);
          if (enableCastToRead) {
            this.castToRead(reference);
          }
        }
      }
      if (definition.lexerToken.getLText() === reference.referenceToken.getLText()) {
        reference.definitions.push(definition);
        definition.references.push(reference);
        if (enableCastToRead) {
          this.castToRead(reference);
        }
      }
    }
  }
  // function elaborateAttributeReferences(reference: OAttributeReference) {
  //   for (const [object, directlyVisible] of scope(reference)) {
  //     // Handling for Attributes e.g. 'INSTANCE_name or 'PATH_NAME
  //     // TODO: check better if actual Attribute is following
  //     // Possible entities (objects where attributes are valid):
  //     /*
  //       entity ✓
  //       architecture ✓
  //       configuration
  //       procedure✓
  //       function✓
  //       package ✓
  //       type ✓
  //       subtype ✓
  //       constant ✓
  //       signal✓
  //       variable✓
  //       component✓
  //       label
  //       literal
  //       units
  //       group
  //       file ✓
  //       property
  //       sequence
  //       */
  //     const relevantTypes = [
  //       OEntity,
  //       OArchitecture,
  //       OSubprogram, // Procedure, Function
  //       // OPackage, OPackageBody,
  //       OType,
  //       OSubType,
  //       OConstant,
  //       OSignal,
  //       OVariable,
  //       OComponent];
  //     for (const relevantType of relevantTypes) {
  //       if (object instanceof relevantType) {
  //         this.evaluateDefinition(reference, object, Math.random() > 0.5);

  //         if (object.lexerToken && object.lexerToken.getLText() === reference.referenceToken.getLText()) {
  //           reference.definitions.push(object);
  //           object.references.push(reference);
  //         }
  //       }

  //     }
  //   }
  // }
  elaborateReference(reference: OReference) {
    for (const [object, directlyVisible] of scope(reference)) {
      if (implementsIHasSignals(object)) {
        this.evaluateDefinition(reference, object.signals, true);
      }
      if (implementsIHasConstants(object)) {
        this.evaluateDefinition(reference, object.constants, true);
      }
      if (implementsIHasAliases(object)) {
        this.evaluateDefinition(reference, object.aliases, true);
      }
      if (implementsIHasPorts(object)) {
        this.evaluateDefinition(reference, object.ports, true);
      }
      if (implementsIHasGenerics(object)) {
        this.evaluateDefinition(reference, object.generics, true);
      }
      if (implementsIHasSubprograms(object)) {
        this.evaluateDefinition(reference, object.subprograms, false);
      }

      if (implementsIHasTypes(object)) {
        for (const type of object.types) {
          this.evaluateDefinition(reference, type, false);
          if (type instanceof OEnum) {
            this.evaluateDefinition(reference, type.literals, true);
          }
          if (type instanceof ORecord) {
            this.evaluateDefinition(reference, type.children, false);
          }

        }
      }
      if (implementsIHasVariables(object)) {
        this.evaluateDefinition(reference, object.variables, true);
      }
      if (implementsIHasFileVariables(object)) {
        this.evaluateDefinition(reference, object.files, true);

      }


      if (implementsIHasPackageInstantiations(object)) {
        this.evaluateDefinition(reference, object.packageInstantiations, false);
      }

      // package names are only referable in direct visibility
      if (directlyVisible && (object instanceof OPackage || object instanceof OPackageBody || object instanceof OEntity || object instanceof OArchitecture)) {
        this.evaluateDefinition(reference, object, false);
      }

    }
  }

  elaborateSelectedNames(reference: OSelectedName) {
      if (reference.prefixTokens.length === 2) {
        const [libraryToken, pkgToken] = reference.prefixTokens;
        let library: OLibrary | undefined;
        for (const [obj] of scope(reference)) {
          if (implementsIHasLibraries(obj)) {
            for (const findLibrary of obj.libraries) {
              if (findLibrary.lexerToken.getLText() == libraryToken.getLText()) {
                library = findLibrary;
              }
            }
          }
        }
        if (library) {
          for (const pkg of this.vhdlLinter.projectParser.packages) {
            if (pkg.lexerToken.getLText() === pkgToken.getLText()) {
              if (implementsIHasSignals(pkg)) {
                this.evaluateDefinition(reference, pkg.signals, true);
              }
              if (implementsIHasConstants(pkg)) {
                this.evaluateDefinition(reference, pkg.constants, true);
              }
              if (implementsIHasAliases(pkg)) {
                this.evaluateDefinition(reference, pkg.aliases, true);
              }
              if (implementsIHasPorts(pkg)) {
                this.evaluateDefinition(reference, pkg.ports, true);
              }
              if (implementsIHasGenerics(pkg)) {
                this.evaluateDefinition(reference, pkg.generics, true);
              }
              if (implementsIHasSubprograms(pkg)) {
                this.evaluateDefinition(reference, pkg.subprograms, false);
              }

              if (implementsIHasTypes(pkg)) {
                for (const type of pkg.types) {
                  this.evaluateDefinition(reference, type, false);
                  if (type instanceof OEnum) {
                    this.evaluateDefinition(reference, type.literals, true);
                  }
                  if (type instanceof ORecord) {
                    this.evaluateDefinition(reference, type.children, false);
                  }

                }
              }
              if (implementsIHasVariables(pkg)) {
                this.evaluateDefinition(reference, pkg.variables, true);
              }
              if (implementsIHasFileVariables(pkg)) {
                this.evaluateDefinition(reference, pkg.files, true);

              }


              if (implementsIHasPackageInstantiations(pkg)) {
                this.evaluateDefinition(reference, pkg.packageInstantiations, false);
              }

            }
          }
        }

      } else if (reference.prefixTokens.length === 1) {
        // If first token is library this is referencing a package
        // Otherwise object from package
        let library;
        for (const [obj] of scope(reference)) {
          if (implementsIHasLibraries(obj)) {
            for (const findLibrary of obj.libraries) {
              if (findLibrary.lexerToken.getLText() == reference.prefixTokens[0].getLText()) {
                library = findLibrary;
              }
            }
          }
        }
        if (library) {
          for (const pkg of this.vhdlLinter.projectParser.packages) {
            if (reference.referenceToken.getLText() === pkg.lexerToken.getLText()) {
              reference.definitions.push(pkg);
            }
          }
          for (const pkg of this.vhdlLinter.projectParser.packageInstantiations) {
            if (reference.referenceToken.getLText() === pkg.lexerToken.getLText()) {
              reference.definitions.push(pkg);
            }
          }
        } else {
          const packages: OPackage[] = [];
          for (const [obj] of scope(reference)) {
            if (implementsIHasPackageInstantiations(obj)) {
              for (const pkgInst of obj.packageInstantiations) {
                if (pkgInst instanceof OPackageInstantiation && pkgInst.lexerToken?.getLText() === reference.prefixTokens[0].getLText()) {
                  const pkg = this.vhdlLinter.projectParser.packages.filter(pkg => pkg.lexerToken.getLText() === pkgInst.uninstantiatedPackageToken.getLText());
                  packages.push(...pkg);
                }
              }
            }
            if (implementsIHasGenerics(obj)) {
              for (const pkgInst of obj.generics) {
                if (pkgInst instanceof OInterfacePackage && pkgInst.lexerToken?.getLText() === reference.prefixTokens[0].getLText()) {
                  const pkg = this.vhdlLinter.projectParser.packages.filter(pkg => pkg.lexerToken.getLText() === pkgInst.uninstantiatedPackageToken.getLText());
                  packages.push(...pkg);
                }
              }
            }
          }
          for (const pkg of packages) {
            for (const constant of pkg.constants) {
              if (constant.lexerToken.getLText() === reference.referenceToken.getLText()) {
                reference.definitions.push(constant);
              }
            }
            for (const subprogram of pkg.subprograms) {
              if (subprogram.lexerToken.getLText() === reference.referenceToken.getLText()) {
                reference.definitions.push(subprogram);
              }
            }
            for (const generic of pkg.generics) {
              if (generic.lexerToken.getLText() === reference.referenceToken.getLText()) {
                reference.definitions.push(generic);
              }
            }
            for (const type of pkg.types) {
              const map = new Map();
              type.addReadsToMap(map);
              const definition = map.get(reference.referenceToken.getLText());
              if (definition) {
                reference.definitions.push(definition);
              }
            }
          }
          for (const [obj] of scope(reference)) {
            if (implementsIHasVariables(obj)) {
              this.evaluateDefinition(reference, obj.variables, true);

            }
            if (implementsIHasSignals(obj)) {
              this.evaluateDefinition(reference, obj.signals, true);
            }
            if (implementsIHasConstants(obj)) {
              this.evaluateDefinition(reference, obj.constants, true);
            }
            if (implementsIHasAliases(obj)) {
              this.evaluateDefinition(reference, obj.aliases, true);
            }
            if (implementsIHasPorts(obj)) {
              this.evaluateDefinition(reference, obj.ports, true);
            }
            if (implementsIHasGenerics(obj)) {
              this.evaluateDefinition(reference, obj.generics, true);
            }
          }
        }
      } else {
        this.vhdlLinter.addMessage({
          range: reference.range,
          severity: DiagnosticSeverity.Warning,
          message: `selected name found with ${reference.prefixTokens.length} prefixes. This is unexpected.`
        });
      }
  }
}