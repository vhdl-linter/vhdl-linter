import { findBestMatch } from 'string-similarity';
import {
  CodeAction, CodeActionKind, CodeLens,
  Command, Diagnostic, DiagnosticSeverity, Position, Range, TextEdit
} from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { CancelationError, CancelationObject, getDocumentSettings } from './language-server';
import {
  IHasContextReference, IHasLexerToken, IHasUseClauses, implementsIHasConstants, implementsIHasContextReference,
  implementsIHasInstantiations, implementsIHasLexerToken, implementsIHasSignals, implementsIHasSubprograms,
  implementsIHasTypes, implementsIHasUseClause, implementsIHasVariables, implementsIReferencable, MagicCommentType,
  OArchitecture, OAssociation, OAssociationFormal, OAssociationList, ObjectBase, OCase, OComponent, OConstant, OEntity,
  OFile, OGeneric, OGenericAssociationList, OHasSequentialStatements, OI, OIf, OInstantiation, OIRange, OPackage,
  OPackageBody, OPort, OPortAssociationList, OProcess, ORead, OSignal, OSubprogram, OReference, OType,
  OVariable, OWrite, ParserError, implementsIHasLibraries, implementsIHasLibraryReference, OSelectedNameRead,
  implementsIHasPorts, implementsIHasGenerics, implementsIHasPackageInstantiations, scope, OTypeMark, implementsIHasSubprogramAlias, OSubprogramAlias
} from './parser/objects';
import { Parser } from './parser/parser';
import { ProjectParser } from './project-parser';
export enum LinterRules {
  Reset
}
export interface IAddSignalCommandArguments {
  textDocumentUri: string;
  signalName: string;
  position: OI;
}
export interface OIDiagnostic extends Diagnostic {
  range: OIRange;
}
export interface IIgnoreLineCommandArguments {
  textDocumentUri: string;
  range: Range;
}
export type diagnosticCodeActionCallback = (textDocumentUri: string) => CodeAction[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type commandCallback = (textDocumentUri: string, ...args: any[]) => TextEdit[];
export class VhdlLinter {
  messages: Diagnostic[] = [];
  file: OFile;
  parser: Parser;
  parsedSuccessfully = false;
  constructor(private editorPath: string, public text: string, public projectParser: ProjectParser,
    public onlyEntity: boolean = false, public cancelationObject: CancelationObject = { canceled: false }) {
    try {
      this.parser = new Parser(text, this.editorPath, onlyEntity, cancelationObject);
      this.file = this.parser.parse();
      this.parsedSuccessfully = true;
    } catch (e) {
      if (e instanceof ParserError) {
        let code;
        if (e.solution) {
          code = this.addCodeActionCallback((textDocumentUri: string) => {
            const actions = [];
            actions.push(CodeAction.create(
              e.solution.message,
              {
                changes: {
                  [textDocumentUri]: e.solution.edits
                }
              },
              CodeActionKind.QuickFix));
            return actions;
          });
        }

        this.messages.push({
          range: e.range,
          severity: DiagnosticSeverity.Error,
          message: e.message,
          code
        });
        this.file = new OFile(this.text, this.editorPath, this.text);
      } else {
        this.messages.push({
          range: Range.create(Position.create(0, 0), Position.create(10, 10)),
          message: `Javascript error while parsing '${e.message}'`
        });
        console.error(e);
        this.file = new OFile(this.text, this.editorPath, this.text);

      }
    }
    //     console.log(`done parsing: ${editorPath}`);

  }

  diagnosticCodeActionRegistry: diagnosticCodeActionCallback[] = [];
  addCodeActionCallback(handler: diagnosticCodeActionCallback): number {
    return this.diagnosticCodeActionRegistry.push(handler) - 1;
  }
  commandCallbackRegistry: commandCallback[] = [];
  addCommandCallback(title: string, textDocumentUri: string, handler: commandCallback): Command {
    const counter = this.commandCallbackRegistry.push(handler) - 1;
    return {
      title,
      command: 'vhdl-linter:lsp-command',
      arguments: [textDocumentUri, counter]
    };
  }
  checkMagicComments(range: OIRange, rule?: LinterRules, parameter?: string) {
    const matchingMagiComments = this.file.magicComments.filter(magicComment => {
      if (range.start.i < magicComment.range.start.i) {
        return false;
      }
      if (range.end.i > magicComment.range.end.i) {
        return false;
      }
      return true;
    }).filter(magicComment => {
      if (magicComment.commentType === MagicCommentType.Disable) {
        return true;
      }
      if (magicComment.commentType === MagicCommentType.Parameter && rule === LinterRules.Reset && typeof parameter !== 'undefined' && magicComment.parameter.find(parameterFind => parameterFind.toLowerCase() === parameter.toLowerCase())) {
        return true;
      }
      return false;
    });
    return matchingMagiComments.length === 0;
  }
  checkLibraryReferences() {
    for (const object of this.file.objectList) {
      if (implementsIHasLibraryReference(object) && object.library !== undefined) {
        const libraryReference = object.library;
        let iterator = object as ObjectBase;
        let library;
        while (iterator instanceof OFile !== true) {
          library = implementsIHasLibraries(iterator) ?
            iterator.libraries.find(library => library.lexerToken.getLText() === libraryReference.getLText()) : undefined;
          if (library) {
            break;
          }
          if (iterator.parent instanceof OFile) {
            if (iterator instanceof OArchitecture && iterator.correspondingEntity) {
              iterator = iterator.correspondingEntity;
            } else if (iterator instanceof OPackageBody && iterator.correspondingPackage) {
              iterator = iterator.correspondingPackage;
            } else {
              break;
            }
          } else {
            iterator = iterator.parent;
          }
        }
        if (library === undefined) {
          this.addMessage({
            range: object.library.range,
            severity: DiagnosticSeverity.Error,
            message: `Library ${object.library} not declared.`
          });
        }
      }
    }
  }
  addMessage(diagnostic: OIDiagnostic, rule: LinterRules, parameter: string): void;
  addMessage(diagnostic: OIDiagnostic): void;
  addMessage(diagnostic: OIDiagnostic, rule?: LinterRules, parameter?: string) {

    if (this.checkMagicComments(diagnostic.range, rule, parameter)) {
      const newCode = this.addCodeActionCallback((textDocumentUri: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actions = [] as any[];
        // [textDocumentUri]: [TextEdit.replace(Range.create(write.range.start, write.range.end), bestMatch.bestMatch.target)]
        actions.push(CodeAction.create(
          'Ignore messages on this line.',
          {
            changes: {
              [textDocumentUri]: [
                TextEdit.insert(Position.create(diagnostic.range.end.line, 1000), ' --vhdl-linter-disable-this-line')]
            }
          },
          CodeActionKind.QuickFix));
        return actions;
      });
      const codes = [];
      if (typeof diagnostic.code !== 'undefined') {
        codes.push(diagnostic.code);
      }
      codes.push(newCode);
      diagnostic.code = codes.join(';');
      this.messages.push(diagnostic);
    }

  }
  getUseClauses(parent: IHasUseClauses | IHasContextReference) {
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
      const contexts = this.projectParser.getContexts();
      for (const reference of contextReferences) {
        const context = contexts.find(c => c.lexerToken.getLText() === reference.contextName.toLowerCase());
        if (!context) {
          this.addMessage({
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

  async handleCanceled() {
    await new Promise(resolve => setImmediate(resolve));
    if (this.cancelationObject.canceled) {
      console.log('canceled');
      throw new CancelationError();
    }
  }
  async elaborateUseClauses() {

    const packages = this.projectParser.getPackages();
    const packageInstantiations = this.projectParser.getPackageInstantiations();

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
                  this.addMessage({
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
            let parent: ObjectBase | OFile = obj;
            while (parent instanceof ObjectBase) {
              if (implementsIHasPackageInstantiations(parent)) {
                pkgInstantations.push(...parent.packageInstantiations);
              }
              if (parent instanceof OArchitecture && typeof parent.correspondingEntity !== 'undefined') {
                pkgInstantations.push(...parent.correspondingEntity.packageInstantiations);
              }
              if (parent instanceof OPackageBody && typeof parent.correspondingPackage !== 'undefined') {
                pkgInstantations.push(...parent.correspondingPackage.packageInstantiations);
              }
              parent = parent.parent;
            }
            pkgInstantations.push(...parent.packageInstantiations);

            const packageInstantiation = pkgInstantations.find(inst => inst.lexerToken.getLText() === useClause.packageName.getLText());
            if (!packageInstantiation) {
              found = true;
              if (useClause.getRoot().file === this.file.file) {
                this.addMessage({
                  range: useClause.range,
                  severity: DiagnosticSeverity.Warning,
                  message: `could not find package instantiation for ${useClause.packageName}`
                });
              } else {
                this.addMessage({
                  range: obj.getRootElement().range.getLimitedRange(1),
                  severity: DiagnosticSeverity.Warning,
                  message: `could not find package instantiation for ${useClause.packageName} (in ${useClause.getRoot().file})`
                });
              }
              continue;
            }
            const uninstantiatedPackage = (packages.filter(p => p instanceof OPackage) as OPackage[]).find(p => p.lexerToken.getLText() === packageInstantiation.uninstantiatedPackageToken.text.toLowerCase());
            if (uninstantiatedPackage) {
              obj.packageDefinitions.push(uninstantiatedPackage);
              found = true;

            } else {
              this.addMessage({
                range: useClause.range,
                severity: DiagnosticSeverity.Warning,
                message: `could not find uninstantiated package of package instantiation ${packageInstantiation.lexerToken.text}.`
              });
            }
          }
          if (!found) {
            if (useClause.getRoot().file === this.file.file) {
              this.addMessage({
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
  async elaborate() {

    await this.handleCanceled();

    // const start = Date.now();
    // Map architectures to entity
    for (const architecture of this.file.architectures) {
      if (architecture.entityName === undefined) {
        continue;
      }
      // Find entity first in this file
      let entity = this.file.entities.find(entity => entity.lexerToken.getLText() === architecture.entityName?.getLText());
      if (!entity) { // Find entity in all files
        entity = this.projectParser.getEntities().find(entity => entity.lexerToken.getLText() === architecture.entityName?.getLText());
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
          pkgHeader = this.projectParser.getPackages().find(pkgHeader => pkgHeader instanceof OPackage && pkgHeader.lexerToken.getLText() === pkg.lexerToken.getLText()) as OPackage | undefined;
        }
        if (pkgHeader) {
          pkg.correspondingPackage = pkgHeader;
        } else {
          this.addMessage({
            range: pkg.range,
            severity: DiagnosticSeverity.Warning,
            message: `Can not find package for package body.`
          })
        }

      }
    }
    //     console.log(packages);
    await this.elaborateUseClauses();
    await this.handleCanceled();
    //     console.log(packages);
    for (const obj of this.file.objectList) {
      if (obj instanceof OReference) {
        obj.elaborate();
      }
    }

    // console.log(`elab: useClauses for: ${Date.now() - start} ms.`);
    // start = Date.now();
    await this.handleCanceled();



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
      for (const object of scope(read)) {
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
          for (const obj of scope(read)) {
            if (implementsIHasLibraries(obj)) {
              for (const findLibrary of obj.libraries) {
                if (findLibrary.lexerToken.getLText() == libraryToken.getLText()) {
                  library = findLibrary;
                }
              }
            }
          }
          if (library) {
            for (const pkg of this.projectParser.getPackages()) {
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
          for (const obj of scope(read)) {
            if (implementsIHasLibraries(obj)) {
              for (const findLibrary of obj.libraries) {
                if (findLibrary.lexerToken.getLText() == read.prefixTokens[0].getLText()) {
                  library = findLibrary;
                }
              }
            }
          }
          if (library) {
            for (const pkg of this.projectParser.getPackages()) {
              if (read.lexerToken.getLText() === pkg.lexerToken.getLText()) {
                read.definitions.push(pkg);
              }
            }
            for (const pkg of this.projectParser.getPackageInstantiations()) {
              if (read.lexerToken.getLText() === pkg.lexerToken.getLText()) {
                read.definitions.push(pkg);
              }
            }
          } else {
            const packages: OPackage[] = [];
            for (const obj of scope(read)) {
              if (implementsIHasPackageInstantiations(obj)) {
                for (const pkgInst of obj.packageInstantiations) {
                  if (pkgInst.lexerToken?.getLText() === read.prefixTokens[0].getLText()) {
                    const pkg = this.projectParser.getPackages().filter(pkg => pkg.lexerToken.getLText() === pkgInst.uninstantiatedPackageToken.getLText());
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
            for (const obj of scope(read)) {
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
          this.addMessage({
            range: read.range,
            severity: DiagnosticSeverity.Warning,
            message: `selected name found with ${read.prefixTokens.length} prefixes. This is unexpected.`
          });
        }
      }
    }

    // console.log(`elab: reads for: ${Date.now() - start} ms.`);
    // start = Date.now();
    await this.handleCanceled();

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
    await this.handleCanceled();

    for (const architecture of this.file.architectures) {
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
    await this.handleCanceled();

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
    await this.handleCanceled();

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

  // When the definition of an association can not be found avoid errors because actuals can not be cleanly mapped then
  async removeBrokenActuals() {
    for (const association of this.file.objectList.filter(object => object instanceof OAssociation) as OAssociation[]) {
      if (association.actualIfInput.length > 0
        && (association.actualIfOutput[0].length > 0 || association.actualIfOutput[1].length > 0)
        && (association.actualIfInoutput[0].length > 0 || association.actualIfInoutput[1].length > 0)) {
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
      }
    }
  }
  async checkLibrary() {
    const settings = await getDocumentSettings(URI.file(this.editorPath).toString());
    for (const entity of this.file.entities) {
      if (settings.rules.warnLibrary && entity !== undefined && typeof entity.targetLibrary === 'undefined') {
        this.addMessage({
          range: new OIRange(this.file, new OI(this.file, 0, 0), new OI(this.file, 1, 0)),
          severity: DiagnosticSeverity.Warning,
          message: `Please define library magic comment \n --!@library libraryName`
        });
      }
    }
  }
  async checkAll(profiling = false) {
    console.profile();
    let start;
    let i = 0;
    if (this.file) {
      start = Date.now();
      try {
        await this.elaborate();
        if (profiling) {
          console.log(`check ${i++}: ${Date.now() - start}ms`);
          start = Date.now();
        }
        await this.removeBrokenActuals();
        if (profiling) {
          console.log(`check ${i++}: ${Date.now() - start}ms`);
          start = Date.now();
        }
        await this.checkComponents();
        if (profiling) {
          console.log(`check ${i++}: ${Date.now() - start}ms`);
          start = Date.now();
        }
        await this.checkNotDeclared();
        if (profiling) {
          console.log(`check ${i++}: ${Date.now() - start}ms`);
          start = Date.now();
        }
        await this.checkLibrary();
        if (profiling) {
          console.log(`check ${i++}: ${Date.now() - start}ms`);
          start = Date.now();
        }
        this.checkAllMultipleDefinitions();
        if (profiling) {
          console.log(`check ${i++}: ${Date.now() - start}ms`);
          start = Date.now();
        }
        for (const architecture of this.file.architectures) {
          this.checkResets();
          if (profiling) {
            console.log(`check ${i++}: ${Date.now() - start}ms`);
            start = Date.now();
          }
          await this.checkUnused(architecture, architecture.correspondingEntity);
          if (profiling) {
            console.log(`check ${i++}: ${Date.now() - start}ms`);
            start = Date.now();
          }
          await this.checkPortDeclaration();
          if (profiling) {
            console.log(`check ${i++}: ${Date.now() - start}ms`);
            start = Date.now();
          }
          this.checkInstantiations(architecture);
          if (profiling) {
            console.log(`check ${i++}: ${Date.now() - start}ms`);
            start = Date.now();
          }
          await this.checkPortType();
          if (profiling) {
            console.log(`check ${i++}: ${Date.now() - start}ms`);
            start = Date.now();
          }
        }
        this.checkLibraryReferences();
        for (const pkg of this.file.packages) {
          this.checkInstantiations(pkg);
        }
        if (profiling) {
          console.log(`check ${i++}: ${Date.now() - start}ms`);
          start = Date.now();
        }
      } catch (err) {
        if (err instanceof ParserError) {
          this.messages.push(Diagnostic.create(err.range, `Error while parsing: '${err.message}'`));

        } else {
          this.messages.push(Diagnostic.create(Range.create(Position.create(0, 0), Position.create(10, 100)), `Error while checking: '${err.message}'\n${err.stack}`));

        }
      }

      // this.parser.debugObject(this.tree);
    }
    console.profileEnd();
    return this.messages;
  }
  checkComponents() {
    for (const architecture of this.file.architectures) {

      for (const component of architecture.components) {
        const entities = this.getEntities(component);
        if (entities.length === 0) {
          this.addMessage({
            range: component.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `Could not find an entity declaration for this component (${component.lexerToken})`
          });
          continue;
        }
        // list of generics (possibly multiple occurences)
        const realGenerics = entities.flatMap(e => e.generics);
        // generics not in realEntity
        for (const generic of realGenerics) {
          if (!realGenerics.find(gen => gen.lexerTokenEquals(generic))) {
            this.addMessage({
              range: generic.lexerToken.range,
              severity: DiagnosticSeverity.Error,
              message: `no generic ${generic.lexerToken.text} on entity ${component.lexerToken}`
            });
          }
        }
        // generics not in this component
        for (const generic of realGenerics) {
          if (!component.generics.find(gen => gen.lexerTokenEquals(generic))) {
            this.addMessage({
              range: component.genericRange ?? component.range,
              severity: DiagnosticSeverity.Error,
              message: `generic ${generic.lexerToken.text} is missing in this component declaration`
            });
          }
        }
        // list of ports (possibly multiple occurences)
        const realPorts = entities.flatMap(e => e.ports);
        // ports not in realEntity
        for (const port of component.ports) {
          if (!realPorts.find(p => p.lexerTokenEquals(port))) {
            this.addMessage({
              range: port.lexerToken.range,
              severity: DiagnosticSeverity.Error,
              message: `no port ${port.lexerToken.text} on entity ${component.lexerToken}`
            });
          }
        }
        // generics not in this component
        for (const port of realPorts) {
          if (!component.ports.find(p => p.lexerTokenEquals(port))) {
            this.addMessage({
              range: component.portRange ?? component.range,
              severity: DiagnosticSeverity.Error,
              message: `port ${port.lexerToken.text} is missing in this component declaration`
            });
          }
        }
      }
    }
  }

  checkMultipleDefinitions(objList: ObjectBase[]) {
    for (const obj of objList) {
      if (implementsIHasLexerToken(obj) && objList.find(o => {
        if (obj !== o && obj.lexerTokenEquals(o)) {
          if (obj instanceof OType && o instanceof OType) {
            if ((obj.protected && o.protectedBody) || (obj.protectedBody && o.protected)) {
              return false;
            }
          }
          return true;
        }
        return false;
      }
      )) {
        this.addMessage({
          range: obj.range,
          severity: DiagnosticSeverity.Error,
          message: `${obj.lexerToken.text} defined multiple times`
        });
      }
    }
  }
  checkAllMultipleDefinitions() {
    const extractObjects = (obj: ObjectBase) => {
      const objList = [];
      if (implementsIHasSignals(obj)) {
        objList.push(...obj.signals);
      }
      if (implementsIHasVariables(obj)) {
        objList.push(...obj.variables);
      }
      if (implementsIHasConstants(obj)) {
        objList.push(...obj.constants);
      }
      // subprograms can be overloaded
      if (implementsIHasTypes(obj)) {
        for (const type of obj.types) {
          if (type.alias) { // Aliases can be overloaded like subprograms.
            continue;
          }
          if (type.incomplete) { // Incomplete types can be overloaded
            continue;
          }
          objList.push(type);
        }
      }
      if (implementsIHasInstantiations(obj)) {
        objList.push(...obj.instantiations);
      }
      if (implementsIHasPorts(obj)) {
        objList.push(...obj.ports);
      }
      if (implementsIHasGenerics(obj)) {
        objList.push(...obj.generics);
      }
      if (obj instanceof OArchitecture) {
        objList.push(...obj.blocks);
        objList.push(...obj.generates);
        objList.push(...obj.processes);
      }
      return objList;
    }
    for (const obj of this.file.objectList) {
      const objList: ObjectBase[] = [];
      objList.push(...extractObjects(obj));
      if (obj instanceof OArchitecture && obj.correspondingEntity) {
        objList.push(...extractObjects(obj.correspondingEntity));
      }
      if (obj instanceof OPackageBody && obj.correspondingPackage) {
        objList.push(...obj.correspondingPackage.generics);
      }
      this.checkMultipleDefinitions(objList);
    }
  }
  private pushNotDeclaredError(token: ORead | OWrite) {
    const code = this.addCodeActionCallback((textDocumentUri: string) => {
      const actions = [];
      for (const o of this.file.objectList) {
        if (implementsIHasUseClause(o)) {
          for (const pkg of o.packageDefinitions) {
            const thing = pkg.constants.find(constant => constant.lexerToken.getLText() === token.lexerToken.getLText()) || pkg.types.find(type => type.lexerToken.getLText() === token.lexerToken.getLText())
              || pkg.subprograms.find(subprogram => subprogram.lexerToken.getLText() === token.lexerToken.getLText());
            if (thing) {
              const architecture = token.getRootElement();
              const pos = Position.create(0, 0);
              if (architecture && architecture.useClauses.length > 0) {
                pos.line = architecture.useClauses[architecture.useClauses.length - 1].range.end.line + 1;
              }
              actions.push(CodeAction.create(
                'add use statement for ' + pkg.lexerToken,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.insert(pos, `use ${pkg.targetLibrary ? pkg.targetLibrary : 'work'}.${pkg.lexerToken}.all;\n`)]
                  }
                },
                CodeActionKind.QuickFix
              ));
            }
          }
        }
      }
      for (const architecture of this.file.architectures) {
        const args: IAddSignalCommandArguments = { textDocumentUri, signalName: token.lexerToken.text, position: architecture.endOfDeclarativePart ?? architecture.range.start };
        actions.push(CodeAction.create(
          'add signal to architecture',
          Command.create('add signal to architecture', 'vhdl-linter:add-signal', args),
          CodeActionKind.QuickFix));
      }
      const possibleMatches = this.file.objectList
        .filter(obj => typeof obj !== 'undefined' && implementsIHasLexerToken(obj))
        .map(obj => (obj as IHasLexerToken).lexerToken.text);
      const bestMatch = findBestMatch(token.lexerToken.text, possibleMatches);
      if (bestMatch.bestMatch.rating > 0.5) {
        actions.push(CodeAction.create(
          `Replace with ${bestMatch.bestMatch.target} (score: ${bestMatch.bestMatch.rating})`,
          {
            changes: {
              [textDocumentUri]: [TextEdit.replace(Range.create(token.range.start, token.range.end), bestMatch.bestMatch.target)]
            }
          },
          CodeActionKind.QuickFix));
      }
      return actions;
    });
    this.addMessage({
      code,
      range: token.range,
      severity: DiagnosticSeverity.Error,
      message: `signal '${token.lexerToken.text}' is ${token instanceof ORead ? 'read' : 'written'} but not declared`
    });
  }
  private pushAssociationError(read: OAssociationFormal) {
    const code = this.addCodeActionCallback((textDocumentUri: string) => {
      const actions = [];
      for (const o of this.file.objectList) {
        if (implementsIHasUseClause(o)) {
          for (const pkg of o.packageDefinitions) {
            const thing = pkg.constants.find(constant => constant.lexerToken.getLText() === read.lexerToken.getLText()) || pkg.types.find(type => type.lexerToken.getLText() === read.lexerToken.getLText())
              || pkg.subprograms.find(subprogram => subprogram.lexerToken.getLText() === read.lexerToken.getLText());
            if (thing) {
              const architecture = read.getRootElement();
              const pos = Position.create(0, 0);
              if (architecture && architecture.useClauses.length > 0) {
                pos.line = architecture.useClauses[architecture.useClauses.length - 1].range.end.line + 1;
              }
              actions.push(CodeAction.create(
                'add use statement for ' + pkg.lexerToken,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.insert(pos, `use ${pkg.targetLibrary ? pkg.targetLibrary : 'work'}.${pkg.lexerToken}.all;\n`)]
                  }
                },
                CodeActionKind.QuickFix
              ));
            }
          }
        }
      }

      return actions;
    });
    this.addMessage({
      range: read.range,
      code: code,
      severity: DiagnosticSeverity.Error,
      message: `port '${read.lexerToken.text}' does not exist`
    });
  }
  checkNotDeclared() {
    for (const obj of this.file.objectList) {
      if ((obj instanceof ORead || obj instanceof OWrite) && obj.definitions.length === 0) {
        this.pushNotDeclaredError(obj);
      } else if (obj instanceof OAssociationFormal && obj.definitions.length === 0) {
        const instOrPackage = obj.parent.parent.parent;
        // if instantiations entity/component/subprogram is not found, don't report read errors
        if (instOrPackage instanceof OInstantiation && instOrPackage.definitions.length > 0) {
          this.pushAssociationError(obj);
        }
      }
    }
  }
  getCodeLens(textDocumentUri: string): CodeLens[] {
    let signalLike: OSignal[] = [];
    for (const architecture of this.file.architectures) {
      signalLike = signalLike.concat(architecture.signals);
    }
    for (const entity of this.file.entities) {
      signalLike = signalLike.concat(entity.ports);
    }
    const signalsMissingReset = signalLike.filter(signal => {
      if (typeof signal.registerProcess === 'undefined') {
        return false;
      }
      for (const reset of signal.registerProcess.getResets()) {
        if (reset.toLowerCase() === signal.lexerToken.getLText()) {
          return false;
        }
      }
      return this.checkMagicComments(signal.registerProcess.range, LinterRules.Reset, signal.lexerToken.text);
    });
    if (signalsMissingReset.length === 0) {
      return [];
    }
    const registerProcessMap = new Map<OProcess, OSignal[]>();
    for (const signal of signalsMissingReset) {
      const registerProcess = signal.registerProcess;
      if (typeof registerProcess === 'undefined') {
        continue;
      }
      let registerProcessList = registerProcessMap.get(registerProcess);
      if (!registerProcessList) {
        registerProcessList = [];
        registerProcessMap.set(registerProcess, registerProcessList);
      }
      registerProcessList.push(signal);
    }
    const codeLenses: CodeLens[] = [];
    for (const [registerProcess, signalLikes] of registerProcessMap.entries()) {
      const registerNameList = signalLikes.map(signalLike => signalLike.lexerToken.text).join(' ');
      codeLenses.push({
        range: registerProcess.range,
        command: this.addCommandCallback('Ignore all missing resets in process ' + registerProcess.label, textDocumentUri, () => {
          const change = this.file.originalText.split('\n')[registerProcess.range.start.line - 1].match(/--\s*vhdl-linter-parameter-next-line/i) === null ?
            TextEdit.insert(registerProcess.range.start, `--vhdl-linter-parameter-next-line ${registerNameList}\n` + ' '.repeat(registerProcess.range.start.character)) :
            TextEdit.insert(Position.create(registerProcess.range.start.line - 1, this.file.originalText.split('\n')[registerProcess.range.start.line - 1].length), ` ${registerNameList}`);
          return [change];
        })
        // {
        //   changes: {
        //     [textDocumentUri]: [change]
        //   }
        // },
        // CodeActionKind.QuickFix
      });
    }
    return codeLenses;

  }
  checkResets() {
    for (const architecture of this.file.architectures) {
      let signalLike: OSignal[] = architecture.signals;
      if (architecture.correspondingEntity !== undefined) {
        signalLike = signalLike.concat(architecture.correspondingEntity.ports);
      }
      for (const signal of signalLike) {
        for (const obj of scope(signal)) {
          if (obj instanceof OProcess && obj.registerProcess) {
            signal.registerProcess = obj;
            break;
          }
        }
        if (typeof signal.registerProcess === 'undefined') {
          continue;
        }
        const registerProcess = signal.registerProcess;
        let resetFound = false;
        for (const reset of registerProcess.getResets()) {
          if (reset.toLowerCase() === signal.lexerToken.getLText()) {
            resetFound = true;
          }
        }
        if (!resetFound) {
          const code = this.addCodeActionCallback((textDocumentUri: string) => {
            const actions = [];

            const change = this.file.originalText.split('\n')[registerProcess.range.start.line - 1].match(/--\s*vhdl-linter-parameter-next-line/i) === null ?
              TextEdit.insert(registerProcess.range.start, `--vhdl-linter-parameter-next-line ${signal.lexerToken.text}\n` + ' '.repeat(registerProcess.range.start.character)) :
              TextEdit.insert(Position.create(registerProcess.range.start.line - 1, this.file.originalText.split('\n')[registerProcess.range.start.line - 1].length), ` ${signal.lexerToken.text}`);
            actions.push(CodeAction.create(
              'Ignore reset for ' + signal.lexerToken,
              {
                changes: {
                  [textDocumentUri]: [change]
                }
              },
              CodeActionKind.QuickFix
            ));
            let resetValue = null;
            if (signal.type.map(read => read.lexerToken.text).join(' ').match(/^std_u?logic_vector|unsigned|signed/i)) {
              resetValue = `(others => '0')`;
            } else if (signal.type.map(read => read.lexerToken.text).join(' ').match(/^std_u?logic/i)) {
              resetValue = `'0'`;
            } else if (signal.type.map(read => read.lexerToken.text).join(' ').match(/^integer|natural|positive/i)) {
              resetValue = `0`;
            }
            if (resetValue !== null && typeof registerProcess.resetClause !== 'undefined') {
              const positionStart = Position.create(registerProcess.resetClause.range.start.line, registerProcess.resetClause.range.start.character);
              positionStart.line++;
              const indent = positionStart.character + 2;
              positionStart.character = 0;
              actions.push(CodeAction.create(
                'Add reset for ' + signal.lexerToken,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.insert(positionStart, ' '.repeat(indent) + `${signal.lexerToken} <= ${resetValue};\n`)]
                  }
                },
                CodeActionKind.QuickFix
              ));
            }
            return actions;
          });
          const range = registerProcess.range.getLimitedRange(1);
          const message = `Reset '${signal.lexerToken}' missing`;
          this.addMessage({
            range,
            code,
            severity: DiagnosticSeverity.Warning,
            message
          }, LinterRules.Reset, signal.lexerToken.text);
        }
      }
    }

  }

  private checkUnusedPorts(ports: OPort[]) {
    for (const port of ports) {
      if (port.parent instanceof OSubprogram && port.parent.hasBody === false) { // For empty procedures/function the ports can not be used
        continue;
      }
      if ((port.direction === 'in' || port.direction === 'inout') && port.references.filter(token => token instanceof ORead).length === 0) {
        this.addMessage({
          range: port.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not reading input port '${port.lexerToken}'`
        });
      }
      const writes = port.references.filter(token => token instanceof OWrite);
      if ((port.direction === 'out' || port.direction === 'inout') && writes.length === 0) {
        this.addMessage({
          range: port.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not writing output port '${port.lexerToken}'`
        });
      }
    }
  }

  private async checkUnused(architecture: OArchitecture, entity?: OEntity) {
    const settings = (await getDocumentSettings(URI.file(this.editorPath).toString()));
    if (!architecture) {
      return;
    }

    const unusedSignalRegex = new RegExp(settings.style.unusedSignalRegex);
    if (entity) {
      this.checkUnusedPorts(entity.ports);
      for (const generic of entity.generics) {
        if (unusedSignalRegex.exec(generic.lexerToken.text) === null && generic.references.filter(token => token instanceof ORead).length === 0) {
          this.addMessage({
            range: generic.range,
            severity: DiagnosticSeverity.Warning,
            message: `Not reading generic '${generic.lexerToken}'`
          });
        }
        for (const write of generic.references.filter(token => token instanceof OWrite)) {
          this.addMessage({
            range: write.range,
            severity: DiagnosticSeverity.Error,
            message: `Generic ${generic.lexerToken} cannot be written`
          });
        }
      }
    }
    for (const type of architecture.types) {
      if (unusedSignalRegex.exec(type.lexerToken.text) === null && type.references.length === 0) {
        this.addMessage({
          range: type.lexerToken.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not using type ${type.lexerToken.text}`
        });
      }
    }
    for (const component of architecture.components) {
      if (unusedSignalRegex.exec(component.lexerToken.text) === null && component.references.length === 0) {
        this.addMessage({
          range: component.lexerToken.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not using component ${component.lexerToken.text}`
        });
      }
    }
    for (const signal of architecture.getRoot().objectList.filter(object => object instanceof OSignal) as OSignal[]) {
      if (unusedSignalRegex.exec(signal.lexerToken.text) === null && signal.references.filter(token => token instanceof ORead).length === 0) {
        this.addMessage({
          range: signal.lexerToken.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not reading signal '${signal.lexerToken}'`
        });
      }
      const writes = signal.references.filter(token => token instanceof OWrite);
      if (unusedSignalRegex.exec(signal.lexerToken.text) === null && writes.length === 0) {
        this.addMessage({
          range: signal.lexerToken.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not writing signal '${signal.lexerToken}'`
        });
      } else if (settings.rules.warnMultipleDriver && writes.length > 1) {
        // check for multiple drivers
        const writeScopes = writes.map(write => {
          // checked scopes are: OArchitecture, OProcess, OInstatiation (only component and entity)
          let scope: ObjectBase | OFile = write.parent;
          while (!(scope instanceof OArchitecture
            || scope instanceof OFile
            || scope instanceof OProcess)) {
            if (scope instanceof OInstantiation && (scope.type === 'component' || scope.type === 'entity')) {
              break;
            }
            scope = scope.parent;
          }
          return { scope, write };
        });
        const filteredScopes = writeScopes.filter((v, i, a) => a.findIndex(x => x.scope === v.scope) === i);

        const ignoreAction = this.addCodeActionCallback((textDocumentUri: string) => {
          return [
            CodeAction.create(
              `Ignore multiple drivers of ${signal.lexerToken.text}`,
              Command.create(
                `Ignore multiple drivers of ${signal.lexerToken.text}`,
                'vhdl-linter:ignore-line',
                { textDocumentUri, range: signal.lexerToken.range }
              ),
              CodeActionKind.QuickFix
            )
          ];
        });
        if (filteredScopes.length > 1 && this.checkMagicComments(signal.lexerToken.range)) {
          this.addMessage({
            code: ignoreAction,
            range: signal.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `'${signal.lexerToken}' has multiple drivers (e.g. lines ${filteredScopes.map(s => `${s.write.range.start.line}`).join(', ')}).`
          });
          for (const write of writeScopes) {
            this.addMessage({
              code: ignoreAction,
              range: write.write.range,
              severity: DiagnosticSeverity.Warning,
              message: `Driver of multiple driven signal '${signal.lexerToken}'.`
            });
          }
        } else if (filteredScopes.length === 1 && writes.length > 1 && !(filteredScopes[0].scope instanceof OProcess) && this.checkMagicComments(signal.lexerToken.range)) {
          // if multiple writes in the architecture or one instantiation
          this.addMessage({
            code: ignoreAction,
            range: signal.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `'${signal.lexerToken}' has ${writes.length} drivers (lines ${writeScopes.map(s => `${s.write.range.start.line}`).join(', ')}).`
          });
          for (const write of writeScopes) {
            this.addMessage({
              code: ignoreAction,
              range: write.write.range,
              severity: DiagnosticSeverity.Warning,
              message: `Driver of multiple driven signal '${signal.lexerToken}'.`
            });
          }
        }
      }
    }
    for (const variable of architecture.getRoot().objectList.filter(object => object instanceof OVariable) as OVariable[]) {
      if (unusedSignalRegex.exec(variable.lexerToken.text) === null && variable.references.filter(token => token instanceof ORead).length === 0) {
        this.addMessage({
          range: variable.lexerToken.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not reading variable '${variable.lexerToken}'`
        });
      }
      const writes = variable.references.filter(token => token instanceof OWrite);
      if (unusedSignalRegex.exec(variable.lexerToken.text) === null && writes.length === 0) {
        if (variable.type[0]?.definitions?.[0] instanceof OType) {
          // This is protected type. Assume protected type has side-effect and does not net writting to.
        } else {
          this.addMessage({
            range: variable.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `Not writing variable '${variable.lexerToken}'`
          });

        }
      }
    }
    for (const constant of architecture.getRoot().objectList.filter(object => object instanceof OConstant) as OConstant[]) {
      if (unusedSignalRegex.exec(constant.lexerToken.text) === null && constant.references.filter(token => token instanceof ORead).length === 0) {
        this.addMessage({
          range: constant.lexerToken.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not reading constant '${constant.lexerToken}'`
        });
      }
      for (const write of constant.references.filter(token => token instanceof OWrite)) {
        this.addMessage({
          range: write.range,
          severity: DiagnosticSeverity.Error,
          message: `Constant ${constant.lexerToken} cannot be written`
        });
      }
    }
    for (const subprogram of architecture.getRoot().objectList.filter(object => object instanceof OSubprogram) as OSubprogram[]) {
      this.checkUnusedPorts(subprogram.ports);
    }
  }
  async checkPortDeclaration() {
    for (const entity of this.file.entities) {

      const portSettings = (await getDocumentSettings(URI.file(this.editorPath).toString())).ports;
      if (portSettings.enablePortStyle) {

        for (const port of entity.ports ?? []) {
          if (port.direction === 'in') {
            if (port.lexerToken.text.match(new RegExp(portSettings.outRegex, 'i'))) {
              const code = this.addCodeActionCallback((textDocumentUri: string) => {
                const actions = [];
                const newName = port.lexerToken.text.replace(new RegExp(portSettings.outRegex, 'i'), 'i_');
                actions.push(CodeAction.create(
                  `Replace portname with '${newName}`,
                  {
                    changes: {
                      [textDocumentUri]: [TextEdit.replace(port.lexerToken.range, newName)]
                    }
                  },
                  CodeActionKind.QuickFix));
                actions.push(CodeAction.create(
                  `Change port name.`,
                  {
                    changes: {
                      [textDocumentUri]: [TextEdit.replace(port.directionRange, 'out')]
                    }
                  },
                  CodeActionKind.QuickFix));
                return actions;
              });
              this.addMessage({
                range: port.range,
                severity: DiagnosticSeverity.Error,
                message: `input port '${port.lexerToken}' matches output regex ${portSettings.outRegex}`,
                code
              });
            } else if (port.lexerToken.text.match(new RegExp(portSettings.inRegex, 'i')) === null) {
              const code = this.addCodeActionCallback((textDocumentUri: string) => {
                const actions = [];
                const newName = port.lexerToken.text.replace(/^(._|_?)/, 'i_');
                actions.push(CodeAction.create(
                  `Replace portname with '${newName}`,
                  {
                    changes: {
                      [textDocumentUri]: [TextEdit.replace(port.lexerToken.range, newName)]
                    }
                  },
                  CodeActionKind.QuickFix));
                return actions;
              });
              this.addMessage({
                range: port.range,
                severity: DiagnosticSeverity.Information,
                message: `input port '${port.lexerToken}' should match input regex ${portSettings.inRegex}`,
                code
              });
            }
          } else if (port.direction === 'out') {
            if (port.lexerToken.text.match(new RegExp(portSettings.inRegex, 'i'))) {
              const code = this.addCodeActionCallback((textDocumentUri: string) => {
                const actions = [];
                const newName = port.lexerToken.text.replace(/^i_/, 'o_');
                actions.push(CodeAction.create(
                  `Replace portname with '${newName}`,
                  {
                    changes: {
                      [textDocumentUri]: [TextEdit.replace(port.lexerToken.range, newName)]
                    }
                  },
                  CodeActionKind.QuickFix));
                actions.push(CodeAction.create(
                  `Change port name.`,
                  {
                    changes: {
                      [textDocumentUri]: [TextEdit.replace(port.directionRange, 'in')]
                    }
                  },
                  CodeActionKind.QuickFix));
                return actions;
              });
              this.addMessage({
                range: port.range,
                severity: DiagnosticSeverity.Error,
                message: `ouput port '${port.lexerToken}' matches input regex ${portSettings.inRegex}`,
                code
              });
            } else if (port.lexerToken.text.match(new RegExp(portSettings.outRegex, 'i')) === null) {
              const code = this.addCodeActionCallback((textDocumentUri: string) => {
                const actions = [];
                const newName = port.lexerToken.text.replace(/^(._|_?)/, 'o_');
                actions.push(CodeAction.create(
                  `Replace portname with '${newName}`,
                  {
                    changes: {
                      [textDocumentUri]: [TextEdit.replace(port.lexerToken.range, newName)]
                    }
                  },
                  CodeActionKind.QuickFix));
                return actions;
              });
              this.addMessage({
                code,
                range: port.lexerToken.range,
                severity: DiagnosticSeverity.Information,
                message: `ouput port '${port.lexerToken}' should match output regex ${portSettings.outRegex}`
              });
            }
          }
        }
      }
    }
  }
  async checkPortType() {
    for (const entity of this.file.entities) {

      const settings = (await getDocumentSettings(URI.file(this.editorPath).toString()));
      if (settings.rules.warnLogicType) {
        for (const port of entity.ports) {
          if ((settings.style.preferedLogicType === 'std_logic' && port.type[0]?.lexerToken?.text?.match(/^std_ulogic/i))
            || (settings.style.preferedLogicType === 'std_ulogic' && port.type[0]?.lexerToken?.text?.match(/^std_logic/i))) {
            const match = port.type[0].lexerToken.text.match(/^std_u?logic/i);
            if (match) {
              const replacement = port.type[0].lexerToken.text.replace(match[0], settings.style.preferedLogicType);
              const code = this.addCodeActionCallback((textDocumentUri: string) => {
                const actions = [];
                actions.push(CodeAction.create(
                  `Replace with ${replacement}`,
                  {
                    changes: {
                      [textDocumentUri]: [TextEdit.replace(port.type[0].range
                        , replacement)]
                    }
                  },
                  CodeActionKind.QuickFix));
                return actions;
              });
              this.addMessage({
                range: port.type[0].range,
                severity: DiagnosticSeverity.Information,
                message: `Port should be ${replacement} but is ${port.type[0].lexerToken.text}`,
                code
              });
            }
          }
        }
      }
    }
  }
  getEntities(instantiation: OInstantiation | OComponent): OEntity[] {
    const entities: OEntity[] = [];
    if (instantiation instanceof OInstantiation && instantiation.type === 'component') {
      return [];
    }
    // find project entities
    const projectEntities = this.projectParser.getEntities();
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
  getPackages(object: ObjectBase) {
    const packages = [];
    for (const iterator of scope(object)) {
      if (implementsIHasUseClause(iterator)) {
        packages.push(...iterator.packageDefinitions);
      }
    }
    return packages;
  }
  getComponents(instantiation: OInstantiation): OComponent[] {
    const components: OComponent[] = [];
    if (instantiation.type !== 'component') {
      return components;
    }
    // find all defined components in current scope
    let parent: ObjectBase | OFile | undefined = instantiation.parent;
    if (!parent) {
      throw new Error('Error in getComponents');
    }
    while (parent instanceof ObjectBase) {
      if (parent instanceof OArchitecture) {
        components.push(...parent.components);
      }
      parent = parent.parent;
    }
    // find project components

    const projectComponents = this.getPackages(instantiation).flatMap(pkg => (pkg instanceof OPackage) ? pkg.components : []);
    components.push(...projectComponents);
    const name = instantiation.componentName;
    return components.filter(e => e.lexerToken.getLText() === name.text.toLowerCase());
  }

  getSubprograms(instantiation: OInstantiation) {
    const subprograms: (OSubprogram | OSubprogramAlias)[] = [];
    // find all defined subprograms in current scope
    for (const parent of scope(instantiation)) {
      if (implementsIHasSubprograms(parent)) {
        subprograms.push(...parent.subprograms);
      }
      if (implementsIHasSubprogramAlias(parent)) {
        subprograms.push(...parent.subprogramAliases);
      }
      if (parent instanceof OPackageBody && parent.correspondingPackage) {
        subprograms.push(...parent.correspondingPackage.subprograms);
      }
      if (instantiation.package) {
        if (implementsIHasVariables(parent)) {
          for (const variable of parent.variables) {
            // if (variable.shared) { // TODO: Does not have to be shared to be protected
              const type = variable.type[0].definitions[0] as OType;
              subprograms.push(...type.subprograms);
              subprograms.push(...type.subprogramAliases);
            // }
          }
        }
      }
    }
    // find project subprograms
    // in packages
    let recursionCounter = 5000;
    const addTypes = (types: OType[]) => {
      subprograms.push(...types.flatMap(t => t.subprograms));
      recursionCounter--;
      if (recursionCounter > 0) {
        const children = types.flatMap(t => t.types);
        if (children.length > 0) {
          addTypes(children);
        }
      } else {
        throw new ParserError('Recursion Limit reached', instantiation.range);
      }
    };

    for (const pkg of this.getPackages(instantiation)) {
      subprograms.push(...pkg.subprograms);
      subprograms.push(...pkg.subprogramAliases);
      addTypes(pkg.types);
    }
    // in entities
    subprograms.push(...this.projectParser.getEntities().flatMap(ent => ent.subprograms));
    if (instantiation.library !== undefined && instantiation.package !== undefined) {
      subprograms.push(...this.projectParser.getPackages().filter(pkg => pkg.lexerToken.getLText() === instantiation.package?.text.toLowerCase()).map(pkg => pkg.subprograms).flat());

    }
    return subprograms.filter(e => e.lexerToken.getLText() === instantiation.componentName.getLText());
  }

  checkAssociations(availableInterfaceElements: (OPort | OGeneric | OTypeMark)[][], associationList: OAssociationList | undefined, typeName: string, range: OIRange, kind: 'port' | 'generic') {
    const availableInterfaceElementsFlat = availableInterfaceElements.flat().filter((v, i, self) => self.findIndex(o => o.lexerTokenEquals(v)) === i);
    const foundElements: (OPort | OGeneric | OTypeMark)[] = [];
    let elementsWithoutFormal = false;
    let allElementsWithoutFormal = true;
    if (associationList) {
      for (const association of associationList.children) {
        if (association.formalPart.length === 0) {
          elementsWithoutFormal = true;
          continue;
        }
        allElementsWithoutFormal = false;
        const interfaceElement = availableInterfaceElementsFlat.find(port => {
          for (const part of association.formalPart) {
            if (port instanceof OTypeMark) {
              return false;
            }
            if (part.lexerToken.getLText() === port.lexerToken.getLText()) {
              return true;
            }
          }
          return false;
        });
        if (!interfaceElement) {
          let code: number | undefined = undefined;
          const possibleMatches = availableInterfaceElementsFlat.filter(implementsIHasLexerToken).map(element => (element as IHasLexerToken).lexerToken.text);
          if (possibleMatches.length > 0) {
            const bestMatch = findBestMatch(association.formalPart[0].lexerToken.text, possibleMatches);
            code = this.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              actions.push(CodeAction.create(
                `Replace with ${bestMatch.bestMatch.target} (score: ${bestMatch.bestMatch.rating})`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(Range.create(association.formalPart[0].range.start, association.formalPart[association.formalPart.length - 1].range.end)
                      , bestMatch.bestMatch.target)]
                  }
                },
                CodeActionKind.QuickFix));
              return actions;
            });
          }
          this.addMessage({
            range: association.range,
            severity: DiagnosticSeverity.Error,
            message: `no ${kind} ${association.formalPart.map(name => name.lexerToken.text).join(', ')} on ${typeName}`,
            code
          });
        } else {
          foundElements.push(interfaceElement);
        }
      }
    }
    if (allElementsWithoutFormal) {
      const counts = [...new Set(availableInterfaceElements.flatMap(elements => {
        const totalLength = elements.length;
        // TODO: This assumes all SubprogramAlias Parameters are optional. This actually depends on the function definition
        const withDefault = elements.filter(p => (p instanceof OTypeMark) || p.defaultValue !== undefined).length;
        const result = [];
        for (let i = totalLength; i >= totalLength - withDefault; i--) {
          result.push(i);
        }
        return result;
      }))].sort((a, b) => a - b);
      const actualCount = associationList?.children.length ?? 0;
      if (!counts.includes(actualCount)) {
        let portCountString: string;
        if (counts.length > 1) {
          const last = counts.pop();
          portCountString = `${counts.join(', ')} or ${last}`;
        } else {
          portCountString = `${counts[0]}`;
        }
        this.addMessage({
          range: range,
          severity: DiagnosticSeverity.Error,
          message: `Got ${actualCount} ${kind}s but expected ${portCountString} ${kind}s.`
        });
      }
    } else {
      if (elementsWithoutFormal) {
        this.addMessage({
          range: range,
          severity: DiagnosticSeverity.Warning,
          message: `some ${kind}s have no formal part while others have. Associations are not verified accurately.`
        });
      } else {
        // check which interfaceElements are missing from the different possible interfaces
        const missingElements: (OPort | OGeneric)[][] = availableInterfaceElements.map(_interface => {
          const missing: (OPort | OGeneric)[] = [];
          for (const element of _interface) {
            if (((element instanceof OPort && element.direction === 'in') || element instanceof OGeneric)
              && typeof element.defaultValue === 'undefined'
              && typeof foundElements.find(search => search.lexerTokenEquals(element)) === 'undefined') {
              missing.push(element);
            }
          }
          return missing;
        });
        // if one interface has no missing elements, don't add a message
        if (!missingElements.find(elements => elements.length === 0)) {
          const elementString = [...new Set(missingElements.map(elements => elements.map(e => e.lexerToken.text).join(', ')))].join(') or (');
          this.addMessage({
            range: range,
            severity: DiagnosticSeverity.Warning,
            message: `${kind} map is incomplete: ${kind}s (${elementString}) are missing.`
          });
        }
      }
    }
  }

  checkInstantiations(object: ObjectBase) {
    if (!object) {
      return;
    }
    if (implementsIHasInstantiations(object)) {
      for (const instantiation of object.instantiations) {
        let definitions: (OComponent | OEntity | OSubprogram | OSubprogramAlias)[] = [];
        switch (instantiation.type) {
          case 'component':
            definitions = this.getComponents(instantiation);
            break;
          case 'entity':
            definitions = this.getEntities(instantiation);
            break;
          case 'subprogram':
            definitions = this.getSubprograms(instantiation);
            break;
        }
        if (definitions.length === 0) {
          this.addMessage({
            range: instantiation.range.start.getRangeToEndLine(),
            severity: DiagnosticSeverity.Warning,
            message: `can not find ${instantiation.type} ${instantiation.componentName}`
          });
        } else {
          const range = instantiation.range.start.getRangeToEndLine();
          const availablePorts = definitions.map(e => {
            if (implementsIHasPorts(e)) {
              return e.ports
            }
            if (e instanceof OSubprogramAlias) {
              return e.typeMarks;
            }
            return [];
          });
          this.checkAssociations(availablePorts, instantiation.portAssociationList, instantiation.type, range, 'port');
          const availableGenerics = definitions.map(d => (d instanceof OComponent || d instanceof OEntity) ? d.generics : []);
          this.checkAssociations(availableGenerics, instantiation.genericAssociationList, instantiation.type, range, 'generic');
        }
      }
    }
    if (implementsIHasSubprograms(object)) {
      for (const subprograms of object.subprograms) {
        this.checkInstantiations(subprograms);
      }
    }
    if (object instanceof OArchitecture) {
      for (const statement of object.statements) {
        this.checkInstantiations(statement);
      }
    }
    if (object instanceof OIf) {
      for (const clause of object.clauses) {
        this.checkInstantiations(clause);
      }
      if (object.else) {
        this.checkInstantiations(object.else);
      }
    }
    if (object instanceof OCase) {
      for (const clause of object.whenClauses) {
        this.checkInstantiations(clause);
      }
    }
    if (object instanceof OHasSequentialStatements) {
      for (const cases of object.cases) {
        this.checkInstantiations(cases);
      }
      for (const assignments of object.assignments) {
        this.checkInstantiations(assignments);
      }
      for (const ifs of object.ifs) {
        this.checkInstantiations(ifs);
      }
      for (const loops of object.loops) {
        this.checkInstantiations(loops);
      }
      for (const instantiations of object.instantiations) {
        this.checkInstantiations(instantiations);
      }
    }
  }
  getIFromPosition(p: Position): number {
    const text = this.text.split('\n').slice(0, p.line);
    const i = text.join('\n').length + p.character;
    return i;
  }
}
