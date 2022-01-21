import { ParserBase } from './parser-base';
import { AssignmentParser } from './assignment-parser';

import { OProcess, OStatement, OForLoop, OIf, OIfClause, OCase, OWhenClause, OVariable, ORead, ObjectBase, OI, OElseClause, OName, OProcedure, OWhileLoop } from './objects';
import { tokenizer } from './tokenizer';
import { ProcessLikeParser } from './process-like-parse';
import { DeclarativePartParser } from './declarative-part-parser';

export class ProcedureParser extends ProcessLikeParser {
  constructor(text: string, pos: OI, file: string, private parent: ObjectBase) {
    super(text, pos, file);
    this.debug(`start`);

  }
  parse(startI: number, label?: string): OProcedure {
    const beforeNameI = this.pos.i;
    const name = this.getNextWord();
    const procedure = new OProcedure(this.parent, startI, this.getEndOfLineI());
    procedure.name = new OName(procedure, beforeNameI, beforeNameI + name.length);
    procedure.name.text = name;

    if (this.text[this.pos.i] === '(') {
      // this.expect('(');
      this.parsePortsAndGenerics(false, procedure);
    } else {
      procedure.parameter = '';
    }
    let nextWord = this.getNextWord({consume: false});
    if (nextWord === 'is') {
      this.expect('is');
      new DeclarativePartParser(this.text, this.pos, this.file, procedure).parse();
      this.expect('begin');
      procedure.statements = this.parseStatements(procedure, ['end']);
      this.expect('end');
      this.maybeWord('procedure');
      this.maybeWord(name);
      procedure.range.end.i = this.pos.i;

    }
    this.expect(';');

    return procedure;
  }

}
