import { OLexerToken } from '../lexer';
import { StatementBodyParser } from './statement-body-parser';
import { AssignmentParser } from './assignment-parser';
import { ConcurrentInstantiationParser } from './concurrent-instantiation-parser';
import { OArchitecture, OCaseGenerate, OEntity, OForGenerate, OIfGenerate, OIfGenerateClause, OIRange, ORead, OStatementBody, ParserError } from './objects';
import { ParserBase, ParserState } from './parser-base';
import { ProcessParser } from './process-parser';
import { ExpressionParser } from './expression-parser';
export enum ConcurrentStatementTypes {
  Process,
  ProcedureInstantiation,
  Generate,
  Assignment,
  Assert,
  Block
}
export class ConcurrentStatementParser extends ParserBase {
  constructor(state: ParserState, private parent: OStatementBody | OEntity) {
    super(state);
    this.debug('start');
  }
  parse(allowedStatements: ConcurrentStatementTypes[], previousStatementBody?: OStatementBody, returnOnWhen = false) {
    let nextToken = this.getToken();

    let label: OLexerToken | undefined;
    const savedI = this.state.pos.i;
    if (this.getToken(1, true).text === ':') {
      label = this.consumeToken();
      this.debug('parse label ' + label);
      this.consumeToken();
      this.advanceWhitespace();
      nextToken = this.getToken();
    }


    if (nextToken.getLText() === 'process' && allowedStatements.includes(ConcurrentStatementTypes.Process)) {
      this.consumeToken();
      const processParser = new ProcessParser(this.state, this.parent);
      this.parent.statements.push(processParser.parse(savedI, label));
    } else if (nextToken.getLText() === 'block' && allowedStatements.includes(ConcurrentStatementTypes.Block)) {
      this.consumeToken();
      this.debug('parse block');

      const subarchitecture = new StatementBodyParser(this.state, (this.parent as OArchitecture), label);
      const block = subarchitecture.parse(true, 'block');
      block.range = block.range.copyWithNewStart(savedI);
      this.reverseWhitespace();
      block.range = block.range.copyWithNewEnd(this.state.pos.i);
      if (typeof label === 'undefined') {
        throw new ParserError('A block needs a label.', block.range);
      }
      block.label = label;
      this.advanceWhitespace();
      //        console.log(generate, generate.constructor.name);
      (this.parent as OArchitecture).statements.push(block);
    } else if (nextToken.getLText() === 'for' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      this.consumeToken();
      this.debug('parse for generate');
      if (typeof label === 'undefined') {
        throw new ParserError('A for generate needs a label.', this.state.pos.getRangeToEndLine());
      }

      const startI = this.state.pos.i;
      const [constantName] = this.advancePast('in');

      const rangeToken = this.advancePast('generate');
      const constantRange = new ExpressionParser(this.state, this.parent, rangeToken).parse();
      const subarchitecture = new StatementBodyParser(this.state, (this.parent as OArchitecture), label);
      const generate: OForGenerate = subarchitecture.parse(true, 'generate', { constantName, constantRange, startPosI: startI });
      generate.label = label;
      generate.range = generate.range.copyWithNewStart(savedI);

      this.reverseWhitespace();
      generate.range = generate.range.copyWithNewEnd(this.state.pos.i);
      this.advanceWhitespace();
      //        console.log(generate, generate.constructor.name);
      (this.parent as OArchitecture).statements.push(generate);
    } else if (nextToken.getLText() === 'when' && returnOnWhen) {
      return true;
    } else if (nextToken.getLText() === 'case' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      if (typeof label === 'undefined') {
        throw new ParserError('A case generate needs a label.', this.state.pos.getRangeToEndLine());
      }
      const caseGenerate = new OCaseGenerate(this.parent, new OIRange(this.parent, this.state.pos.i, this.state.pos.i));
      this.consumeToken();
      const caseConditionToken = this.advancePast('generate');
      caseGenerate.expression.push(...new ExpressionParser(this.state, caseGenerate, caseConditionToken).parse());
      let nextToken = this.getToken();
      while (nextToken.getLText() === 'when') {
        this.expect('when');
        let alternativeLabel;
        if (this.getToken(1, true).getLText() === ':') {
          alternativeLabel = this.consumeToken();
          this.expect(':');
        }
        const whenI = this.state.pos.i;
        const whenConditionToken = this.advancePast('=>');
        const subarchitecture = new StatementBodyParser(this.state, caseGenerate, label);
        const whenGenerateClause = subarchitecture.parse(true, 'when-generate', undefined, alternativeLabel);
        whenGenerateClause.condition.push(...new ExpressionParser(this.state, whenGenerateClause, whenConditionToken).parse());
        whenGenerateClause.range = whenGenerateClause.range.copyWithNewStart(whenI);
        nextToken = this.getToken();
      }
      this.expect('end');
      this.expect('generate');
      if (label) {
        this.maybe(label.text);
      }
      this.advanceSemicolon();
      this.reverseWhitespace();
      caseGenerate.range = caseGenerate.range.copyWithNewEnd(this.state.pos.i);
      this.advanceWhitespace();
    } else if (nextToken.getLText() === 'if' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      if (typeof label === 'undefined') {
        throw new ParserError('If generate requires a label.', this.state.pos.getRangeToEndLine());
      }
      const ifGenerate = new OIfGenerate(this.parent, new OIRange(this.parent, this.state.pos.i, this.state.pos.i), label);
      this.consumeToken();
      // There is an alternative label possible
      let alternativeLabel;
      if (this.getToken(1, true).getLText() === ':') {
        alternativeLabel = this.consumeToken();
        this.expect(':');
      }
      const conditionTokens = this.advancePast('generate');
      this.debug('parse if generate ' + label);
      const subarchitecture = new StatementBodyParser(this.state, ifGenerate, label);
      const ifGenerateClause = subarchitecture.parse(true, 'generate', undefined, alternativeLabel);
      ifGenerateClause.range = ifGenerateClause.range.copyWithNewStart(savedI);
      ifGenerateClause.label = alternativeLabel;
      ifGenerateClause.condition = new ExpressionParser(this.state, ifGenerateClause, conditionTokens).parse();
      ifGenerate.ifGenerateClauses.unshift(ifGenerateClause);
      (this.parent as OArchitecture).statements.push(ifGenerate);
      this.reverseWhitespace();
      ifGenerate.range = ifGenerate.range.copyWithNewEnd(this.state.pos.i);
      ifGenerateClause.range = ifGenerateClause.range.copyWithNewEnd(this.state.pos.i);
      this.advanceWhitespace();
    } else if (nextToken.getLText() === 'elsif' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      if (!(this.parent instanceof OIfGenerateClause)) {
        throw new ParserError('elsif generate without if generate', this.state.pos.getRangeToEndLine());
      }
      if (!previousStatementBody) {
        throw new ParserError('elsif without preceding statement body', this.state.pos.getRangeToEndLine());
      }

      this.consumeToken();
      previousStatementBody.range = previousStatementBody.range.copyWithNewEnd(this.getToken(-1, true).range.end);
      // There is an alternative label possible
      let alternativeLabel;
      if (this.getToken(1, true).getLText() === ':') {
        alternativeLabel = this.consumeToken();
        this.expect(':');
      }
      const condition = this.advancePast('generate');
      this.debug('parse elsif generate ' + label);
      const subarchitecture = new StatementBodyParser(this.state, this.parent.parent, this.parent.parent.label);
      const ifGenerateObject = subarchitecture.parse(true, 'generate', undefined, alternativeLabel);
      ifGenerateObject.range = ifGenerateObject.range.copyWithNewStart(savedI);

      ifGenerateObject.condition = new ExpressionParser(this.state, ifGenerateObject, condition).parse();
      this.parent.parent.ifGenerateClauses.unshift(ifGenerateObject);
      return true;
    } else if (nextToken.getLText() === 'else' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      if (!(this.parent instanceof OIfGenerateClause)) {
        throw new ParserError('else generate without if generate', this.state.pos.getRangeToEndLine());
      }
      if (!previousStatementBody) {
        throw new ParserError('WTF', this.state.pos.getRangeToEndLine());
      }
      previousStatementBody.range = previousStatementBody.range.copyWithNewEnd(this.getToken(-1, true).range.copyExtendEndOfLine().end);
      this.consumeToken();
      let alternativeLabel;
      if (this.getToken(1, true).getLText() === ':') {
        alternativeLabel = this.consumeToken();
        this.expect(':');
      }
      this.expect('generate');
      this.debug('parse else generate ' + label);
      const subarchitecture = new StatementBodyParser(this.state, this.parent.parent, this.parent.parent.label);

      const elseGenerateObject = subarchitecture.parse(true, 'else-generate', undefined, alternativeLabel);
      elseGenerateObject.range = elseGenerateObject.range.copyWithNewStart(savedI);
      this.reverseWhitespace();
      elseGenerateObject.range = elseGenerateObject.range.copyWithNewEnd(this.state.pos.i);
      this.advanceWhitespace();
      this.parent.parent.elseGenerateClause = elseGenerateObject;
      return true;

    } else if (nextToken.getLText() === 'with' && allowedStatements.includes(ConcurrentStatementTypes.Assignment)) {
      this.consumeToken();
      const readToken = this.consumeToken();
      if (this.getToken().text === '(') {
        this.consumeToken();
        this.advanceClosingParenthesis();
      }
      this.consumeToken();
      const assignmentParser = new AssignmentParser(this.state, this.parent);
      const assignment = assignmentParser.parse();
      const read = new ORead(assignment, readToken);
      assignment.labelLinks.push(read);
      this.parent.statements.push(assignment);
    } else if (nextToken.getLText() === 'assert' && allowedStatements.includes(ConcurrentStatementTypes.Assert)) {
      this.consumeToken();
      //        console.log('report');
      this.advancePast(';');
    } else {
      let braceLevel = 0;
      let i = 0;
      let assignment = false;
      let foundSemi = false;
      while (this.state.pos.num + i < this.state.pos.lexerTokens.length) {
        if (this.getToken(i).getLText() === '(') {
          braceLevel++;
        } else if (this.getToken(i).getLText() === ')') {
          braceLevel--;
          if (braceLevel < 0) {
            throw new ParserError(`Unexpected )!`, this.getToken(i).range);
          }
        } else if (this.getToken(i).getLText() === ';') {
          foundSemi = true;
          break;
        } else if (this.getToken(i).getLText() === '<=' && braceLevel === 0) {
          assignment = true;
        }
        i++;
      }
      if (!foundSemi) {
        throw new ParserError(`Missing Semicolon!`, this.getToken(0).range);
      }
      if (assignment) {
        if (!allowedStatements.includes(ConcurrentStatementTypes.Assignment)) {
          throw new ParserError(`Unexpected assignment!`, this.getToken(0).range);
        }

        const assignmentParser = new AssignmentParser(this.state, this.parent);
        const assignment = assignmentParser.parse();
        try {
          this.parent.statements.push(assignment);
        } catch (err) {
          throw new ParserError(`AAA`, this.state.pos.getRangeToEndLine());
        }

      } else {
        const instantiationParser = new ConcurrentInstantiationParser(this.state, this.parent);
        (this.parent as OArchitecture).statements.push(instantiationParser.parse(nextToken, label));
      }
    }
    return false;
  }

}