import { findBestMatch } from 'string-similarity';
import {
  CodeAction, CodeActionKind, CodeLens,
  Command, Diagnostic, DiagnosticSeverity, Position, Range, TextEdit
} from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { getDocumentSettings } from './language-server';
import { IHasDefinitions, IHasInstantiations, implementsIHasInstantiations, implementsIHasSubprograms, implementsIMentionable, MagicCommentType, OArchitecture, OAssociation, OAssociationFormal, ObjectBase, OCase, OComponent, OConstant, OContext, OEntity, OEnum, OFile, OFileWithEntity, OFileWithEntityAndArchitecture, OFileWithPackages, OGeneric, OGenericAssociationList, OHasSequentialStatements, OIf, OInstantiation, OPackage, OPackageBody, OPort, OPortAssociationList, OProcess, ORead, ORecord, OSignal, OSignalBase, OSubprogram, OType, OUseClause, OWhenClause, OWrite, ParserError, OToken, OAssociationList, OIRange, OVariable } from './parser/objects';
import { Parser } from './parser/parser';
import { ProjectParser } from './project-parser';
export enum LinterRules {
  Reset
}
export interface IAddSignalCommandArguments {
  textDocumentUri: string;
  signalName: string;
  range: Range;
}
export type diagnosticCodeActionCallback = (textDocumentUri: string) => CodeAction[];
export type commandCallback = (textDocumentUri: string, ...args: any[]) => TextEdit[];
export class VhdlLinter {
  messages: Diagnostic[] = [];
  file: OFileWithEntityAndArchitecture | OFileWithEntity | OFileWithPackages | OFile;
  parser: Parser;
  packages: (OPackage | OPackageBody)[] = [];
  constructor(private editorPath: string, public text: string, public projectParser: ProjectParser, public onlyEntity: boolean = false) {
    //     console.log('lint');
    this.parser = new Parser(this.text, this.editorPath, onlyEntity);
    //     console.log(`parsing: ${editorPath}`);
    try {
      this.file = this.parser.parse();
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
      } else {
        throw e;
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
  checkMagicComments(range: Range, rule?: LinterRules, parameter?: string) {
    const matchingMagiComments = this.file.magicComments.filter(magicComment => (magicComment.range.start.character <= range.start.character && magicComment.range.start.line <= range.start.line &&
      magicComment.range.end.character >= range.start.character && magicComment.range.end.line >= range.start.line) || (magicComment.range.start.character <= range.end.character && magicComment.range.start.line <= range.end.line &&
        magicComment.range.end.character >= range.end.character && magicComment.range.end.line >= range.end.line)).filter(magicComment => {
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
  checkTodos() {
    this.file.magicComments.forEach(magicComment => {
      if (magicComment.commentType === MagicCommentType.Todo) {
        this.messages.push({
          range: magicComment.range,
          severity: DiagnosticSeverity.Information,
          message: magicComment.message
        });
      }
    });
  }

  addMessage(diagnostic: Diagnostic, rule: LinterRules, parameter: string): void;
  addMessage(diagnostic: Diagnostic): void;
  addMessage(diagnostic: Diagnostic, rule?: LinterRules, parameter?: string) {

    if (this.checkMagicComments(diagnostic.range, rule, parameter)) {
      this.messages.push(diagnostic);
    }

  }
  getUseClauses(parent: OFile | OContext) {
    const useClauses = parent.useClauses.slice();
    if (parent.contextReferences.length > 0) {
      const contexts = this.projectParser.getContexts();
      for (const reference of parent.contextReferences) {
        const context = contexts.find(c => c.name.text.toLowerCase() === reference.contextName.toLowerCase());
        if (!context) {
          if (parent instanceof OFile) {
            this.addMessage({
              range: reference.range,
              severity: DiagnosticSeverity.Warning,
              message: `could not find context for ${reference.library}.${reference.contextName}`
            });
          }
        } else {
          useClauses.push(...this.getUseClauses(context));
        }
      }
    }
    return useClauses;
  }
  async elaborate() {
    for (const obj of this.file.objectList) {
      if (obj instanceof OToken) {
        obj.elaborate();
      }
    }
    const packages = this.projectParser.getPackages();
    const standard = packages.find(pkg => pkg.name.text.toLowerCase() === 'standard');
    if (standard) {
      this.packages.push(standard);
    }
    //     console.log(packages);
    for (const useClause of this.getUseClauses(this.file)) {
      let found = false;
      for (let foundPkg of packages) {
        if (foundPkg.name.text.toLowerCase() === useClause.packageName.toLowerCase()) {
          if (foundPkg instanceof OPackage && typeof foundPkg.uninstantiatedPackageName !== 'undefined') {
            const uninstantiatedPackage = packages.find(p => p.name.text.toLowerCase() === (foundPkg as OPackage).uninstantiatedPackageName?.text.toLowerCase());
            if (uninstantiatedPackage) {
              foundPkg = uninstantiatedPackage;
            } else {
              found = true;
              this.addMessage({
                range: useClause.range,
                severity: DiagnosticSeverity.Warning,
                message: `could not find instantiated package from package ${useClause.library}.${useClause.packageName}`
              })
              break;
            }
          }
          this.packages.push(foundPkg);
          found = true;
        }
      }
      if (!found) {
        if (useClause.getRoot().file === this.file.file) {
          this.addMessage({
            range: useClause.range,
            severity: DiagnosticSeverity.Warning,
            message: `could not find package for ${useClause.library}.${useClause.packageName}`
          });
        }
      }
    }
    for (const read of this.file.objectList.filter(object => object instanceof ORead) as ORead[]) {
      for (const pkg of packages) {
        for (const constant of pkg.constants) {
          if (constant.name.text.toLowerCase() === read.text.toLowerCase()) {
            read.definitions.push(constant);
          }
        }
        for (const subprogram of pkg.subprograms) {
          if (subprogram.name.text.toLowerCase() === read.text.toLowerCase()) {
            read.definitions.push(subprogram);
          }
        }
        for (const type of pkg.types) {
          const typeRead = type.findRead(read);
          if (typeRead !== false) {
            read.definitions.push(typeRead);
          }
          if (type instanceof OEnum) {
            for (const state of type.literals) {
              if (state.name.text.toLowerCase() === read.text.toLowerCase()) {
                read.definitions.push(state);

              }
            }
          } else if (type instanceof ORecord) {
            for (const child of type.children) {
              if (child.name.text.toLowerCase() === read.text.toLowerCase()) {
                read.definitions.push(child);
              }
            }
          }
        }
      }
    }
    for (const instantiation of this.file.objectList.filter(object => object instanceof OInstantiation) as OInstantiation[]) {
      switch (instantiation.type) {
        case 'component':
          const components = this.getComponents(instantiation);
          instantiation.definitions.push(...components);
          for (const component of components) {
            component.references.push(instantiation);
          }
          break;
        case 'entity':
          instantiation.definitions.push(...this.getEntities(instantiation));
          break;
        case 'subprogram':
        case 'subprogram-call':
          instantiation.definitions.push(...this.getSubprograms(instantiation));
          break;
      }
    }
    if (this.file instanceof OFileWithEntityAndArchitecture) {
      for (const component of this.file.architecture.components) {
        component.definitions.push(...this.getEntities(component));
      }
    }
    for (const obj of this.file.objectList) {
      if (obj instanceof OAssociation) {
        if (obj.parent instanceof OGenericAssociationList || obj.parent instanceof OPortAssociationList) {
          if (!(obj.parent.parent instanceof OInstantiation)) {
            continue;
          }
          let definitions: (OComponent | OEntity | OSubprogram)[];
          switch (obj.parent.parent.type) {
            case 'component':
              definitions = this.getComponents(obj.parent.parent);
              break;
            case 'entity':
              definitions = this.getEntities(obj.parent.parent);
              break;
            case 'subprogram':
            case 'subprogram-call':
              definitions = this.getSubprograms(obj.parent.parent);
              break;
          }
          if (definitions.length === 0) {
            continue;
          }

          let interfaceElements: (OPort | OGeneric)[] = [];
          interfaceElements.push(...definitions.flatMap(definition => {
            let elements: (OPort | OGeneric)[] = [];
            if (obj.parent instanceof OPortAssociationList) {
              elements = definition.ports;
            } else if (definition instanceof OComponent || definition instanceof OEntity) {
              elements = definition.generics;
            }
            return elements.filter((port, portNumber) => {
              const formalMatch = obj.formalPart.find(name => name.text.toLowerCase() === port.name.text.toLowerCase());
              if (formalMatch) {
                return true;
              }
              return obj.formalPart.length === 0 && portNumber === obj.parent.children.findIndex(o => o === obj);
            });
          }));

          if (interfaceElements.length === 0) {
            continue;
          }
          obj.definitions.push(...interfaceElements);
          for (const formalPart of obj.formalPart) {
            formalPart.definitions.push(...interfaceElements);
          }
          for (const portOrGeneric of interfaceElements) {
            if (portOrGeneric instanceof OPort) {
              if (portOrGeneric.direction === 'in') {
                for (const mapping of obj.actualIfOutput.flat()) {
                  const index = this.file.objectList.indexOf(mapping);
                  this.file.objectList.splice(index, 1);
                  for (const mentionable of this.file.objectList) {
                    if (implementsIMentionable(mentionable)) {
                      for (const [index, mention] of mentionable.references.entries()) {
                        if (mention === mapping) {
                          mentionable.references.splice(index, 1);
                        }
                      }
                    }
                  }
                }
                obj.actualIfOutput = [[], []];
              } else if (portOrGeneric.direction === 'out') {
                for (const mapping of obj.actualIfInput) {
                  const index = this.file.objectList.indexOf(mapping);
                  this.file.objectList.splice(index, 1);
                  for (const mentionable of this.file.objectList) {
                    if (implementsIMentionable(mentionable)) {
                      for (const [index, mention] of mentionable.references.entries()) {
                        if (mention === mapping) {
                          mentionable.references.splice(index, 1);
                        }
                      }
                    }
                  }
                }
                obj.actualIfInput = [];
              }
            }
          }
        }
      }
    }
  }

  async checkLibrary() {
    const settings = await getDocumentSettings(URI.file(this.editorPath).toString());

    if (settings.rules.warnLibrary && this.file && this.file instanceof OFileWithEntity && typeof this.file.entity.library === 'undefined') {
      this.addMessage({
        range: Range.create(Position.create(0, 0), Position.create(1, 0)),
        severity: DiagnosticSeverity.Warning,
        message: `Please define library magic comment \n --!@library libraryName`
      });

    }
  }
  async checkAll() {
    if (this.file) {
      this.elaborate();
      this.checkComponents();
      this.checkNotDeclared();
      await this.checkLibrary();
      this.checkTodos();
      if (this.file instanceof OFileWithEntityAndArchitecture) {
        this.checkResets();
        this.checkUnused(this.file.architecture, this.file.entity);
        this.checkDoubles();
        await this.checkPortDeclaration();
        this.checkInstantiations(this.file.architecture);
        await this.checkPortType();
      }
      // this.parser.debugObject(this.tree);
    }
    return this.messages;
  }
  checkComponents() {
    if (!(this.file instanceof OFileWithEntityAndArchitecture)) {
      return;
    }
    for (const component of this.file.architecture.components) {
      const entities = this.getEntities(component);
      if (entities.length === 0) {
        this.addMessage({
          range: component.name.range,
          severity: DiagnosticSeverity.Warning,
          message: `Could not find an entity declaration for this component (${component.name})`
        });
        continue;
      }
      // list of generics (possibly multiple occurences)
      const realGenerics = entities.flatMap(e => e.generics);
      // generics not in realEntity
      for (const generic of realGenerics) {
        if (!realGenerics.find(gen => gen.nameEquals(generic))) {
          this.addMessage({
            range: generic.name.range,
            severity: DiagnosticSeverity.Error,
            message: `no generic ${generic.name.text} on entity ${component.name}`
          });
        }
      }
      // generics not in this component
      for (const generic of realGenerics) {
        if (!component.generics.find(gen => gen.nameEquals(generic))) {
          this.addMessage({
            range: component.genericRange ?? component.range,
            severity: DiagnosticSeverity.Error,
            message: `generic ${generic.name.text} is missing in this component declaration`
          });
        }
      }
      // list of ports (possibly multiple occurences)
      const realPorts = entities.flatMap(e => e.ports);
      // ports not in realEntity
      for (const port of component.ports) {
        if (!realPorts.find(p => p.nameEquals(port))) {
          this.addMessage({
            range: port.name.range,
            severity: DiagnosticSeverity.Error,
            message: `no port ${port.name.text} on entity ${component.name}`
          });
        }
      }
      // generics not in this component
      for (const port of realPorts) {
        if (!component.ports.find(p => p.nameEquals(port))) {
          this.addMessage({
            range: component.portRange ?? component.range,
            severity: DiagnosticSeverity.Error,
            message: `port ${port.name.text} is missing in this component declaration`
          });
        }
      }
    }
  }
  checkDoubles() {
    if (!(this.file instanceof OFileWithEntityAndArchitecture)) {
      return;
    }
    for (const signal of this.file.architecture.signals) {
      if (this.file.architecture.signals.find(signalSearch => signal !== signalSearch && signal.nameEquals(signalSearch))) {
        this.addMessage({
          range: signal.range,
          severity: DiagnosticSeverity.Error,
          message: `signal ${signal.name} defined multiple times`
        });
      }
    }
    for (const type of this.file.architecture.types) {
      if (this.file.architecture.types.find(typeSearch => type !== typeSearch && type.nameEquals(typeSearch))) {
        this.addMessage({
          range: type.range,
          severity: DiagnosticSeverity.Error,
          message: `type ${type.name} defined multiple times`
        });
      }
      if (type instanceof OEnum) {
        for (const state of type.literals) {
          if (type.literals.find(stateSearch => state !== stateSearch && state.nameEquals(stateSearch))) {
            this.addMessage({
              range: state.range,
              severity: DiagnosticSeverity.Error,
              message: `state ${state.name} defined multiple times`
            });

          }
        }
      }
    }
    for (const port of this.file.entity.ports) {
      if (this.file.entity.ports.find(portSearch => port !== portSearch && port.nameEquals(portSearch))) {
        this.addMessage({
          range: port.range,
          severity: DiagnosticSeverity.Error,
          message: `port ${port.name} defined multiple times`
        });

      }
    }
  }

  private pushWriteError(write: OWrite) {
    const code = this.addCodeActionCallback((textDocumentUri: string) => {
      const actions = [];
      if (this.file instanceof OFileWithEntityAndArchitecture) {
        const args: IAddSignalCommandArguments = { textDocumentUri, signalName: write.text, range: this.file.architecture.range };
        actions.push(CodeAction.create('add signal to architecture', Command.create('add signal to architecture', 'vhdl-linter:add-signal', args)));
      }
      return actions;
    });
    this.addMessage({
      code,
      range: write.range,
      severity: DiagnosticSeverity.Error,
      message: `signal '${write.text}' is written but not declared`
    });
  }
  private pushReadError(read: ORead) {
    const code = this.addCodeActionCallback((textDocumentUri: string) => {
      const actions = [];
      for (const pkg of this.packages) {
        const thing = pkg.constants.find(constant => constant.name.text.toLowerCase() === read.text.toLowerCase()) || pkg.types.find(type => type.name.text.toLowerCase() === read.text.toLowerCase())
          || pkg.subprograms.find(subprogram => subprogram.name.text.toLowerCase() === read.text.toLowerCase());
        if (thing) {
          const file = read.getRoot();
          const pos = Position.create(0, 0);
          if (file.useClauses.length > 0) {
            pos.line = file.useClauses[file.useClauses.length - 1].range.end.line + 1;
          }
          actions.push(CodeAction.create(
            'add use statement for ' + pkg.name,
            {
              changes: {
                [textDocumentUri]: [TextEdit.insert(pos, `use ${pkg.library ? pkg.library : 'work'}.${pkg.name}.all;\n`)]
              }
            },
            CodeActionKind.QuickFix
          ));
        }
      }
      if (this.file instanceof OFileWithEntityAndArchitecture) {
        const args: IAddSignalCommandArguments = { textDocumentUri, signalName: read.text, range: this.file.architecture.range };
        actions.push(CodeAction.create('add signal to architecture', Command.create('add signal to architecture', 'vhdl-linter:add-signal', args)));
      }
      return actions;
    });
    this.addMessage({
      range: read.range,
      code: code,
      severity: DiagnosticSeverity.Error,
      message: `signal '${read.text}' is read but not declared`
    });
  }
  private pushAssociationError(read: OAssociationFormal) {
    const code = this.addCodeActionCallback((textDocumentUri: string) => {
      const actions = [];
      for (const pkg of this.packages) {
        const thing = pkg.constants.find(constant => constant.name.text.toLowerCase() === read.text.toLowerCase()) || pkg.types.find(type => type.name.text.toLowerCase() === read.text.toLowerCase())
          || pkg.subprograms.find(subprogram => subprogram.name.text.toLowerCase() === read.text.toLowerCase());
        if (thing) {
          const file = read.getRoot();
          const pos = Position.create(0, 0);
          if (file.useClauses.length > 0) {
            pos.line = file.useClauses[file.useClauses.length - 1].range.end.line + 1;
          }
          actions.push(CodeAction.create(
            'add use statement for ' + pkg.name,
            {
              changes: {
                [textDocumentUri]: [TextEdit.insert(pos, `use ${pkg.library ? pkg.library : 'work'}.${pkg.name}.all;\n`)]
              }
            },
            CodeActionKind.QuickFix
          ));
        }
      }

      return actions;
    });
    this.addMessage({
      range: read.range,
      code: code,
      severity: DiagnosticSeverity.Error,
      message: `port '${read.text}' does not exist`
    });
  }
  checkNotDeclared() {
    for (const obj of this.file.objectList) {
      if (obj instanceof ORead && obj.definitions.length === 0) {
        this.pushReadError(obj);
      } else if (obj instanceof OWrite && obj.definitions.length === 0) {
        this.pushWriteError(obj);
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
    if (!(this.file instanceof OFileWithEntityAndArchitecture)) {
      return [];
    }
    let signalLike: OSignalBase[] = this.file.architecture.signals;
    signalLike = signalLike.concat(this.file.entity.ports);
    const processes = this.file.objectList.filter(object => object instanceof OProcess) as OProcess[];
    const signalsMissingReset = signalLike.filter(signal => {
      if (typeof signal.registerProcess === 'undefined') {
        return false;
      }
      for (const reset of signal.registerProcess.getResets()) {
        if (reset.toLowerCase() === signal.name.text.toLowerCase()) {
          return false;
        }
      }
      return this.checkMagicComments(signal.registerProcess.range, LinterRules.Reset, signal.name.text);
    });
    if (signalsMissingReset.length === 0) {
      return [];
    }
    const registerProcessMap = new Map<OProcess, OSignalBase[]>();
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
      const registerNameList = signalLikes.map(signalLike => signalLike.name.text).join(' ');
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
    if (!(this.file instanceof OFileWithEntityAndArchitecture)) {
      return;
    }
    let signalLike: OSignalBase[] = this.file.architecture.signals;
    signalLike = signalLike.concat(this.file.entity.ports);
    const processes = this.file.objectList.filter(object => object instanceof OProcess) as OProcess[];

    for (const signal of signalLike) {
      if (typeof signal.registerProcess === 'undefined') {
        continue;
      }
      const registerProcess = signal.registerProcess;
      let resetFound = false;
      for (const reset of registerProcess.getResets()) {
        if (reset.toLowerCase() === signal.name.text.toLowerCase()) {
          resetFound = true;
        }
      }
      if (!resetFound) {
        const code = this.addCodeActionCallback((textDocumentUri: string) => {
          const actions = [];

          const change = this.file.originalText.split('\n')[registerProcess.range.start.line - 1].match(/--\s*vhdl-linter-parameter-next-line/i) === null ?
            TextEdit.insert(registerProcess.range.start, `--vhdl-linter-parameter-next-line ${signal.name.text}\n` + ' '.repeat(registerProcess.range.start.character)) :
            TextEdit.insert(Position.create(registerProcess.range.start.line - 1, this.file.originalText.split('\n')[registerProcess.range.start.line - 1].length), ` ${signal.name.text}`);
          actions.push(CodeAction.create(
            'Ignore reset for ' + signal.name,
            {
              changes: {
                [textDocumentUri]: [change]
              }
            },
            CodeActionKind.QuickFix
          ));
          let resetValue = null;
          if (signal.type.map(read => read.text).join(' ').match(/^std_u?logic_vector|unsigned|signed/i)) {
            resetValue = `(others => '0')`;
          } else if (signal.type.map(read => read.text).join(' ').match(/^std_u?logic/i)) {
            resetValue = `'0'`;
          } else if (signal.type.map(read => read.text).join(' ').match(/^integer|natural|positive/i)) {
            resetValue = `0`;
          }
          if (resetValue !== null && typeof registerProcess.resetClause !== 'undefined') {
            let positionStart = Position.create(registerProcess.resetClause.range.start.line, registerProcess.resetClause.range.start.character);
            positionStart.line++;
            const indent = positionStart.character + 2;
            positionStart.character = 0;
            actions.push(CodeAction.create(
              'Add reset for ' + signal.name,
              {
                changes: {
                  [textDocumentUri]: [TextEdit.insert(positionStart, ' '.repeat(indent) + `${signal.name} <= ${resetValue};\n`)]
                }
              },
              CodeActionKind.QuickFix
            ));
          }
          return actions;
        });
        const endCharacter = this.text.split('\n')[registerProcess.range.start.line].length;
        const range = Range.create(Position.create(registerProcess.range.start.line, 0), Position.create(registerProcess.range.start.line, endCharacter));
        const message = `Reset '${signal.name}' missing`;
        this.addMessage({
          range,
          code,
          severity: DiagnosticSeverity.Warning,
          message
        }, LinterRules.Reset, signal.name.text);
      }
    }
  }

  private checkUnusedPorts(ports: OPort[]) {
    for (const port of ports) {
      if ((port.direction === 'in' || port.direction === 'inout') && port.references.filter(token => token instanceof ORead).length === 0) {
        this.addMessage({
          range: port.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not reading input port '${port.name}'`
        });
      }
      const writes = port.references.filter(token => token instanceof OWrite);
      if ((port.direction === 'out' || port.direction === 'inout')&& writes.length === 0) {
        this.addMessage({
          range: port.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not writing output port '${port.name}'`
        });
      }
    }
  }

  private checkUnused(architecture: OArchitecture, entity?: OEntity) {
    if (!architecture) {
      return;
    }

    if (entity) {
      this.checkUnusedPorts(entity.ports);
      for (const generic of entity.generics) {
        if (generic.references.filter(token => token instanceof ORead).length === 0) {
          this.addMessage({
            range: generic.range,
            severity: DiagnosticSeverity.Warning,
            message: `Not reading generic '${generic.name}'`
          });
        }
        for (const write of generic.references.filter(token => token instanceof OWrite)) {
            this.addMessage({
              range: write.range,
              severity: DiagnosticSeverity.Error,
              message: `Generic ${generic.name} cannot be written`
            });
        }
      }
    }
    for (const type of architecture.types) {
      if (type.references.length === 0) {
        this.addMessage({
          range: type.name.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not using type ${type.name.text}`
        })
      }
    }
    for (const component of architecture.components) {
      if (component.references.length === 0) {
        this.addMessage({
          range: component.name.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not using component ${component.name.text}`
        })
      }
    }
    for (const signal of architecture.getRoot().objectList.filter(object => object instanceof OSignal) as OSignal[]) {
      if (signal.references.filter(token => token instanceof ORead).length === 0) {
        this.addMessage({
          range: signal.name.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not reading signal '${signal.name}'`
        });
      }
      const writes = signal.references.filter(token => token instanceof OWrite);
      if (writes.length === 0) {
        this.addMessage({
          range: signal.name.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not writing signal '${signal.name}'`
        });
      }
    }
    for (const variable of architecture.getRoot().objectList.filter(object => object instanceof OVariable) as OVariable[]) {
      if (variable.references.filter(token => token instanceof ORead).length === 0) {
        this.addMessage({
          range: variable.name.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not reading variable '${variable.name}'`
        });
      }
      const writes = variable.references.filter(token => token instanceof OWrite);
      if (writes.length === 0) {
        this.addMessage({
          range: variable.name.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not writing variable '${variable.name}'`
        });
      }
    }
    for (const constant of architecture.getRoot().objectList.filter(object => object instanceof OConstant) as OConstant[]) {
      if (constant.references.filter(token => token instanceof ORead).length === 0) {
        this.addMessage({
          range: constant.name.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not reading constant '${constant.name}'`
        });
      }
      for (const write of constant.references.filter(token => token instanceof OWrite)) {
          this.addMessage({
            range: write.range,
            severity: DiagnosticSeverity.Error,
            message: `Constant ${constant.name} cannot be written`
          });
      }
    }
    for (const subprogram of architecture.getRoot().objectList.filter(object => object instanceof OSubprogram) as OSubprogram[]) {
      this.checkUnusedPorts(subprogram.ports);
    }
  }
  async checkPortDeclaration() {
    if (this.file instanceof OFileWithEntity === false) {
      return;
    }

    const tree = this.file as OFileWithEntity;
    const portSettings = (await getDocumentSettings(URI.file(this.editorPath).toString())).ports;
    if (portSettings.enablePortStyle) {

      for (const port of tree.entity.ports) {
        if (port.direction === 'in') {
          if (port.name.text.match(new RegExp(portSettings.outRegex, 'i'))) {
            const code = this.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              const newName = port.name.text.replace(new RegExp(portSettings.outRegex, 'i'), 'i_');
              actions.push(CodeAction.create(
                `Replace portname with '${newName}`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(port.name.range, newName)]
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
              message: `input port '${port.name}' matches output regex ${portSettings.outRegex}`,
              code
            });
          } else if (port.name.text.match(new RegExp(portSettings.inRegex, 'i')) === null) {
            const code = this.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              const newName = port.name.text.replace(/^(._|_?)/, 'i_');
              actions.push(CodeAction.create(
                `Replace portname with '${newName}`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(port.name.range, newName)]
                  }
                },
                CodeActionKind.QuickFix));
              return actions;
            });
            this.addMessage({
              range: port.range,
              severity: DiagnosticSeverity.Information,
              message: `input port '${port.name}' should match input regex ${portSettings.inRegex}`,
              code
            });
          }
        } else if (port.direction === 'out') {
          if (port.name.text.match(new RegExp(portSettings.inRegex, 'i'))) {
            const code = this.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              const newName = port.name.text.replace(/^i_/, 'o_');
              actions.push(CodeAction.create(
                `Replace portname with '${newName}`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(port.name.range, newName)]
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
              message: `ouput port '${port.name}' matches input regex ${portSettings.inRegex}`,
              code
            });
          } else if (port.name.text.match(new RegExp(portSettings.outRegex, 'i')) === null) {
            const code = this.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              const newName = port.name.text.replace(/^(._|_?)/, 'o_');
              actions.push(CodeAction.create(
                `Replace portname with '${newName}`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(port.name.range, newName)]
                  }
                },
                CodeActionKind.QuickFix));
              return actions;
            });
            this.addMessage({
              range: port.range,
              severity: DiagnosticSeverity.Information,
              message: `ouput port '${port.name}' should match output regex ${portSettings.outRegex}`
            });
          }
        }
      }
    }
  }
  async checkPortType() {
    if (this.file instanceof OFileWithEntity === false) {
      return;
    }

    const tree = this.file as OFileWithEntity;
    const settings = (await getDocumentSettings(URI.file(this.editorPath).toString()));
    if (settings.rules.warnLogicType) {
      for (const port of tree.entity.ports) {
        console.log(port.type);
        let match;
        if ((settings.style.preferedLogicType === 'std_logic' && port.type[0].text.match(/^std_ulogic/i))
          || (settings.style.preferedLogicType === 'std_ulogic' && port.type[0].text.match(/^std_logic/i))) {
          const code = this.addCodeActionCallback((textDocumentUri: string) => {
            const actions = [];
            const match = port.type[0].text.match(/^std_u?logic/i);
            if (match) {
              const replacement = port.type[0].text.replace(match[0], settings.style.preferedLogicType);
              actions.push(CodeAction.create(
                `Replace with ${replacement}`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(port.type[0].range
                      , replacement)]
                  }
                },
                CodeActionKind.QuickFix));
            }
            return actions;
          });
          this.addMessage({
            range: port.type[0].range,
            severity: DiagnosticSeverity.Information,
            message: `Port should be ${settings.style.preferedLogicType} is ${port.type[0].text}`,
            code
          });
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
    if (instantiation instanceof OInstantiation && typeof instantiation.library !== 'undefined') {
      entities.push(...projectEntities.filter(entity => {
        if (entity.library !== undefined) {
          return entity.library.toLowerCase() === instantiation.library?.toLowerCase() ?? '';
        }
        return true;

      }));
    } else {
      entities.push(...projectEntities);
    }
    const name = (instantiation instanceof OInstantiation) ? instantiation.componentName : instantiation.name;
    return entities.filter(e => e.name.text.toLowerCase() === name.text.toLowerCase());
  }
  getComponents(instantiation: OInstantiation): OComponent[] {
    const components: OComponent[] = [];
    if (instantiation.type !== 'component') {
      return components;
    }
    // find all defined components in current scope
    let parent: ObjectBase | OFile | undefined = instantiation.parent;
    if (!parent) {
      if (this.file instanceof OFileWithEntityAndArchitecture) {
        parent = this.file.architecture;
      }
    }
    while (parent instanceof ObjectBase) {
      if (parent instanceof OArchitecture) {
        components.push(...parent.components);
      }
      parent = parent.parent;
    }
    // find project components
    const projectComponents = this.packages.flatMap(pkg => (pkg instanceof OPackage) ? pkg.components : []);
    components.push(...projectComponents);
    const name = instantiation.componentName;
    return components.filter(e => e.name.text.toLowerCase() === name.text.toLowerCase());
  }

  getSubprograms(instantiation: OInstantiation): OSubprogram[] {
    const subprograms: OSubprogram[] = [];
    // find all defined subprograms in current scope
    let parent: ObjectBase | OFile | undefined = instantiation.parent;
    if (!parent) {
      if (this.file instanceof OFileWithEntityAndArchitecture) {
        parent = this.file.architecture;
      }
    }
    while (parent instanceof ObjectBase) {
      if (implementsIHasSubprograms(parent)) {
        subprograms.push(...parent.subprograms);
      }
      parent = parent.parent;
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

    for (const pkg of this.packages) {
      subprograms.push(...pkg.subprograms);
      addTypes(pkg.types);
    }
    // in entities
    subprograms.push(...this.projectParser.getEntities().flatMap(ent => ent.subprograms));
    return subprograms.filter(e => e.name.text.toLowerCase() === instantiation.componentName.text.toLowerCase());
  }

  checkAssociations(availableInterfaceElements: (OPort | OGeneric)[][], associationList: OAssociationList | undefined, typeName: string, range: OIRange, kind: 'port' | 'generic') {
    const availableInterfaceElementsFlat = availableInterfaceElements.flat().filter((v, i, self) => self.findIndex(o => o.nameEquals(v)) === i);
    const foundElements: (OPort | OGeneric)[] = [];
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
            if (part.text.toLowerCase() === port.name.text.toLowerCase()) {
              return true;
            }
          }
          return false;
        });
        if (!interfaceElement) {
          const bestMatch = findBestMatch(association.formalPart[0].text, availableInterfaceElementsFlat.map(element => element.name.text));
          const code = this.addCodeActionCallback((textDocumentUri: string) => {
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
          this.addMessage({
            range: association.range,
            severity: DiagnosticSeverity.Error,
            message: `no ${kind} ${association.formalPart.map(name => name.text).join(', ')} on ${typeName}`,
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
        const withDefault = elements.filter(p => typeof p.defaultValue !== 'undefined').length;
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
          message: `some ${kind}s have no formal part while others have. Associations are not verified inaccurate.`
        });
      } else {
        // check which interfaceElements are missing from the different possible interfaces
        const missingElements: (OPort|OGeneric)[][] = availableInterfaceElements.map(_interface => {
          const missing: (OPort|OGeneric)[] = [];
          for (const element of _interface) {
            if (((element instanceof OPort && element.direction === 'in') || element instanceof OGeneric)
              && typeof element.defaultValue === 'undefined'
              && typeof foundElements.find(search => search.nameEquals(element)) === 'undefined') {
                missing.push(element);
            }
          }
          return missing;
        });
        // if one interface has no missing elements, don't add a message
        if (!missingElements.find(elements => elements.length === 0)) {
          const elementString = [...new Set(missingElements.map(elements => elements.map(e => e.name.text).join(', ')))].join(') or (');
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
        let definitions: (OComponent | OEntity | OSubprogram)[];
        switch (instantiation.type) {
          case 'component':
            definitions = this.getComponents(instantiation);
            break;
          case 'entity':
            definitions = this.getEntities(instantiation);
            break;
          case 'subprogram':
          case 'subprogram-call':
            definitions = this.getSubprograms(instantiation);
            break;
        }
        let typeName;
        switch (instantiation.type) {
          case 'subprogram-call':
            typeName = 'subprogram';
            break;
          default:
            typeName = instantiation.type;
        }
        if (definitions.length === 0) {
          this.addMessage({
            range: instantiation.range.start.getRangeToEndLine(),
            severity: DiagnosticSeverity.Warning,
            message: `can not find ${typeName} ${instantiation.componentName}`
          });
        } else {
          const range = instantiation.range.start.getRangeToEndLine();
          const availablePorts = definitions.map(e => e.ports);
          this.checkAssociations(availablePorts, instantiation.portAssociationList, typeName, range, 'port');
          const availableGenerics = definitions.map(d => (d instanceof OComponent || d instanceof OEntity) ? d.generics : []);
          this.checkAssociations(availableGenerics, instantiation.genericAssociationList, typeName, range, 'generic');
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
    let text = this.text.split('\n').slice(0, p.line);
    let i = text.join('\n').length + p.character;
    return i;
  }
}
