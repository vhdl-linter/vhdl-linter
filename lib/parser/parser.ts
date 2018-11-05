import {EntityParser} from './entity-parser';
import {ArchitectureParser} from './architecture-parser';
import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position';
import {OEntity, OArchitecture, OFile, OUseStatement} from './objects';


export class Parser extends ParserBase {
  position: ParserPosition;
  constructor(text: string, file: string) {
    super(text, new ParserPosition(), file);
    this.removeComments();
  }
  parse(): OFile {
    const file = new OFile();
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
    let useStatement = new OUseStatement(file, this.pos.i);
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
