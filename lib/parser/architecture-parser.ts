import { ConcurrentStatementParser, ConcurrentStatementTypes } from './concurrent-statement-parser';
import { DeclarativePartParser } from './declarative-part-parser';
import { OArchitecture, OBlock, OCaseGenerate, OConstant, OFile, OForGenerate, OI, OIfGenerate, OIfGenerateClause, OName, ORead, OVariable, OWhenGenerateClause, ParserError } from './objects';
import { ParserBase } from './parser-base';

export class ArchitectureParser extends ParserBase {
  name: string;
  type?: string;

  constructor(text: string, pos: OI, file: string, private parent: OArchitecture | OFile | OIfGenerate | OCaseGenerate, name?: string) {
    super(text, pos, file);
    this.debug('start');
    if (name) {
      this.name = name;
    }
  }
  public architecture: OArchitecture;
  parse(): OArchitecture;
  parse(skipStart: boolean, structureName: 'when-generate'): OWhenGenerateClause;
  parse(skipStart: boolean, structureName: 'generate'): OIfGenerateClause;
  parse(skipStart: boolean, structureName: 'block'): OBlock;
  parse(skipStart: boolean, structureName: 'generate', forConstant?: { constantName: string, constantRange: ORead[], startPosI: number }): OForGenerate;
  parse(skipStart = false, structureName: 'architecture' | 'generate' | 'block' | 'when-generate' = 'architecture', forConstant?: { constantName: string, constantRange: ORead[], startPosI: number }): OArchitecture | OForGenerate | OIfGenerateClause {
    this.debug(`parse`);
    if (structureName === 'architecture') {
      this.architecture = new OArchitecture(this.parent, this.pos.i, this.getEndOfLineI());
    } else if (structureName === 'block') {
      this.architecture = new OBlock(this.parent, this.pos.i, this.getEndOfLineI());
    } else if (structureName === 'when-generate') {
      this.architecture = new OWhenGenerateClause(this.parent, this.pos.i, this.getEndOfLineI());
    } else if (!forConstant) {
      this.architecture = new OIfGenerateClause(this.parent, this.pos.i, this.getEndOfLineI());
    } else {
      if (this.parent instanceof OFile) {
        throw new ParserError(`For Generate can not be top level architecture!`, this.pos.getRangeToEndLine());
      }
      const { constantName, constantRange, startPosI } = forConstant;
      this.architecture = new OForGenerate(this.parent as OArchitecture, this.pos.i, this.getEndOfLineI(), constantRange);
      const iterateConstant = new OConstant(this.architecture, startPosI, startPosI + constantName.length);
      iterateConstant.type = [];
      iterateConstant.name = new OName(iterateConstant, startPosI, startPosI + constantName.length);
      iterateConstant.name.text = constantName;
      this.architecture.constants.push(iterateConstant);
    }
    if (skipStart !== true) {
      this.type = this.getNextWord();
      this.architecture.identifier = this.type;
      this.expect('of');
      this.name = this.getNextWord();
      this.architecture.entityName = this.name;
      this.expect('is');
    }

    new DeclarativePartParser(this.text, this.pos, this.file, this.architecture).parse(structureName !== 'architecture');
    this.architecture.endOfDeclarativePart = new OI(this.architecture, this.pos.i);
    this.maybeWord('begin');

    while (this.pos.i < this.text.length) {
      this.advanceWhitespace();
      let nextWord = this.getNextWord({ consume: false }).toLowerCase();
      if (nextWord === 'end') {
        if (structureName === 'when-generate') {
          break;
        }
        this.getNextWord();
        if (structureName === 'block') {
          this.expect(structureName);
        } else {
          this.maybeWord(structureName);
        }
        if (typeof this.type !== 'undefined') {
          this.maybeWord(this.type);
        }

        if (this.name) {
          this.maybeWord(this.name);
        }
        this.expect(';');
        break;
      }
      const statementParser = new ConcurrentStatementParser(this.text, this.pos, this.file, this.architecture);
      if (statementParser.parse([
        ConcurrentStatementTypes.Assert,
        ConcurrentStatementTypes.Assignment,
        ConcurrentStatementTypes.Generate,
        ConcurrentStatementTypes.Block,
        ConcurrentStatementTypes.ProcedureInstantiation,
        ConcurrentStatementTypes.Process
      ], this.architecture, structureName === 'when-generate')) {
        break;
      }
    }
    this.debug('finished parse');
    return this.architecture;
  }


}
