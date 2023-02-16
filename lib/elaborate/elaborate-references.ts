import { IHasLexerToken, IHasReferenceLinks, implementsIHasAliases, implementsIHasAttributeDeclarations, implementsIHasConstants, implementsIHasFileVariables, implementsIHasGenerics, implementsIHasLabel, implementsIHasLexerToken, implementsIHasLibraries, implementsIHasPackageInstantiations, implementsIHasPorts, implementsIHasReference, implementsIHasSignals, implementsIHasStatements, implementsIHasSubprograms, implementsIHasTypes, implementsIHasVariables } from "../parser/interfaces";
import { OAttributeDeclaration, OAttributeReference, ObjectBase, OConcurrentStatements, OEnum, OFile, OFormalReference, OInstantiation, OLabelReference, ORead, ORecord, OReference, OSelectedName, OSelectedNameRead, OSelectedNameWrite, OSequentialStatement, OWrite, scope } from "../parser/objects";
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
      if (obj instanceof OLabelReference) {
        elaborator.elaborateLabelReference(obj);
      }
      if (obj instanceof OReference && obj instanceof OInstantiation === false) {
        if (obj instanceof OSelectedName || obj instanceof OSelectedNameWrite) {
          elaborator.elaborateSelectedNames(obj);
        } else if (obj instanceof OAttributeReference) {
          elaborator.elaborateAttributeReferences(obj);
        } else {
          elaborator.elaborateReference(obj);
        }
      }
    }
    console.log(`counter: ${elaborator.counter}`);
  }

  fillVisibilityMap(parent: ObjectBase) {
    this.counter++;
    const newMap = new Map<string, ObjectBase[]>();
    const setObj = (...objects: ObjectBase[]) => {
      for (const obj of objects.filter(o => implementsIHasLexerToken(o)) as (ObjectBase & IHasLexerToken)[]) {
        const text = obj.lexerToken.getLText();
        const list = (newMap.has(text)) ? newMap.get(text)! : [];
        list.push(obj);
        newMap.set(text, list);
      }
    };
    for (const [scopeObj] of scope(parent)) {
      setObj(scopeObj);
      if (implementsIHasStatements(scopeObj)) {
        setObj(...scopeObj.statements);
      }
      if (implementsIHasAttributeDeclarations(scopeObj)) {
        setObj(...scopeObj.attributeDeclarations);
      }
      if (implementsIHasSignals(scopeObj)) {
        setObj(...scopeObj.signals);
      }
      if (implementsIHasConstants(scopeObj)) {
        setObj(...scopeObj.constants);
      }
      if (implementsIHasAliases(scopeObj)) {
        setObj(...scopeObj.aliases);
      }
      if (implementsIHasPorts(scopeObj)) {
        setObj(...scopeObj.ports);
      }
      if (implementsIHasGenerics(scopeObj)) {
        setObj(...scopeObj.generics);
      }
      if (implementsIHasSubprograms(scopeObj)) {
        setObj(...scopeObj.subprograms);
      }
      if (implementsIHasLibraries(scopeObj)) {
        setObj(...scopeObj.libraries);
      }
      if (implementsIHasTypes(scopeObj)) {
        for (const type of scopeObj.types) {
          setObj(type);
          if (type instanceof OEnum) {
            setObj(...type.literals);
          }
          if (type instanceof ORecord) {
            setObj(...type.children);
          }
          if (type.units !== undefined) {
            setObj(...type.units);
          }

        }
      }
      if (implementsIHasVariables(scopeObj)) {
        setObj(...scopeObj.variables);
      }
      if (implementsIHasFileVariables(scopeObj)) {
        setObj(...scopeObj.files);

      }
      if (implementsIHasPackageInstantiations(scopeObj)) {
        setObj(...scopeObj.packageInstantiations);
      }
      if (implementsIHasAttributeDeclarations(scopeObj)) {
        setObj(...scopeObj.attributeDeclarations);
      }
    }
    this.scopeVisibilityMap.set(parent, newMap);
  }

  getList(reference: OReference, searchText: string) {
    if (!this.scopeVisibilityMap.has(reference.parent)) {
      this.fillVisibilityMap(reference.parent);
    }
    const list = this.scopeVisibilityMap.get(reference.parent);
    if (list === undefined) {
      throw new Error('no map found');
    }
    return list.get(searchText) ?? [];
  }

  elaborateLabelReference(reference: OLabelReference) {
    for (const object of this.getList(reference, reference.referenceToken.getLText())) {
      if (implementsIHasLabel(object)) {
        object.labelLinks.push(reference);
        reference.definitions.push(object);
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

  evaluateDefinition(reference: OReference, definition: (ObjectBase & IHasReferenceLinks & IHasLexerToken) | (ObjectBase & IHasReferenceLinks & IHasLexerToken)[], enableCastToRead: boolean) {
    if (Array.isArray(definition)) {
      for (const def of definition) {
        this.evaluateDefinition(reference, def, enableCastToRead);
      }
    } else {
      if (reference instanceof OSelectedName || reference instanceof OSelectedNameWrite) {
        if (definition.lexerToken.getLText() === reference.prefixTokens[0].referenceToken.getLText()) {
          reference.definitions.push(definition);
          definition.referenceLinks.push(reference);
          if (enableCastToRead) {
            this.castToRead(reference);
          }
        }
      }
      if (definition.lexerToken.getLText() === reference.referenceToken.getLText()) {
        reference.definitions.push(definition);
        definition.referenceLinks.push(reference);
        if (enableCastToRead) {
          this.castToRead(reference);
        }
      }
    }
  }

  evaluateLabelDefinition(reference: OReference, definition: OSequentialStatement | OConcurrentStatements | (OSequentialStatement | OConcurrentStatements)[]) {
    if (Array.isArray(definition)) {
      for (const def of definition) {
        this.evaluateLabelDefinition(reference, def);
      }
    } else {
      if (definition.label?.getLText() === reference.referenceToken.getLText()) {
        reference.definitions.push(definition);
        definition.labelLinks.push(reference);

      }
    }
  }

  elaborateReference(reference: OReference) {
    for (const obj of this.getList(reference, reference.referenceToken.getLText())) {
      if (implementsIHasReference(obj)) {
        reference.definitions.push(obj);
        obj.referenceLinks.push(reference);
        this.castToRead(reference);
      }
    }
    if (reference instanceof OSelectedName || reference instanceof OSelectedNameWrite) {
      for (const obj of this.getList(reference, reference.prefixTokens[0].referenceToken.getLText())) {
        if (implementsIHasReference(obj)) {
          reference.definitions.push(obj);
          obj.referenceLinks.push(reference);
          this.castToRead(reference);
        }
      }
    }
  }

  elaborateAttributeReferences(reference: OAttributeReference) {
    for (const attributeDeclaration of this.getList(reference, reference.referenceToken.getLText())) {
      if (attributeDeclaration instanceof OAttributeDeclaration) {
        attributeDeclaration.referenceLinks.push(reference);
        reference.definitions.push(attributeDeclaration);
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