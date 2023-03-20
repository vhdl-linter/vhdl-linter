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
    // elaborate use clauses
    for (const obj of vhdlLinter.file.objectList) {
      const now = Date.now();
      if (now - lastCancelTime >= 10) {
        await vhdlLinter.handleCanceled();
        lastCancelTime = now;
      }
      if (I.implementsIHasUseClause(obj)) {
        elaborator.elaborateUseClauses(obj, elaborator.getUseClauses(obj));
      }
    }
    elaborator.scopeVisibilityMap.clear();
    // elaborate ONames
    const nameList = (vhdlLinter.file.objectList.filter(obj => obj instanceof O.OName) as O.OName[]).sort((a, b) => a.nameToken.range.start.i - b.nameToken.range.start.i);
    for (const obj of nameList) {
      const now = Date.now();
      if (now - lastCancelTime >= 10) {
        await vhdlLinter.handleCanceled();
        lastCancelTime = now;
      }
        elaborator.elaborate(obj);
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
    if (name instanceof O.OSelectedName) {
      this.elaborateSelectedName(name);
    } else {
      this.elaborateName(name);
    }
  }

  getObjectText(obj: O.ObjectBase) {
    if (I.implementsIHasLabel(obj)) {
      return obj.label.getLText();
    }
    return obj.lexerToken?.getLText();
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

  fillVisibilityMap(parent: O.ObjectBase) {
    const visibilityMap = new Map<string, O.ObjectBase[]>();
    const recordChildMap = new Map<string, O.ORecordChild[]>();
    this.scopeVisibilityMap.set(parent, visibilityMap);
    this.scopeRecordChildMap.set(parent, recordChildMap);
    for (const [scopeObj, directlyVisible] of O.scope(parent)) {
      this.addObjectsToMap(visibilityMap, scopeObj);
      if (directlyVisible && I.implementsIHasPorts(scopeObj)) {
        this.addObjectsToMap(visibilityMap, ...scopeObj.ports);
      }
      if (directlyVisible && I.implementsIHasGenerics(scopeObj)) {
        this.addObjectsToMap(visibilityMap, ...scopeObj.generics);
      }
      if (directlyVisible && I.implementsIHasDeclarations(scopeObj)) {
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
      if (directlyVisible && I.implementsIHasStatements(scopeObj)) {
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
      this.addObjectsToMap(this.projectVisibilityMap, ...projectParser.entities);
      this.addObjectsToMap(this.projectVisibilityMap, ...projectParser.packages);
      for (const pkg of projectParser.packages) {
        this.fillVisibilityMap(pkg);
      }
      this.addObjectsToMap(this.projectVisibilityMap, ...projectParser.packageInstantiations);
      this.addObjectsToMap(this.projectVisibilityMap, ...projectParser.contexts);
      this.addObjectsToMap(this.projectVisibilityMap, ...projectParser.configurations);
    }
    if (searchText === 'all') {
      return [...this.projectVisibilityMap.values()].flat();
    }
    return this.projectVisibilityMap.get(searchText) ?? [];
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


  link(name: O.OName, obj: O.ObjectBase & (I.IHasNameLinks | I.IHasLabel)) {
    // for attributes: only link attribute references to attribute declarations
    if ((obj instanceof O.OAttributeDeclaration && !(name instanceof O.OAttributeName) && !(name.parent instanceof O.OUseClause))
      || (name instanceof O.OAttributeName && !(obj instanceof O.OAttributeDeclaration))) {
      return;
    }
    name.definitions.push(obj);
    if (I.implementsIHasLabel(obj)) {
      obj.labelLinks.push(name);
    } else {
      obj.nameLinks.push(name);
    }
  }

  elaborateName(name: O.OName) {
    if (name.parent instanceof O.OSubtypeIndication && name.parent.constraint.includes(name)) {
      const typeName = name.parent.typeNames.at(-1);
      if (typeName) {
        const braceLevel = (name.braceLevel ?? 0);
        // previous token is type (e.g. protected or record) or alias -> expect stuff from within
        if (braceLevel === 1) {
          // if first brace level -> expect from main type
          for (const typeDef of typeName.definitions) {
            this.elaborateTypeChildren(name, typeDef);
          }
        } else {
          // otherwise expect from type of last token of lower braceLevel
          const index = name.parent.constraint.findIndex(c => c === name);
          // find last of lower brace level
          const lastLevel = name.parent.constraint.slice(0, index).reverse().find(c => c.braceLevel === braceLevel - 1);
          if (lastLevel) {
            for (const typeRef of lastLevel.definitions.filter(def => I.implementsIHasSubTypeIndication(def)) as (O.ObjectBase & I.IHasSubtypeIndication)[]) {
              for (const typeDef of typeRef.subtypeIndication.typeNames.flatMap(type => type.definitions)) {
                this.elaborateTypeChildren(name, typeDef);
              }
            }
          }
        }
      }
    }
    for (const obj of this.getList(name)) {
      // alias doesn't has aliasReferences but still referenceLinks
      if (I.implementsIHasNameLinks(obj) || obj instanceof O.OAlias || I.implementsIHasLabel(obj)) {
        this.link(name, obj);
      }
    }
  }


  private elaborateTypeChildren(selectedName: O.OName, typeDefinition: O.ObjectBase) {
    if (typeDefinition instanceof O.ORecord || (typeDefinition instanceof O.OType && (typeDefinition.protected || typeDefinition instanceof O.OAccessType || typeDefinition instanceof O.OSubType))) {
      let found = false;
      if (typeDefinition instanceof O.ORecord) {
        for (const child of typeDefinition.children) {
          if (child.lexerToken.getLText() === selectedName.nameToken.getLText()) {
            this.link(selectedName, child);
            found = true;
          }
        }
      } else if (typeDefinition instanceof O.OAccessType || typeDefinition instanceof O.OSubType) {
        for (const subtype of typeDefinition.subtypeIndication.typeNames) {
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
      for (const def of typeDefinition.subtypeIndication.typeNames.flatMap(r => r.definitions)) {
        this.elaborateTypeChildren(selectedName, def);
      }
    }
  }
  getSignalType(signalOrVariable: O.ObjectBase & I.IHasSubtypeIndication, rootFile: O.OFile) {
    const resolveArrayAlias = (obj: O.ObjectBase): O.ObjectBase[] => {
      if (obj instanceof O.OAlias) {
        const name = obj.subtypeIndication.typeNames.at(-1);
        if (name && name.rootFile !== rootFile) {
          this.elaborate(name);
        }
        return name?.definitions.flatMap(resolveArrayAlias) ?? [];
      } else if (obj instanceof O.OArray) {
        const name = obj.subtypeIndication.typeNames.at(-1);
        if (name && name.rootFile !== rootFile) {
          this.elaborate(name);
        }
        return name?.definitions.flatMap(resolveArrayAlias) ?? [];
      }
      return [obj];
    };
    const name = signalOrVariable.subtypeIndication.typeNames.at(-1);
    if (name && name.rootFile !== rootFile) {
      this.elaborate(name);
    }
    const definitions = name?.definitions.flatMap(resolveArrayAlias) ?? [];
    return definitions;
  }

  elaborateSelectedName(name: O.OSelectedName) {


    // all prefix tokens should be elaborated already
    const lastPrefix = name.prefixTokens.at(-1)!;
    if (lastPrefix.definitions.length === 0) {
      // if the last prefix token was not defined, do not try to look for more
      return;
    }
    // All is only valid in certain cases LRM 8.3
    if (name.nameToken.getLText() === 'all') {
      // As part of use clause when prefix is either library or package
      if (name.parent instanceof O.OUseClause) {
        if (lastPrefix.definitions.some(def => def instanceof O.OLibrary || def instanceof O.OPackage || def instanceof O.OPackageInstantiation || def instanceof O.OInterfacePackage) === false) {
          this.vhdlLinter.addMessage({
            message: 'all in use clause only allowed when prefix is library or package!',
            range: name.range
          }, 'elaborate');
          return;
        }
      } else {

        // When prefix is of an access type (is used as a dereference of the access/pointer type)
        if (lastPrefix.definitions.some(signalVariable => I.implementsIHasSubTypeIndication(signalVariable) && this.getSignalType(signalVariable, lastPrefix.rootFile).some(obj => obj instanceof O.OAccessType === false))) {
          this.vhdlLinter.addMessage({
            message: 'all only allowed when prefix is of access type!',
            range: name.range
          }, 'elaborate');
        }
        return;
      }
    }
    // previous token is library -> expect a package, entity or configuration
    const libraryDefinitions = lastPrefix.definitions.filter(def => def instanceof O.OLibrary);
    if (libraryDefinitions.length > 0) {
      for (const obj of this.getProjectList(name.nameToken.getLText())) {
        if (obj instanceof O.OPackage || obj instanceof O.OPackageInstantiation || obj instanceof O.OEntity || obj instanceof O.OConfigurationDeclaration) {
          this.link(name, obj);
        }
      }
    }
    // if all definitions are libraries -> do not look further (especially do not look in the fallback map)
    if (libraryDefinitions.length === lastPrefix.definitions.length) {
      return;
    }

    // previous token is type (e.g. protected or record) or alias -> expect stuff from within
    const typeNames = lastPrefix.definitions.flatMap(def => I.implementsIHasSubTypeIndication(def) ? def.subtypeIndication.typeNames : []);
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
    for (const pkgInstantiation of pkgInstantiations) {
      for (const ref of pkgInstantiation.uninstantiatedPackage) {
        if (ref.rootFile !== name.rootFile) {
          this.elaborate(ref);
        }
      }
    }
    packages.push(...pkgInstantiations.flatMap(inst => inst.uninstantiatedPackage[inst.uninstantiatedPackage.length - 1]!.definitions).filter(ref => ref instanceof O.OPackage) as O.OPackage[]);
    for (const pkg of packages) {

      for (const decl of pkg.declarations) {
        if (decl.lexerToken !== undefined && (decl.lexerToken.getLText() === name.nameToken.getLText() || name.nameToken.getLText() === 'all')) {
          this.link(name, decl);
        }
        if (decl instanceof O.OEnum) {
          for (const enumLiteral of decl.literals) {
            if (enumLiteral.lexerToken.getLText() === name.nameToken.getLText() || name.nameToken.getLText() === 'all') {
              this.link(name, enumLiteral);
            }
          }
        }
        if (decl instanceof O.OType) {
          for (const unit of decl.units) {
            if (unit.lexerToken.getLText() === name.nameToken.getLText() || name.nameToken.getLText() === 'all') {
              this.link(name, unit);
            }
          }
        }
      }
      for (const generic of pkg.generics) {
        if (generic.lexerToken !== undefined && (generic.lexerToken.getLText() === name.nameToken.getLText() || name.nameToken.getLText() === 'all')) {
          this.link(name, generic);
        }
      }
    }

    // previous token is subprogram -> look in the return types
    const returnReferences = (lastPrefix.definitions.filter(def => def instanceof O.OSubprogram) as O.OSubprogram[]).flatMap(subprogram => subprogram.return);
    for (const returnType of returnReferences.flatMap(ref => ref.definitions)) {
      this.elaborateTypeChildren(name, returnType);
    }


  }


  elaborateUseClauses(parent: O.ObjectBase & I.IHasUseClauses, useClauses: O.OUseClause[]) {
    for (const useClause of useClauses) {
      // elaborate the names (useClause is created before the names of it)
      for (const name of useClause.names) {
        this.elaborate(name);
      }
      const libraryRef = useClause.names[0].definitions.some(def => def instanceof O.OLibrary);
      if (libraryRef === false) {
        const packageRef = useClause.names[0];
        for (const obj of packageRef.definitions) {
          if (obj instanceof O.OPackageInstantiation || obj instanceof O.OInterfacePackage) {
            // they are not elaborated yet because the useClauses are always elaborated before anything else.
            // In this case the packageInstantiation/interfacePackage needs to be elaborated
            for (const ref of obj.uninstantiatedPackage) {
              this.elaborate(ref);
            }
            obj.nameLinks.push(packageRef);
          }
        }
      }
    }
  }

  getUseClauses(parent: O.ObjectBase & (I.IHasUseClauses), parentContexts: O.OContext[] = []) {
    const useClauses = parent.useClauses.slice();
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
        const [lib, context] = contextRef.names;
        if (lib && context) {
          this.elaborateName(lib);
          for (const obj of this.getProjectList(context.nameToken.getLText())) {
            if (obj instanceof O.OContext) {
              if (parentContexts.includes(obj)) {
                this.vhdlLinter.addMessage({
                  message: `Circular dependency in context references ${[...parentContexts, obj].map(context => context.lexerToken.text).join(' -> ')}`,
                  range: parentContexts[0]!.range
                }, 'elaborate');
              } else {
                context.definitions.push(obj);
                useClauses.push(...this.getUseClauses(obj, [...parentContexts, obj]));
              }
            }
          }
        }
      }
    }
    return useClauses;
  }
}
