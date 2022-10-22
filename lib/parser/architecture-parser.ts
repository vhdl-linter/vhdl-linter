import { OLexerToken } from '../lexer';
import { ConcurrentStatementParser, ConcurrentStatementTypes } from './concurrent-statement-parser';
import { DeclarativePartParser } from './declarative-part-parser';
import { OArchitecture, OBlock, OCaseGenerate, OConstant, OFile, OForGenerate, OI, OIfGenerate, OIfGenerateClause, ORead, OWhenGenerateClause, ParserError } from './objects';
import { ParserPosition } from './parser';
import { ParserBase } from './parser-base';

export class ArchitectureParser extends ParserBase {
  entityName: OLexerToken;
  constructor(pos: ParserPosition, file: string, private parent: OArchitecture | OFile | OIfGenerate | OCaseGenerate, name?: OLexerToken) {
    super(pos, file);
    this.debug('start');
    if (name) {
      this.entityName = name;
    }
  }
  public architecture: OArchitecture;
  parse(): OArchitecture;
  parse(skipStart: boolean, structureName: 'when-generate'): OWhenGenerateClause;
  parse(skipStart: boolean, structureName: 'generate'): OIfGenerateClause;
  parse(skipStart: boolean, structureName: 'block'): OBlock;
  parse(skipStart: boolean, structureName: 'generate', forConstant?: { constantName: OLexerToken, constantRange: ORead[], startPosI: number }): OForGenerate;
  parse(skipStart = false, structureName: 'architecture' | 'generate' | 'block' | 'when-generate' = 'architecture', forConstant?: { constantName: OLexerToken, constantRange: ORead[], startPosI: number }): OArchitecture | OForGenerate | OIfGenerateClause {
    this.debug(`parse`);
    if (structureName === 'architecture') {
      this.architecture = new OArchitecture(this.parent, this.getToken().range.copyExtendEndOfLine());
    } else if (structureName === 'block') {
      this.architecture = new OBlock(this.parent, this.getToken().range.copyExtendEndOfLine());
    } else if (structureName === 'when-generate') {
      this.architecture = new OWhenGenerateClause(this.parent, this.getToken().range.copyExtendEndOfLine());
    } else if (!forConstant) {
      this.architecture = new OIfGenerateClause(this.parent, this.getToken().range.copyExtendEndOfLine());
    } else {
      if (this.parent instanceof OFile) {
        throw new ParserError(`For Generate can not be top level architecture!`, this.pos.getRangeToEndLine());
      }
      const { constantName, constantRange } = forConstant;
      this.architecture = new OForGenerate(this.parent as OArchitecture, this.getToken().range.copyExtendEndOfLine(), constantRange);
      const iterateConstant = new OConstant(this.architecture, constantName.range);
      iterateConstant.type = [];
      iterateConstant.lexerToken = constantName;
      this.architecture.constants.push(iterateConstant);
    }
    if (skipStart !== true) {
      this.architecture.lexerToken = this.consumeToken();
      this.expect('of');
      this.entityName = this.consumeToken();
      this.architecture.entityName = this.entityName;
      this.expect('is');
    }

    new DeclarativePartParser(this.pos, this.filePath, this.architecture).parse(structureName !== 'architecture');
    this.architecture.endOfDeclarativePart = new OI(this.architecture, this.pos.i);
    this.maybe('begin');

    while (this.pos.isValid()) {
      this.advanceWhitespace();
      const nextToken = this.getToken();
      if (nextToken.getLText() === 'end') {
        if (structureName === 'when-generate') {
          break;
        }
        this.consumeToken();
        if (structureName === 'block') {
          this.expect(structureName);
        } else {
          this.maybe(structureName);
        }
        if (this.architecture.lexerToken) {
          this.maybe(this.architecture.lexerToken.text);
        }

        if (this.entityName) {
          this.maybe(this.entityName.text);
        }
        this.expect(';');
        break;
      }
      const statementParser = new ConcurrentStatementParser(this.pos, this.filePath, this.architecture);
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
