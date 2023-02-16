import { IHasLexerToken, IHasReferenceLinks, implementsIHasAliases, implementsIHasAttributeDeclarations, implementsIHasConstants, implementsIHasFileVariables, implementsIHasGenerics, implementsIHasLabel, implementsIHasLexerToken, implementsIHasLibraries, implementsIHasPackageInstantiations, implementsIHasPorts, implementsIHasReference, implementsIHasSignals, implementsIHasStatements, implementsIHasSubprograms, implementsIHasTypes, implementsIHasVariables } from "../parser/interfaces";
import { OAlias, OAttributeDeclaration, OAttributeReference, ObjectBase, OConcurrentStatements, OEntity, OEnum, OFile, OFormalReference, OInstantiation, OLabelReference, OPackage, OPackageBody, OProcess, ORead, ORecord, OReference, OSelectedName, OSelectedNameRead, OSelectedNameWrite, OSequentialStatement, OStatementBody, OSubprogram, OWrite, scope } from "../parser/objects";
import { VhdlLinter } from "../vhdl-linter";
export class ElaborateReferences {
  file: OFile;
  private counter = 0;
  private scopeVisibilityMap = new Map<ObjectBase, Map<string, ObjectBase[]>>();

  private constructor(public vhdlLinter: VhdlLinter) {
    this.file = vhdlLinter.file;
  }
  public static elaborate(vhdlLinter: VhdlLinter) {
    const elaborator = new ElaborateReferences(vhdlLinter);
    for (const obj of vhdlLinter.file.objectList) {
      if (obj instanceof OFormalReference) {
        continue;
      }
      // elaborate all references except instantiations
      if (obj instanceof OReference && obj instanceof OInstantiation === false) {
        if (obj instanceof OSelectedName || obj instanceof OSelectedNameWrite) {
          elaborator.elaborateSelectedNames(obj);
        } else {
          elaborator.elaborateReference(obj);
        }
      }
    }
    console.log(`counter: ${elaborator.counter}`);
  }

  getObjectText(obj: ObjectBase) {
    if (implementsIHasLabel(obj)) {
      return obj.label.getLText();
    }
    return obj?.lexerToken?.getLText();
  }
  addObjectsToMap(map: Map<string, ObjectBase[]>, ...objects: ObjectBase[]) {
    for (const obj of objects) {
      const text = this.getObjectText(obj);
      if (text === undefined) {
        continue;
      }
      const list = (map.has(text)) ? map.get(text)! : [];
      list.push(obj);
      map.set(text, list);
    }
  }

  fillVisibilityMap(parent: ObjectBase) {
    this.counter++;
    const newMap = new Map<string, ObjectBase[]>();
    for (const [scopeObj] of scope(parent)) {
      this.addObjectsToMap(newMap, scopeObj);
      if (implementsIHasStatements(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.statements);
      }
      if (implementsIHasAttributeDeclarations(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.attributeDeclarations);
      }
      if (implementsIHasSignals(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.signals);
      }
      if (implementsIHasConstants(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.constants);
      }
      if (implementsIHasAliases(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.aliases);
      }
      if (implementsIHasPorts(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.ports);
      }
      if (implementsIHasGenerics(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.generics);
      }
      if (implementsIHasSubprograms(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.subprograms);
      }
      if (implementsIHasLibraries(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.libraries);
      }
      if (implementsIHasTypes(scopeObj)) {
        for (const type of scopeObj.types) {
          this.addObjectsToMap(newMap, type);
          if (type instanceof OEnum) {
            this.addObjectsToMap(newMap, ...type.literals);
          }
          if (type instanceof ORecord) {
            this.addObjectsToMap(newMap, ...type.children);
          }
          if (type.units !== undefined) {
            this.addObjectsToMap(newMap, ...type.units);
          }
        }
      }
      if (implementsIHasVariables(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.variables);
      }
      if (implementsIHasFileVariables(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.files);
      }
      if (implementsIHasPackageInstantiations(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.packageInstantiations);
      }
      if (implementsIHasAttributeDeclarations(scopeObj)) {
        this.addObjectsToMap(newMap, ...scopeObj.attributeDeclarations);
      }
    }
    this.scopeVisibilityMap.set(parent, newMap);
  }

  getList(reference: OReference, searchText: string) {
    // find parent with visibility of reference
    let parent = reference.parent;
    for (const [p] of scope(reference)) {
      if (p instanceof OStatementBody || p instanceof OEntity || p instanceof OSubprogram || p instanceof OProcess || p instanceof OPackage || p instanceof OPackageBody) {
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


  castToRead(reference: OReference) {
    if (reference instanceof OWrite === false) {
      if (reference instanceof OSelectedName) {
        Object.setPrototypeOf(reference, OSelectedNameRead.prototype);
      } else {
        Object.setPrototypeOf(reference, ORead.prototype);
      }
    }
  }

  elaborateReference(reference: OReference) {
    for (const obj of this.getList(reference, reference.referenceToken.getLText())) {
      // alias doesn't has aliasReferences
      if (implementsIHasReference(obj) || obj instanceof OAlias) {
        reference.definitions.push(obj);
        if (implementsIHasLabel(obj)) {
          obj.labelLinks.push(reference);
        } else {
          obj.referenceLinks.push(reference);
        }
        this.castToRead(reference);
      }
    }
  }

  elaborateSelectedNames(reference: OSelectedName | OSelectedNameWrite) {
    // const [libraryToken] = reference.prefixTokens;
    // let library: OLibrary | undefined;
    // for (const [obj] of scope(reference)) {
    //   if (implementsIHasLibraries(obj)) {
    //     for (const findLibrary of obj.libraries) {
    //       if (findLibrary.lexerToken.getLText() == libraryToken.referenceToken.getLText()) {
    //         library = findLibrary;
    //       }
    //     }
    //   }
    // }
    // if (!library) {
    //   const packages: OPackage[] = [];
    //   for (const [obj] of scope(reference)) {
    //     if (implementsIHasPackageInstantiations(obj)) {
    //       for (const pkgInst of obj.packageInstantiations) {
    //         if (pkgInst instanceof OPackageInstantiation && pkgInst.lexerToken.getLText() === reference.prefixTokens[0].referenceToken.getLText()) {
    //           const pkg = this.vhdlLinter.projectParser.packages.filter(pkg => pkg.lexerToken.getLText() === pkgInst.uninstantiatedPackageToken.getLText());
    //           packages.push(...pkg);
    //         }
    //       }
    //     }
    //     if (implementsIHasGenerics(obj)) {
    //       for (const pkgInst of obj.generics) {
    //         if (pkgInst instanceof OInterfacePackage && pkgInst.lexerToken.getLText() === reference.prefixTokens[0].referenceToken.getLText()) {
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
    //       const map = new Map<string, ObjectBase>();
    //       type.addReadsToMap(map);
    //       const definition = map.get(reference.referenceToken.getLText());
    //       if (definition) {
    //         reference.definitions.push(definition);
    //       }
    //     }
    //   }
    //   for (const [obj] of scope(reference)) {
    //     if (implementsIHasVariables(obj)) {
    //       this.evaluateDefinition(reference, obj.variables, true);
    //     }
    //     if (implementsIHasSignals(obj)) {
    //       this.evaluateDefinition(reference, obj.signals, true);
    //     }
    //     if (implementsIHasConstants(obj)) {
    //       this.evaluateDefinition(reference, obj.constants, true);
    //     }
    //     if (implementsIHasAliases(obj)) {
    //       this.evaluateDefinition(reference, obj.aliases, true);
    //     }
    //     if (implementsIHasPorts(obj)) {
    //       this.evaluateDefinition(reference, obj.ports, true);
    //     }
    //     if (implementsIHasGenerics(obj)) {
    //       this.evaluateDefinition(reference, obj.generics, true);
    //     }
    //   }
    // }
    // if (reference.prefixTokens.length === 2) {
    //   const [, pkgToken] = reference.prefixTokens;
    //   if (library) {
    //     for (const pkg of this.vhdlLinter.projectParser.packages) {
    //       if (pkg.lexerToken.getLText() === pkgToken.referenceToken.getLText()) {
    //         if (implementsIHasSignals(pkg)) {
    //           this.evaluateDefinition(reference, pkg.signals, true);
    //         }
    //         if (implementsIHasConstants(pkg)) {
    //           this.evaluateDefinition(reference, pkg.constants, true);
    //         }
    //         if (implementsIHasAliases(pkg)) {
    //           this.evaluateDefinition(reference, pkg.aliases, true);
    //         }
    //         if (implementsIHasPorts(pkg)) {
    //           this.evaluateDefinition(reference, pkg.ports, true);
    //         }
    //         if (implementsIHasGenerics(pkg)) {
    //           this.evaluateDefinition(reference, pkg.generics, true);
    //         }
    //         if (implementsIHasSubprograms(pkg)) {
    //           this.evaluateDefinition(reference, pkg.subprograms, false);
    //         }

    //         if (implementsIHasTypes(pkg)) {
    //           for (const type of pkg.types) {
    //             this.evaluateDefinition(reference, type, false);
    //             if (type instanceof OEnum) {
    //               this.evaluateDefinition(reference, type.literals, true);
    //             }
    //             if (type instanceof ORecord) {
    //               this.evaluateDefinition(reference, type.children, false);
    //             }

    //           }
    //         }
    //         if (implementsIHasVariables(pkg)) {
    //           this.evaluateDefinition(reference, pkg.variables, true);
    //         }
    //         if (implementsIHasFileVariables(pkg)) {
    //           this.evaluateDefinition(reference, pkg.files, true);

    //         }


    //         if (implementsIHasPackageInstantiations(pkg)) {
    //           this.evaluateDefinition(reference, pkg.packageInstantiations, false);
    //         }

    //       }
    //     }
    //   }

    // } else if (reference.prefixTokens.length === 1) {
    //   // If first token is library this is referencing a package
    //   // Otherwise object from package
    //   let library;
    //   for (const [obj] of scope(reference)) {
    //     if (implementsIHasLibraries(obj)) {
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