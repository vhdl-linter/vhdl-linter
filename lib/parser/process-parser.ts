import { ParserBase } from './parser-base';
import { AssignmentParser } from './assignment-parser';

import { OProcess, OStatement, OForLoop, OIf, OIfClause, OCase, OWhenClause, OVariable, ORead, ObjectBase, OI, OElseClause, OName, OWhileLoop } from './objects';
import { tokenizer } from './tokenizer';
import { ProcessLikeParser } from './process-like-parse';
import { DeclarativePartParser } from './declarative-part-parser';

export class ProcessParser extends ProcessLikeParser {
  constructor(text: string, pos: OI, file: string, private parent: ObjectBase) {
    super(text, pos, file);
    this.debug(`start`);

  }
  parse(startI: number, label?: string): OProcess {
    const process = new OProcess(this.parent, startI, this.getEndOfLineI());
    process.label = label;
    if (this.text[this.pos.i] === '(') {
      this.expect('(');
      process.sensitivityList = this.advanceBrace();
    }
    this.maybeWord('is');
    new DeclarativePartParser(this.text, this.pos, this.file, process).parse();
    this.expect('begin');
    process.statements = this.parseStatements(process, ['end']);
    this.expect('end');
    this.expect('process');
    if (label) {
      this.maybeWord(label);
    }
    process.range.end.i = this.pos.i;
    this.expect(';');
    return process;
  }
}
