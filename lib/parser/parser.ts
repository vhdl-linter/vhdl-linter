import { ArchitectureParser } from './architecture-parser';
import { ContextParser } from './context-parser';
import { ContextReferenceParser } from './context-reference-parser';
import { EntityParser } from './entity-parser';
import { MagicCommentType, OArchitecture, OContextReference, OEntity, OFile, OI, OIRange, OMagicCommentDisable, OMagicCommentParameter, OMagicCommentTodo, OPackage, OPackageBody, OUseClause, ParserError, OConfiguration } from './objects';
import { PackageParser } from './package-parser';
import { ParserBase } from './parser-base';
import { UseClauseParser } from './use-clause-parser';
import { CancelationObject } from '../language-server';
import { Lexer, OLexerToken } from '../lexer';

export class ParserPosition {
  public lexerTokens: OLexerToken[];
  public file: OFile;
  constructor() {

  }
  public num: number = 0;
  public get i() {
    if (this.num >= this.lexerTokens.length) {
      throw new ParserError(`I out of range`, this.lexerTokens[this.lexerTokens.length - 1].range);
    }
    return this.lexerTokens[this.num].range.start.i;
  }
  public isLast() {
    return this.num === this.lexerTokens.length - 1;
  }
  public isValid() {
    return this.num >= 0 && this.num < this.lexerTokens.length;
  }
  // public set i(newI: number) {
  //   while (this.num < this.lexerTokens.length) {
  //     if (this.lexerTokens[this.num].range.start.i === newI) {
  //       return;
  //     } else if (this.lexerTokens[this.num].range.start.i < newI) {
  //       this.num++;
  //     } else {
  //       debugger;
  //       return;
  //     }
  //   }
  // }
  public get line() {
    return 0;
  }
  public getRangeToEndLine() {
    return new OIRange(this.file, this.lexerTokens[this.num].range.start, this.lexerTokens[this.num].range.start);
  }

}
export class Parser extends ParserBase {
  pos: ParserPosition;
  private originalText: string;
  public lexerTokens: OLexerToken[] = [];
  text: string;
  file: OFile;
  constructor(text: string, filePath: string, public onlyEntity: boolean = false, public cancelationObject: CancelationObject) {
    super(new ParserPosition(), filePath);
    this.originalText = text;
    this.text = text;
    this.file = new OFile(this.text, this.filePath, this.originalText);

    const lexer = new Lexer(this.originalText, this.file);
    this.lexerTokens = lexer.lex();
    this.pos.lexerTokens = this.lexerTokens;
    this.pos.file = this.file;
  }
  parse(): OFile {

    let disabledRangeStart = undefined;
    let ignoreRegex: RegExp[] = [];
    for (const [lineNumber, line] of this.originalText.split('\n').entries()) {
      let match = /(--\s*vhdl-linter)(.*)/.exec(line); // vhdl-linter-disable-next-line //vhdl-linter-disable-this-line

      if (match) {
        let innerMatch: RegExpMatchArray | null;
        const nextLineRange = new OIRange(this.file, new OI(this.file, lineNumber + 1, 0), new OI(this.file, lineNumber + 1, this.originalText.split('\n')[lineNumber + 1].length - 1));
        if ((innerMatch = match[2].match('-disable-this-line')) !== null) {
          this.file.magicComments.push(new OMagicCommentDisable(this.file, MagicCommentType.Disable, new OIRange(this.file, new OI(this.file, lineNumber, 0), new OI(this.file, lineNumber, line.length - 1))));
        } else if ((innerMatch = match[2].match('-disable-next-line')) !== null) {// TODO: next nonempty line
          this.file.magicComments.push(new OMagicCommentDisable(this.file, MagicCommentType.Disable, nextLineRange));
        } else if ((innerMatch = match[2].match('-disable-region')) !== null) {
          if (disabledRangeStart === undefined) {
            disabledRangeStart = lineNumber;
          }
        } else if ((innerMatch = match[2].match('-enable-region')) !== null) {
          if (disabledRangeStart !== undefined) {
            let disabledRange = new OIRange(this.file, new OI(this.file, disabledRangeStart, 0), new OI(this.file, lineNumber, line.length - 1));
            this.file.magicComments.push(new OMagicCommentDisable(this.file, MagicCommentType.Disable, disabledRange));
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
          //   const read = new ORead(this.file, new OI(this.file, lineNumber, startCharacter).i, new OI(this.file, lineNumber, startCharacter + innerInnerMatch.length - 1).i);
          //   read.text = parameter;
          //   return read;
          // });
          this.file.magicComments.push(new OMagicCommentParameter(this.file, MagicCommentType.Parameter, nextLineRange, parameter));
        } else if ((innerMatch = match[2].match(/-ignore\s+\/([^\/]*)\/(.)?/)) !== null) {
          ignoreRegex.push(RegExp(innerMatch[1], innerMatch[2]));
        }
      }
      if (disabledRangeStart !== undefined) {
        let disabledRange = new OIRange(this.file, new OI(this.file, disabledRangeStart, 0), new OI(this.file, this.originalText.length - 1));
        this.file.magicComments.push(new OMagicCommentDisable(this.file, MagicCommentType.Disable, disabledRange));
        disabledRangeStart = undefined;
      }
      match = /(--\s*)(.*TODO.*)/.exec(line);
      if (match) {
        const todoRange = new OIRange(this.file, new OI(this.file, lineNumber, line.length - match[2].length), new OI(this.file, lineNumber, line.length));
        this.file.magicComments.push(new OMagicCommentTodo(this.file, MagicCommentType.Todo, todoRange, match[2].toString()));
      }

    }
    for (const regex of ignoreRegex) {
      const ignores = this.text.match(regex);
      if (ignores === null) continue;
      for (const ignore of ignores) {
        const replacement = ignore.replace(/\S/g, ' ');
        this.text = this.text.replace(ignore, replacement);
      }
    }
    // this.pos = new OI(this.file, 0);
    if (this.text.length > 500 * 1024) {
      throw new ParserError('this.file too large', this.pos.getRangeToEndLine());
    }
    let entity: OEntity | undefined;
    let architecture: OArchitecture | undefined;
    const packages: (OPackage | OPackageBody)[] = [];
    let contextReferences = [];
    let useClauses = [];

    while (this.pos.isValid()) {
      this.advanceWhitespace();
      let nextWord = this.getNextWord().toLowerCase();
      if (nextWord === 'context') {
        if (this.advanceSemicolonToken(true, { consume: false }).find(token => token.getLText() === 'is')) {
          const contextParser = new ContextParser(this.pos, this.filePath, this.file);
          this.file.contexts.push(contextParser.parse());
        } else {
          const contextReferenceParser = new ContextReferenceParser(this.pos, this.filePath, this.file);
          contextReferences.push(contextReferenceParser.parse());
        }
      } else if (nextWord === 'library') {
        this.file.libraries.push(this.getNextWord());
        this.expect(';');
      } else if (nextWord === 'use') {
        const useClauseParser = new UseClauseParser(this.pos, this.filePath, this.file);
        useClauses.push(useClauseParser.parse());
      } else if (nextWord === 'entity') {
        const entityParser = new EntityParser(this.pos, this.filePath, this.file);
        const entity = entityParser.parse();
        this.file.entities.push(entity);
        entity.contextReferences = contextReferences;
        contextReferences = [];
        entity.useClauses = useClauses;
        useClauses = [];
        if (this.onlyEntity) {
          break;
        }
        //         // console.log(this.file, typeof this.file.entity, 'typeof');
      } else if (nextWord === 'architecture') {
        const architectureParser = new ArchitectureParser(this.pos, this.filePath, this.file);
        const architecture = architectureParser.parse();
        this.file.architectures.push(architecture);
        architecture.contextReferences = contextReferences;
        contextReferences = [];
        architecture.useClauses = useClauses;
        useClauses = [];
      } else if (nextWord === 'package') {
        if (this.onlyEntity && this.getNextWord({ consume: false }) === 'body') {
          // break;
        }
        const packageParser = new PackageParser(this.pos, this.filePath);
        this.file.packages.push(packageParser.parse(this.file));
      } else if (nextWord === 'configuration') {
        const configuration = new OConfiguration(this.file, this.pos.i, this.getEndOfLineI());
        configuration.identifier = this.consumeToken();
        this.expect('of');
        configuration.entityName = this.consumeToken();
        while (
          ((this.getToken(0).getLText() === 'end' && this.getToken(1, true).getLText() === ';')
            || (this.getToken(0).getLText() === 'end' && this.getToken(1, true).getLText() === 'configuration'
              && this.getToken(2, true).getLText() === ';')
            || (this.getToken(0).getLText() === 'end' && this.getToken(1, true).getLText() === 'configuration'
              && this.getToken(2, true).getLText() === configuration.identifier.getLText() && this.getToken(3, true).getLText() === ';')
            || (this.getToken(0).getLText() === 'end'
              && this.getToken(1, true).getLText() === configuration.identifier.getLText() && this.getToken(2, true).getLText() === ';'))
          === false) {
          this.consumeToken(true);
        }
        this.file.configurations.push(configuration);
        this.advanceSemicolon();
      } else {
        throw new ParserError(`Unexpected token ${nextWord}`, this.getToken().range);
      }
    }
    return this.file;
  }
}
