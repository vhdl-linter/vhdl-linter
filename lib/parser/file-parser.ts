/* eslint-disable @typescript-eslint/no-explicit-any */
import { Lexer, OLexerToken, TokenType } from '../lexer';
import { CancelationObject } from '../server-objects';
import { ContextParser } from './context-parser';
import { ContextReferenceParser } from './context-reference-parser';
import { EntityParser } from './entity-parser';
import { MagicCommentType, ObjectBase, OConfiguration, OFile, OI, OIRange, OLibrary, OLibraryReference, OMagicCommentDisable, OPackageInstantiation, OReference, OUseClause, ParserError } from './objects';
import { PackageInstantiationParser } from './package-instantiation-parser';
import { PackageParser } from './package-parser';
import { ParserBase, ParserPosition, ParserState } from './parser-base';
import { StatementBodyParser } from './statement-body-parser';

export class FileParser extends ParserBase {
  state: ParserState;
  private originalText: string;
  public lexerTokens: OLexerToken[] = [];
  text: string;
  file: OFile;
  constructor(text: string, filePath: URL, public cancelationObject: CancelationObject) {

    super(new ParserState(new ParserPosition(), filePath));
    this.originalText = text;
    this.text = text;
    this.file = new OFile(this.text, this.state.fileUri, this.originalText);

    const lexer = new Lexer(this.originalText, this.file);
    this.lexerTokens = lexer.lex(this.file);
    this.file.lexerTokens = this.lexerTokens;
    this.state.pos.lexerTokens = this.lexerTokens;
    this.state.pos.file = this.file;
  }
  getNextLineRange(lineNumber: number) {
    while (this.originalText.split('\n')[lineNumber + 1]?.match(/^\s*(?:--.*)?$/)) {
      lineNumber++;
    }
    return new OIRange(this.file, new OI(this.file, lineNumber + 1, 0), new OI(this.file, lineNumber + 1, this.originalText.split('\n')[lineNumber + 1]!.length));
  }
  parse(): OFile {

    const disabledRangeStart = new Map<string | undefined, number>();
    for (const [lineNumber, line] of this.originalText.split('\n').entries()) {
      const match = /(--\s*vhdl-linter)(.*)/.exec(line) as [string, string, string] | null; // vhdl-linter-disable-next-line //vhdl-linter-disable-this-line

      if (match) {
        let innerMatch: [string, string] | null;
        const nextLineRange = this.getNextLineRange(lineNumber);
        if ((innerMatch = (match[2]?.match(/-disable(?:-this)?-line(?:\s|$)(.+)?/i)) as [string, string] | null) !== null) {
          for (const rule of innerMatch[1].split(' ')) {
            this.file.magicComments.push(new OMagicCommentDisable(
              this.file,
              MagicCommentType.Disable,
              new OIRange(this.file, new OI(this.file, lineNumber, 0), new OI(this.file, lineNumber, line.length)),
              rule
            ));
          }

        } else if ((innerMatch = (match[2].match(/-disable-next-line(?:\s|$)(.+)?/i) as [string, string] |null)) !== null) {
          for (const rule of innerMatch[1].split(' ')) {
            this.file.magicComments.push(new OMagicCommentDisable(
              this.file,
              MagicCommentType.Disable,
              nextLineRange,
              rule
            ));
          }
        } else if ((innerMatch = (match[2].match(/-disable(?:\s|$)(.+)?/i) as [string, string] | null)) !== null) {
          const rules: (string | undefined)[] = innerMatch[1].split(' ');
          if (rules.length == 0) {
            rules.push(undefined);
          }
          for (const rule of rules) {
            if (disabledRangeStart.has(rule) === false) {
              disabledRangeStart.set(rule, lineNumber);
            }
          }
        } else if ((innerMatch = (match[2].match(/-enable(?:\s|$)(.+)?/i) as [string, string] | null)) !== null) {
          const rules: (string | undefined)[] = innerMatch[1].split(' ');
          if (rules.length == 0) { // If not rule is specified all rules are enabled
            rules.push(...disabledRangeStart.keys());
          }
          for (const rule of rules) {
            const rangeStart = disabledRangeStart.get(rule);
            if (rangeStart !== undefined) {
              const disabledRange = new OIRange(this.file,
                new OI(this.file, rangeStart, 0),
                new OI(this.file, lineNumber, line.length - 1));
              this.file.magicComments.push(new OMagicCommentDisable(
                this.file,
                MagicCommentType.Disable,
                disabledRange,
                rule));
              disabledRangeStart.delete(rule);
            }
          }

        }
      }


    }
    for (const [rule, start] of disabledRangeStart) {
      const disabledRange = new OIRange(this.file, new OI(this.file, start, 0), new OI(this.file, this.originalText.length - 1));
      this.file.magicComments.push(new OMagicCommentDisable(
        this.file, MagicCommentType.Disable, disabledRange, rule));
    }
    // this.state.pos = new OI(this.file, 0);
    if (this.text.length > 500 * 1024) {
      throw new ParserError('this.file too large', this.state.pos.getRangeToEndLine());
    }
    let contextReferences = [];
    const defaultLibrary = [
      new OLexerToken('std', new OIRange(this.file, 0, 0), TokenType.implicit, this.file),
      new OLexerToken('work', new OIRange(this.file, 0, 0), TokenType.implicit, this.file),
    ];
    // store use clauses to be attached to the next design unit
    let useClausesPrepare: [OLexerToken, OLexerToken, OLexerToken][] = [];
    const getUseClauses = (parent: ObjectBase) => {
      return [
        new OUseClause(parent, new OLibraryReference(parent, new OLexerToken('std', new OIRange(this.file, 0, 0), TokenType.implicit, this.file)),
          new OReference(parent, new OLexerToken('standard', new OIRange(this.file, 0, 0), TokenType.implicit, this.file)),
          new OLexerToken('all', new OIRange(this.file, 0, 0), TokenType.implicit, this.file)),
        ...useClausesPrepare.map(([library, packageName, suffix]) => new OUseClause(parent, new OLibraryReference(parent, library), new OReference(parent, packageName), suffix))
      ];
    };
    let libraries = defaultLibrary.slice(0);
    this.advanceWhitespace();

    while (this.state.pos.isValid()) {
      const nextToken = this.consumeToken();
      if (nextToken.getLText() === 'context') {
        if (this.advanceSemicolon(true, { consume: false }).find(token => token.getLText() === 'is')) {
          const contextParser = new ContextParser(this.state, this.file);
          const context = contextParser.parse();
          context.libraries.push(...libraries.map(library => new OLibrary(context, library)));
          context.useClauses.push(...getUseClauses(context));
          context.contextReferences.push(...contextReferences);
          for (const contextReference of contextReferences) {
            contextReference.parent = context;
          }


          libraries = defaultLibrary.slice(0);
          useClausesPrepare = [];
          contextReferences = [];
          this.file.contexts.push(context);
        } else {
          // The Parent gets overwritten when attaching the reference to the correct object
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const contextReferenceParser = new ContextReferenceParser(this.state, this.file);
          contextReferences.push(contextReferenceParser.parse());
        }
      } else if (nextToken.getLText() === 'library') {
        libraries.push(this.consumeToken());
        while (this.getToken().getLText() === ',') {
          this.consumeToken(); // consume ','
          libraries.push(this.consumeToken());
        }
        this.expect(';');
      } else if (nextToken.getLText() === 'use') {

        const library = this.consumeToken();
        this.expect('.');
        const packageName = this.consumeToken();
        this.expect('.');
        const suffix = this.consumeToken();
        this.expect(';');
        useClausesPrepare.push([library, packageName, suffix]);
      } else if (nextToken.getLText() === 'entity') {
        const entityParser = new EntityParser(this.state, this.file);
        const entity = entityParser.parse();
        this.file.entities.push(entity);
        entity.contextReferences = contextReferences;
        for (const contextReference of contextReferences) {
          contextReference.parent = entity;
        }
        contextReferences = [];
        entity.useClauses.push(...getUseClauses(entity));
        entity.libraries.push(...libraries.map(library => new OLibrary(entity, library)));
        libraries = defaultLibrary.slice(0);
        useClausesPrepare = [];
      } else if (nextToken.getLText() === 'architecture') {
        const architectureParser = new StatementBodyParser(this.state, this.file);
        const architecture = architectureParser.parse();
        this.file.architectures.push(architecture);
        architecture.contextReferences = contextReferences;
        for (const contextReference of contextReferences) {
          contextReference.parent = architecture;
        }

        contextReferences = [];
        architecture.useClauses.push(...getUseClauses(architecture));
        architecture.libraries.push(...libraries.map(library => new OLibrary(architecture, library)));

        libraries = defaultLibrary.slice(0);
        useClausesPrepare = [];
      } else if (nextToken.getLText() === 'package') {
        const pkg = (this.getToken(2, true).getLText() === 'new')
          ? new PackageInstantiationParser(this.state, this.file).parse()
          : new PackageParser(this.state).parse(this.file);
        pkg.useClauses.push(...getUseClauses(pkg));
        pkg.libraries.push(...libraries.map(library => new OLibrary(pkg, library)));
        pkg.contextReferences = contextReferences;
        for (const contextReference of contextReferences) {
          contextReference.parent = pkg;
        }

        if (pkg instanceof OPackageInstantiation) {
          this.file.packageInstantiations.push(pkg);
          this.expect(';'); // package instantiations do not parse ';'
        } else {
          this.file.packages.push(pkg);
        }
        contextReferences = [];
        libraries = defaultLibrary.slice(0);
        useClausesPrepare = [];
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
      this.advanceWhitespace();

    }
    return this.file;
  }
}
