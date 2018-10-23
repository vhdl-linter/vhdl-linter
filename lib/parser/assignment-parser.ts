import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position';
import {OAssignment} from './objects';

export class AssignmentParser extends ParserBase {
  constructor(text: string, pos: ParserPosition, file: string) {
    super(text, pos, file);
    this.debug(`start`);
    this.start = pos.i;
  }
  parse(): OAssignment {
    let assignment = new OAssignment(this.pos.i);


    let leftHandSide = '';
    while (this.text.substr(this.pos.i, 2) !== '<=') {
      leftHandSide += this.text[this.pos.i];
      this.pos.i++;
    }
    assignment.writes = this.tokenize(leftHandSide).filter(token => token.type === 'VARIABLE').map(token => token.value);
    this.expect('<=');
    let rightHandSide = '';
    assignment.reads = [];
    while (this.text.substr(this.pos.i, 1) !== ';') {
      rightHandSide += this.text[this.pos.i];
      this.pos.i++;
    }
    assignment.reads = this.tokenize(rightHandSide).filter(token => token.type === 'VARIABLE').map(token => token.value);
    this.expect(';');
    // console.log(assignment,  assignment.constructor.name, assignment instanceof Assignment);
    return assignment;
  }



}
