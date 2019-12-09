import { OFile, OIf, OSignalLike, OSignal, OArchitecture, OEntity, OPort, OInstantiation, OWrite, ORead, OFileWithEntity, OFileWithPackage, OFileWithEntityAndArchitecture, ORecord, OPackage, ParserError, OEnum, OGenericActual, OMapping, OPortMap, MagicCommentType } from './parser/objects';
import { Parser } from './parser/parser';
import { ProjectParser } from './project-parser';
import { findBestMatch } from 'string-similarity';
import { EventEmitter } from 'events';
import {
  Range,
  Position,
  CodeAction,
  Diagnostic,
  TextEdit,
  CodeActionKind,
  DiagnosticSeverity
} from 'vscode-languageserver';
import { ThemeIcon } from 'vscode';
import { type } from 'os';
import { match } from 'minimatch';
export enum LinterRules {
  Reset
}
export type diagnosticCodeActionCallback = (textDocumentUri: string) => CodeAction[];
export class VhdlLinter {
  messages: Diagnostic[] = [];
  tree: OFileWithEntityAndArchitecture | OFileWithEntity | OFileWithPackage | OFile;
  parser: Parser;
  packages: OPackage[] = [];
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
  addMessage(diagnostic: Diagnostic, rule: LinterRules, parameter: string): void;
  addMessage(diagnostic: Diagnostic): void;
  addMessage(diagnostic: Diagnostic, rule?: LinterRules, parameter?: string) {
    const matchingMagiComments = this.tree.magicComments.filter(magicComment => (magicComment.range.start.character <= diagnostic.range.start.character && magicComment.range.start.line <= diagnostic.range.start.line &&
      magicComment.range.end.character >= diagnostic.range.start.character && magicComment.range.end.line >= diagnostic.range.start.line) || (magicComment.range.start.character <= diagnostic.range.end.character && magicComment.range.start.line <= diagnostic.range.end.line &&
        magicComment.range.end.character >= diagnostic.range.end.character && magicComment.range.end.line >= diagnostic.range.end.line)).filter(magicComment => {
          if (magicComment.commentType === MagicCommentType.Disable) {
            return true;
          }
          if (magicComment.commentType === MagicCommentType.Parameter && rule === LinterRules.Reset && typeof parameter !== 'undefined' && magicComment.parameter.find(parameterFind => parameterFind.toLowerCase() === parameter.toLowerCase())) {
            return true;
          }
          return false;
        });
    if (matchingMagiComments.length === 0) {
      this.messages.push(diagnostic);
    }

  }
  async parsePackages() {
    const packages = this.projectParser.getPackages();
    const standard = packages.find(pkg => pkg.name.toLowerCase() === 'standard');
    if (standard) {
      this.packages.push(standard);
    }
    //     console.log(packages);
    for (const useStatement of this.tree.useStatements) {
      let match = useStatement.text.match(/([^.]+)\.([^.]+)\.all/i);
      let found = false;
      if (match) {
        const library = match[1];
        const pkg = match[2];
        if (library.toLowerCase() === 'altera_mf') {
          found = true;
        } else {
          for (const foundPkg of packages) {
            if (foundPkg.name.toLowerCase() === pkg.toLowerCase()) {
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
  }
  checkAll() {
    if (this.tree) {
      this.parsePackages();
      this.checkNotDeclared();
      if (this.tree instanceof OFileWithEntityAndArchitecture) {
        this.checkResets();
        this.checkUnused(this.tree.architecture, this.tree.entity);
        this.checkDoubles();
        this.checkPortDeclaration();
        this.checkInstantiations(this.tree.architecture);
      }
      // this.parser.debugObject(this.tree);
    }
    return this.messages;
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
      if (this.tree.architecture.types.find(typeSearch => type !== typeSearch && type.name.toLowerCase() === typeSearch.name.toLowerCase())) {
        this.addMessage({
          range: type.range,
          severity: DiagnosticSeverity.Error,
          message: `type ${type.name} defined multiple times`
        });
      }
      if (type instanceof OEnum) {
        for (const state of type.states) {
          if (type.states.find(stateSearch => state !== stateSearch && state.name.toLowerCase() === stateSearch.name.toLowerCase())) {
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
    this.addMessage({
      range: write.range,
      severity: DiagnosticSeverity.Error,
      message: `signal '${write.text}' is written but not declared`
    });
  }
  private pushReadError(read: ORead) {
    const code = this.addCodeActionCallback((textDocumentUri: string) => {
      const actions = [];
      for (const pkg of this.projectParser.getPackages()) {
        const thing = pkg.constants.find(constant => constant.name.text.toLowerCase() === read.text.toLowerCase()) || pkg.types.find(type => type.name.toLowerCase() === read.text.toLowerCase())
          || pkg.functions.find(func => func.name.toLowerCase() === read.text.toLowerCase());
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
      if (obj.parent instanceof OMapping && obj.parent.parent instanceof OPortMap) {
        const mapping = obj.parent;
        const entity = this.getProjectEntity(obj.parent.parent.parent);
        if (!entity) {
          continue;
        }
        const port = entity.ports.find(port => mapping.name.find(name => name.text.toLowerCase() === port.name.text.toLowerCase()));
        if (!port) {
          continue;
        }
        if (port.direction === 'in' && obj instanceof OWrite) {
          continue;
        }
      }
      if (obj instanceof ORead) {
        !this.tree.isValidRead(obj, this.packages) && this.pushReadError(obj);
      } else if (obj instanceof OWrite) {
        !this.tree.isValidWrite(obj) && this.pushWriteError(obj);
      }
    }
  }
  checkResets() {
    if (!(this.tree instanceof OFileWithEntityAndArchitecture)) {
      return;
    }
    let signalLike: OSignalLike[] = this.tree.architecture.signals;
    signalLike = signalLike.concat(this.tree.entity.ports);
    for (const signal of signalLike) {
      if (signal.isRegister() === false) {
        continue;
      }
      let resetFound = false;
      for (const process of this.tree.architecture.processes) {
        if (process.isRegisterProcess()) {
          for (const reset of process.getResets()) {
            if (reset.toLowerCase() === signal.name.text.toLowerCase()) {
              resetFound = true;
            }
          }
        }
      }
      const registerProcess = signal.getRegisterProcess();
      if (!resetFound && registerProcess) {
        const code = this.addCodeActionCallback((textDocumentUri: string) => {
          const actions = [];
          for (const statement of registerProcess.statements) {
            if (statement instanceof OIf) {
              for (const clause of statement.clauses) {
                if (clause.condition.match(/res|rst/i)) {
                  let resetValue = null;
                  if (signal.type.match(/^std_u?logic_vector|unsigned|signed/i)) {
                    resetValue = `(others => '0')`;
                  } else if (signal.type.match(/^std_u?logic/i)) {
                    resetValue = `'0'`;
                  } else if (signal.type.match(/^integer|natural|positive/i)) {
                    resetValue = `0`;
                  }
                  if (resetValue !== null) {
                    let positionStart = Position.create(clause.range.start.line, clause.range.start.character);
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
                  }
                }
              }
            }
          }
          return actions;
        });
        const endCharacter = this.text.split('\n')[registerProcess.range.start.line].length;
        const range = Range.create(Position.create(registerProcess.range.start.line, 0), Position.create(registerProcess.range.start.line, endCharacter));
        const message = `Reset '${signal.name}' missing`;
        this.addMessage({
          range,
          code,
          severity: DiagnosticSeverity.Error,
          message
        }, LinterRules.Reset, signal.name.text);
      }
    }
  }

  private checkUnusedPerArchitecture(architecture: OArchitecture, signal: OSignal | OPort) {
    let unread = true;
    let unwritten = true;
    const sigLowName = signal.name.text.toLowerCase();
    for (const process of architecture.processes) {
      if (process.getFlatReads().find(read => read.text.toLowerCase() === sigLowName)) {
        unread = false;
      }
      if (process.getFlatWrites().find(write => write.text.toLowerCase() === sigLowName)) {
        unwritten = false;
      }
    }
    for (const assignment of architecture.assignments) {
      if (assignment.reads.find(read => read.text.toLowerCase() === sigLowName)) {
        unread = false;
      }
      if (assignment.writes.find(write => write.text.toLowerCase() === sigLowName)) {
        unwritten = false;
      }
    }
    for (const signal of architecture.signals) {
      if (signal.reads.find(read => read.text.toLowerCase() === sigLowName)) {
        unread = false;
      }
    }
    for (const instantiation of architecture.instantiations) {
      const entity = this.getProjectEntity(instantiation);
      //       console.log(instantiation.getFlatReads(entity), instantiation.getFlatWrites(entity));
      if (instantiation.getFlatReads(entity).find(read => read.text.toLowerCase() === sigLowName)) {
        unread = false;
      }
      if (instantiation.getFlatWrites(entity).find(read => read.text.toLowerCase() === sigLowName)) {
        unwritten = false;
      }
    }
    for (const generate of architecture.generates) {
      const [unreadChild, unwrittenChild] = this.checkUnusedPerArchitecture(generate, signal);
      if (!unreadChild) {
        unread = false;
      }
      if (!unwrittenChild) {
        unwritten = false;
      }
    }
    return [unread, unwritten];
  }
  private checkUnused(architecture: OArchitecture, entity?: OEntity) {
    if (!architecture) {
      return;
    }
    for (const generate of architecture.generates) {
      this.checkUnused(generate);
    }
    if (entity) {
      for (const port of entity.ports) {
        const [unread, unwritten] = this.checkUnusedPerArchitecture(architecture, port);
        if (unread && port.direction === 'in') {
          this.addMessage({
            range: port.range,
            severity: DiagnosticSeverity.Warning,
            message: `Not reading input port '${port.name}'`
          });
        }
        if (unwritten && port.direction === 'out') {
          this.addMessage({
            range: port.range,
            severity: DiagnosticSeverity.Warning,
            message: `Not writing output port '${port.name}'`
          });
        }
      }
    }
    for (const signal of architecture.signals) {
      const [unread, unwritten] = this.checkUnusedPerArchitecture(architecture, signal);
      if (unread) {
        this.addMessage({
          range: signal.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not reading signal '${signal.name}'`
        });
      }
      if (unwritten && !signal.constant) {
        this.addMessage({
          range: signal.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not writing signal '${signal.name}'`
        });
      }
    }
  }
  checkPortDeclaration() {
    if (this.tree instanceof OFileWithEntity === false) {
      return;
    }
    const tree = this.tree as OFileWithEntity;
    for (const port of tree.entity.ports) {
      if (port.direction === 'in') {
        if (port.name.text.match(/^o_/i)) {
          const code = this.addCodeActionCallback((textDocumentUri: string) => {
            const actions = [];
            const newName = port.name.text.replace(/^o_/, 'i_');
            actions.push(CodeAction.create(
              `Replace portname with '${newName}`,
              {
                changes: {
                  [textDocumentUri]: [TextEdit.replace(port.name.range, newName)]
                }
              },
              CodeActionKind.QuickFix));
            const textEdit2: TextEdit = TextEdit.replace(port.directionRange, 'out');
            actions.push(CodeAction.create(
              `Change port direction to output.`,
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
            message: `input port '${port.name}' begins with 'o_'!`,
            code
          });
        } else if (port.name.text.match(/^i_/i) === null) {
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
            message: `input port '${port.name}' should begin with i_`,
            code
          });
        }
      } else if (port.direction === 'out') {
        if (port.name.text.match(/^i_/i)) {
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
              `Change port direction to input.`,
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
            message: `ouput port '${port.name}' begins with 'i_'!`,
            code
          });
        } else if (port.name.text.match(/^o_/i) === null) {
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
            message: `ouput port '${port.name}' should begin with 'o_'`
          });
        }
      }
    }
  }
  getProjectEntity(instantiation: OInstantiation): OEntity | undefined {
    const projectEntities: OEntity[] = this.projectParser.getEntities();
    if (instantiation.library) {
      const entityWithLibrary = projectEntities.find(entity => entity.name.toLowerCase() === instantiation.componentName.toLowerCase() && typeof entity.library !== 'undefined' && typeof instantiation.library !== 'undefined' && entity.library.toLowerCase() === instantiation.library.toLowerCase());
      if (entityWithLibrary) {
        return entityWithLibrary;
      }
    }
    return projectEntities.find(entity => entity.name.toLowerCase() === instantiation.componentName.toLowerCase());

  }
  checkInstantiations(architecture: OArchitecture) {
    if (!architecture) {
      return;
    }
    for (const instantiation of architecture.instantiations) {
      if (instantiation.entityInstantiation) {
        const entity = this.getProjectEntity(instantiation);
        if (!entity) {
          this.addMessage({
            range: instantiation.range,
            severity: DiagnosticSeverity.Error,
            message: `can not find entity ${instantiation.componentName}`
          });
        } else {
          const foundPorts: OPort[] = [];
          if (instantiation.portMappings) {
            for (const portMapping of instantiation.portMappings.children) {
              const entityPort = entity.ports.find(port => {
                for (const part of portMapping.name) {
                  if (part.text.toLowerCase() === port.name.text.toLowerCase()) {
                    return true;
                  }
                }
                return false;
              });
              if (!entityPort) {
                const bestMatch = findBestMatch(portMapping.name[0].text, entity.ports.map(port => port.name.text));
                const code = this.addCodeActionCallback((textDocumentUri: string) => {
                  const actions = [];
                  actions.push(CodeAction.create(
                    `Replace with ${bestMatch.bestMatch.target} (score: ${bestMatch.bestMatch.rating})`,
                    {
                      changes: {
                        [textDocumentUri]: [TextEdit.replace(Range.create(portMapping.name[0].range.start, portMapping.name[portMapping.name.length - 1].range.start)
                          , bestMatch.bestMatch.target)]
                      }
                    },
                    CodeActionKind.QuickFix));
                  return actions;
                });
                this.addMessage({
                  range: portMapping.range,
                  severity: DiagnosticSeverity.Error,
                  message: `no port ${portMapping.name.map(name => name.text).join(', ')} on entity ${instantiation.componentName}`,
                  code
                });
              } else {
                foundPorts.push(entityPort);
              }
            }
          }
          for (const port of entity.ports) {
            if (port.direction === 'in' && typeof port.defaultValue === 'undefined' && typeof foundPorts.find(portSearch => portSearch === port) === 'undefined') {
              this.addMessage({
                range: instantiation.range,
                severity: DiagnosticSeverity.Error,
                message: `input port ${port.name} is missing in port map and has no default value on entity ${instantiation.componentName}`
              });
            }
          }

        }
      } else {
        this.addMessage({
          range: instantiation.range,
          severity: DiagnosticSeverity.Hint,
          message: `can not evaluate instantiation via component`
        });
      }
    }
    for (const generate of architecture.generates) {
      this.checkInstantiations(generate);
    }
  }

  getIFromPosition(p: Position): number {
    let text = this.text.split('\n').slice(0, p.line);
    let i = text.join('\n').length + p.character;
    return i;
  }
}
// | {
//   title?: string,
//   priority?: number,
//   position: Range,
//   apply: (() => any),
// }
