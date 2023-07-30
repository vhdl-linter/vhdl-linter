import { Position, Range, TextEdit } from 'vscode-languageserver';
import { OIDiagnosticWithSolution } from '../vhdlLinter';
import { OLexerToken } from '../lexer';

// All files that do not come from the standard but are needed for the operation of the linter
export class ObjectBase {
  lexerToken?: OLexerToken;
  readonly rootFile: OFile;
  constructor(public parent: ObjectBase | OFile, public range: OIRange) {
    let maximumIterationCounter = 5000;
    let p = parent;
    while (!(p instanceof OFile)) {
      p = p.parent;
      maximumIterationCounter--;
      if (maximumIterationCounter === 0) {
        throw new ParserError('Maximum Iteration Counter overrun', range);
      }
    }
    this.rootFile = p;
    p.objectList.push(this);
  }
  private rootElement?: ORootElements;

  getRootElement(): ORootElements {
    if (this.rootElement) {
      return this.rootElement;
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let parent: ObjectBase = this;
    while (parent instanceof OArchitecture === false
      && parent instanceof OEntity === false
      && parent instanceof OPackage === false
      && parent instanceof OPackageInstantiation === false
      && parent instanceof OPackageBody === false
      && parent instanceof OContext === false
      && parent instanceof OConfigurationDeclaration === false) {
      if (parent.parent instanceof OFile) {
        throw new ParserError('Failed to find root element', this.range);
      }
      parent = parent.parent;
    }
    this.rootElement = parent as ORootElements;
    return this.rootElement;
  }
  lexerTokenEquals(other: ObjectBase) {
    return this.lexerToken?.text.toLowerCase() === other.lexerToken?.text.toLowerCase();
  }
}
export class ParserError extends Error {
  constructor(message: string,
    public range: OIRange,
    public solution?: { message: string, edits: TextEdit[] }
  ) {
    super(message);
  }
}
export enum MagicCommentType {
  Disable
}
abstract class OMagicComment extends ObjectBase {
  constructor(public parent: OFile, public commentType: MagicCommentType, range: OIRange,
    public rule?: string) {
    super(parent, range);
  }
}
export class OMagicCommentDisable extends OMagicComment {
  constructor(public parent: OFile,
    public commentType: MagicCommentType.Disable,
    range: OIRange, public rule?: string) {
    super(parent, commentType, range, rule);
  }
}
export class OI implements Position {
  protected i_?: number;
  constructor(public parent: ObjectBase | OFile, i: number, j?: number, k?: number) {
    if (j === Number.POSITIVE_INFINITY) {
      const lines = (this.parent instanceof OFile ? this.parent : this.parent.rootFile).lines;
      j = lines[i]!.length - 1;
    }
    if (k !== undefined && j !== undefined) {
      this.i_ = k;
      this.position = {
        line: i,
        character: j
      };
    } else if (typeof j === 'undefined') {
      this.i_ = i;
    } else {
      this.position = {
        line: i,
        character: j,
      };
    }
  }
  get i() {
    if (this.i_ === undefined) {
      this.calcI();
      if (this.i_ === undefined) {
        throw new Error('Can not convert position to i');
      }
    }
    return this.i_;
  }
  private position?: Position;
  get line() {
    if (!this.position) {
      this.position = this.calcPosition();
    }
    return this.position.line;
  }
  toJSON() {
    if (!this.position) {
      this.position = this.calcPosition();
    }
    return this.position;
  }
  get character() {
    if (!this.position) {
      this.position = this.calcPosition();
    }
    return this.position.character;
  }

  getRangeToEndLine(): OIRange {
    const start = this.i;
    const text = this.parent.rootFile.text;
    let end = text.length;
    const match = /\n/.exec(text.substr(start));
    if (match) {
      end = start + match.index;
    }
    return new OIRange(this.parent, start, end);

  }
  private calcPosition(): Position {
    const lines = (this.parent instanceof OFile ? this.parent : this.parent.rootFile).text.slice(0, this.i).split('\n');
    const line = lines.length - 1;
    const character = lines[lines.length - 1]!.length;
    return { character, line };
  }
  private calcI() {
    if (typeof this.position === 'undefined') {
      throw new Error('Something went wrong with OIRange');
    }
    const lines = (this.parent instanceof OFile ? this.parent : this.parent.rootFile).lines;
    this.i_ = lines.slice(0, this.position.line).join('\n').length + 1 + Math.min(this.position.character, lines[this.position.line]!.length);
  }
}
export class OIRange implements Range {

  public readonly start: OI;
  public readonly end: OI;
  constructor(public parent: ObjectBase | OFile, start: number | OI, end: number | OI) {
    if (start instanceof OI) {
      this.start = start;
    } else {
      this.start = new OI(parent, start);
    }
    if (end instanceof OI) {
      this.end = end;
    } else {
      this.end = new OI(parent, end);
    }
  }
  getText() {
    return this.parent.rootFile.text.substring(this.start.i, this.end.i);
  }
  copyWithNewEnd(newEnd: OI | number | OIRange) {
    if (newEnd instanceof OIRange) {
      newEnd = newEnd.end;
    }
    return new OIRange(this.parent, this.start, newEnd);
  }
  copyWithNewStart(newStart: OI | number | OIRange) {
    if (newStart instanceof OIRange) {
      newStart = newStart.start;
    }
    return new OIRange(this.parent, newStart, this.end);
  }

  toJSON() {
    return Range.create(this.start, this.end);
  }
  getLimitedRange(limit = 5, fromEnd = false) {
    if (fromEnd) {
      const newStart = this.end.line - this.start.line > limit ?
        new OI(this.parent, this.end.line - limit, 0)
        : this.start;
      return new OIRange(this.parent, newStart, this.end);
    } else {
      const newEnd = this.end.line - this.start.line > limit ?
        new OI(this.parent, this.start.line + limit, Number.POSITIVE_INFINITY)
        : this.end;
      return new OIRange(this.parent, this.start, newEnd);
    }
  }
  copyExtendBeginningOfLine() {
    const lines = (this.parent instanceof OFile ? this.parent : this.parent.rootFile).lines;
    let startCol = 0;
    const match = lines[this.start.line]?.match(/\S/);
    if (match) {
      startCol = match.index ?? 0;
    }
    const newStart = new OI(this.parent, this.start.line, startCol);

    return new OIRange(this.parent, newStart, this.end);

  }
  copyExtendEndOfLine(): OIRange {
    const text = this.parent.rootFile.text;
    const match = /\n/.exec(text.substr(this.start.i));
    let end = text.length;
    if (match) {
      end = this.start.i + match.index;
    }
    return new OIRange(this.parent, this.start.i, end);
  }
}

export class OFile {
  parserMessages: OIDiagnosticWithSolution[] = [];
  public lines: string[];
  constructor(public text: string, public uri: URL, public originalText: string, public lexerTokens: OLexerToken[]) {
    this.lines = originalText.split('\n');
  }

  objectList: ObjectBase[] = [];
  contexts: OContext[] = [];
  magicComments: (OMagicCommentDisable)[] = [];
  entities: OEntity[] = [];
  architectures: OArchitecture[] = [];
  packages: (OPackage | OPackageBody)[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  configurations: OConfigurationDeclaration[] = [];
  targetLibrary?: string;
  readonly rootFile = this; // Provided as a convenience to equalize to ObjectBase
}
