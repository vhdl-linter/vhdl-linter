import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
import { VhdlLinter } from "../vhdl-linter";
export class ElaborateReferences {
  file: O.OFile;
  private scopeVisibilityMap = new Map<O.ObjectBase, Map<string, O.ObjectBase[]>>();

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
      if (I.implementsIHasStatements(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.statements);
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

  getList(reference: O.OReference, searchText: string) {
    // find parent with visibility of reference
    let parent = reference.parent;
    for (const [p] of O.scope(reference)) {
      if (p instanceof O.OStatementBody || p instanceof O.OEntity || p instanceof O.OSubprogram || p instanceof O.OProcess || p instanceof O.OPackage || p instanceof O.OPackageBody) {
        parent = p;
        break;
      }
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
    // const [libraryToken] = reference.prefixTokens;
    // let library: O.OLibrary | undefined;
    // for (const [obj] of scope(reference)) {
    //   if (I.implementsIHasLibraries(obj)) {
    //     for (const findLibrary of obj.libraries) {
    //       if (findLibrary.lexerToken.getLText() == libraryToken.referenceToken.getLText()) {
    //         library = findLibrary;
    //       }
    //     }
    //   }
    // }
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
    // if (reference.prefixTokens.length === 2) {
    //   const [, pkgToken] = reference.prefixTokens;
    //   if (library) {
    //     for (const pkg of this.vhdlLinter.projectParser.packages) {
    //       if (pkg.lexerToken.getLText() === pkgToken.referenceToken.getLText()) {
    //         if (I.implementsIHasSignals(pkg)) {
    //           this.evaluateDefinition(reference, pkg.signals, true);
    //         }
    //         if (I.implementsIHasConstants(pkg)) {
    //           this.evaluateDefinition(reference, pkg.constants, true);
    //         }
    //         if (I.implementsIHasAliases(pkg)) {
    //           this.evaluateDefinition(reference, pkg.aliases, true);
    //         }
    //         if (I.implementsIHasPorts(pkg)) {
    //           this.evaluateDefinition(reference, pkg.ports, true);
    //         }
    //         if (I.implementsIHasGenerics(pkg)) {
    //           this.evaluateDefinition(reference, pkg.generics, true);
    //         }
    //         if (I.implementsIHasSubprograms(pkg)) {
    //           this.evaluateDefinition(reference, pkg.subprograms, false);
    //         }

    //         if (I.implementsIHasTypes(pkg)) {
    //           for (const type of pkg.types) {
    //             this.evaluateDefinition(reference, type, false);
    //             if (type instanceof O.OEnum) {
    //               this.evaluateDefinition(reference, type.literals, true);
    //             }
    //             if (type instanceof O.ORecord) {
    //               this.evaluateDefinition(reference, type.children, false);
    //             }

    //           }
    //         }
    //         if (I.implementsIHasVariables(pkg)) {
    //           this.evaluateDefinition(reference, pkg.variables, true);
    //         }
    //         if (I.implementsIHasFileVariables(pkg)) {
    //           this.evaluateDefinition(reference, pkg.files, true);

    //         }


    //         if (I.implementsIHasPackageInstantiations(pkg)) {
    //           this.evaluateDefinition(reference, pkg.packageInstantiations, false);
    //         }

    //       }
    //     }
    //   }

    // } else if (reference.prefixTokens.length === 1) {
    //   // If first token is library this is referencing a package
    //   // O.Otherwise object from package
    //   let library;
    //   for (const [obj] of scope(reference)) {
    //     if (I.implementsIHasLibraries(obj)) {
    //       for (const findLibrary of obj.libraries) {
    //         if (findLibrary.lexerToken.getLText() == reference.prefixTokens[0].referenceToken.getLText()) {
    //           library = findLibrary;
    //         }
    //       }
    //     }
    //   }
    //   if (library) {
    //     for (const pkg of this.vhdlLinter.projectParser.packages) {
    //       if (reference.referenceToken.getLText() === pkg.lexerToken.getLText()) {
    //         reference.definitions.push(pkg);
    //       }
    //     }
    //     for (const pkg of this.vhdlLinter.projectParser.packageInstantiations) {
    //       if (reference.referenceToken.getLText() === pkg.lexerToken.getLText()) {
    //         reference.definitions.push(pkg);
    //       }
    //     }
    //   }
    // } else {
    //   // This seems expected if record in record for example...
    //   // this.vhdlLinter.addMessage({
    //   //   range: reference.range,
    //   //   severity: DiagnosticSeverity.Warning,
    //   //   message: `selected name found with ${reference.prefixTokens.length} prefixes. This is unexpected.`
    //   // });
    // }
  }
}