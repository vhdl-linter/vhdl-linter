import { DiagnosticSeverity } from "vscode-languageserver/node";
import { IHasContextReference, IHasUseClauses, implementsIHasComponents, implementsIHasContextReference, implementsIHasLibraries, implementsIHasPackageInstantiations, implementsIHasPorts, implementsIHasSubprogramAlias, implementsIHasSubprograms, implementsIHasTypes, implementsIHasUseClause, implementsIHasVariables, implementsIReferencable, OArchitecture, OAssociation, ObjectBase, OComponent, OEntity, OFile, OGeneric, OGenericAssociationList, OInstantiation, OPackage, OPackageBody, OPort, OPortAssociationList, ORead, OReference, OSelectedNameRead, OSubprogram, OSubprogramAlias, OType, OTypeMark, ParserError, scope } from "./parser/objects";
import { VhdlLinter } from "./vhdl-linter";

export class Elaborator {
  file: OFile;
  private constructor(public vhdlLinter: VhdlLinter) {
    this.file = vhdlLinter.file;
  }
  public static async elaborate(vhdlLinter: VhdlLinter) {
    const elaborator = new Elaborator(vhdlLinter);
    await elaborator.elaborateAll();
  }
  async elaborateAll() {

    await this.vhdlLinter.handleCanceled();

    // const start = Date.now();
    // Map architectures to entity
    for (const architecture of this.file.architectures) {
      if (architecture.entityName === undefined) {
        continue;
      }
      // Find entity first in this file
      let entity = this.file.entities.find(entity => entity.lexerToken.getLText() === architecture.entityName?.getLText());
      if (!entity) { // Find entity in all files
        entity = this.vhdlLinter.projectParser.entities.find(entity => entity.lexerToken.getLText() === architecture.entityName?.getLText());
      }
      if (entity) {
        architecture.correspondingEntity = entity;
      }
    }
    // Map package body to package
    for (const pkg of this.file.packages) {
      if (pkg instanceof OPackageBody) {

        // Find entity first in this file
        let pkgHeader: OPackage | undefined = this.file.packages.find(pkgHeader => pkgHeader instanceof OPackage && pkgHeader.lexerToken.getLText() === pkg.lexerToken.getLText()) as OPackage | undefined;
        if (!pkgHeader) { // Find entity in all files
          pkgHeader = this.vhdlLinter.projectParser.packages.find(pkgHeader => pkgHeader instanceof OPackage && pkgHeader.lexerToken.getLText() === pkg.lexerToken.getLText()) as OPackage | undefined;
        }
        if (pkgHeader) {
          pkg.correspondingPackage = pkgHeader;
        } else {
          this.vhdlLinter.addMessage({
            range: pkg.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `Can not find package for package body.`
          })
        }

      }
    }
    //     console.log(packages);
    await this.elaborateUseClauses();
    await this.vhdlLinter.handleCanceled();
    //     console.log(packages);
    for (const obj of this.file.objectList) {
      if (obj instanceof OReference) {
        obj.elaborate();
      }
    }

    // console.log(`elab: useClauses for: ${Date.now() - start} ms.`);
    // start = Date.now();
    await this.vhdlLinter.handleCanceled();



    // console.log(`elab: otherFileEntity for: ${Date.now() - start} ms.`);
    // start = Date.now();

    // This is caching all visible reads from packets for every object that can reference packages/have use clauses
    const readObjectMap = new Map<ObjectBase, Map<string, ObjectBase>>();
    for (const object of this.file.objectList) {
      if (implementsIHasUseClause(object)) {
        const innerMap = new Map<string, ObjectBase>();
        const packages = object.packageDefinitions;
        for (const pkg of packages) {
          for (const constant of pkg.constants) {
            innerMap.set(constant.lexerToken.getLText(), constant);
          }
          for (const subprogram of pkg.subprograms) {
            innerMap.set(subprogram.lexerToken.getLText(), subprogram);
          }
          for (const subprogramAlias of pkg.subprogramAliases) {
            innerMap.set(subprogramAlias.lexerToken.getLText(), subprogramAlias);
          }
          for (const type of pkg.types) {
            type.addReadsToMap(innerMap);
          }
          for (const generic of pkg.generics) {
            innerMap.set(generic.lexerToken.getLText(), generic);
          }
        }
        readObjectMap.set(object, innerMap);
      }
    }

    for (const read of this.file.objectList.filter(object => object instanceof ORead) as ORead[]) {
      for (const [object] of scope(read)) {
        const match = readObjectMap.get(object)?.get(read.lexerToken.getLText());
        if (match) {
          read.definitions.push(match);
        }
        if (implementsIHasLibraries(object)) {
          const match = object.libraries.find(library => library.lexerToken.getLText() === read.lexerToken.getLText())
          if (match) {
            read.definitions.push(match);
          }
        }
      }
      const rootElement = read.getRootElement();
      if (implementsIHasPorts(rootElement)) {
        for (const port of rootElement.ports) {
          if (port.lexerToken.getLText() === read.lexerToken.getLText()) {
            read.definitions.push(port);
            port.references.push(read);
          }
        }
      } else if (rootElement instanceof OArchitecture) {
        for (const port of rootElement.correspondingEntity?.ports ?? []) {
          if (port.lexerToken.getLText() === read.lexerToken.getLText()) {
            read.definitions.push(port);
            port.references.push(read);
          }
        }
      }
      if (read instanceof OSelectedNameRead) {
        if (read.prefixTokens.length === 2) {
          const [libraryToken, pkgToken] = read.prefixTokens;
          let library;
          for (const [obj] of scope(read)) {
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
                for (const constant of pkg.constants) {
                  if (constant.lexerToken.getLText() === read.lexerToken.getLText()) {
                    read.definitions.push(constant);
                  }
                }
                for (const subprogram of pkg.subprograms) {
                  if (subprogram.lexerToken.getLText() === read.lexerToken.getLText()) {
                    read.definitions.push(subprogram);
                  }
                }
                for (const generic of pkg.generics) {
                  if (generic.lexerToken.getLText() === read.lexerToken.getLText()) {
                    read.definitions.push(generic);
                  }
                }
                for (const type of pkg.types) {
                  const map = new Map();
                  type.addReadsToMap(map);
                  const definition = map.get(read.lexerToken.getLText());
                  if (definition) {
                    read.definitions.push(definition)
                  }
                }

              }
            }
          }

        } else if (read.prefixTokens.length === 1) {
          // If first token is library this is referencing a package
          // Otherwise object from package
          let library;
          for (const [obj] of scope(read)) {
            if (implementsIHasLibraries(obj)) {
              for (const findLibrary of obj.libraries) {
                if (findLibrary.lexerToken.getLText() == read.prefixTokens[0].getLText()) {
                  library = findLibrary;
                }
              }
            }
          }
          if (library) {
            for (const pkg of this.vhdlLinter.projectParser.packages) {
              if (read.lexerToken.getLText() === pkg.lexerToken.getLText()) {
                read.definitions.push(pkg);
              }
            }
            for (const pkg of this.vhdlLinter.projectParser.packageInstantiations) {
              if (read.lexerToken.getLText() === pkg.lexerToken.getLText()) {
                read.definitions.push(pkg);
              }
            }
          } else {
            const packages: OPackage[] = [];
            for (const [obj] of scope(read)) {
              if (implementsIHasPackageInstantiations(obj)) {
                for (const pkgInst of obj.packageInstantiations) {
                  if (pkgInst.lexerToken?.getLText() === read.prefixTokens[0].getLText()) {
                    const pkg = this.vhdlLinter.projectParser.packages.filter(pkg => pkg.lexerToken.getLText() === pkgInst.uninstantiatedPackageToken.getLText());
                    packages.push(...pkg);
                  }
                }
              }
            }
            for (const pkg of packages) {
              for (const constant of pkg.constants) {
                if (constant.lexerToken.getLText() === read.lexerToken.getLText()) {
                  read.definitions.push(constant);
                }
              }
              for (const subprogram of pkg.subprograms) {
                if (subprogram.lexerToken.getLText() === read.lexerToken.getLText()) {
                  read.definitions.push(subprogram);
                }
              }
              for (const generic of pkg.generics) {
                if (generic.lexerToken.getLText() === read.lexerToken.getLText()) {
                  read.definitions.push(generic);
                }
              }
              for (const type of pkg.types) {
                const map = new Map();
                type.addReadsToMap(map);
                const definition = map.get(read.lexerToken.getLText());
                if (definition) {
                  read.definitions.push(definition)
                }
              }
            }
            for (const [obj] of scope(read)) {
              if (implementsIHasVariables(obj)) {
                for (const variable of obj.variables) {
                  // TODO: Find out way to check for proteced
                  if (variable.lexerToken.getLText() === read.prefixTokens[0].getLText()) {
                    // TODO: Link the actual subprogramm
                    read.definitions.push(variable);
                  }
                }
              }
            }
          }
        } else {
          this.vhdlLinter.addMessage({
            range: read.range,
            severity: DiagnosticSeverity.Warning,
            message: `selected name found with ${read.prefixTokens.length} prefixes. This is unexpected.`
          });
        }
      }
    }

    // console.log(`elab: reads for: ${Date.now() - start} ms.`);
    // start = Date.now();
    await this.vhdlLinter.handleCanceled();

    for (const instantiation of this.file.objectList.filter(object => object instanceof OInstantiation) as OInstantiation[]) {
      switch (instantiation.type) {
        case 'component': {
          const components = this.getComponents(instantiation);
          instantiation.definitions.push(...components);
          for (const component of components) {
            component.references.push(instantiation);
          }
          break;
        }
        case 'entity':
          instantiation.definitions.push(...this.getEntities(instantiation));
          break;
        case 'subprogram':
          instantiation.definitions.push(...this.getSubprograms(instantiation));
          break;
      }
    }
    // console.log(`elab: instantiations for: ${Date.now() - start} ms.`);
    // start = Date.now();
    await this.vhdlLinter.handleCanceled();

    for (const architecture of [...this.file.architectures, ...this.file.packages.filter(p => p instanceof OPackage) as OPackage[]]) {
      for (const component of architecture.components) {
        component.definitions.push(...this.getEntities(component));
        const entityPorts = component.definitions.flatMap(ent => ent.ports);
        for (const port of component.ports) {
          port.definitions.push(...entityPorts.filter(p => p.lexerTokenEquals(port)));
        }
        const entityGenerics = component.definitions.flatMap(ent => ent.generics);
        for (const generics of component.generics) {
          generics.definitions.push(...entityGenerics.filter(g => g.lexerTokenEquals(generics)));
        }
      }
    }
    // console.log(`elab: components for: ${Date.now() - start} ms.`);
    // start = Date.now();
    await this.vhdlLinter.handleCanceled();

    for (const association of this.file.objectList.filter(obj => obj instanceof OAssociation) as OAssociation[]) {
      if (association.parent instanceof OGenericAssociationList || association.parent instanceof OPortAssociationList) {
        if (!(association.parent.parent instanceof OInstantiation)) {
          continue;
        }
        const definitions = association.parent.parent.definitions;

        const possibleFormals: (OPort | OGeneric | OTypeMark)[] = [];
        possibleFormals.push(...definitions.flatMap(definition => {
          let elements: (OPort | OGeneric | OTypeMark)[] = [];
          if (association.parent instanceof OPortAssociationList) {
            elements = definition instanceof OSubprogramAlias ? definition.typeMarks : definition.ports;
          } else if (definition instanceof OComponent || definition instanceof OEntity) {
            elements = definition.generics;
          }
          return elements.filter((port, portNumber) => {
            if (!(port instanceof OTypeMark)) {
              const formalMatch = association.formalPart.find(name => name.lexerToken.getLText() === port.lexerToken.getLText());
              if (formalMatch) {
                return true;
              }
            }
            return association.formalPart.length === 0 && portNumber === association.parent.children.findIndex(o => o === association);
          });
        }));

        if (possibleFormals.length === 0) {
          continue;
        }
        association.definitions.push(...possibleFormals);
        for (const formalPart of association.formalPart) {
          formalPart.definitions.push(...possibleFormals);
        }
        for (const possibleFormal of possibleFormals) {
          this.elaborateAssociationMentionables(possibleFormal, association);
        }
      }
    }
    // console.log(`elab: associations for: ${Date.now() - start} ms.`);
    // start = Date.now();
    await this.vhdlLinter.handleCanceled();

  }
  elaborateAssociationMentionables(possibleFormal: OPort | OGeneric | OTypeMark, association: OAssociation) {
    if (possibleFormal instanceof OPort) {
      if (possibleFormal.direction === 'in') {
        for (const mapping of association.actualIfOutput.flat()) {
          const index = this.file.objectList.indexOf(mapping);
          this.file.objectList.splice(index, 1);
          for (const mentionable of this.file.objectList) {
            if (implementsIReferencable(mentionable)) {
              for (const [index, mention] of mentionable.references.entries()) {
                if (mention === mapping) {
                  mentionable.references.splice(index, 1);
                }
              }
            }
          }
        }
        association.actualIfOutput = [[], []];
        for (const mapping of association.actualIfInoutput.flat()) {
          const index = this.file.objectList.indexOf(mapping);
          this.file.objectList.splice(index, 1);
          for (const mentionable of this.file.objectList) {
            if (implementsIReferencable(mentionable)) {
              for (const [index, mention] of mentionable.references.entries()) {
                if (mention === mapping) {
                  mentionable.references.splice(index, 1);
                }
              }
            }
          }
        }
        association.actualIfInoutput = [[], []];
      } else if (possibleFormal.direction === 'out') {
        for (const mapping of association.actualIfInput) {
          const index = this.file.objectList.indexOf(mapping);
          this.file.objectList.splice(index, 1);
          for (const mentionable of this.file.objectList) {
            if (implementsIReferencable(mentionable)) {
              for (const [index, mention] of mentionable.references.entries()) {
                if (mention === mapping) {
                  mentionable.references.splice(index, 1);
                }
              }
            }
          }
        }
        association.actualIfInput = [];
        for (const mapping of association.actualIfInoutput.flat()) {
          const index = this.file.objectList.indexOf(mapping);
          this.file.objectList.splice(index, 1);
          for (const mentionable of this.file.objectList) {
            if (implementsIReferencable(mentionable)) {
              for (const [index, mention] of mentionable.references.entries()) {
                if (mention === mapping) {
                  mentionable.references.splice(index, 1);
                }
              }
            }
          }
        }
        association.actualIfInoutput = [[], []];
      } else if (possibleFormal.direction === 'inout') {
        for (const mapping of association.actualIfInput) {
          const index = this.file.objectList.indexOf(mapping);
          this.file.objectList.splice(index, 1);
          for (const mentionable of this.file.objectList) {
            if (implementsIReferencable(mentionable)) {
              for (const [index, mention] of mentionable.references.entries()) {
                if (mention === mapping) {
                  mentionable.references.splice(index, 1);
                }
              }
            }
          }
        }
        association.actualIfInput = [];
        for (const mapping of association.actualIfOutput.flat()) {
          const index = this.file.objectList.indexOf(mapping);
          this.file.objectList.splice(index, 1);
          for (const mentionable of this.file.objectList) {
            if (implementsIReferencable(mentionable)) {
              for (const [index, mention] of mentionable.references.entries()) {
                if (mention === mapping) {
                  mentionable.references.splice(index, 1);
                }
              }
            }
          }
        }
        association.actualIfOutput = [[], []];
      }
    }
  }
  getUseClauses(parent: ObjectBase & (IHasUseClauses | IHasContextReference)) {
    const useClauses = implementsIHasUseClause(parent) ? parent.useClauses.slice() : [];
    const contextReferences = implementsIHasContextReference(parent) ? parent.contextReferences.slice() : [];
    if (parent instanceof OPackageBody && parent.correspondingPackage) {
      useClauses.push(...parent.correspondingPackage.useClauses);
      contextReferences.push(...parent.correspondingPackage.contextReferences);
    } else if (parent instanceof OArchitecture && parent.correspondingEntity) {
      useClauses.push(...parent.correspondingEntity.useClauses);
      contextReferences.push(...parent.correspondingEntity.contextReferences);
    }
    if (contextReferences.length > 0) {
      const contexts = this.vhdlLinter.projectParser.contexts;
      for (const reference of contextReferences) {
        const context = contexts.find(c => c.lexerToken.getLText() === reference.contextName.toLowerCase());
        if (!context) {
          this.vhdlLinter.addMessage({
            range: reference.range,
            severity: DiagnosticSeverity.Warning,
            message: `could not find context for ${reference.library}.${reference.contextName}`
          });
        } else {
          reference.definitions.push(context);
          useClauses.push(...this.getUseClauses(context));
        }
      }
    }
    return useClauses;
  }
  async elaborateUseClauses() {

    const packages = this.vhdlLinter.projectParser.packages;
    const packageInstantiations = this.vhdlLinter.projectParser.packageInstantiations;

    for (const obj of this.file.objectList) {
      if (implementsIHasUseClause(obj) || implementsIHasContextReference(obj)) {
        for (const useClause of this.getUseClauses(obj)) {
          let found = false;
          // if library is defined, uses a "normal" Package; i.e. not an uninstantiated package
          // or an instantiated package
          if (useClause.library !== undefined) {
            for (const foundPkg of packages) {
              if (foundPkg.lexerToken.getLText() === useClause.packageName.getLText()) {
                obj.packageDefinitions.push(foundPkg);
                found = true;
              }
            }

            for (const foundPkg of packageInstantiations) {
              if (foundPkg.lexerToken.getLText() === useClause.packageName.getLText()) {
                found = true;
                const uninstantiatedPackage = packages.find(p => p.lexerToken.getLText() === foundPkg.uninstantiatedPackageToken.getLText());
                if (uninstantiatedPackage) {
                  obj.packageDefinitions.push(uninstantiatedPackage);
                } else {
                  this.vhdlLinter.addMessage({
                    range: useClause.range,
                    severity: DiagnosticSeverity.Warning,
                    message: `could not find instantiated package from package ${useClause.library}.${useClause.packageName}`
                  });
                  break;
                }
              }
            }
          } else { // if using package directly, it is an instantiated package
            const pkgInstantations = [];
            // go through scope to find all package instantiations
            for (const [iterator] of scope(obj)) {
              if (implementsIHasPackageInstantiations(iterator)) {
                pkgInstantations.push(...iterator.packageInstantiations);
              }
            }

            const packageInstantiation = pkgInstantations.find(inst => inst.lexerToken.getLText() === useClause.packageName.getLText());
            if (!packageInstantiation) {
              found = true;
              if (useClause.rootFile.file === this.file.file) {
                this.vhdlLinter.addMessage({
                  range: useClause.range,
                  severity: DiagnosticSeverity.Warning,
                  message: `could not find package instantiation for ${useClause.packageName}`
                });
              } else {
                this.vhdlLinter.addMessage({
                  range: obj.getRootElement().range.getLimitedRange(1),
                  severity: DiagnosticSeverity.Warning,
                  message: `could not find package instantiation for ${useClause.packageName} (in ${useClause.rootFile.file})`
                });
              }
              continue;
            }
            const uninstantiatedPackage = (packages.filter(p => p instanceof OPackage) as OPackage[]).find(p => p.lexerToken.getLText() === packageInstantiation.uninstantiatedPackageToken.text.toLowerCase());
            if (uninstantiatedPackage) {
              obj.packageDefinitions.push(uninstantiatedPackage);
              found = true;

            } else {
              this.vhdlLinter.addMessage({
                range: useClause.range,
                severity: DiagnosticSeverity.Warning,
                message: `could not find uninstantiated package of package instantiation ${packageInstantiation.lexerToken.text}.`
              });
            }
          }
          if (!found) {
            if (useClause.rootFile.file === this.file.file) {
              this.vhdlLinter.addMessage({
                range: useClause.range,
                severity: DiagnosticSeverity.Warning,
                message: `could not find package for ${useClause.library !== undefined ? `${useClause.library}.` : ''}${useClause.packageName}`
              });
            }
          }
        }
      }
    }
  }
  getSubprograms(instantiation: OInstantiation): (OSubprogram | OSubprogramAlias)[] {
    const subprograms: (OSubprogram | OSubprogramAlias)[] = [];
    const addTypes = (types: OType[], recursionCounter: number) => {
      subprograms.push(...types.flatMap(t => t.subprograms));
      if (recursionCounter > 0) {
        const children = types.flatMap(t => t.types);
        if (children.length > 0) {
          addTypes(children, recursionCounter - 1);
        }
      } else {
        throw new ParserError('Recursion Limit reached', instantiation.range);
      }
    };

    for (const [iterator] of scope(instantiation)) {
      if (implementsIHasSubprograms(iterator)) {
        subprograms.push(...iterator.subprograms);
      }
      if (implementsIHasSubprogramAlias(iterator)) {
        subprograms.push(...iterator.subprogramAliases);
      }
      if (implementsIHasTypes(iterator)) {
        addTypes(iterator.types, 500);
      }
    }
    // Direct call via library.package.function
    if (instantiation.library !== undefined && instantiation.package !== undefined) {
      subprograms.push(...this.vhdlLinter.projectParser.packages.filter(pkg => pkg.lexerToken.getLText() === instantiation.package?.text.toLowerCase()).map(pkg => pkg.subprograms).flat());
    }
    return subprograms.filter(e => e.lexerToken.getLText() === instantiation.componentName.getLText());
  }
  getComponents(instantiation: OInstantiation): OComponent[] {
    const components: OComponent[] = [];
    if (instantiation.type !== 'component') {
      return components;
    }
    // find all defined components in current scope
    for (const [iterator] of scope(instantiation)) {
      if (implementsIHasComponents(iterator)) {
        components.push(...iterator.components);
      }
    }
    const name = instantiation.componentName;
    return components.filter(e => e.lexerToken.getLText() === name.text.toLowerCase());
  }
  // TODO: To fit with the style of packages and architectures I think this should be linked during elaboration
  getEntities(instantiation: OInstantiation | OComponent): OEntity[] {
    const entities: OEntity[] = [];
    if (instantiation instanceof OInstantiation && instantiation.type === 'component') {
      return [];
    }
    // find project entities
    const projectEntities = this.vhdlLinter.projectParser.entities;
    if (instantiation instanceof OInstantiation && typeof instantiation.library !== 'undefined' && instantiation.library.getLText() !== 'work') {
      entities.push(...projectEntities.filter(entity => {
        if (typeof entity.targetLibrary !== 'undefined') {
          return entity.targetLibrary.toLowerCase() === instantiation.library?.getLText() ?? '';
        }
        return true;

      }));
    } else {
      entities.push(...projectEntities);
    }
    const name = (instantiation instanceof OInstantiation) ? instantiation.componentName : instantiation.lexerToken;
    return entities.filter(e => e.lexerToken.getLText() === name.text.toLowerCase());
  }



}