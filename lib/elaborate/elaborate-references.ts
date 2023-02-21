import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
import { VhdlLinter } from "../vhdl-linter";
export class ElaborateReferences {
  file: O.OFile;
  private scopeVisibilityMap = new Map<O.ObjectBase, Map<string, O.ObjectBase[]>>();
  private projectVisibilityMap?: Map<string, O.ObjectBase[]> = undefined;

  private constructor(public vhdlLinter: VhdlLinter) {
    this.file = vhdlLinter.file;
  }
  public static elaborate(vhdlLinter: VhdlLinter) {
    const elaborator = new ElaborateReferences(vhdlLinter);
    for (const obj of vhdlLinter.file.objectList) {
      if (obj instanceof O.OFormalReference) {
        continue;
      }
      // elaborate all references except instantiations
      if (obj instanceof O.OReference && obj instanceof O.OInstantiation === false) {
        if (obj instanceof O.OSelectedName || obj instanceof O.OSelectedNameWrite) {
          elaborator.elaborateSelectedNames(obj);
        } else {
          elaborator.elaborateReference(obj);
        }
      }
    }
  }

  getObjectText(obj: O.ObjectBase) {
    if (I.implementsIHasLabel(obj)) {
      return obj.label.getLText();
    }
    return obj?.lexerToken?.getLText();
  }
  addObjectsToMap(map: Map<string, O.ObjectBase[]>, ...objects: O.ObjectBase[]) {
    for (const obj of objects) {
      const text = this.getObjectText(obj);
      if (text === undefined) {
        continue;
      }

      let list: O.ObjectBase[];
      if (map.has(text)) {
        list = map.get(text)!;
      } else {
        list = [];
        map.set(text, list);
      }
      list.push(obj);
    }
  }

  fillVisibilityMap(parent: O.ObjectBase) {
    const newMap = new Map<string, O.ObjectBase[]>();
    for (const [scopeObj] of O.scope(parent)) {
      this.addObjectsToMap(newMap, scopeObj);
      if (I.implementsIHasPorts(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.ports);
      }
      if (I.implementsIHasGenerics(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.generics);
      }
      if (I.implementsIHasDeclarations(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.declarations);
        for (const type of scopeObj.declarations) {
          if (type instanceof O.OType) {
            if (type instanceof O.OEnum) {
              this.addObjectsToMap(newMap, ...type.literals);
            }
            if (type instanceof O.ORecord) {
              this.addObjectsToMap(newMap, ...type.children);
            }
            if (type.units !== undefined) {
              this.addObjectsToMap(newMap, ...type.units);
            }
          }
        }
      }
      if (I.implementsIHasLibraries(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.libraries);
      }
    }
    this.scopeVisibilityMap.set(parent, newMap);
  }

  fillProjectMap() {
    const projectParser = this.vhdlLinter.projectParser;
    this.projectVisibilityMap = new Map();
    this.addObjectsToMap(this.projectVisibilityMap, ...projectParser.packages);
    for (const pkg of projectParser.packages) {
      this.fillVisibilityMap(pkg);
    }
  }

  // reference is undefined -> find objects in projectParser
  // reference is OReference -> find parent with visibility
  // reference is other ObjectBase -> search this object in visibility map
  getList(object: O.ObjectBase | O.OReference | undefined, searchText: string) {
    // find parent with visibility of reference
    if (object === undefined) {
      if (this.projectVisibilityMap === undefined) {
        this.fillProjectMap();
      }
      return this.projectVisibilityMap?.get(searchText) ?? [];
    } else {

      let parent: O.ObjectBase;
      if (object instanceof O.OReference) {
        parent = object.parent;
        for (const [p] of O.scope(object)) {
          if (I.implementsIHasDeclarations(p)) {
            parent = p;
            break;
          }
        }
      } else {
        parent = object;
      }

      if (!this.scopeVisibilityMap.has(parent)) {
        this.fillVisibilityMap(parent);
      }
      const list = this.scopeVisibilityMap.get(parent);
      if (list === undefined) {
        throw new Error('no map found');
      }
      return list.get(searchText) ?? [];
    }
  }


  castToRead(reference: O.OReference) {
    if (reference instanceof O.OWrite === false) {
      if (reference instanceof O.OSelectedName) {
        Object.setPrototypeOf(reference, O.OSelectedNameRead.prototype);
      } else {
        Object.setPrototypeOf(reference, O.ORead.prototype);
      }
    }
  }

  elaborateReference(reference: O.OReference) {
    for (const obj of this.getList(reference, reference.referenceToken.getLText())) {
      // alias doesn't has aliasReferences
      if (I.implementsIHasReference(obj) || obj instanceof O.OAlias) {
        reference.definitions.push(obj);
        if (I.implementsIHasLabel(obj)) {
          obj.labelLinks.push(reference);
        } else {
          obj.referenceLinks.push(reference);
        }
        this.castToRead(reference);
      }
    }
  }

  elaborateSelectedNames(reference: O.OSelectedName | O.OSelectedNameWrite) {
    const firstPrefix = reference.prefixTokens[0];
    const libraries: O.OLibrary[] = [];
    for (const obj of this.getList(reference, firstPrefix.referenceToken.getLText())) {
      if (obj instanceof O.OLibrary) {
        libraries.push(obj);
      }
      // todo package inst
    }
    if (libraries.length > 0) {
      // first token is library
      // 1 prefix token  -> lib.pkg;
      // 2 prefix tokens -> lib.pkg.obj;
      if (reference.prefixTokens.length === 1) {
        const pkgToken = reference;
        for (const pkg of this.getList(undefined, pkgToken.referenceToken.getLText())) {
          if (pkg instanceof O.OPackage) {
            reference.definitions.push(pkg);
            if (I.implementsIHasLabel(pkg)) {
              pkg.labelLinks.push(reference);
            } else {
              pkg.referenceLinks.push(reference);
            }
          }
        }
      } else if (reference.prefixTokens.length === 2) {
        const pkgToken = reference.prefixTokens[1]!;
        // expect pkgToken to already be elaborated -> take its definitions
        for (const pkg of pkgToken.definitions) {
          if (pkg instanceof O.OPackage) {
            for (const obj of this.getList(pkg, reference.referenceToken.getLText())) {
              if (I.implementsIHasReference(obj) || obj instanceof O.OAlias) {
                reference.definitions.push(obj);
                if (I.implementsIHasLabel(obj)) {
                  obj.labelLinks.push(reference);
                } else {
                  obj.referenceLinks.push(reference);
                }
                this.castToRead(reference);
              }
            }
          }
        }
      }
    }
  }


    // if (!library) {
    //   const packages: O.OPackage[] = [];
    //   for (const [obj] of scope(reference)) {
    //     if (I.implementsIHasPackageInstantiations(obj)) {
    //       for (const pkgInst of obj.packageInstantiations) {
    //         if (pkgInst instanceof O.OPackageInstantiation && pkgInst.lexerToken.getLText() === reference.prefixTokens[0].referenceToken.getLText()) {
    //           const pkg = this.vhdlLinter.projectParser.packages.filter(pkg => pkg.lexerToken.getLText() === pkgInst.uninstantiatedPackageToken.getLText());
    //           packages.push(...pkg);
    //         }
    //       }
    //     }
    //     if (I.implementsIHasGenerics(obj)) {
    //       for (const pkgInst of obj.generics) {
    //         if (pkgInst instanceof O.OInterfacePackage && pkgInst.lexerToken.getLText() === reference.prefixTokens[0].referenceToken.getLText()) {
    //           const pkg = this.vhdlLinter.projectParser.packages.filter(pkg => pkg.lexerToken.getLText() === pkgInst.uninstantiatedPackageToken.getLText());
    //           packages.push(...pkg);
    //         }
    //       }
    //     }
    //   }
    //   for (const pkg of packages) {
    //     for (const constant of pkg.constants) {
    //       if (constant.lexerToken.getLText() === reference.referenceToken.getLText()) {
    //         reference.definitions.push(constant);
    //       }
    //     }
    //     for (const subprogram of pkg.subprograms) {
    //       if (subprogram.lexerToken.getLText() === reference.referenceToken.getLText()) {
    //         reference.definitions.push(subprogram);
    //       }
    //     }
    //     for (const generic of pkg.generics) {
    //       if (generic.lexerToken.getLText() === reference.referenceToken.getLText()) {
    //         reference.definitions.push(generic);
    //       }
    //     }
    //     for (const type of pkg.types) {
    //       const map = new Map<string, O.ObjectBase>();
    //       type.addReadsToMap(map);
    //       const definition = map.get(reference.referenceToken.getLText());
    //       if (definition) {
    //         reference.definitions.push(definition);
    //       }
    //     }
    //   }
    //   for (const [obj] of scope(reference)) {
    //     if (I.implementsIHasVariables(obj)) {
    //       this.evaluateDefinition(reference, obj.variables, true);
    //     }
    //     if (I.implementsIHasSignals(obj)) {
    //       this.evaluateDefinition(reference, obj.signals, true);
    //     }
    //     if (I.implementsIHasConstants(obj)) {
    //       this.evaluateDefinition(reference, obj.constants, true);
    //     }
    //     if (I.implementsIHasAliases(obj)) {
    //       this.evaluateDefinition(reference, obj.aliases, true);
    //     }
    //     if (I.implementsIHasPorts(obj)) {
    //       this.evaluateDefinition(reference, obj.ports, true);
    //     }
    //     if (I.implementsIHasGenerics(obj)) {
    //       this.evaluateDefinition(reference, obj.generics, true);
    //     }
    //   }
    // }
}