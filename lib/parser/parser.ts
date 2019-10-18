import {EntityParser} from './entity-parser';
import {ArchitectureParser} from './architecture-parser';
import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position';
import {OFile, OUseStatement, ParserError} from './objects';


export class Parser extends ParserBase {
  position: ParserPosition;
  private originalText: string;
  constructor(text: string, file: string, public onlyEntity: boolean = true) {
    super(text, new ParserPosition(), file);
    this.originalText = text;
    this.removeComments();
  }
  parse(): OFile {
    if (this.text.length > 500 * 1024) {
      throw new ParserError('file too large', 0);
    }
    const file = new OFile(this.text, this.file, this.originalText);
    while (this.pos.i < this.text.length) {
      if (this.text[this.pos.i].match(/\s/)) {
        this.pos.i++;
        continue;
      }
      let nextWord = this.getNextWord().toLowerCase();
      if (nextWord === 'library') {
        file.libraries.push(this.getNextWord());
        this.expect(';');
      } else if (nextWord === 'use') {
        file.useStatements.push(this.getUseStatement(file));
        this.expect(';');
      } else if (nextWord === 'entity') {
        const entity = new EntityParser(this.text, this.pos, this.file, file);
        file.entity = entity.parse();
        if (this.onlyEntity) {
          return file;
        }
//         // console.log(file, typeof file.entity, 'typeof');
      } else if (nextWord === 'architecture') {
        if (file.architecture) {
          this.message('Second Architecture not supported');
        }
        const architecture = new ArchitectureParser(this.text, this.pos, this.file, file);
        file.architecture = architecture.parse();

      } else {
        this.pos.i++;
      }
    }
    return file;
  }
  removeComments() {
    let i = 0;
    while (i < this.text.length) {
      if (this.text.substr(i, 2) === '--') {
        let start = i;
        while (this.text[i] !== '\n') {
          i++;
        }
        let end = i;
        this.text = this.text.substr(0, start) + ' '.repeat(end - start) + this.text.substr(end);
      }
      i++;
    }
  }

  getUseStatement(file: OFile) {
    let useStatement = new OUseStatement(file, this.pos.i, this.getEndOfLineI());
    useStatement.begin = this.pos.i;
    useStatement.text = '';
    while (this.text[this.pos.i].match(/[\w.]/)) {
      useStatement.text += this.text[this.pos.i];
      this.pos.i++;
    }
    useStatement.end = useStatement.begin + useStatement.text.length;
    this.advanceWhitespace();
    return useStatement;
  }

}
