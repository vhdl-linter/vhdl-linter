import { OLexerToken, TokenType } from '../lexer';
import { ConcurrentStatementParser, ConcurrentStatementTypes } from './concurrent-statement-parser';
import { DeclarativePartParser } from './declarative-part-parser';
import { ExpressionParser } from './expression-parser';
import { OArchitecture, OBlock, OCaseGenerate, OConstant, OFile, OForGenerate, OI, OIfGenerate, OIfGenerateClause, ORead, OReference, OWhenGenerateClause, ParserError } from './objects';
import { ParserBase, ParserState } from './parser-base';

export class StatementBodyParser extends ParserBase {
  entityName: OLexerToken;
  constructor(state: ParserState, private parent: OArchitecture | OFile | OIfGenerate | OCaseGenerate, name?: OLexerToken) {
    super(state);
    this.debug('start');
    if (name) {
      this.entityName = name;
    }
  }
  parse(): OArchitecture;
  parse(skipStart: boolean, structureName: 'when-generate'): OWhenGenerateClause;
  parse(skipStart: boolean, structureName: 'generate'): OIfGenerateClause;
  parse(skipStart: boolean, structureName: 'block'): OBlock;
  parse(skipStart: boolean, structureName: 'generate', forConstant?: { constantName: OLexerToken, constantRange: OReference[], startPosI: number }): OForGenerate;
  parse(skipStart = false, structureName: 'architecture' | 'generate' | 'block' | 'when-generate' = 'architecture', forConstant?: { constantName: OLexerToken, constantRange: OReference[], startPosI: number }): OArchitecture | OForGenerate | OIfGenerateClause | OWhenGenerateClause | OBlock{
    this.debug(`parse`);
    let statementBody;
    if (structureName === 'architecture') {
      statementBody = new OArchitecture(this.parent, this.getToken(-1, true).range.copyExtendEndOfLine());
    } else if (structureName === 'block') {
      statementBody = new OBlock(this.parent, this.getToken(-1, true).range.copyExtendEndOfLine());
      // guarded block
      if (this.getToken().getLText() === '(') {
        const startRange = this.getToken().range;
        this.consumeToken(); // consume '('
        (statementBody as OBlock).guardCondition = new ExpressionParser(this.state, statementBody, this.advanceClosingParenthesis()).parse();
        const guardRange = startRange.copyWithNewEnd(this.getToken().range.end);
        // implicit declare constant GUARD
        const constant = new OConstant(statementBody, guardRange);
        constant.lexerToken = new OLexerToken('GUARD', guardRange, TokenType.basicIdentifier);
        // read GUARD constant to avoid 'not read' warning
        (statementBody as OBlock).guardCondition?.push(new ORead(statementBody, constant.lexerToken));
        statementBody.constants.push(constant);
      }
      this.maybe('is');
    } else if (structureName === 'when-generate') {
      statementBody = new OWhenGenerateClause(this.parent, this.getToken().range.copyExtendEndOfLine());
    } else if (!forConstant) {
      statementBody = new OIfGenerateClause(this.parent, this.getToken().range.copyExtendEndOfLine());
    } else {
      if (this.parent instanceof OFile) {
        throw new ParserError(`For Generate can not be top level architecture!`, this.state.pos.getRangeToEndLine());
      }
      const { constantName, constantRange } = forConstant;
      statementBody = new OForGenerate(this.parent as OArchitecture, this.getToken().range.copyExtendEndOfLine(), constantRange);
      const iterateConstant = new OConstant(statementBody, constantName.range);
      iterateConstant.typeReference = [];
      iterateConstant.lexerToken = constantName;
      statementBody.constants.push(iterateConstant);
    }
    if (skipStart !== true) {
      statementBody.lexerToken = this.consumeIdentifier();
      this.expect('of');
      this.entityName = this.consumeIdentifier();
      if (statementBody instanceof OArchitecture === false) {
        throw new ParserError(`unexpected architecture header`, statementBody.lexerToken.range.copyExtendEndOfLine());
      }
      (statementBody as OArchitecture).entityName = this.entityName;
      this.expect('is');
    }

    new DeclarativePartParser(this.state, (statementBody as OArchitecture)).parse(structureName !== 'architecture');
    statementBody.endOfDeclarativePart = new OI(statementBody, this.state.pos.i);
    this.maybe('begin');

    while (this.state.pos.isValid()) {
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
        if (statementBody.lexerToken) {
          this.maybe(statementBody.lexerToken.text);
        }

        if (this.entityName) {
          this.maybe(this.entityName.text);
        }
        this.expect(';');
        break;
      }
      if (new ConcurrentStatementParser(this.state, statementBody).parse([
        ConcurrentStatementTypes.Assert,
        ConcurrentStatementTypes.Assignment,
        ConcurrentStatementTypes.Generate,
        ConcurrentStatementTypes.Block,
        ConcurrentStatementTypes.ProcedureInstantiation,
        ConcurrentStatementTypes.Process
      ], statementBody, structureName === 'when-generate')) {
        break;
      }
    }
    this.debug('finished parse');
    return statementBody;
  }


}
