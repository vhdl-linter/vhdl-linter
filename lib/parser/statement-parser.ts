import { ParserBase } from './parser-base';
import { OI, OEntity, OArchitecture, OForGenerate, ParserError, ORead, OIfGenerateClause, OIfGenerate, OProcedure, OName } from './objects';
import { ProcessParser } from './process-parser';
import { AssignmentParser } from './assignment-parser';
import { InstantiationParser } from './instantiation-parser';
import { ArchitectureParser } from './architecture-parser';
export enum StatementTypes {
  Process,
  ProcedureInstantiation,
  Generate,
  Assignment,
  Assert,
  Block
}
export class StatementParser extends ParserBase {
  constructor(text: string, pos: OI, file: string, private parent: OArchitecture | OEntity) {
    super(text, pos, file);
    this.debug('start');
  }
  parse(allowedStatements: StatementTypes[], previousArchitecture?: OArchitecture) {
    let nextWord = this.getNextWord({ consume: false }).toLowerCase();

    let label;
    const savedI = this.pos.i;
    const regex = new RegExp(`^${nextWord}\\s*:`, 'i');
    if (this.text.substr(this.pos.i).match(regex)) {
      label = this.getNextWord();
      this.debug('parse label ' + label);
      this.pos.i++;
      this.advanceWhitespace();
      nextWord = this.getNextWord({ consume: false }).toLowerCase();
    }

    if (nextWord === 'process' && allowedStatements.includes(StatementTypes.Process)) {
      this.getNextWord();
      const processParser = new ProcessParser(this.text, this.pos, this.file, this.parent);
      this.parent.statements.push(processParser.parse(savedI, label));
    } else if (nextWord === 'block' && allowedStatements.includes(StatementTypes.Block)) {
      this.getNextWord();
      this.debug('parse block');


      const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, (this.parent as OArchitecture), label);
      const block = subarchitecture.parse(true, 'block');
      block.label = label ?? 'no label';
      block.range.start.i = savedI;
      this.reverseWhitespace();
      block.range.end.i = this.pos.i;
      this.advanceWhitespace();
      //        console.log(generate, generate.constructor.name);
      (this.parent as OArchitecture).statements.push(block);
    } else if (nextWord === 'for' && allowedStatements.includes(StatementTypes.Generate)) {
      this.getNextWord();
      this.debug('parse for generate');

      const startI = this.pos.i;
      let variable = this.advancePast(/\bin\b/i);

      const rangeI = this.pos.i;
      const rangeText = this.advancePast(/\bgenerate\b/i).trim();
      const variableRange = this.extractReads(this.parent, rangeText, rangeI);
      const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, (this.parent as OArchitecture), label);
      const generate: OForGenerate = subarchitecture.parse(true, 'generate', { variable, variableRange, startPosI: startI });
      generate.range.start.i = savedI;
      this.reverseWhitespace();
      generate.range.end.i = this.pos.i;
      this.advanceWhitespace();
      //        console.log(generate, generate.constructor.name);
      (this.parent as OArchitecture).statements.push(generate);
    } else if (nextWord === 'if' && allowedStatements.includes(StatementTypes.Generate)) {
      const ifGenerate = new OIfGenerate(this.parent, this.pos.i, this.pos.i);
      this.getNextWord();
      let conditionI = this.pos.i;
      let condition = this.advancePast(/\bgenerate\b/i);
      this.debug('parse if generate ' + label);
      const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, ifGenerate, label);
      const ifGenerateClause = subarchitecture.parse(true, 'generate');
      ifGenerateClause.range.start.i = savedI;
      if (ifGenerateClause.conditions) {
        ifGenerateClause.conditions = [condition].concat(ifGenerateClause.conditions);
        ifGenerateClause.conditionReads = this.extractReads(ifGenerateClause, condition, conditionI).concat(ifGenerateClause.conditionReads);
      } else {
        ifGenerateClause.conditions = [condition];
        ifGenerateClause.conditionReads = this.extractReads(ifGenerateClause, condition, conditionI);
      }
      ifGenerate.ifGenerates.push(ifGenerateClause);
      (this.parent as OArchitecture).statements.push(ifGenerate);
      this.reverseWhitespace();
      ifGenerate.range.end.i = this.pos.i;
      ifGenerateClause.range.end.i = this.pos.i;
      this.advanceWhitespace();
    } else if (nextWord === 'elsif' && allowedStatements.includes(StatementTypes.Generate)) {
      if (!(this.parent instanceof OIfGenerateClause)) {
        throw new ParserError('elsif generate without if generate', this.pos.getRangeToEndLine());
      }
      if (!previousArchitecture) {
        throw new ParserError('WTF', this.pos.getRangeToEndLine());
      }
      previousArchitecture.range.end.line = this.pos.line - 1;
      previousArchitecture.range.end.character = 999;

      let conditionI = this.pos.i;
      let condition = this.advancePast(/\bgenerate\b/i);
      this.debug('parse elsif generate ' + label);
      const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, this.parent.parent, label);
      const ifGenerateObject = subarchitecture.parse(true, 'generate');
      ifGenerateObject.range.start.i = savedI;
      if (ifGenerateObject.conditions) {
        ifGenerateObject.conditions = [condition].concat(ifGenerateObject.conditions);
        ifGenerateObject.conditionReads = this.extractReads(ifGenerateObject, condition, conditionI).concat(ifGenerateObject.conditionReads);
      } else {
        ifGenerateObject.conditions = [condition];
        ifGenerateObject.conditionReads = this.extractReads(ifGenerateObject, condition, conditionI);
      }
      this.parent.parent.ifGenerates.push(ifGenerateObject);
      return true;
    } else if (nextWord === 'else' && allowedStatements.includes(StatementTypes.Generate)) {
      if (!(this.parent instanceof OIfGenerateClause)) {
        throw new ParserError('elsif generate without if generate', this.pos.getRangeToEndLine());
      }
      if (!previousArchitecture) {
        throw new ParserError('WTF', this.pos.getRangeToEndLine());
      }
      previousArchitecture.range.end.line = this.pos.line - 1;
      previousArchitecture.range.end.character = 999;
      this.advancePast(/\bgenerate\b/i);
      this.debug('parse else generate ' + label);
      const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, this.parent.parent, label);

      const ifGenerateObject = subarchitecture.parse(true, 'generate');
      ifGenerateObject.range.start.i = savedI;
      this.reverseWhitespace();
      ifGenerateObject.range.end.i = this.pos.i;
      this.advanceWhitespace();
      this.parent.parent.elseGenerate = ifGenerateObject;
      return true;

      // this.getNextWord();
      // if (!(this.parent instanceof OArchitecture)) {
      //   throw new ParserError('Found Else generate without preceding if generate', this.pos.i);
      // }
      // this.debug('parse else generate ' + this.name);
      // this.advancePast(/\bgenerate\b/i);
    } else if (nextWord === 'with' && allowedStatements.includes(StatementTypes.Assignment)) {
      this.getNextWord();
      const beforeI = this.pos.i;
      const readText = this.getNextWord();
      const afterI = this.pos.i;
      if (this.test(/^\(/)) {
        this.pos.i++;
        this.advanceBrace();
      }
      this.getNextWord();
      const assignmentParser = new AssignmentParser(this.text, this.pos, this.file, this.parent);
      const assignment = assignmentParser.parse();
      const read = new ORead(assignment, beforeI, afterI, readText);
      assignment.reads.push(read);
      this.parent.statements.push(assignment);
    } else if (nextWord === 'assert' && allowedStatements.includes(StatementTypes.Assert)) {
      this.getNextWord();
      //        console.log('report');
      this.advancePast(';');
    } else if (this.test(/^[\w.]+\s*\([^<]*;/) && allowedStatements.includes(StatementTypes.ProcedureInstantiation)) {
      const instantiationParser = new InstantiationParser(this.text, this.pos, this.file, this.parent);
      (this.parent as OArchitecture).statements.push(instantiationParser.parse(nextWord, label, savedI, true));
    } else if (allowedStatements.includes(StatementTypes.Assignment)) { // TODO  others
      if (label) {
        this.getNextWord();
        const instantiationParser = new InstantiationParser(this.text, this.pos, this.file, this.parent);
        (this.parent as OArchitecture).statements.push(instantiationParser.parse(nextWord, label, savedI, false));
      } else { // statement;
        const assignmentParser = new AssignmentParser(this.text, this.pos, this.file, this.parent);
        const assignment = assignmentParser.parse();
        this.parent.statements.push(assignment);

      }
    } else {
      throw new ParserError(`Unexpected Statement`, this.pos.getRangeToEndLine());
    }
    return false;
  }
}