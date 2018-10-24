import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position';
import {OAssignment, OWrite, ORead, ParserError} from './objects';

export class AssignmentParser extends ParserBase {
  constructor(text: string, pos: ParserPosition, file: string, private parent: object) {
    super(text, pos, file);
    this.debug(`start`);
    this.start = pos.i;
  }
  parse(): OAssignment {
    let assignment = new OAssignment(this.parent, this.pos.i);
    assignment.begin = this.pos.i;
    let leftHandSideI = this.pos.i;
    let leftHandSide = '';
    while (this.text.substr(this.pos.i, 2) !== '<=') {
      leftHandSide += this.text[this.pos.i];
      this.pos.i++;
      if (this.pos.i === this.text.length) {
        throw new ParserError(`expecteded <=, reached end of text. Start on line: ${this.getLine(leftHandSideI)}`, leftHandSideI);
      }
    }
    assignment.writes = this.tokenize(leftHandSide).filter(token => token.type === 'VARIABLE' || token.type === 'FUNCTION').map(token => {
      const write = new OWrite(assignment, leftHandSideI + token.offset);
      write.begin = leftHandSideI;
      // write.begin = leftHandSideI + token.offset;
      write.end = write.begin + token.value.length;
      write.text = token.value;
      return write;
    });
    this.expect('<=');
    let rightHandSide = '';
    let rightHandSideI = this.pos.i;

    assignment.reads = [];
    while (this.text.substr(this.pos.i, 1) !== ';') {
      rightHandSide += this.text[this.pos.i];
      this.pos.i++;
    }
    assignment.reads = this.tokenize(rightHandSide).filter(token => token.type === 'VARIABLE' || token.type === 'FUNCTION').map(token => {
      const read = new ORead(assignment, rightHandSideI + token.offset);
      read.begin = rightHandSideI + token.offset;
      read.end = read.begin + token.value.length;
      read.text = token.value;
      return read;
    });
    this.expect(';');
    // console.log(assignment,  assignment.constructor.name, assignment instanceof Assignment);
    assignment.end = this.pos.i;
    return assignment;
  }



}
