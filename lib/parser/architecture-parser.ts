import { ParserBase } from './parser-base';
import { ProcessParser } from './process-parser';
import { InstantiationParser } from './instantiation-parser';
import { OArchitecture, ParserError, OForGenerate, OIfGenerateClause, OFile, ORead, OI, OProcedureInstantiation, OVariable, OName, OIfGenerate, OBlock } from './objects';
import { AssignmentParser } from './assignment-parser';
import { DeclarativePartParser } from './declarative-part-parser';
import { StatementParser, StatementTypes } from './statement-parser';

export class ArchitectureParser extends ParserBase {
  name: string;
  constructor(text: string, pos: OI, file: string, private parent: OArchitecture | OFile | OIfGenerate, name?: string) {
    super(text, pos, file);
    this.debug('start');
    if (name) {
      this.name = name;
    }
  }
  public architecture: OArchitecture;
  parse(): OArchitecture;
  // parse(skipStart: boolean, structureName: 'generate'): OForGenerate;
  parse(skipStart: boolean, structureName: 'generate'): OIfGenerateClause;
  parse(skipStart: boolean, structureName: 'block'): OBlock;
  parse(skipStart: boolean, structureName: 'generate', variable: { variable: string, start: string, end: string, startPosI: number }): OForGenerate;
  parse(skipStart = false, structureName: 'architecture' | 'generate' | 'block' = 'architecture', forShit?: { variable: string, start: string, end: string, startPosI: number }): OArchitecture | OForGenerate | OIfGenerateClause {
    this.debug(`parse`);
    if (structureName === 'architecture') {
      this.architecture = new OArchitecture(this.parent, this.pos.i, this.getEndOfLineI());
    } else if (structureName === 'block') {
      this.architecture = new OBlock(this.parent, this.pos.i, this.getEndOfLineI());
    } else if (!forShit) {
      this.architecture = new OIfGenerateClause(this.parent, this.pos.i, this.getEndOfLineI());
    } else {
      if (this.parent instanceof OFile) {
        throw new ParserError(`For Generate can not be top level architecture!`, this.pos.getRangeToEndLine());
      }
      const { variable, start, end, startPosI } = forShit as { variable: string, start: string, end: string, startPosI: number };
      this.architecture = new OForGenerate(this.parent as OArchitecture, this.pos.i, this.getEndOfLineI(), start, end);
      const variableObject = new OVariable(this.architecture, startPosI, startPosI + variable.length);
      variableObject.type = [];
      variableObject.name = new OName(variableObject, startPosI, startPosI + variable.length);
      variableObject.name.text = variable;
      (this.architecture as OForGenerate).variable = variableObject;
    }
    if (skipStart !== true) {
      this.type = this.getNextWord();
      this.expect('of');
      this.name = this.getNextWord();
      this.expect('is');
    }

    new DeclarativePartParser(this.text, this.pos, this.file, this.architecture).parse(structureName !== 'architecture');
    this.maybeWord('begin');

    while (this.pos.i < this.text.length) {
      this.advanceWhitespace();
      let nextWord = this.getNextWord({ consume: false }).toLowerCase();
      if (nextWord === 'end') {
        this.getNextWord();
        if (structureName === 'block') {
          this.expect(structureName);
        } else {
          this.maybeWord(structureName);
        }
        if (this.name) {
          this.maybeWord(this.name);
        }
        this.expect(';');
        break;
      }
      const statementParser = new StatementParser(this.text, this.pos, this.file, this.architecture);
      if (statementParser.parse([
        StatementTypes.Assert,
        StatementTypes.Assignment,
        StatementTypes.Generate,
        StatementTypes.Block,
        StatementTypes.ProcedureInstantiation,
        StatementTypes.Process
      ], this.architecture)) {
        break;
      }
    }
    this.debug('finished parse');
    return this.architecture;
  }


}
