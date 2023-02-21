import { DiagnosticSeverity } from "vscode-languageserver";
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
    this.scopeVisibilityMap.set(parent, newMap);
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
      // if reference: find parent which has declarations to use as key
      let key: O.ObjectBase;
      if (object instanceof O.OReference) {
        key = object.parent;
        for (const [p] of O.scope(object)) {
          if (I.implementsIHasDeclarations(p)) {
            key = p;
            break;
          }
        }
      } else {
        key = object;
      }

      if (!this.scopeVisibilityMap.has(key)) {
        this.fillVisibilityMap(key);
      }
      const list = this.scopeVisibilityMap.get(key);
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

  link(reference: O.OReference, obj: O.ObjectBase & (I.IHasReferenceLinks | I.IHasLabel)) {
    reference.definitions.push(obj);
    if (I.implementsIHasLabel(obj)) {
      obj.labelLinks.push(reference);
    } else {
      obj.referenceLinks.push(reference);
    }
    this.castToRead(reference);

  }

  elaborateReference(reference: O.OReference) {
    for (const obj of this.getList(reference, reference.referenceToken.getLText())) {
      // alias doesn't has aliasReferences but still referenceLinks
      if (I.implementsIHasReference(obj) || obj instanceof O.OAlias) {
        this.link(reference, obj);
      }
    }
  }


  private elaborateTypeChildren(selectedName: O.OSelectedName | O.OSelectedNameWrite | O.OSelectedNameRead, typeDefinition: O.ObjectBase) {
    if (typeDefinition instanceof O.ORecord || (typeDefinition instanceof O.OType && typeDefinition.protected)) {
      let found = false;
      if (typeDefinition instanceof O.ORecord) {
        for (const child of typeDefinition.children) {
          if (child.lexerToken.getLText() === selectedName.referenceToken.getLText()) {
            selectedName.definitions.push(child);
            found = true;
          }
        }
      } else {
        // for protected types (not protected bodies) search subprograms and attributes
        for (const child of typeDefinition.declarations) {
          if (child.lexerToken.getLText() === selectedName.referenceToken.getLText()) {
            selectedName.definitions.push(child);
            found = true;
          }
        }
      }
      if (found === false) {
        this.vhdlLinter.addMessage({
          message: `${selectedName.referenceToken.text} does not exist on ${typeDefinition instanceof O.ORecord ? 'record' : 'protected type'} ${typeDefinition.lexerToken.text}`,
          range: selectedName.referenceToken.range,
          severity: DiagnosticSeverity.Error
        }, 'elaborate');
      }
    } else if (typeDefinition instanceof O.OArray) {
      for (const def of typeDefinition.elementType.flatMap(r => r.definitions)) {
        this.elaborateTypeChildren(selectedName, def);
      }
    }
  }

  elaborateSelectedNames(reference: O.OSelectedName | O.OSelectedNameWrite) {
    // all prefix tokens should be elaborated already
    const lastPrefix = reference.prefixTokens[reference.prefixTokens.length - 1]!;
    // last token is library -> expect a package
    if (lastPrefix.definitions.some(def => def instanceof O.OLibrary)) {
      for (const pkg of this.getList(undefined, reference.referenceToken.getLText())) {
        if (pkg instanceof O.OPackage) {
          this.link(reference, pkg);
        }
      }
    }
    // find record elements and protected type procedures
    const typeRefDefinitions = [...new Set(lastPrefix.definitions.flatMap(def => I.implementsIHasTypeReference(def) ? def.typeReference : []).flatMap(typeRef => typeRef.definitions))];
    for (const typeDef of typeRefDefinitions) {
      this.elaborateTypeChildren(reference, typeDef);
    }
    const pkgInstantiations = lastPrefix.definitions.filter(def => def instanceof O.OPackageInstantiation) as O.OPackageInstantiation[];
    for (const pkg of pkgInstantiations.flatMap(inst => inst.definitions)) {
      for (const decl of pkg.declarations) {
        if (decl.lexerToken.getLText() === reference.referenceToken.getLText()) {
          this.link(reference, decl);
        }
      }
    }
  }
}