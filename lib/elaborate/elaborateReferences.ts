import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
import { VhdlLinter } from "../vhdlLinter";
export class ElaborateNames {
  file: O.OFile;
  private scopeVisibilityMap = new Map<O.ObjectBase, Map<string, O.ObjectBase[]>>();
  // this map only contains the record children and is used for aggregate references
  private scopeRecordChildMap = new Map<O.ObjectBase, Map<string, O.ORecordChild[]>>();
  // the project visibility map includes packages that are visible in the project
  private projectVisibilityMap?: Map<string, O.ObjectBase[]> = undefined;

  private constructor(public vhdlLinter: VhdlLinter) {
    this.file = vhdlLinter.file;
  }
  public static async elaborate(vhdlLinter: VhdlLinter) {
    const elaborator = new ElaborateNames(vhdlLinter);
    let lastCancelTime = Date.now();
    for (const obj of vhdlLinter.file.objectList) {
      const now = Date.now();
      if (now - lastCancelTime >= 10) {
        await vhdlLinter.handleCanceled();
        lastCancelTime = now;
      }
      if (I.implementsIHasUseClause(obj)) {
        // elaborator.elaborateUseClauses(obj, elaborator.getUseClauses(obj));
      } else if (obj instanceof O.OName) {
        elaborator.elaborate(obj);
      }
    }
  }

  elaborate(name: O.OName) {
    if (name.definitions.length > 0) {
      // was already elaborated (e.g. in use clause)
      return;
    }
    if (name instanceof O.OFormalName) {
      return;
    }
    // elaborate all names except instantiations
    if (name instanceof O.OInstantiation === false) {
      if (name instanceof O.OSelectedName) {
        this.elaborateSelectedName(name);
      } else {
        this.elaborateName(name);
      }
    }
  }

  getObjectText(obj: O.ObjectBase) {
    if (I.implementsIHasLabel(obj)) {
      return obj.label.getLText();
    }
    return obj?.lexerToken?.getLText();
  }
  addObjectsToMap<T extends O.ObjectBase>(map: Map<string, T[]>, ...objects: T[]) {
    for (const obj of objects) {
      const text = this.getObjectText(obj);
      if (text === undefined) {
        continue;
      }

      let list: T[];
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
    const recordChildMap = new Map<string, O.ORecordChild[]>();
    this.scopeVisibilityMap.set(parent, visibilityMap);
    this.scopeRecordChildMap.set(parent, recordChildMap);
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
              this.addObjectsToMap(recordChildMap, ...type.children);
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
    if (searchText === 'all') {
      return [...this.projectVisibilityMap?.values() ?? []].flat();
    }
    return this.projectVisibilityMap?.get(searchText) ?? [];
  }

  getList(name: O.OName) {
    // find parent which is a scope
    let key = name.parent;
    for (const [p] of O.scope(key)) {
      if (I.implementsIHasDeclarations(p) || I.implementsIHasStatements(p) || p instanceof O.OPackageInstantiation || p instanceof O.OContext) {
        key = p;
        break;
      }
    }
    if (!this.scopeVisibilityMap.has(key)) {
      this.fillVisibilityMap(key);
    }
    const objMap = this.scopeVisibilityMap.get(key)!;
    const searchText = name.nameToken.getLText();
    const result = objMap.get(searchText) ?? [];
    if (name instanceof O.OChoice) {
      return result.concat(this.scopeRecordChildMap.get(key)!.get(searchText) ?? []);
    } else {
      return result;
    }
  }


  link(reference: O.OName, obj: O.ObjectBase & (I.IHasNameLinks | I.IHasLabel)) {
    // for attributes: only link attribute references to attribute declarations
    if (obj instanceof O.OAttributeDeclaration && !(reference instanceof O.OAttributeName)
    || reference instanceof O.OAttributeName && !(obj instanceof O.OAttributeDeclaration)) {
      return;
    }
    reference.definitions.push(obj);
    if (I.implementsIHasLabel(obj)) {
      obj.labelLinks.push(reference);
    } else {
      obj.nameLinks.push(reference);
    }
  }

  elaborateName(name: O.OName) {
    for (const obj of this.getList(name)) {
      // alias doesn't has aliasReferences but still referenceLinks
      if (I.implementsIHasNameLinks(obj) || obj instanceof O.OAlias || I.implementsIHasLabel(obj)) {
        this.link(name, obj);
      }
    }
  }


  private elaborateTypeChildren(selectedName: O.OSelectedName, typeDefinition: O.ObjectBase) {
    if (typeDefinition instanceof O.ORecord || (typeDefinition instanceof O.OType && (typeDefinition.protected || typeDefinition.access))) {
      let found = false;
      if (typeDefinition instanceof O.ORecord) {
        for (const child of typeDefinition.children) {
          if (child.lexerToken.getLText() === selectedName.nameToken.getLText()) {
            this.link(selectedName, child);
            found = true;
          }
        }
      } else if (typeDefinition.access) {
        for (const subtype of typeDefinition.subtypeIndication) {
          if (subtype.rootFile !== selectedName.rootFile) {
            this.elaborate(subtype);
          }
          for (const subtypeDef of subtype.definitions) {
            this.elaborateTypeChildren(selectedName, subtypeDef);
          }
        }
      } else {
        // for protected types (not protected bodies) search subprograms and attributes
        for (const child of typeDefinition.declarations) {
          if (child.lexerToken !== undefined && child.lexerToken.getLText() === selectedName.nameToken.getLText()) {
            this.link(selectedName, child);
            found = true;
          }
        }
      }
      if (found === false) {
        // add a hint for the notDeclared rule to give a more detailed error message
        selectedName.notDeclaredHint = `${selectedName.nameToken.text} does not exist on ${typeDefinition instanceof O.ORecord ? 'record' : 'protected type'} ${typeDefinition.lexerToken.text}`;
      }
    } else if (typeDefinition instanceof O.OArray) {
      for (const def of typeDefinition.elementType.flatMap(r => r.definitions)) {
        this.elaborateTypeChildren(selectedName, def);
      }
    }
  }

  elaborateSelectedName(name: O.OSelectedName) {
    // all prefix tokens should be elaborated already
    const lastPrefix = name.prefixTokens.at(-1)!;
    if (lastPrefix.definitions.length === 0) {
      // if the last prefix token was not defined, do not try to look for more
      return;
    }
    // previous token is library -> expect a package
    const libraryDefinitions = lastPrefix.definitions.filter(def => def instanceof O.OLibrary);
    if (libraryDefinitions.length > 0) {
      for (const pkg of this.getProjectList(name.nameToken.getLText())) {
        if (pkg instanceof O.OPackage || pkg instanceof O.OPackageInstantiation) {
          this.link(name, pkg);
        }
      }
    }
    // if all definitions are libraries -> do not look further (especially do not look in the fallback map)
    if (libraryDefinitions.length === lastPrefix.definitions.length) {
      return;
    }

    // previous token is type (e.g. protected or record) -> expect stuff from within
    const typeNames = lastPrefix.definitions.flatMap(def => I.implementsIHasTypeNames(def) ? def.typeNames : []);
    for (const typeName of typeNames) {
      if (typeName.rootFile !== name.rootFile) {
        this.elaborate(typeName);
      }
    }
    const typeRefDefinitions = typeNames.flatMap(typeRef => typeRef.definitions);
    for (const typeDef of typeRefDefinitions) {
      this.elaborateTypeChildren(name, typeDef);
    }

    // previous token is package
    const packages = lastPrefix.definitions.filter(def => def instanceof O.OPackage) as O.OPackage[];
    // previous token is pkg inst or interface pkg -> find stuff from the uninstantiated package
    const pkgInstantiations = lastPrefix.definitions.filter(def => def instanceof O.OPackageInstantiation || def instanceof O.OInterfacePackage) as (O.OPackageInstantiation | O.OInterfacePackage)[];
    packages.push(...pkgInstantiations.flatMap(inst => inst.uninstantiatedPackage[inst.uninstantiatedPackage.length - 1]!.definitions).filter(ref => ref instanceof O.OPackage) as O.OPackage[]);
    for (const pkg of packages) {
      for (const decl of pkg.declarations) {
        if (decl.lexerToken !== undefined && (decl.lexerToken.getLText() === name.nameToken.getLText() || name.nameToken.getLText() === 'all')) {
          this.link(name, decl);
        }
        if (decl instanceof O.OEnum) {
          for (const  enumLiteral of decl.literals) {
            if (enumLiteral.lexerToken.getLText() === name.nameToken.getLText()) {
              this.link(name, enumLiteral);
            }
          }
        }
      }
    }

    // previous token is subprogram -> look in the return types
    const returnReferences = (lastPrefix.definitions.filter(def => def instanceof O.OSubprogram) as O.OSubprogram[]).flatMap(subprogram => subprogram.return);
    for (const returnType of returnReferences.flatMap(ref => ref.definitions)) {
      this.elaborateTypeChildren(name, returnType);
    }

    // previous token is alias -> look in the subtypeIndication
    const aliasSubtypeIndication = (lastPrefix.definitions.filter(def => def instanceof O.OAlias) as O.OAlias[]).flatMap(alias => alias.subtypeIndication);
    for (const subtype of aliasSubtypeIndication.flatMap(ref => ref.definitions)) {
      this.elaborateTypeChildren(name, subtype);
    }
  }

  elaborateUseClauses(parent: O.ObjectBase & I.IHasUseClauses, useClauses: O.OUseClause[]) {
    // the scope changes when finding use clause -> clear the visibility map
    let clearVisibilityMap = false;
    for (const useClause of useClauses) {
      // elaborate the names (useClause is created before the names of it)
      for (const name of useClause.names) {
        this.elaborate(name);
      }
      const libraryRef = useClause.names[0].definitions.some(def => def instanceof O.OLibrary);
      if (libraryRef) {
        if (useClause.names[1] === undefined) {
          this.vhdlLinter.addMessage({
            message: 'use clause with library reference expects a package reference.',
            range: useClause.range
          }, 'elaborate');
          return;
        }
        const packageRef = useClause.names[2]!;
        for (const obj of this.getProjectList(packageRef.nameToken.getLText())) {
          if (obj instanceof O.OPackage) {
            parent.packageDefinitions.push(obj);
            obj.nameLinks.push(packageRef);
            clearVisibilityMap = true;
          }
          if (obj instanceof O.OPackageInstantiation) {
            const uninstantiatedPackage = obj.uninstantiatedPackage[obj.uninstantiatedPackage.length - 1]!;
            // manually elaborate the uninstantiated package:
            const packageDefinitions = this.getProjectList(uninstantiatedPackage.nameToken.getLText()).filter(def => def instanceof O.OPackage) as O.OPackage[];
            uninstantiatedPackage.definitions = packageDefinitions;

            parent.packageDefinitions.push(...packageDefinitions);
            obj.nameLinks.push(packageRef);
            clearVisibilityMap = true;
          }
        }
      } else {
        const packageRef = useClause.names[0];
        for (const obj of packageRef.definitions) {
          if (obj instanceof O.OPackageInstantiation || obj instanceof O.OInterfacePackage) {
            // they are not elaborated yet because the useClauses are always elaborated before anything else.
            // In this case the packageInstantiation/interfacePackage needs to be elaborated
            for (const ref of obj.uninstantiatedPackage) {
              this.elaborate(ref);
            }

            const packageDefinitions = obj.uninstantiatedPackage[obj.uninstantiatedPackage.length - 1]!.definitions.filter(ref => ref instanceof O.OPackage) as O.OPackage[];
            parent.packageDefinitions.push(...packageDefinitions);
            obj.nameLinks.push(packageRef);
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
        const [lib, context] = contextRef.names as [O.OName, O.OName];
        this.elaborateName(lib);
        for (const obj of this.getProjectList(context.nameToken.getLText())) {
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