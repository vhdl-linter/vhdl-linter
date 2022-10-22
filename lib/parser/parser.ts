/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArchitectureParser } from './architecture-parser';
import { ContextParser } from './context-parser';
import { ContextReferenceParser } from './context-reference-parser';
import { EntityParser } from './entity-parser';
import { MagicCommentType, OFile, OI, OIRange, OMagicCommentDisable, OMagicCommentParameter, ParserError, OConfiguration, OUseClause, OLibrary, OPackageInstantiation } from './objects';
import { PackageParser } from './package-parser';
import { ParserBase } from './parser-base';
import { UseClauseParser } from './use-clause-parser';
import { CancelationObject } from '../language-server';
import { Lexer, OLexerToken, TokenType } from '../lexer';
import { PackageInstantiationParser } from './package-instantiation-parser';

export class ParserPosition {
  public lexerTokens: OLexerToken[];
  public file: OFile;
  public num = 0;
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
  public getRangeToEndLine() {
    return this.lexerTokens[this.num].range.copyExtendEndOfLine();
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
    const ignoreRegex: RegExp[] = [];
    for (const [lineNumber, line] of this.originalText.split('\n').entries()) {
      const match = /(--\s*vhdl-linter)(.*)/.exec(line); // vhdl-linter-disable-next-line //vhdl-linter-disable-this-line

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
            const disabledRange = new OIRange(this.file, new OI(this.file, disabledRangeStart, 0), new OI(this.file, lineNumber, line.length - 1));
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
        } else if ((innerMatch = match[2].match(/-ignore\s+\/([^/]*)\/(.)?/)) !== null) {
          ignoreRegex.push(RegExp(innerMatch[1], innerMatch[2]));
        }
      }
      if (disabledRangeStart !== undefined) {
        const disabledRange = new OIRange(this.file, new OI(this.file, disabledRangeStart, 0), new OI(this.file, this.originalText.length - 1));
        this.file.magicComments.push(new OMagicCommentDisable(this.file, MagicCommentType.Disable, disabledRange));
        disabledRangeStart = undefined;
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
    let contextReferences = [];
    const defaultLibrary = [
      new OLexerToken('std', new OIRange(this.file, 0, 0), TokenType.keyword),
      new OLexerToken('work', new OIRange(this.file, 0, 0), TokenType.keyword),
    ];
    const defaultUseClause = [
      new OUseClause(this.file, new OIRange(this.file, 0, 0), new OLexerToken('std', new OIRange(this.file, 0, 0), TokenType.keyword),
        new OLexerToken('standard', new OIRange(this.file, 0, 0), TokenType.keyword),
        new OLexerToken('all', new OIRange(this.file, 0, 0), TokenType.keyword))
    ];
    // TODO: Add library STD, WORK; use STD.STANDARD.all;
    let libraries = defaultLibrary.slice(0);
    let useClauses = defaultUseClause.slice(0);

    while (this.pos.isValid()) {
      this.advanceWhitespace();
      const nextToken = this.consumeToken();
      if (nextToken.getLText() === 'context') {
        if (this.advanceSemicolonToken(true, { consume: false }).find(token => token.getLText() === 'is')) {
          const contextParser = new ContextParser(this.pos, this.filePath, this.file);
          const context = contextParser.parse();
          context.libraries.push(...libraries.map(library => new OLibrary(context, library)));
          context.useClauses.push(...useClauses);
          context.contextReferences.push(...contextReferences);
          for (const contextReference of contextReferences) {
            contextReference.parent = context;
          }
          for (const useClause of useClauses) {
            useClause.parent = context;
          }

          libraries = defaultLibrary.slice(0);
          useClauses = defaultUseClause.slice(0);
          contextReferences = [];
          this.file.contexts.push(context);
        } else {
          // The Parent gets overwritten when attaching the reference to the correct object
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const contextReferenceParser = new ContextReferenceParser(this.pos, this.filePath, (this.file as any));
          contextReferences.push(contextReferenceParser.parse());
        }
      } else if (nextToken.getLText() === 'library') {
        libraries.push(this.consumeToken());
        this.expect(';');
      } else if (nextToken.getLText() === 'use') {
        const useClauseParser = new UseClauseParser(this.pos, this.filePath, this.file);
        useClauses.push(useClauseParser.parse());
      } else if (nextToken.getLText() === 'entity') {
        const entityParser = new EntityParser(this.pos, this.filePath, this.file);
        const entity = entityParser.parse();
        this.file.entities.push(entity);
        entity.contextReferences = contextReferences;
        for (const contextReference of contextReferences) {
          contextReference.parent = entity;
        }
        for (const useClause of useClauses) {
          useClause.parent = entity;
        }
        contextReferences = [];
        entity.useClauses.push(...useClauses);
        entity.libraries.push(...libraries.map(library => new OLibrary(entity, library)));
        libraries = defaultLibrary.slice(0);
        useClauses = defaultUseClause.slice(0);
        if (this.onlyEntity) {
          break;
        }
        //         // console.log(this.file, typeof this.file.entity, 'typeof');
      } else if (nextToken.getLText() === 'architecture') {
        const architectureParser = new ArchitectureParser(this.pos, this.filePath, this.file);
        const architecture = architectureParser.parse();
        this.file.architectures.push(architecture);
        architecture.contextReferences = contextReferences;
        for (const contextReference of contextReferences) {
          contextReference.parent = architecture;
        }
        for (const useClause of useClauses) {
          useClause.parent = architecture;
        }
        contextReferences = [];
        architecture.useClauses.push(...useClauses);
        architecture.libraries.push(...libraries.map(library => new OLibrary(architecture, library)));

        libraries = defaultLibrary.slice(0);
        useClauses = defaultUseClause.slice(0);
      } else if (nextToken.getLText() === 'package') {
        if (this.onlyEntity && this.getNextWord({ consume: false }) === 'body') {
          // break;
        }
        const pkg = (this.getToken(2, true).getLText() === 'new')
          ? new PackageInstantiationParser(this.pos, this.filePath, this.file).parse()
          : new PackageParser(this.pos, this.filePath).parse(this.file);
        pkg.useClauses.push(...useClauses);
        pkg.libraries.push(...libraries.map(library => new OLibrary(pkg, library)));
        pkg.contextReferences = contextReferences;
        for (const contextReference of contextReferences) {
          contextReference.parent = pkg;
        }
        for (const useClause of useClauses) {
          useClause.parent = pkg;
        }
        if (pkg instanceof OPackageInstantiation) {
          this.file.packageInstantiations.push(pkg);
          this.expect(';'); // package instantiations do not parse ';'
        } else {
          this.file.packages.push(pkg);
        }
        contextReferences = [];
        libraries = defaultLibrary.slice(0);
        useClauses = defaultUseClause.slice(0);
      } else if (nextToken.getLText() === 'configuration') {
        const configuration = new OConfiguration(this.file, this.getToken().range.copyExtendEndOfLine());
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
        throw new ParserError(`Unexpected token ${nextToken.text}`, this.getToken().range);
      }
    }
    return this.file;
  }
}
