import { OLexerToken } from '../lexer';
import { ArchitectureParser } from './architecture-parser';
import { AssignmentParser } from './assignment-parser';
import { InstantiationParser } from './instantiation-parser';
import { OArchitecture, OCaseGenerate, OEntity, OForGenerate, OIfGenerate, OIfGenerateClause, OIRange, ORead, ParserError } from './objects';
import { ParserPosition } from './parser';
import { ParserBase } from './parser-base';
import { ProcessParser } from './process-parser';
export enum ConcurrentStatementTypes {
  Process,
  ProcedureInstantiation,
  Generate,
  Assignment,
  Assert,
  Block
}
export class ConcurrentStatementParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: OArchitecture | OEntity) {
    super(pos, file);
    this.debug('start');
  }
  parse(allowedStatements: ConcurrentStatementTypes[], previousArchitecture?: OArchitecture, returnOnWhen = false) {
    let nextToken = this.getToken();

    let label: OLexerToken | undefined;
    const savedI = this.pos.i;
    if (this.getToken(1, true).text === ':') {
      label = this.consumeToken();
      this.debug('parse label ' + label);
      this.consumeToken();
      this.advanceWhitespace();
      nextToken = this.getToken();
    }


    if (nextToken.getLText() === 'process' && allowedStatements.includes(ConcurrentStatementTypes.Process)) {
      this.consumeToken();
      const processParser = new ProcessParser(this.pos, this.filePath, this.parent);
      this.parent.statements.push(processParser.parse(savedI, label));
    } else if (nextToken.getLText() === 'block' && allowedStatements.includes(ConcurrentStatementTypes.Block)) {
      this.consumeToken();
      this.debug('parse block');

      const subarchitecture = new ArchitectureParser(this.pos, this.filePath, (this.parent as OArchitecture), label);
      const block = subarchitecture.parse(true, 'block');
      block.range = block.range.copyWithNewStart(savedI);
      this.reverseWhitespace();
      block.range = block.range.copyWithNewEnd(this.pos.i);
      if (typeof label === 'undefined') {
        throw new ParserError('A block needs a label.', block.range);
      }
      block.lexerToken = label;
      this.advanceWhitespace();
      //        console.log(generate, generate.constructor.name);
      (this.parent as OArchitecture).statements.push(block);
    } else if (nextToken .getLText()=== 'for' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      this.consumeToken();
      this.debug('parse for generate');
      if (typeof label === 'undefined') {
        throw new ParserError('A for generate needs a label.', this.pos.getRangeToEndLine());
      }

      const startI = this.pos.i;
      const [constantName] = this.advancePast('in');

      const rangeToken = this.advancePast('generate');
      const constantRange = this.extractReads(this.parent, rangeToken);
      const subarchitecture = new ArchitectureParser(this.pos, this.filePath, (this.parent as OArchitecture), label);
      const generate: OForGenerate = subarchitecture.parse(true, 'generate', { constantName, constantRange, startPosI: startI });
      generate.range = generate.range.copyWithNewStart(savedI);

      this.reverseWhitespace();
      generate.range = generate.range.copyWithNewEnd(this.pos.i);
      this.advanceWhitespace();
      //        console.log(generate, generate.constructor.name);
      (this.parent as OArchitecture).statements.push(generate);
    } else if (nextToken.getLText() === 'when' && returnOnWhen) {
      return true;
    } else if (nextToken.getLText() === 'case' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      if (typeof label === 'undefined') {
        throw new ParserError('A case generate needs a label.', this.pos.getRangeToEndLine());
      }
      const caseGenerate = new OCaseGenerate(this.parent, new OIRange(this.parent, this.pos.i, this.pos.i));
      this.consumeToken();
      const caseConditionToken = this.advancePast('generate');
      caseGenerate.signal.push(...this.extractReads(caseGenerate, caseConditionToken));
      let nextToken = this.getToken();
      while (nextToken.getLText() === 'when') {
        this.expect('when');
        const whenI = this.pos.i;
        const whenConditionToken = this.advancePast('=>');
        const subarchitecture = new ArchitectureParser(this.pos, this.filePath, caseGenerate, label);
        const whenGenerateClause = subarchitecture.parse(true, 'when-generate');
        whenGenerateClause.condition.push(...this.extractReads(whenGenerateClause, whenConditionToken));
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
      caseGenerate.range = caseGenerate.range.copyWithNewEnd(this.pos.i);
      this.advanceWhitespace();
    } else if (nextToken.getLText() === 'if' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      if (typeof label === 'undefined') {
        throw new ParserError('If generate requires a label.', this.pos.getRangeToEndLine());
      }
      const ifGenerate = new OIfGenerate(this.parent, new OIRange(this.parent, this.pos.i, this.pos.i), label);
      this.consumeToken();
      const conditionTokens = this.advancePast('generate');
      this.debug('parse if generate ' + label);
      const subarchitecture = new ArchitectureParser(this.pos, this.filePath, ifGenerate, label);
      const ifGenerateClause = subarchitecture.parse(true, 'generate');
      ifGenerateClause.range = ifGenerateClause.range.copyWithNewStart(savedI);

      if (ifGenerateClause.conditions) {
        ifGenerateClause.conditions = conditionTokens.concat(ifGenerateClause.conditions);
        ifGenerateClause.conditionReads = this.extractReads(ifGenerateClause, conditionTokens).concat(ifGenerateClause.conditionReads);
      } else {
        ifGenerateClause.conditions = conditionTokens;
        ifGenerateClause.conditionReads = this.extractReads(ifGenerateClause, conditionTokens);
      }
      ifGenerate.ifGenerates.push(ifGenerateClause);
      (this.parent as OArchitecture).statements.push(ifGenerate);
      this.reverseWhitespace();
      ifGenerate.range = ifGenerate.range.copyWithNewEnd(this.pos.i);
      ifGenerateClause.range = ifGenerateClause.range.copyWithNewEnd(this.pos.i);
      this.advanceWhitespace();
    } else if (nextToken.getLText() === 'elsif' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      if (!(this.parent instanceof OIfGenerateClause)) {
        throw new ParserError('elsif generate without if generate', this.pos.getRangeToEndLine());
      }
      if (!previousArchitecture) {
        throw new ParserError('WTF', this.pos.getRangeToEndLine());
      }
      previousArchitecture.range = previousArchitecture.range.copyWithNewEnd(this.getToken(-1, true).range.end);

      const condition = this.advancePast('generate');
      this.debug('parse elsif generate ' + label);
      const subarchitecture = new ArchitectureParser(this.pos, this.filePath, this.parent.parent, this.parent.parent.lexerToken);
      const ifGenerateObject = subarchitecture.parse(true, 'generate');
      ifGenerateObject.range = ifGenerateObject.range.copyWithNewStart(savedI);

      if (ifGenerateObject.conditions) {
        ifGenerateObject.conditions = condition.concat(ifGenerateObject.conditions);
        ifGenerateObject.conditionReads = this.extractReads(ifGenerateObject, condition).concat(ifGenerateObject.conditionReads);
      } else {
        ifGenerateObject.conditions = condition;
        ifGenerateObject.conditionReads = this.extractReads(ifGenerateObject, condition);
      }
      this.parent.parent.ifGenerates.push(ifGenerateObject);
      return true;
    } else if (nextToken.getLText() === 'else' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      if (!(this.parent instanceof OIfGenerateClause)) {
        throw new ParserError('else generate without if generate', this.pos.getRangeToEndLine());
      }
      if (!previousArchitecture) {
        throw new ParserError('WTF', this.pos.getRangeToEndLine());
      }
      previousArchitecture.range = previousArchitecture.range.copyWithNewEnd(this.getToken(-1, true).range.copyExtendEndOfLine().end);
      this.advancePast('generate');
      this.debug('parse else generate ' + label);
      const subarchitecture = new ArchitectureParser(this.pos, this.filePath, this.parent.parent, this.parent.parent.lexerToken);

      const elseGenerateObject = subarchitecture.parse(true, 'generate');
      elseGenerateObject.range = elseGenerateObject.range.copyWithNewStart(savedI);
      this.reverseWhitespace();
      elseGenerateObject.range = elseGenerateObject.range.copyWithNewEnd(this.pos.i);
      this.advanceWhitespace();
      this.parent.parent.elseGenerate = elseGenerateObject;
      return true;

    } else if (nextToken.getLText() === 'with' && allowedStatements.includes(ConcurrentStatementTypes.Assignment)) {
      this.consumeToken();
      const readToken = this.consumeToken();
      if (this.getToken().text === '(') {
        this.consumeToken();
        this.advanceClosingParenthese();
      }
      this.consumeToken();
      const assignmentParser = new AssignmentParser(this.pos, this.filePath, this.parent);
      const assignment = assignmentParser.parse();
      const read = new ORead(assignment, readToken);
      assignment.reads.push(read);
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
      while (this.pos.num + i < this.pos.lexerTokens.length) {
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

        const assignmentParser = new AssignmentParser(this.pos, this.filePath, this.parent);
        const assignment = assignmentParser.parse();
        try {
          this.parent.statements.push(assignment);
        } catch (err) {
          throw new ParserError(`AAA`, this.pos.getRangeToEndLine());
        }

      } else {
        const instantiationParser = new InstantiationParser(this.pos, this.filePath, this.parent);
        (this.parent as OArchitecture).statements.push(instantiationParser.parse(nextToken, label));
      }
    }
    return false;
  }

}