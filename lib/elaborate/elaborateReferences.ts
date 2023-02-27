import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
import { VhdlLinter } from "../vhdlLinter";
export class ElaborateReferences {
  file: O.OFile;
  private scopeVisibilityMap = new Map<O.ObjectBase, Map<string, O.ObjectBase[]>>();
  // the fallback map includes record children and protected type content which usually is not visible
  // however, we sometimes cannot infer the type correctly (e.g. return type of a function) and then fail to find an object correctly.
  // Then, we can look in the fallback map and probably find it somewhere.
  private fallbackVisibilityMap = new Map<O.ObjectBase, Map<string, O.ObjectBase[]>>();
  // the project visibility map includes packages that are visible in the project
  private projectVisibilityMap?: Map<string, O.ObjectBase[]> = undefined;

  private constructor(public vhdlLinter: VhdlLinter) {
    this.file = vhdlLinter.file;
  }
  public static async elaborate(vhdlLinter: VhdlLinter) {
    const elaborator = new ElaborateReferences(vhdlLinter);
    let lastCancelTime = Date.now();
    for (const obj of vhdlLinter.file.objectList) {
      const now = Date.now();
      if (now - lastCancelTime >= 10) {
        await vhdlLinter.handleCanceled();
        lastCancelTime = now;
      }
      if (I.implementsIHasUseClause(obj)) {
        elaborator.elaborateUseClauses(obj, elaborator.getUseClauses(obj));
      } else if (obj instanceof O.OReference) {
        elaborator.elaborate(obj);
      }
    }
  }

  elaborate(ref: O.OReference) {
    if (ref.definitions.length > 0) {
      // was already elaborated (e.g. in use clause)
      return;
    }
    if (ref instanceof O.OFormalReference) {
      return;
    }
    // elaborate all references except instantiations
    if (ref instanceof O.OInstantiation === false) {
      if (ref instanceof O.OSelectedName || ref instanceof O.OSelectedNameWrite || ref instanceof O.OSelectedNameRead) {
        this.elaborateSelectedNames(ref);
      } else {
        this.elaborateReference(ref);
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

  addHiddenDeclarationsToMap(map: Map<string, O.ObjectBase[]>, obj: O.ObjectBase & I.IHasDeclarations) {
    for (const decl of obj.declarations) {
      if (decl instanceof O.ORecord) {
        this.addObjectsToMap(map, ...decl.children);
      }
      if (decl instanceof O.OType && decl.protectedBody) {
        this.addObjectsToMap(map, ...decl.declarations);
        this.addHiddenDeclarationsToMap(map, decl);
      }
    }
  }

  fillVisibilityMap(parent: O.ObjectBase) {
    const visibilityMap = new Map<string, O.ObjectBase[]>();
    const fallbackMap = new Map<string, O.ObjectBase[]>();
    this.scopeVisibilityMap.set(parent, visibilityMap);
    this.fallbackVisibilityMap.set(parent, fallbackMap);
    for (const [scopeObj, directlyVisible] of O.scope(parent)) {
      this.addObjectsToMap(visibilityMap, scopeObj);
      if (I.implementsIHasPorts(scopeObj)) {
        this.addObjectsToMap(visibilityMap, ...scopeObj.ports);
      }
      if (I.implementsIHasGenerics(scopeObj)) {
        this.addObjectsToMap(visibilityMap, ...scopeObj.generics);
      }
      if (I.implementsIHasDeclarations(scopeObj)) {
        this.addObjectsToMap(visibilityMap, ...scopeObj.declarations);
        this.addHiddenDeclarationsToMap(fallbackMap, scopeObj);
        for (const type of scopeObj.declarations) {
          if (type instanceof O.OType) {
            if (type instanceof O.OEnum) {
              this.addObjectsToMap(visibilityMap, ...type.literals);
            }
            if (type.units !== undefined) {
              this.addObjectsToMap(visibilityMap, ...type.units);
            }
            if (type.protected || type.protectedBody) {
              this.addObjectsToMap(visibilityMap, ...type.declarations);
            }
            if (type instanceof O.ORecord) {
              this.addObjectsToMap(fallbackMap, ...type.declarations);
            }
          }
        }
      }
      if (I.implementsIHasStatements(scopeObj)) {
        this.addObjectsToMap(visibilityMap, ...scopeObj.statements);
      }
      if (directlyVisible && I.implementsIHasLibraries(scopeObj)) {
        this.addObjectsToMap(visibilityMap, ...scopeObj.libraries);
      }
    }
  }

  getProjectList(searchText: string) {
    if (this.projectVisibilityMap === undefined) {
      const projectParser = this.vhdlLinter.projectParser;
      this.projectVisibilityMap = new Map();
      this.addObjectsToMap(this.projectVisibilityMap, ...projectParser.packages);
      for (const pkg of projectParser.packages) {
        this.fillVisibilityMap(pkg);
      }
      this.addObjectsToMap(this.projectVisibilityMap, ...projectParser.packageInstantiations);
      this.addObjectsToMap(this.projectVisibilityMap, ...projectParser.contexts);
    }
    return this.projectVisibilityMap?.get(searchText) ?? [];
  }

  getList(reference: O.OReference, fallback = false) {
    // find parent which is a scope
    let key = reference.parent;
    for (const [p] of O.scope(key)) {
      if (I.implementsIHasDeclarations(p) || I.implementsIHasStatements(p) || p instanceof O.OPackageInstantiation || p instanceof O.OContext) {
        key = p;
        break;
      }
    }

    if (!this.scopeVisibilityMap.has(key)) {
      this.fillVisibilityMap(key);
    }
    const list = this.scopeVisibilityMap.get(key);
    if (list === undefined) {
      throw new Error('no map found');
    }
    const searchText = reference.referenceToken.getLText();
    if (fallback) {
      const fallbackList = this.fallbackVisibilityMap.get(key);
      if (fallbackList === undefined) {
        throw new Error('no fallback map found');
      }
      return (list.get(searchText) ?? []).concat(fallbackList.get(searchText) ?? []);
    } else {
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
    for (const obj of this.getList(reference)) {
      // alias doesn't has aliasReferences but still referenceLinks
      if (I.implementsIHasReference(obj) || obj instanceof O.OAlias || I.implementsIHasLabel(obj)) {
        this.link(reference, obj);
      }
    }
    if (reference.parent instanceof O.OUseClause) {
      // never look in fallback map for use clauses
      return;
    }
    // if nothing was found look in the fallback map
    if (reference.definitions.length === 0) {
      for (const obj of this.getList(reference, true)) {
        // alias doesn't has aliasReferences but still referenceLinks
        if (I.implementsIHasReference(obj) || obj instanceof O.OAlias) {
          this.link(reference, obj);
        }
      }
    }
  }


  private elaborateTypeChildren(selectedName: O.OSelectedName | O.OSelectedNameWrite | O.OSelectedNameRead, typeDefinition: O.ObjectBase) {
    if (typeDefinition instanceof O.ORecord || (typeDefinition instanceof O.OType && typeDefinition.protected)) {
      let found = false;
      if (typeDefinition instanceof O.ORecord) {
        for (const child of typeDefinition.children) {
          if (child.lexerToken.getLText() === selectedName.referenceToken.getLText()) {
            this.link(selectedName, child);
            found = true;
          }
        }
      } else {
        // for protected types (not protected bodies) search subprograms and attributes
        for (const child of typeDefinition.declarations) {
          if (child.lexerToken.getLText() === selectedName.referenceToken.getLText()) {
            this.link(selectedName, child);
            found = true;
          }
        }
      }
      if (found === false) {
        // add a hint for the notDeclared rule to give a more detailed error message
        selectedName.notDeclaredHint = `${selectedName.referenceToken.text} does not exist on ${typeDefinition instanceof O.ORecord ? 'record' : 'protected type'} ${typeDefinition.lexerToken.text}`;
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
    if (lastPrefix.definitions.length === 0) {
      // if the last prefix token was not defined, do not try to look for more
      return;
    }
    // previous token is library -> expect a package
    const libraryDefinitions = lastPrefix.definitions.filter(def => def instanceof O.OLibrary);
    if (libraryDefinitions.length > 0) {
      for (const pkg of this.getProjectList(reference.referenceToken.getLText())) {
        if (pkg instanceof O.OPackage || pkg instanceof O.OPackageInstantiation) {
          this.link(reference, pkg);
        }
      }
    }
    // if all definitions are libraries -> do not look further (especially do not look in the fallback map)
    if (libraryDefinitions.length === lastPrefix.definitions.length) {
      return;
    }

    // previous token is type (e.g. protected or record) -> expect stuff from within
    const typeRefDefinitions = [...new Set(lastPrefix.definitions.flatMap(def => I.implementsIHasTypeReference(def) ? def.typeReference : []).flatMap(typeRef => typeRef.definitions))];
    for (const typeDef of typeRefDefinitions) {
      this.elaborateTypeChildren(reference, typeDef);
    }

    // previous token is package
    const packages = lastPrefix.definitions.filter(def => def instanceof O.OPackage) as O.OPackage[];
    // previous token is pkg inst or interface pkg -> find stuff from the uninstantiated package
    const pkgInstantiations = lastPrefix.definitions.filter(def => def instanceof O.OPackageInstantiation || def instanceof O.OInterfacePackage) as (O.OPackageInstantiation | O.OInterfacePackage)[];
    packages.push(...pkgInstantiations.flatMap(inst => inst.uninstantiatedPackage[inst.uninstantiatedPackage.length - 1]!.definitions).filter(ref => ref instanceof O.OPackage) as O.OPackage[]);
    for (const pkg of packages) {
      for (const decl of pkg.declarations) {
        if (decl.lexerToken.getLText() === reference.referenceToken.getLText()) {
          this.link(reference, decl);
        }
        if (decl instanceof O.OEnum) {
          for (const enumLiteral of decl.literals) {
            if (enumLiteral.lexerToken.getLText() === reference.referenceToken.getLText()) {
              this.link(reference, enumLiteral);
            }
          }
        }
      }
    }

    if (reference.parent instanceof O.OUseClause) {
      // never look in fallback map for use clauses
      return;
    }
    // if nothing was found look in the fallback map
    if (reference.definitions.length === 0 && reference.notDeclaredHint === undefined) {
      for (const obj of this.getList(reference, true)) {
        // alias doesn't has aliasReferences but still referenceLinks
        if (I.implementsIHasReference(obj) || obj instanceof O.OAlias) {
          this.link(reference, obj);
        }
      }
    }
  }

  elaborateUseClauses(parent: O.ObjectBase & I.IHasUseClauses, useClauses: O.OUseClause[]) {
    // the scope changes when finding use clause -> clear the visibility map
    let clearVisibilityMap = false;
    for (const useClause of useClauses) {
      // elaborate the references (useClause is created before the references of it)
      for (const ref of useClause.reference) {
        this.elaborate(ref);
      }
      const libraryRef = useClause.reference[0].definitions.some(def => def instanceof O.OLibrary);
      if (libraryRef) {
        if (useClause.reference[1] === undefined) {
          this.vhdlLinter.addMessage({
            message: 'use clause with library reference expects a package reference.',
            range: useClause.range
          }, 'elaborate');
          return;
        }
        const packageRef = useClause.reference[1]!;
        for (const obj of this.getProjectList(packageRef.referenceToken.getLText())) {
          if (obj instanceof O.OPackage) {
            parent.packageDefinitions.push(obj);
            obj.referenceLinks.push(packageRef);
            clearVisibilityMap = true;
          }
          if (obj instanceof O.OPackageInstantiation) {
            const uninstantiatedPackage = obj.uninstantiatedPackage[obj.uninstantiatedPackage.length - 1]!;
            // manually elaborate the uninstantiated package:
            const packageDefinitions = this.getProjectList(uninstantiatedPackage.referenceToken.getLText()).filter(def => def instanceof O.OPackage) as O.OPackage[];
            uninstantiatedPackage.definitions = packageDefinitions;

            parent.packageDefinitions.push(...packageDefinitions);
            obj.referenceLinks.push(packageRef);
            clearVisibilityMap = true;
          }
        }
      } else {
        const packageRef = useClause.reference[0];
        for (const obj of packageRef.definitions) {
          if (obj instanceof O.OPackageInstantiation || obj instanceof O.OInterfacePackage) {
            // they are not elaborated yet because the useClauses are always elaborated before anything else.
            // In this case the packageInstantiation/interfacePackage needs to be elaborated
            for (const ref of obj.uninstantiatedPackage) {
              this.elaborate(ref);
            }

            const packageDefinitions = obj.uninstantiatedPackage[obj.uninstantiatedPackage.length - 1]!.definitions.filter(ref => ref instanceof O.OPackage) as O.OPackage[];
            parent.packageDefinitions.push(...packageDefinitions);
            obj.referenceLinks.push(packageRef);
            clearVisibilityMap = true;
          }
        }
      }
    }
    if (clearVisibilityMap) {
      this.scopeVisibilityMap.clear();
    }
  }

  getUseClauses(parent: O.ObjectBase & (I.IHasUseClauses | I.IHasContextReference)) {
    const useClauses = I.implementsIHasUseClause(parent) ? parent.useClauses.slice() : [];
    const contextReferences = I.implementsIHasContextReference(parent) ? parent.contextReferences.slice() : [];
    if (parent instanceof O.OPackageBody && parent.correspondingPackage) {
      useClauses.push(...parent.correspondingPackage.useClauses);
      contextReferences.push(...parent.correspondingPackage.contextReferences);
    } else if (parent instanceof O.OArchitecture && parent.correspondingEntity) {
      useClauses.push(...parent.correspondingEntity.useClauses);
      contextReferences.push(...parent.correspondingEntity.contextReferences);
    }
    if (contextReferences.length > 0) {
      for (const contextRef of contextReferences) {
        const [lib, context] = contextRef.reference as [O.OReference, O.OReference];
        this.elaborateReference(lib);
        for (const obj of this.getProjectList(context.referenceToken.getLText())) {
          if (obj instanceof O.OContext) {
            context.definitions.push(obj);
            useClauses.push(...this.getUseClauses(obj));
          }
        }
      }
    }
    return useClauses;
  }
}