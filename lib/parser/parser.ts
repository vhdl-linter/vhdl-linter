import {EntityParser} from './entity-parser';
import {ArchitectureParser} from './architecture-parser';
import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position';
import {OEntity, OArchitecture, OFile} from './objects';


export class Parser extends ParserBase{
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
      } else if (nextWord == 'use') {
        file.useStatements.push(this.getUseStatement());
        this.expect(';');
      } else if (nextWord == 'entity') {
        const entity = new EntityParser(this.text, this.pos, this.file, file);
        file.entity = entity.parse();
        // console.log(file, typeof file.entity, 'typeof');
      } else if (nextWord == 'architecture') {
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
      if (this.text.substr(i, 2) == '--') {
        let start = i;
        while (this.text[i] !== '\n') {
          i++;
        }
        let end = i;
        this.text = this.text.substr(0, start) + ' '.repeat(end - start + 1) + this.text.substr(end);
      }
      i++;
    }
  }

  getUseStatement() {
    let useStatement = '';
    while (this.text[this.pos.i].match(/[\w.]/)) {
      useStatement += this.text[this.pos.i];
      this.pos.i++;
    }
    this.advanceWhitespace();
    return useStatement;
  }

}
