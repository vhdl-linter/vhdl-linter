import { Lexer, OLexerToken, TokenType } from '../lexer';
import { ISettings } from '../settingsGenerated';
import { ConditionalParser } from './conditionalParser';
import { ConfigurationDeclarationParser } from './configurationDeclarationParser';
import { ContextParser } from './contextParser';
import { ContextReferenceParser } from './contextReferenceParser';
import { EntityParser } from './entityParser';
import { ExpressionParser } from './expressionParser';
import { IHasUseClauses } from './interfaces';
import { MagicCommentType, OFile, OI, OIRange, OLibrary, OMagicCommentDisable, OName, OPackageInstantiation, OSelectedName, OUseClause, ObjectBase, ParserError } from './objects';
import { PackageInstantiationParser } from './packageInstantiationParser';
import { PackageParser } from './packageParser';
import { ParserBase, ParserPosition, ParserState } from './parserBase';
import { StatementBodyParser } from './statementBodyParser';
import { URL } from 'url';

export class FileParser extends ParserBase {
  state: ParserState;
  private originalText: string;
  public lexerTokens: OLexerToken[] = [];
  text: string;
  file: OFile;
  constructor(text: string, filePath: URL, settings: ISettings) {

    super(new ParserState(new ParserPosition(), filePath));
    this.originalText = text;
    this.text = text;
    // Because of cat eats tail and typescript reasons lexer Token array has to be predefined.
    // Lexer takes the array and returns reference to the same array
    // In the end lexerTokens === this.file.lexerTokens === this.lexerTokens
    const lexerTokens: [] = [];
    this.file = new OFile(this.text, this.state.fileUri, this.originalText, lexerTokens);
    if (this.text.length > settings.analysis.maxFileSize * 1024) {
      throw new ParserError(`This file is larger than the configured maximum size of ${settings.analysis.maxFileSize}kiB (${(this.text.length / 1024)}kiB)`, new OI(this.file, 0).getRangeToEndLine());
    }
    const lexer = new Lexer(this.originalText, this.file, lexerTokens);
    this.file.lexerTokens = lexer.lex();
    this.lexerTokens = this.file.lexerTokens;
    new ConditionalParser(this.lexerTokens, 0, settings, this.state);
    this.state.pos.lexerTokens = this.lexerTokens;
    this.state.pos.file = this.file;
  }

  getNextLineRange(lineNumber: number) {
    while (this.originalText.split('\n')[lineNumber + 1]?.match(/^\s*(?:--.*)?$/)) {
      lineNumber++;
    }
    return new OIRange(this.file, new OI(this.file, lineNumber + 1, 0), new OI(this.file, lineNumber + 1, this.originalText.split('\n')[lineNumber + 1]!.length));
  }

  private useClauseFromTokens(parent: ObjectBase & IHasUseClauses, tokens: [OLexerToken, ...OLexerToken[]]) {
    const newUseClause = new OUseClause(parent, tokens[0].range.copyWithNewEnd(tokens[tokens.length - 1]!.range));
    newUseClause.names = new ExpressionParser(this.state, newUseClause, tokens).parse() as [OName, ...OSelectedName[]];
    return newUseClause;
  }

  parse(): OFile {
    this.file.targetLibrary = this.getTargetLibrary();
    const disabledRangeStart = new Map<string | undefined, number>();
    for (const [lineNumber, line] of this.originalText.split('\n').entries()) {
      const match = /(--\s*vhdl-linter)(.*)/.exec(line) as [string, string, string] | null; // vhdl-linter-disable-next-line //vhdl-linter-disable-this-line

      if (match) {
        let innerMatch: [string, string?] | null;
        const nextLineRange = this.getNextLineRange(lineNumber);
        if ((innerMatch = (match[2]?.match(/-disable(?:-this)?-line(?:\s|$)(.+)?/i)) as [string, string] | null) !== null) {
          for (const rule of innerMatch[1]?.split(' ') ?? [undefined]) {
            this.file.magicComments.push(new OMagicCommentDisable(
              this.file,
              MagicCommentType.Disable,
              new OIRange(this.file, new OI(this.file, lineNumber, 0), new OI(this.file, lineNumber, line.length)),
              rule
            ));
          }

        } else if ((innerMatch = (match[2].match(/-disable-next-line(?:\s|$)(.+)?/i) as [string, string] | null)) !== null) {
          for (const rule of innerMatch[1]?.split(' ') ?? [undefined]) {
            this.file.magicComments.push(new OMagicCommentDisable(
              this.file,
              MagicCommentType.Disable,
              nextLineRange,
              rule
            ));
          }
        } else if ((innerMatch = (match[2].match(/-disable(?:\s|$)(.+)?/i) as [string, string?] | null)) !== null) {
          const rules: (string | undefined)[] = innerMatch[1]?.split(' ') ?? [undefined];
          for (const rule of rules) {
            if (disabledRangeStart.has(rule) === false) {
              disabledRangeStart.set(rule, lineNumber);
            }
          }
        } else if ((innerMatch = (match[2].match(/-enable(?:\s|$)(.+)?/i) as [string, string] | null)) !== null) {
          const rules: (string | undefined)[] = innerMatch[1]?.split(' ') ?? [];
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
    let contextReferences = [];
    const defaultLibrary = [
      new OLexerToken('std', new OIRange(this.file, 0, 0), TokenType.implicit, this.file),
      new OLexerToken('work', new OIRange(this.file, 0, 0), TokenType.implicit, this.file),
    ];
    // store use clauses to be attached to the next design unit
    let useClausesPrepare: [OLexerToken, ...OLexerToken[]][] = [];
    const getUseClauses = (parent: ObjectBase & IHasUseClauses) => {
      // always add `use std.standard.all;`
      const standardUseClause = this.useClauseFromTokens(parent, [
        new OLexerToken('std', new OIRange(this.file, 0, 0), TokenType.implicit, this.file),
        new OLexerToken('.', new OIRange(this.file, 0, 0), TokenType.implicit, this.file),
        new OLexerToken('standard', new OIRange(this.file, 0, 0), TokenType.implicit, this.file),
        new OLexerToken('.', new OIRange(this.file, 0, 0), TokenType.implicit, this.file),
        new OLexerToken('all', new OIRange(this.file, 0, 0), TokenType.implicit, this.file)
      ]);
      return [
        standardUseClause,
        ...useClausesPrepare.map(tokens => this.useClauseFromTokens(parent, tokens))
      ];
    };
    let libraries = defaultLibrary.slice(0);
    this.advanceWhitespace();

    while (this.state.pos.isValid()) {
      let nextToken = this.consumeToken();
      const allowedKeywords = [
        'context', 'library', 'use', 'entity', 'architecture', 'package', 'configuration'
      ];
      const errorTokens = [];
      while (allowedKeywords.includes(nextToken.getLText()) === false) {
        errorTokens.push(nextToken);
        if (this.state.pos.isValid()) {
          nextToken = this.consumeToken();
        } else {
          break;
        }
      }
      if (errorTokens.length > 0) {
        const range = errorTokens[0]!.range.copyWithNewEnd(errorTokens.at(-1)!.range);
        this.state.messages.push({
          message: `Unexpected statement '${range.getText().slice(0, 50)}' in file scope. Expecting on of *${allowedKeywords.join(',')}*`,
          range,
        });
      }
      if (nextToken.getLText() === 'context') {
        if (this.advanceSemicolon(false).find(token => token.getLText() === 'is')) {
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

        useClausesPrepare.push(this.advanceSelectedNameNoParse());
        this.expect(';');

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
        const configuration = new ConfigurationDeclarationParser(this.state, this.file).parse();
        this.file.configurations.push(configuration);
        configuration.useClauses.push(...getUseClauses(configuration));
        configuration.libraries.push(...libraries.map(library => new OLibrary(configuration, library)));
        configuration.contextReferences = contextReferences;
        for (const contextReference of contextReferences) {
          contextReference.parent = configuration;
        }
        contextReferences = [];
        libraries = defaultLibrary.slice(0);
        useClausesPrepare = [];
      }


      this.advanceWhitespace();

    }
    return this.file;
  }
  getTargetLibrary() {
    const match = this.state.pos.file.originalText.match(/!\s*@library\s+(\S+)/i);
    return match?.[1];
  }
}
