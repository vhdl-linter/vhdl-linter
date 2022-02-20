import { findBestMatch } from 'string-similarity';
import {
  CodeAction, CodeActionKind, CodeLens,
  Command, Diagnostic, DiagnosticSeverity, Position, Range, TextEdit
} from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { getDocumentSettings } from './language-server';
import { IHasDefinitions, IHasInstantiations, implementsIHasInstantiations, implementsIHasSubprograms, implementsIMentionable, MagicCommentType, OArchitecture, OAssociation, OAssociationFormal, ObjectBase, OCase, OEntity, OEnum, OFile, OFileWithEntity, OFileWithEntityAndArchitecture, OFileWithPackages, OGeneric, OGenericAssociationList, OHasSequentialStatements, OIf, OInstantiation, OPackage, OPackageBody, OPort, OPortAssociationList, OProcess, ORead, ORecord, OSignal, OSignalBase, OSubprogram, OType, OWhenClause, OWrite, ParserError } from './parser/objects';
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
  tree: OFileWithEntityAndArchitecture | OFileWithEntity | OFileWithPackages | OFile;
  parser: Parser;
  packages: (OPackage | OPackageBody)[] = [];
  constructor(private editorPath: string, public text: string, public projectParser: ProjectParser, public onlyEntity: boolean = false) {
    //     console.log('lint');
    this.parser = new Parser(this.text, this.editorPath, onlyEntity);
    //     console.log(`parsing: ${editorPath}`);
    try {
      this.tree = this.parser.parse();
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
    const matchingMagiComments = this.tree.magicComments.filter(magicComment => (magicComment.range.start.character <= range.start.character && magicComment.range.start.line <= range.start.line &&
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
    this.tree.magicComments.forEach(magicComment => {
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
  async parsePackages() {
    const packages = this.projectParser.getPackages();
    const standard = packages.find(pkg => pkg.name.text.toLowerCase() === 'standard');
    if (standard) {
      this.packages.push(standard);
    }
    //     console.log(packages);
    for (const useStatement of this.tree.useStatements) {
      let match = useStatement.text.match(/([^.]+)\.([^.]+)\.([^.]+)/i);
      let found = false;
      if (match) {
        const library = match[1];
        const pkg = match[2];
        if (library.toLowerCase() === 'altera_mf') {
          found = true;
        } else {
          for (const foundPkg of packages) {
            if (foundPkg.name.text.toLowerCase() === pkg.toLowerCase()) {
              this.packages.push(foundPkg);
              found = true;
            }
          }
        }
      }
      if (!found) {
        this.addMessage({
          range: useStatement.range,
          severity: DiagnosticSeverity.Warning,
          message: `could not find package for ${useStatement.text}`
        });
      }
    }
    for (const read of this.tree.objectList.filter(object => object instanceof ORead) as ORead[]) {
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
            for (const state of type.states) {
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
    for (const instantiation of this.tree.objectList.filter(object => object instanceof OInstantiation) as OInstantiation[]) {
      switch (instantiation.type) {
        case 'component':
        case 'entity':
          instantiation.definitions.push(...this.getEntities(instantiation));
          break;
        case 'procedure':
        case 'procedure-call':
          instantiation.definitions.push(...this.getSubprograms(instantiation));
          break;
      }
    }
    if (this.tree instanceof OFileWithEntityAndArchitecture) {
      for (const component of this.tree.architecture.components) {
        component.definitions.push(...this.getEntities(component));
      }
    }
    for (const obj of this.tree.objectList) {
      if (obj instanceof OAssociation) {
        if (obj.parent instanceof OGenericAssociationList || obj.parent instanceof OPortAssociationList) {
          if (!(obj.parent.parent instanceof OInstantiation)) {
            continue;
          }
          let entitiesOrProcedures: (OEntity | OSubprogram)[] = [];
          switch (obj.parent.parent.type) {
            case 'component':
            case 'entity':
              entitiesOrProcedures = this.getEntities(obj.parent.parent);
              break;
            case 'procedure':
            case 'procedure-call':
              entitiesOrProcedures = this.getSubprograms(obj.parent.parent);
              break;
          }
          if (entitiesOrProcedures.length === 0) {
            continue;
          }

          let ports: (OPort | OGeneric)[] = [];
          if (obj.parent instanceof OPortAssociationList) {
            ports.push(...entitiesOrProcedures.flatMap(ep => ep.ports.filter(port => obj.formalPart.find(name => name.text.toLowerCase() === port.name.text.toLowerCase()))));
          } else {
            for (const ep of entitiesOrProcedures) {
              if (ep instanceof OEntity) {
                ports.push(...ep.generics.filter(port => obj.formalPart.find(name => name.text.toLowerCase() === port.name.text.toLowerCase())));
              }
            }
          }

          if (!ports) {
            continue;
          }
          obj.definitions.push(...ports);
          for (const namePart of obj.formalPart) {
            namePart.definitions.push(...ports);
          }
          for (const portOrGeneric of ports) {
            if (portOrGeneric instanceof OPort) {
              if (portOrGeneric.direction === 'in') {
                for (const mapping of obj.actualIfOutput.flat()) {
                  const index = this.tree.objectList.indexOf(mapping);
                  this.tree.objectList.splice(index, 1);
                  for (const mentionable of this.tree.objectList) {
                    if (implementsIMentionable(mentionable)) {
                      for (const [index, mention] of mentionable.mentions.entries()) {
                        if (mention === mapping) {
                          mentionable.mentions.splice(index, 1);
                        }
                      }
                    }
                  }
                }
                obj.actualIfOutput = [[], []];
              } else {
                for (const mapping of obj.actualIfInput) {
                  const index = this.tree.objectList.indexOf(mapping);
                  this.tree.objectList.splice(index, 1);
                  for (const mentionable of this.tree.objectList) {
                    if (implementsIMentionable(mentionable)) {
                      for (const [index, mention] of mentionable.mentions.entries()) {
                        if (mention === mapping) {
                          mentionable.mentions.splice(index, 1);
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

    if (settings.rules.warnLibrary && this.tree && this.tree instanceof OFileWithEntity && typeof this.tree.entity.library === 'undefined') {
      this.addMessage({
        range: Range.create(Position.create(0, 0), Position.create(1, 0)),
        severity: DiagnosticSeverity.Warning,
        message: `Please define library magic comment \n --!@library libraryName`
      });

    }
  }
  async checkAll() {
    if (this.tree) {
      this.parsePackages();
      this.checkComponents();
      this.checkNotDeclared();
      await this.checkLibrary();
      this.checkTodos();
      if (this.tree instanceof OFileWithEntityAndArchitecture) {
        this.checkResets();
        this.checkUnused(this.tree.architecture, this.tree.entity);
        this.checkDoubles();
        await this.checkPortDeclaration();
        this.checkInstantiations(this.tree.architecture);
        await this.checkPortType();
      }
      // this.parser.debugObject(this.tree);
    }
    return this.messages;
  }
  checkComponents() {
    if (!(this.tree instanceof OFileWithEntityAndArchitecture)) {
      return;
    }
    for (const component of this.tree.architecture.components) {
      const realEntities = this.getEntities(component);
      if (realEntities.length === 0) {
        this.addMessage({
          range: component.name.range,
          severity: DiagnosticSeverity.Warning,
          message: `Could not find an entity declaration for this component (${component.name})`
        });
        continue;
      }
      // list of generics (possibly multiple occurences)
      const realGenerics = realEntities.flatMap(e => e.generics);
      // generics not in realEntity
      for (const generic of realGenerics) {
        if (!realGenerics.find(gen => gen.name.text.toLowerCase() === generic.name.text.toLowerCase())) {
          this.addMessage({
            range: generic.name.range,
            severity: DiagnosticSeverity.Error,
            message: `no generic ${generic.name.text} on entity ${component.name}`
          });
        }
      }
      // generics not in this component
      for (const generic of realGenerics) {
        if (!component.generics.find(gen => gen.name.text.toLowerCase() === generic.name.text.toLowerCase())) {
          this.addMessage({
            range: component.genericRange ?? component.range,
            severity: DiagnosticSeverity.Error,
            message: `generic ${generic.name.text} is missing in this component declaration`
          });
        }
      }
      // list of ports (possibly multiple occurences)
      const realPorts = realEntities.flatMap(e => e.ports);
      // ports not in realEntity
      for (const port of component.ports) {
        if (!realPorts.find(p => p.name.text.toLowerCase() === port.name.text.toLowerCase())) {
          this.addMessage({
            range: port.name.range,
            severity: DiagnosticSeverity.Error,
            message: `no port ${port.name.text} on entity ${component.name}`
          });
        }
      }
      // generics not in this component
      for (const port of realPorts) {
        if (!component.ports.find(p => p.name.text.toLowerCase() === port.name.text.toLowerCase())) {
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
    if (!(this.tree instanceof OFileWithEntityAndArchitecture)) {
      return;
    }
    for (const signal of this.tree.architecture.signals) {
      if (this.tree.architecture.signals.find(signalSearch => signal !== signalSearch && signal.name.text.toLowerCase() === signalSearch.name.text.toLowerCase())) {
        this.addMessage({
          range: signal.range,
          severity: DiagnosticSeverity.Error,
          message: `signal ${signal.name} defined multiple times`
        });
      }
    }
    for (const type of this.tree.architecture.types) {
      if (this.tree.architecture.types.find(typeSearch => type !== typeSearch && type.name.text.toLowerCase() === typeSearch.name.text.toLowerCase())) {
        this.addMessage({
          range: type.range,
          severity: DiagnosticSeverity.Error,
          message: `type ${type.name} defined multiple times`
        });
      }
      if (type instanceof OEnum) {
        for (const state of type.states) {
          if (type.states.find(stateSearch => state !== stateSearch && state.name.text.toLowerCase() === stateSearch.name.text.toLowerCase())) {
            this.addMessage({
              range: state.range,
              severity: DiagnosticSeverity.Error,
              message: `state ${state.name} defined multiple times`
            });

          }
        }
      }
    }
    for (const port of this.tree.entity.ports) {
      if (this.tree.entity.ports.find(portSearch => port !== portSearch && port.name.text.toLowerCase() === portSearch.name.text.toLowerCase())) {
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
      if (this.tree instanceof OFileWithEntityAndArchitecture) {
        const args: IAddSignalCommandArguments = { textDocumentUri, signalName: write.text, range: this.tree.architecture.range };
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
      for (const pkg of this.projectParser.getPackages()) {
        const thing = pkg.constants.find(constant => constant.name.text.toLowerCase() === read.text.toLowerCase()) || pkg.types.find(type => type.name.text.toLowerCase() === read.text.toLowerCase())
          || pkg.subprograms.find(subprogram => subprogram.name.text.toLowerCase() === read.text.toLowerCase());
        if (thing) {
          const file = read.getRoot();
          const pos = Position.create(0, 0);
          if (file.useStatements.length > 0) {
            pos.line = file.useStatements[file.useStatements.length - 1].range.end.line + 1;
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
      if (this.tree instanceof OFileWithEntityAndArchitecture) {
        const args: IAddSignalCommandArguments = { textDocumentUri, signalName: read.text, range: this.tree.architecture.range };
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
  checkNotDeclared() {
    for (const obj of this.tree.objectList) {
      if (obj instanceof ORead && obj.definitions.length === 0) {
        this.pushReadError(obj);
      } else if (obj instanceof OWrite && obj.definitions.length === 0) {
        this.pushWriteError(obj);
      } else if (obj instanceof OAssociationFormal && obj.definitions.length === 0) {
        this.pushReadError(obj);
      }
    }
  }
  getCodeLens(textDocumentUri: string): CodeLens[] {
    if (!(this.tree instanceof OFileWithEntityAndArchitecture)) {
      return [];
    }
    let signalLike: OSignalBase[] = this.tree.architecture.signals;
    signalLike = signalLike.concat(this.tree.entity.ports);
    const processes = this.tree.objectList.filter(object => object instanceof OProcess) as OProcess[];
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
          const change = this.tree.originalText.split('\n')[registerProcess.range.start.line - 1].match(/--\s*vhdl-linter-parameter-next-line/i) === null ?
            TextEdit.insert(registerProcess.range.start, `--vhdl-linter-parameter-next-line ${registerNameList}\n` + ' '.repeat(registerProcess.range.start.character)) :
            TextEdit.insert(Position.create(registerProcess.range.start.line - 1, this.tree.originalText.split('\n')[registerProcess.range.start.line - 1].length), ` ${registerNameList}`);
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
    if (!(this.tree instanceof OFileWithEntityAndArchitecture)) {
      return;
    }
    let signalLike: OSignalBase[] = this.tree.architecture.signals;
    signalLike = signalLike.concat(this.tree.entity.ports);
    const processes = this.tree.objectList.filter(object => object instanceof OProcess) as OProcess[];

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

          const change = this.tree.originalText.split('\n')[registerProcess.range.start.line - 1].match(/--\s*vhdl-linter-parameter-next-line/i) === null ?
            TextEdit.insert(registerProcess.range.start, `--vhdl-linter-parameter-next-line ${signal.name.text}\n` + ' '.repeat(registerProcess.range.start.character)) :
            TextEdit.insert(Position.create(registerProcess.range.start.line - 1, this.tree.originalText.split('\n')[registerProcess.range.start.line - 1].length), ` ${signal.name.text}`);
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

  private checkUnused(architecture: OArchitecture, entity?: OEntity) {
    if (!architecture) {
      return;
    }

    if (entity) {
      for (const port of entity.ports) {
        if (port.direction === 'in' && port.mentions.filter(token => token instanceof ORead).length === 0) {
          this.addMessage({
            range: port.range,
            severity: DiagnosticSeverity.Warning,
            message: `Not reading input port '${port.name}'`
          });
        }
        const writes = port.mentions.filter(token => token instanceof OWrite);
        if (port.direction === 'out' && writes.length === 0) {
          this.addMessage({
            range: port.range,
            severity: DiagnosticSeverity.Warning,
            message: `Not writing output port '${port.name}'`
          });
        }
      }
    }
    for (const type of architecture.types) {
      if (type.mentions.length === 0) {
        this.addMessage({
          range: type.name.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not using type ${type.name.text}`
        })
      }
    }
    for (const component of architecture.components) {
      if (component.mentions.length === 0) {
        this.addMessage({
          range: component.name.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not using component ${component.name.text}`
        })
      }
    }
    for (const signal of architecture.getRoot().objectList.filter(object => object instanceof OSignal) as OSignal[]) {
      if (signal.mentions.filter(token => token instanceof ORead).length === 0) {
        this.addMessage({
          range: signal.name.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not reading signal '${signal.name}'`
        });
      }
      const writes = signal.mentions.filter(token => token instanceof OWrite);
      if (!signal.constant && writes.length === 0) {
        this.addMessage({
          range: signal.name.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not writing signal '${signal.name}'`
        });
      }
      if (signal.constant) {
        for (const write of writes) {
          if (write.parent instanceof OAssociation && write.parent.parent instanceof OPortAssociationList) {
            this.addMessage({
              range: write.range,
              severity: DiagnosticSeverity.Information,
              message: `Constant ${signal.name} could be written in the procedure`
            });
          } else {
            this.addMessage({
              range: write.range,
              severity: DiagnosticSeverity.Error,
              message: `Constant ${signal.name} cannot be written`
            });
          }
        }
      }
    }
  }
  async checkPortDeclaration() {
    if (this.tree instanceof OFileWithEntity === false) {
      return;
    }

    const tree = this.tree as OFileWithEntity;
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
    if (this.tree instanceof OFileWithEntity === false) {
      return;
    }

    const tree = this.tree as OFileWithEntity;
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
  getEntities(instantiation: OInstantiation | OEntity): OEntity[] {
    const entities: OEntity[] = [];
    if (instantiation instanceof OInstantiation) {
      // find all defined components in current scope
      let parent: ObjectBase | OFile | undefined = instantiation.parent;
      if (!parent) {
        if (this.tree instanceof OFileWithEntityAndArchitecture) {
          parent = this.tree.architecture;
        }
      }
      while (parent instanceof ObjectBase) {
        if (parent instanceof OArchitecture) {
          entities.push(...parent.components);
        }
        parent = parent.parent;
      }
    }
    // find project entities
    const projectEntities = this.projectParser.getEntities();
    if (typeof instantiation.library !== 'undefined') {
      entities.push(...projectEntities.filter(entity => entity.library?.toLowerCase() ?? '' === instantiation.library?.toLowerCase()));
    } else {
      entities.push(...projectEntities);
    }
    const name = (instantiation instanceof OInstantiation) ? instantiation.componentName : instantiation.name;
    return entities.filter(e => e.name.text.toLowerCase() === name.text.toLowerCase());
  }

  getSubprograms(instantiation: OInstantiation): OSubprogram[] {
    const subprograms: OSubprogram[] = [];
    // find all defined subprograms in current scope
    let parent: ObjectBase | OFile | undefined = instantiation.parent;
    if (!parent) {
      if (this.tree instanceof OFileWithEntityAndArchitecture) {
        parent = this.tree.architecture;
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

  checkPortMaps(entitiesOrSubprograms: (OEntity | OSubprogram)[], instantiation: OInstantiation) {
    if (entitiesOrSubprograms.length === 0) {
      this.addMessage({
        range: instantiation.range.start.getRangeToEndLine(),
        severity: DiagnosticSeverity.Warning,
        message: `can not find entity/procedure ${instantiation.componentName}`
      });
    } else {
      const availablePortsDup = entitiesOrSubprograms.flatMap(e => e.ports);
      const availablePorts = availablePortsDup.filter((v, i, self) => self.findIndex(o => o.name.text.toLowerCase() === v.name.text.toLowerCase()) === i);
      const foundPorts: OPort[] = [];
      let portsWithoutFormal = false;
      let allPortsWithoutFormal = true;
      if (instantiation.portAssociationList) {
        for (const portAssociation of instantiation.portAssociationList.children) {
          if (portAssociation.formalPart.length === 0) {
            portsWithoutFormal = true;
            continue;
          }
          allPortsWithoutFormal = false;
          const entityPort = availablePorts.find(port => {
            for (const part of portAssociation.formalPart) {
              if (part.text.toLowerCase() === port.name.text.toLowerCase()) {
                return true;
              }
            }
            return false;
          });
          if (!entityPort) {
            const bestMatch = findBestMatch(portAssociation.formalPart[0].text, availablePorts.map(port => port.name.text));
            const code = this.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              actions.push(CodeAction.create(
                `Replace with ${bestMatch.bestMatch.target} (score: ${bestMatch.bestMatch.rating})`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(Range.create(portAssociation.formalPart[0].range.start, portAssociation.formalPart[portAssociation.formalPart.length - 1].range.end)
                      , bestMatch.bestMatch.target)]
                  }
                },
                CodeActionKind.QuickFix));
              return actions;
            });
            this.addMessage({
              range: portAssociation.range,
              severity: DiagnosticSeverity.Error,
              message: `no port ${portAssociation.formalPart.map(name => name.text).join(', ')} on entity/procedure ${entitiesOrSubprograms[0].name.text}`,
              code
            });
          } else {
            foundPorts.push(entityPort);
          }
        }
      }
      if (allPortsWithoutFormal) {
        const portCounts = [...new Set(entitiesOrSubprograms.flatMap(e => {
          const totalLength = e.ports.length;
          const portsWithDefault = e.ports.filter(p => typeof p.defaultValue === 'undefined').length;
          const result = [];
          for (let i = totalLength; i >= totalLength - portsWithDefault; i--) {
            result.push(i);
          }
          return result;
        }))].sort((a, b) => a - b);
        const actualCount = instantiation.portAssociationList?.children.length ?? 0;
        if (!portCounts.includes(actualCount)) {
          let portCountString: string;
          if (portCounts.length > 1) {
            const last = portCounts.pop();
            portCountString = `${portCounts.join(', ')} or ${last}`;
          } else {
            portCountString = `${portCounts[0]}`;
          }
          this.addMessage({
            range: instantiation.range,
            severity: DiagnosticSeverity.Error,
            message: `Got ${actualCount} ports but expected ${portCountString} ports.`
          });
        }
      } else {
        for (const port of availablePorts) {
          if (port.direction === 'in' && typeof port.defaultValue === 'undefined' && typeof foundPorts.find(portSearch => portSearch === port) === 'undefined') {
            if (portsWithoutFormal) {
              this.addMessage({
                range: instantiation.componentName.range,
                severity: DiagnosticSeverity.Information,
                message: `some ports have no formal part and input port ${port.name} cannot be found.`
              });
            } else {
              this.addMessage({
                range: instantiation.componentName.range,
                severity: DiagnosticSeverity.Warning,
                message: `input port ${port.name} might be missing port map and has no default value on entity/portmap ${instantiation.componentName}`
              });
            }
          }
        }
      }
    }
  }

  checkInstantiations(object: ObjectBase) {
    if (!object) {
      return;
    }
    if (implementsIHasInstantiations(object))
      for (const instantiation of object.instantiations) {
        let entitiesOrSubprograms;
        switch (instantiation.type) {
          case 'component':
          case 'entity':
            entitiesOrSubprograms = this.getEntities(instantiation);
            break;
          case 'procedure':
          case 'procedure-call':
            entitiesOrSubprograms = this.getSubprograms(instantiation);
            break;
        }
        this.checkPortMaps(entitiesOrSubprograms, instantiation);
      }
    if (implementsIHasSubprograms(object)) {
      for (const subprograms of object.subprograms) {
        this.checkInstantiations(subprograms);
      }
    }
    if (object instanceof OArchitecture) {
      for (const generate of object.generates) {
        this.checkInstantiations(generate);
      }
      for (const block of object.blocks) {
        this.checkInstantiations(block);
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
