import { OLexerToken, TokenType } from '../lexer';
import { ConcurrentStatementParser, ConcurrentStatementTypes } from './concurrent-statement-parser';
import { DeclarativePartParser } from './declarative-part-parser';
import { ExpressionParser } from './expression-parser';
import { OArchitecture, OBlock, OCaseGenerate, OConstant, OElseGenerateClause, OFile, OForGenerate, OI, OIfGenerate, OIfGenerateClause, ORead, OReference, OWhenGenerateClause, ParserError } from './objects';
import { ParserBase, ParserState } from './parser-base';

export class StatementBodyParser extends ParserBase {
  identifier: OLexerToken;
  constructor(state: ParserState, private parent: OArchitecture | OFile | OIfGenerate | OCaseGenerate, name?: OLexerToken) {
    super(state);
    this.debug('start');
    if (name) {
      this.identifier = name;
    }
  }
  parse(): OArchitecture;
  parse(skipStart: boolean, structureName: 'when-generate', forConstant: undefined, alternativeLabel: OLexerToken | undefined): OWhenGenerateClause;
  parse(skipStart: boolean, structureName: 'generate', forConstant: undefined, alternativeLabel: OLexerToken | undefined): OIfGenerateClause;
  parse(skipStart: boolean, structureName: 'else-generate', forConstant: undefined, alternativeLabel: OLexerToken | undefined): OElseGenerateClause;
  parse(skipStart: boolean, structureName: 'block'): OBlock;
  parse(skipStart: boolean, structureName: 'generate', forConstant?: { constantName: OLexerToken, constantRange: OReference[], startPosI: number }): OForGenerate;
  parse(skipStart = false, structureName: 'architecture' | 'generate' | 'block' | 'when-generate' | 'else-generate' = 'architecture',
    forConstant?: { constantName: OLexerToken, constantRange: OReference[], startPosI: number }, alternativeLabel?: OLexerToken): OArchitecture | OForGenerate | OIfGenerateClause | OWhenGenerateClause | OBlock | OElseGenerateClause{
    this.debug(`parse`);
    let statementBody;
    if (structureName === 'architecture') {
      statementBody = new OArchitecture(this.parent, this.getToken(-1, true).range.copyExtendEndOfLine());
    } else if (structureName === 'block') {
      statementBody = new OBlock(this.parent, this.getToken(-1, true).range.copyExtendEndOfLine());
      statementBody.label = this.identifier;
      // guarded block
      if (this.getToken().getLText() === '(') {
        const startRange = this.getToken().range;
        this.consumeToken(); // consume '('
        statementBody.guardCondition = new ExpressionParser(this.state, statementBody, this.advanceClosingParenthesis()).parse();
        const guardRange = startRange.copyWithNewEnd(this.getToken().range.end);
        // implicit declare constant GUARD
        const constant = new OConstant(statementBody, guardRange);
        constant.lexerToken = new OLexerToken('GUARD', guardRange, TokenType.basicIdentifier, constant.rootFile);
        // read GUARD constant to avoid 'not read' warning
        statementBody.guardCondition.push(new ORead(statementBody, constant.lexerToken));
        statementBody.constants.push(constant);
      }
      this.maybe('is');
    } else if (structureName === 'when-generate') {
      statementBody = new OWhenGenerateClause(this.parent, this.getToken().range.copyExtendEndOfLine());
      statementBody.label = alternativeLabel;
    } else if (structureName === 'else-generate') {
      statementBody = new OElseGenerateClause(this.parent, this.getToken().range.copyExtendEndOfLine());
      statementBody.label = alternativeLabel;
    } else if (!forConstant) {
      statementBody = new OIfGenerateClause(this.parent, this.getToken().range.copyExtendEndOfLine());
      statementBody.label = alternativeLabel;

    } else {
      if (this.parent instanceof OFile) {
        throw new ParserError(`For Generate can not be top level architecture!`, this.state.pos.getRangeToEndLine());
      }
      const { constantName, constantRange } = forConstant;
      statementBody = new OForGenerate(this.parent as OArchitecture, this.getToken().range.copyExtendEndOfLine(), constantRange);
      statementBody.label = this.identifier;
      const iterateConstant = new OConstant(statementBody, constantName.range);
      iterateConstant.typeReference = [];
      iterateConstant.lexerToken = constantName;
      statementBody.constants.push(iterateConstant);
      statementBody.iterationConstant = constantName;
    }
    if (skipStart !== true) {
      statementBody.lexerToken = this.consumeIdentifier();
      this.expect('of');
      this.identifier = this.consumeIdentifier();
      if (statementBody instanceof OArchitecture === false) {
        throw new ParserError(`unexpected architecture header`, statementBody.lexerToken.range.copyExtendEndOfLine());
      }
      (statementBody as OArchitecture).entityName = this.identifier;
      this.expect('is');
    }

    new DeclarativePartParser(this.state, (statementBody as OArchitecture)).parse(structureName !== 'architecture');
    statementBody.endOfDeclarativePart = this.state.pos.pos;
    this.maybe('begin');

    while (this.state.pos.isValid()) {
      this.advanceWhitespace();
      const nextToken = this.getToken();
      if (nextToken.getLText() === 'end') {
        if (structureName === 'generate' || structureName === 'when-generate' || structureName === 'else-generate') {
          // LRM 11.8 Generate statements list an optional end for the generate_statement_body
          if (this.getToken(1, true).getLText() !== 'generate') {
            this.expect('end');
            if (alternativeLabel !== undefined) {
              this.maybe(alternativeLabel.text);
            }
            statementBody.range = statementBody.range.copyWithNewEnd(this.getToken().range);
            this.expect(';');
            continue;
          }
        }
        if (structureName === 'when-generate') {
          break;
        }
        this.consumeToken();
        if (structureName === 'block' || structureName === 'generate') {
          this.expect(structureName);
        } else if (structureName === 'else-generate') {
          this.expect('generate');
        } else {
          this.maybe(structureName);
        }

        if (structureName === 'architecture' ) {
          (statementBody as OArchitecture).endingLexerToken = this.maybe((statementBody as OArchitecture).lexerToken.text);
        } else {
          if (statementBody instanceof OIfGenerateClause || statementBody instanceof OElseGenerateClause) {
            this.maybe(statementBody.parent.label);
          } else {
            this.maybe((statementBody as OBlock | OIfGenerate).label);
          }
        }

        statementBody.range = statementBody.range.copyWithNewEnd(this.getToken().range);
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
