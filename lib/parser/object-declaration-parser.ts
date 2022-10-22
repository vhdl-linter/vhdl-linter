import { IHasConstants, IHasSignals, IHasVariables, implementsIHasConstants, implementsIHasSignals, implementsIHasVariables, OConstant, OSignal, OVariable, ParserError, IHasFileVariables, OFileVariable, implementsIHasFileVariables, ORead, ObjectBase } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';
import { OLexerToken } from '../lexer';

export class ObjectDeclarationParser extends ParserBase {

  constructor(pos: ParserPosition, file: string, private parent: ObjectBase & (IHasSignals | IHasConstants | IHasVariables | IHasFileVariables)) {
    super(pos, file);
    this.debug('start');
  }
  parse(nextToken: OLexerToken) {

    if (nextToken.getLText() === 'shared') {
      this.consumeToken();
      nextToken = this.getToken();
    }
    const objects = [];
    const constant = nextToken.getLText() === 'constant';
    const variable = nextToken.getLText() === 'variable';
    const file = nextToken.getLText() === 'file';
    if ((variable) && !implementsIHasVariables(this.parent)) {
      throw new ParserError(`No variables allowed here.`, this.pos.getRangeToEndLine());
    }
    if ((file) && !implementsIHasFileVariables(this.parent)) {
      throw new ParserError(`No files allowed here.`, this.pos.getRangeToEndLine());
    }
    if (constant && !implementsIHasConstants(this.parent)) {
      throw new ParserError(`No constants allowed here.`, this.pos.getRangeToEndLine());
    }
    if (!variable && !constant && !file && !implementsIHasSignals(this.parent)) {
      throw new ParserError(`No signals allowed here`, this.pos.getRangeToEndLine());
    }
    this.consumeToken();
    do {
      this.maybe(',');
      let object;
      if (variable) {
        object = new OVariable(this.parent as IHasVariables, this.getToken().range);
      } else if (constant) {
        object = new OConstant(this.parent as IHasConstants, this.getToken().range);
      } else if (file) {
        object = new OFileVariable(this.parent as IHasFileVariables, this.getToken().range);
      } else {
        object = new OSignal((this.parent as ObjectBase & IHasSignals), this.getToken().range);
      }
      object.lexerToken = this.consumeToken();
      objects.push(object);

    } while (this.getToken().getLText() === ',');
    this.expectToken(':');
    if (file) {
      const typeToken = this.consumeToken();
      for (const file of objects) {
        const typeRead = new ORead(file, typeToken);
        file.type = [typeRead];
        // TODO: Parse optional parts of file definition
        file.range = file.range.copyWithNewEnd(this.pos.i);
      }
    } else {
      for (const signal of objects) {
        const { typeReads, defaultValueReads } = this.getType(signal, false);
        signal.type = typeReads;
        signal.defaultValue = defaultValueReads;
        signal.range = signal.range.copyWithNewEnd(this.pos.i);
      }

    }
    for (const object of objects) {
      object.range.copyWithNewEnd(this.getToken().range.end);
    }
    this.advanceSemicolonToken();
    if (constant) {
      (this.parent as IHasConstants).constants.push(...objects as OSignal[]);
    } else if (variable) {
      (this.parent as IHasVariables).variables.push(...objects);
    } else if (file) {
      (this.parent as IHasFileVariables).files.push(...objects as OFileVariable[]);
    } else {
      (this.parent as IHasSignals).signals.push(...objects as OSignal[]);
    }
  }
}