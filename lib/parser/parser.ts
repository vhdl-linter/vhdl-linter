import { ArchitectureParser } from './architecture-parser';
import { ContextParser } from './context-parser';
import { ContextReferenceParser } from './context-reference-parser';
import { EntityParser } from './entity-parser';
import { MagicCommentType, OArchitecture, OContextReference, OEntity, OFile, OFileWithEntity, OFileWithEntityAndArchitecture, OFileWithPackages, OI, OIRange, OMagicCommentDisable, OMagicCommentParameter, OMagicCommentTodo, OPackage, OPackageBody, OUseClause, ParserError } from './objects';
import { PackageParser } from './package-parser';
import { ParserBase } from './parser-base';
import { UseClauseParser } from './use-clause-parser';


export class Parser extends ParserBase {
  position: OI;
  private originalText: string;
  constructor(text: string, file: string, public onlyEntity: boolean = false) {
    super(text, {} as OI, file);
    this.originalText = text;
    this.removeCommentsAndStrings();
  }
  parse(): OFileWithPackages | OFileWithEntity | OFile {
    const file = new OFile(this.text, this.file, this.originalText);
    let disabledRangeStart = undefined;
    let ignoreRegex : RegExp[] = [];
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
        } else if ((innerMatch = match[2].match(/-ignore\s+\/([^\/]*)\/(.)?/)) !== null) {
          ignoreRegex.push(RegExp(innerMatch[1], innerMatch[2]));
        }
      }

      match = /(--\s*)(.*TODO.*)/.exec(line);
      if (match) {
        const todoRange = new OIRange(file, new OI(file, lineNumber, line.length-match[2].length), new OI(file, lineNumber, line.length));
        file.magicComments.push(new OMagicCommentTodo(file, MagicCommentType.Todo, todoRange, match[2].toString()));
      }

    }
    for (const regex of ignoreRegex) {
      const ignores = this.text.match(regex);
      if (ignores === null) continue;
      for (const ignore of ignores) {
        const replacement = ignore.replace(/\S/g,' ');
        this.text = this.text.replace(ignore, replacement);
      }
    }
    this.pos = new OI(file, 0);
    if (this.text.length > 500 * 1024) {
      throw new ParserError('file too large', this.pos.getRangeToEndLine());
    }
    let entity: OEntity | undefined;
    let architecture: OArchitecture | undefined;
    const packages: (OPackage|OPackageBody)[] = [];
    while (this.pos.i < this.text.length) {
      this.advanceWhitespace();
      let nextWord = this.getNextWord().toLowerCase();
      if (nextWord === 'context') {
        if (this.advanceSemicolon(true, {consume: false}).match(/\bis\b/i)) {
          const contextParser = new ContextParser(this.text, this.pos, this.file, file);
          file.contexts.push(contextParser.parse());
        } else {
          const contextReferenceParser = new ContextReferenceParser(this.text, this.pos, this.file, file);
          file.contextReferences.push(contextReferenceParser.parse());
        }
      } else if (nextWord === 'library') {
        file.libraries.push(this.getNextWord());
        this.expect(';');
      } else if (nextWord === 'use') {
        const useClauseParser = new UseClauseParser(this.text, this.pos, this.file, file);
        file.useClauses.push(useClauseParser.parse());
      } else if (nextWord === 'entity') {
        const entityParser = new EntityParser(this.text, this.pos, this.file, file as OFileWithEntity);
        Object.setPrototypeOf(file, OFileWithEntity.prototype);
        (file as OFileWithEntity).entity = entityParser.entity;
        entity = entityParser.parse();

        if (this.onlyEntity) {
          break;
        }
        //         // console.log(file, typeof file.entity, 'typeof');
      } else if (nextWord === 'architecture') {
        if (architecture) {
          this.message('Second Architecture not supported');
        }
        const architectureParser = new ArchitectureParser(this.text, this.pos, this.file, file);
        architecture = architectureParser.parse();
      } else if (nextWord === 'package') {
        if (this.onlyEntity && this.getNextWord({consume: false}) === 'body') {
          // break;
        }
        const packageParser = new PackageParser(this.text, this.pos, this.file);
        packages.push(packageParser.parse(file));
      } else {
        this.pos.i++;
      }
    }
    if (architecture && entity) {
      Object.setPrototypeOf(file, OFileWithEntityAndArchitecture.prototype);
      (file as OFileWithEntityAndArchitecture).architecture = architecture;
      (file as OFileWithEntityAndArchitecture).entity = entity;
    } else if (packages.length > 0) {
      Object.setPrototypeOf(file, OFileWithPackages.prototype);
      (file as OFileWithPackages).packages = packages;
    }
    return file;
  }
// a
  removeCommentsAndStrings() {
    this.text = this.text.split('\n').map(s => {
      let quotes = false;
      let result = '';
      for (let i = 0; i < s.length - 1; i++) {
        // "" is valid string (value '')
        // " asf""das" is valid string (value ' asf"das')
        if ((!quotes && s.charAt(i) === '"') || (s.charAt(i) === '"' && s.charAt(i + 1) !== '"')) {
          quotes = !quotes;
        } else if (quotes) {
          result += 's';
          continue;
        } else if (!quotes && s.charAt(i) === '-' && s.charAt(i + 1) === '-') {
          result += ' '.repeat(s.length - i);
          return result;
        }
        result += s.charAt(i);
      }
      if (s.length > 0) {
        result += s.charAt(s.length - 1);
      }
      return result;
    }).join('\n');
  }
}
