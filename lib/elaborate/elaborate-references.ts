import { IHasLexerToken, IHasReferenceLinks, implementsIHasDeclarations, implementsIHasGenerics, implementsIHasLabel, implementsIHasLibraries, implementsIHasPorts, implementsIHasStatements } from "../parser/interfaces";
import { OArchitecture, OAttributeDeclaration, OAttributeReference, ObjectBase, OComponent, OConcurrentStatements, OEntity, OEnum, OFile, OFormalReference, OHasSequentialStatements, OInstantiation, OInterfacePackage, OLabelReference, OLibrary, OPackage, OPackageBody, OPackageInstantiation, ORead, ORecord, OReference, OSelectedName, OSelectedNameRead, OSelectedNameWrite, OSequentialStatement, OType, OWrite, scope } from "../parser/objects";
import { VhdlLinter } from "../vhdl-linter";
export class ElaborateReferences {
  file: OFile;

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
  }
  elaborateLabelReference(reference: OLabelReference) {
    for (const [object] of scope(reference)) {
      if (object instanceof OHasSequentialStatements) {
        if (implementsIHasLabel(object)) {
          if (object.label.getLText() === reference.referenceToken.getLText()) {
            object.labelLinks.push(reference);
            reference.definitions.push(object);
          }
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
  elaborateAttributeReferences(reference: OAttributeReference) {
    for (const [object] of scope(reference)) {
      if (implementsIHasDeclarations(object)) {
        for (const attributeDeclaration of object.declarations) {
          if (attributeDeclaration instanceof OAttributeDeclaration && attributeDeclaration.lexerToken.getLText() === reference.referenceToken.getLText()) {
            attributeDeclaration.referenceLinks.push(reference);
            reference.definitions.push(attributeDeclaration);
          }
        }
      }
    }
  }
  elaborateReference(reference: OReference) {
    for (const [object, directlyVisible] of scope(reference)) {
      if (implementsIHasStatements(object)) {
        this.evaluateLabelDefinition(reference, object.statements);
      }
      if (implementsIHasDeclarations(object)) {
        for (const declaration of object.declarations) {
          if (declaration instanceof OType) {
            this.evaluateDefinition(reference, declaration, false);
            if (declaration instanceof OEnum) {
              this.evaluateDefinition(reference, declaration.literals, true);
            }
            if (declaration instanceof ORecord) {
              this.evaluateDefinition(reference, declaration.children, false);
            }
            if (declaration.units !== undefined) {
              this.evaluateDefinition(reference, declaration.units, false);
            }
          } else if (declaration instanceof OComponent !== true) {
            this.evaluateDefinition(reference, declaration, true);

          }
        }
      }
      if (implementsIHasPorts(object)) {
        this.evaluateDefinition(reference, object.ports, true);
      }
      if (implementsIHasGenerics(object)) {
        this.evaluateDefinition(reference, object.generics, true);
      }
      if (implementsIHasLibraries(object)) {
        this.evaluateDefinition(reference, object.libraries, false);
      }


      // package names are only referable in direct visibility
      if (directlyVisible && (object instanceof OPackage || object instanceof OPackageBody || object instanceof OEntity || object instanceof OArchitecture)) {
        this.evaluateDefinition(reference, object, false);
      }

    }
  }

  elaborateSelectedNames(reference: OSelectedName | OSelectedNameWrite) {
    const [libraryToken] = reference.prefixTokens;
    let library: OLibrary | undefined;
    for (const [obj] of scope(reference)) {
      if (implementsIHasLibraries(obj)) {
        for (const findLibrary of obj.libraries) {
          if (findLibrary.lexerToken.getLText() == libraryToken.referenceToken.getLText()) {
            library = findLibrary;
          }
        }
      }
    }
    if (!library) {
      const packages: OPackage[] = [];
      for (const [obj] of scope(reference)) {
        if (implementsIHasDeclarations(obj)) {
          for (const pkgInst of obj.declarations) {
            if (pkgInst instanceof OPackageInstantiation && pkgInst.lexerToken.getLText() === reference.prefixTokens[0].referenceToken.getLText()) {
              const pkg = this.vhdlLinter.projectParser.packages.filter(pkg => pkg.lexerToken.getLText() === pkgInst.uninstantiatedPackageToken.getLText());
              packages.push(...pkg);
            }
          }
        }
        if (implementsIHasGenerics(obj)) {
          for (const pkgInst of obj.generics) {
            if (pkgInst instanceof OInterfacePackage && pkgInst.lexerToken.getLText() === reference.prefixTokens[0].referenceToken.getLText()) {
              const pkg = this.vhdlLinter.projectParser.packages.filter(pkg => pkg.lexerToken.getLText() === pkgInst.uninstantiatedPackageToken.getLText());
              packages.push(...pkg);
            }
          }
        }
      }
      for (const pkg of packages) {
        for (const declaration of pkg.declarations) {
          if (declaration.lexerToken.getLText() === reference.referenceToken.getLText()) {
            reference.definitions.push(declaration);
          }
          if (declaration instanceof OType) {
            const map = new Map<string, ObjectBase>();
            declaration.addReadsToMap(map);
            const definition = map.get(reference.referenceToken.getLText());
            if (definition) {
              reference.definitions.push(definition);
            }
          }
        }


      }
      for (const [obj] of scope(reference)) {
        if (implementsIHasDeclarations(obj)) {
          this.evaluateDefinition(reference, obj.declarations, true);
        }
        if (implementsIHasPorts(obj)) {
          this.evaluateDefinition(reference, obj.ports, true);
        }
        if (implementsIHasGenerics(obj)) {
          this.evaluateDefinition(reference, obj.generics, true);
        }
      }
    }
    if (reference.prefixTokens.length === 2) {
      const [, pkgToken] = reference.prefixTokens;
      if (library) {
        for (const pkg of this.vhdlLinter.projectParser.packages) {
          if (pkg.lexerToken.getLText() === pkgToken.referenceToken.getLText()) {
            if (implementsIHasDeclarations(pkg)) {
              for (const declaration of pkg.declarations) {
                this.evaluateDefinition(reference, declaration, false);
                if (declaration instanceof OEnum) {
                  this.evaluateDefinition(reference, declaration.literals, true);
                }
                if (declaration instanceof ORecord) {
                  this.evaluateDefinition(reference, declaration.children, false);
                }
              }
              this.evaluateDefinition(reference, pkg.declarations, true);
            }

            if (implementsIHasPorts(pkg)) {
              this.evaluateDefinition(reference, pkg.ports, true);
            }
            if (implementsIHasGenerics(pkg)) {
              this.evaluateDefinition(reference, pkg.generics, true);
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
            if (findLibrary.lexerToken.getLText() == reference.prefixTokens[0].referenceToken.getLText()) {
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
      }
    } else {
      // This seems expected if record in record for example...
      // this.vhdlLinter.addMessage({
      //   range: reference.range,
      //   severity: DiagnosticSeverity.Warning,
      //   message: `selected name found with ${reference.prefixTokens.length} prefixes. This is unexpected.`
      // });
    }
  }
}