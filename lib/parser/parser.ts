import {EntityParser, IEntity} from './entity-parser';
import {ArchitectureParser, IArchitecture} from './architecture-parser';
import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position';

export interface IFile {
  libraries: string[];
  useStatements: string[];
  entity: IEntity;
  architecture: IArchitecture;
}
export class Parser extends ParserBase{
  libraries: string[] = [];
  useStatements: string[] = [];
  entity: IEntity;
  architecture: IArchitecture;
  position: ParserPosition;
  constructor(text: string) {
    super(text, new ParserPosition());
    this.removeComments();
    this.parse();
  }
  parse(): IFile {
    while (this.pos.i < this.text.length) {
      if (this.text[this.pos.i].match(/\s/)) {
        this.pos.i++;
        continue;
      }
      let nextWord = this.getNextWord().toLowerCase();
      if (nextWord === 'library') {
        this.libraries.push(this.getNextWord());
        this.expect(';');
      } else if (nextWord == 'use') {
        this.useStatements.push(this.getUseStatement());
        this.expect(';');
      } else if (nextWord == 'entity') {
        const entity = new EntityParser(this.text, this.pos);
        this.entity = entity.parse();
      } else if (nextWord == 'architecture') {
        if (this.architecture) {
          this.message('Second Architecture not supported');
        }
        const architecture = new ArchitectureParser(this.text, this.pos);
        this.architecture = architecture.parse();
      } else {
        this.pos.i++;
      }
    }
    return {
      libraries: this.libraries,
      useStatements: this.useStatements,
      entity: this.entity,
      architecture: this.architecture
    };
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
