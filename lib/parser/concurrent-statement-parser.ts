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
    let nextWord = this.getNextWord({ consume: false }).toLowerCase();

    let label: OLexerToken | undefined;
    const savedI = this.pos.i;
    if (this.getToken(1, true).text === ':') {
      label = this.consumeToken();
      this.debug('parse label ' + label);
      this.consumeToken();
      this.advanceWhitespace();
      nextWord = this.getNextWord({ consume: false }).toLowerCase();
    }

    this.maybeWord('postponed');
    this.maybeWord('guarded');

    if (nextWord === 'process' && allowedStatements.includes(ConcurrentStatementTypes.Process)) {
      this.getNextWord();
      const processParser = new ProcessParser(this.pos, this.filePath, this.parent);
      this.parent.statements.push(processParser.parse(savedI, label));
    } else if (nextWord === 'block' && allowedStatements.includes(ConcurrentStatementTypes.Block)) {
      this.getNextWord();
      this.debug('parse block');

      const subarchitecture = new ArchitectureParser(this.pos, this.filePath, (this.parent as OArchitecture), label);
      const block = subarchitecture.parse(true, 'block');
      block.range = block.range.copyWithNewStart(savedI);
      this.reverseWhitespace();
      block.range = block.range.copyWithNewEnd(this.pos.i);
      if (typeof label === 'undefined') {
        throw new ParserError('A block needs a label.', block.range);
      }
      block.label = label;
      this.advanceWhitespace();
      //        console.log(generate, generate.constructor.name);
      (this.parent as OArchitecture).statements.push(block);
    } else if (nextWord === 'for' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      this.getNextWord();
      this.debug('parse for generate');
      if (typeof label === 'undefined') {
        throw new ParserError('A for generate needs a label.', this.pos.getRangeToEndLine());
      }

      const startI = this.pos.i;
      const [constantName] = this.advancePastToken('in');

      const rangeToken = this.advancePastToken('generate');
      const constantRange = this.extractReads(this.parent, rangeToken);
      const subarchitecture = new ArchitectureParser(this.pos, this.filePath, (this.parent as OArchitecture), label);
      const generate: OForGenerate = subarchitecture.parse(true, 'generate', { constantName, constantRange, startPosI: startI });
      generate.range = generate.range.copyWithNewStart(savedI);

      this.reverseWhitespace();
      generate.range = generate.range.copyWithNewEnd(this.pos.i);
      this.advanceWhitespace();
      //        console.log(generate, generate.constructor.name);
      (this.parent as OArchitecture).statements.push(generate);
    } else if (nextWord === 'when' && returnOnWhen) {
      return true;
    } else if (nextWord === 'case' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      if (typeof label === 'undefined') {
        throw new ParserError('A case generate needs a label.', this.pos.getRangeToEndLine());
      }
      const caseGenerate = new OCaseGenerate(this.parent, new OIRange(this.parent, this.pos.i, this.pos.i));
      this.getNextWord();
      const caseConditionToken = this.advancePastToken('generate');
      caseGenerate.signal.push(...this.extractReads(caseGenerate, caseConditionToken));
      let nextWord = this.getNextWord({ consume: false });
      while (nextWord.toLowerCase() === 'when') {
        this.expect('when');
        const whenI = this.pos.i;
        const whenConditionToken = this.advancePastToken('=>');
        const subarchitecture = new ArchitectureParser(this.pos, this.filePath, caseGenerate, label);
        const whenGenerateClause = subarchitecture.parse(true, 'when-generate');
        whenGenerateClause.condition.push(...this.extractReads(whenGenerateClause, whenConditionToken));
        whenGenerateClause.range = whenGenerateClause.range.copyWithNewStart(whenI);
        nextWord = this.getNextWord({ consume: false });
      }
      this.expect('end');
      this.expect('generate');
      if (label) {
        this.maybeWord(label.text);
      }
      this.advanceSemicolonToken();
      this.reverseWhitespace();
      caseGenerate.range = caseGenerate.range.copyWithNewEnd(this.pos.i);
      this.advanceWhitespace();
    } else if (nextWord === 'if' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      const ifGenerate = new OIfGenerate(this.parent, new OIRange(this.parent, this.pos.i, this.pos.i));
      this.getNextWord();
      const conditionTokens = this.advancePastToken('generate');
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
    } else if (nextWord === 'elsif' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      if (!(this.parent instanceof OIfGenerateClause)) {
        throw new ParserError('elsif generate without if generate', this.pos.getRangeToEndLine());
      }
      if (!previousArchitecture) {
        throw new ParserError('WTF', this.pos.getRangeToEndLine());
      }
      previousArchitecture.range = previousArchitecture.range.copyWithNewEnd(this.getToken(-1, true).range.end);

      const condition = this.advancePastToken('generate');
      this.debug('parse elsif generate ' + label);
      const subarchitecture = new ArchitectureParser(this.pos, this.filePath, this.parent.parent, label);
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
    } else if (nextWord === 'else' && allowedStatements.includes(ConcurrentStatementTypes.Generate)) {
      if (!(this.parent instanceof OIfGenerateClause)) {
        throw new ParserError('elsif generate without if generate', this.pos.getRangeToEndLine());
      }
      if (!previousArchitecture) {
        throw new ParserError('WTF', this.pos.getRangeToEndLine());
      }
      previousArchitecture.range = previousArchitecture.range.copyWithNewEnd(this.getToken(-1, true).range.copyExtendEndOfLine().end);
      this.advancePast('generate');
      this.debug('parse else generate ' + label);
      const subarchitecture = new ArchitectureParser(this.pos, this.filePath, this.parent.parent, label);

      const ifGenerateObject = subarchitecture.parse(true, 'generate');
      ifGenerateObject.range = ifGenerateObject.range.copyWithNewStart(savedI);
      this.reverseWhitespace();
      ifGenerateObject.range = ifGenerateObject.range.copyWithNewEnd(this.pos.i);
      this.advanceWhitespace();
      this.parent.parent.elseGenerate = ifGenerateObject;
      return true;

      // this.getNextWord();
      // if (!(this.parent instanceof OArchitecture)) {
      //   throw new ParserError('Found Else generate without preceding if generate', this.pos.i);
      // }
      // this.debug('parse else generate ' + this.name);
      // this.advancePast(/\bgenerate\b/i);
    } else if (nextWord === 'with' && allowedStatements.includes(ConcurrentStatementTypes.Assignment)) {
      this.getNextWord();
      const readToken = this.consumeToken();
      if (this.getToken().text === '(') {
        this.consumeToken();
        this.advanceBrace();
      }
      this.getNextWord();
      const assignmentParser = new AssignmentParser(this.pos, this.filePath, this.parent);
      const assignment = assignmentParser.parse();
      const read = new ORead(assignment, readToken);
      assignment.reads.push(read);
      this.parent.statements.push(assignment);
    } else if (nextWord === 'assert' && allowedStatements.includes(ConcurrentStatementTypes.Assert)) {
      this.getNextWord();
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
        (this.parent as OArchitecture).statements.push(instantiationParser.parse(nextWord, label, savedI));
      }
    }
    return false;
  }

}