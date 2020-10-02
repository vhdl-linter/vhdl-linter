import { EntityParser } from './entity-parser';
import { ArchitectureParser } from './architecture-parser';
import { ParserBase } from './parser-base';
import { OFile, OUseStatement, ParserError, OEntity, OArchitecture, OPackage, OFileWithEntity, OFileWithPackage, OFileWithEntityAndArchitecture, OI, ObjectBase, OMagicComment, MagicCommentType, OIRange, ORead, OMagicCommentParameter, OMagicCommentDisable } from './objects';
import { PackageParser } from './package-parser';
import * as escapeStringRegexp from 'escape-string-regexp';


export class Parser extends ParserBase {
  position: OI;
  private originalText: string;
  constructor(text: string, file: string, public onlyEntity: boolean = false) {
    super(text, {} as OI, file);
    this.originalText = text;
    this.removeComments();
  }
  parse(): OFileWithPackage | OFileWithEntity | OFile {
    const file = new OFile(this.text, this.file, this.originalText);
    let disabledRangeStart = undefined;
    for (const [lineNumber, line] of this.originalText.split('\n').entries()) {
      let match = /(--\s*vhdl-linter)(.*)/.exec(line); // vhdl-linter-disable-next-line //vhdl-linter-disable-this-line

      if (match) {
        let innerMatch: RegExpMatchArray | null;
        const nextLineRange = new OIRange(file, new OI(file, lineNumber + 1, 0), new OI(file, lineNumber + 1, this.originalText.split('\n')[lineNumber + 1].length - 1));
        if ((innerMatch = match[2].match('-disable-this-line')) !== null) {
          file.magicComments.push(new OMagicCommentDisable(file, MagicCommentType.Disable, new OIRange(file, new OI(file, lineNumber, 0), new OI(file, lineNumber, line.length - 1))));
        } else if ((innerMatch = match[2].match('-disable-next-line')) !== null) {// TODO: next nonempty line
          file.magicComments.push(new OMagicCommentDisable(file, MagicCommentType.Disable, nextLineRange));
        } else if ((innerMatch = match[2].match('-disable')) !== null) {
          if (disabledRangeStart === undefined) {
            disabledRangeStart = lineNumber;
          }
        } else if ((innerMatch = match[2].match('-enable')) !== null) {
          if (disabledRangeStart !== undefined) {
            let disabledRange =  new OIRange(file, new OI(file, disabledRangeStart, 0), new OI(file, lineNumber, line.length - 1));
            file.magicComments.push(new OMagicCommentDisable(file, MagicCommentType.Disable, disabledRange));
            disabledRangeStart = undefined;
          }
        } else if ((innerMatch = match[2].match(/(-parameter-next-line\s+)(.*)/)) !== null) {// TODO: next nonempty line
          const parameter = innerMatch[2].split(/,?\s+/);
          // .map(parameter => {
          //   const innerInnerMatch = new RegExp(String.raw`\b${escapeStringRegexp(parameter)}\b`, 'i').exec((innerMatch as RegExpMatchArray)[2]);
          //   console.log(String.raw`\b${escapeStringRegexp(parameter)}\b`);
          //   if (!innerInnerMatch) {
          //     throw new Error('FUCK');
          //   }
          //   const startCharacter = (match as RegExpExecArray)[1].length + (innerMatch as RegExpMatchArray)[1].length + innerInnerMatch.index;
          //   const read = new ORead(file, new OI(file, lineNumber, startCharacter).i, new OI(file, lineNumber, startCharacter + innerInnerMatch.length - 1).i);
          //   read.text = parameter;
          //   return read;
          // });
          file.magicComments.push(new OMagicCommentParameter(file, MagicCommentType.Parameter, nextLineRange, parameter));
        }
      }

    }
    this.pos = new OI(file, 0);
    if (this.text.length > 500 * 1024) {
      throw new ParserError('file too large', this.pos.getRangeToEndLine());
    }
    let entity: OEntity | undefined;
    let architecture: OArchitecture | undefined;
    let pkg: OPackage | undefined;
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
        Object.setPrototypeOf(file, OFileWithEntity.prototype);
        (file as OFileWithEntity).entity = entityParser.entity;
        entity = entityParser.parse();

        if (this.onlyEntity) {
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
