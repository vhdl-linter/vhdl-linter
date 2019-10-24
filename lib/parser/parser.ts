import {EntityParser} from './entity-parser';
import {ArchitectureParser} from './architecture-parser';
import {ParserBase} from './parser-base';
import {OFile, OUseStatement, ParserError, OEntity, OArchitecture, OPackage, OFileWithEntity, OFileWithPackage, OFileWithEntityAndArchitecture, OI, ObjectBase} from './objects';
import { PackageParser } from './package-parser';


export class Parser extends ParserBase {
  position: OI;
  private originalText: string;
  constructor(text: string, file: string, public onlyEntity: boolean = false) {
    super(text, {} as OI, file);
    this.originalText = text;
    this.removeComments();
  }
  parse(): OFileWithPackage|OFileWithEntity|OFile {
    const file = new OFile(this.text, this.file, this.originalText);
    this.pos = new OI(file, 0);
    if (this.text.length > 500 * 1024) {
      throw new ParserError('file too large', this.pos);
    }
    let entity: OEntity|undefined;
    let architecture: OArchitecture|undefined;
    let pkg: OPackage|undefined;
    while (this.pos.i < this.text.length) {
      this.advanceWhitespace();
      let nextWord = this.getNextWord().toLowerCase();
      if (nextWord === 'library') {
        file.libraries.push(this.getNextWord());
        this.expect(';');
      } else if (nextWord === 'use') {
        file.useStatements.push(this.getUseStatement(file));
        this.expect(';');
      } else if (nextWord === 'entity') {
        const entityParser = new EntityParser(this.text, this.pos, this.file, file as OFileWithEntity);
        entity = entityParser.parse();
        if (this.onlyEntity) {
          Object.setPrototypeOf(file, OFileWithEntity.prototype);
          (file as OFileWithEntity).entity = entity;
          return file;
        }
//         // console.log(file, typeof file.entity, 'typeof');
      } else if (nextWord === 'architecture') {
        if (architecture) {
          this.message('Second Architecture not supported');
        }
        const architectureParser = new ArchitectureParser(this.text, this.pos, this.file, file);
        architecture = architectureParser.parse();
      } else if (nextWord === 'package') {
        const packageParser = new PackageParser(this.text, this.pos, this.file);
        pkg = packageParser.parse(file);
        Object.setPrototypeOf(file, OFileWithPackage.prototype);
        (file as OFileWithPackage).package = pkg;
        return file;
      } else {
        this.pos.i++;
      }
    }
    if (architecture && entity) {
      Object.setPrototypeOf(file, OFileWithEntityAndArchitecture.prototype);
      (file as OFileWithEntityAndArchitecture).architecture = architecture;
      (file as OFileWithEntityAndArchitecture).entity = entity;
    } else if (pkg) {
      Object.setPrototypeOf(file, OFileWithPackage.prototype);
      (file as OFileWithPackage).package = pkg;
    }
    return file;
  }
  removeComments() {
    this.text = this.text.replace(/--.*/g, match => ' '.repeat(match.length));
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
