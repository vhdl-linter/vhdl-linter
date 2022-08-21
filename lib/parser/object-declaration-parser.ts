import { IHasConstants, IHasSignals, IHasVariables, implementsIHasConstants, implementsIHasSignals, implementsIHasVariables, OConstant, OI, OName, OSignal, OVariable, ParserError, IHasFileVariables, OFileVariable, implementsIHasFileVariables, ORead } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';

export class ObjectDeclarationParser extends ParserBase {

  constructor(pos: ParserPosition, file: string, private parent: IHasSignals | IHasConstants | IHasVariables | IHasFileVariables) {
    super(pos, file);
    this.debug('start');
  }
  parse(nextWord: string) {

    if (nextWord === 'shared') {
      this.getNextWord();
      nextWord = this.getNextWord({ consume: false });
    }
    const objects = [];
    const constant = nextWord === 'constant';
    const variable = nextWord === 'variable';
    const file = nextWord === 'file';
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
    this.getNextWord();
    do {
      this.maybeWord(',');
      let object;
      if (variable) {
        object = new OVariable(this.parent as IHasVariables, this.pos.i, this.getEndOfLineI());
      } else if (constant) {
        object = new OConstant(this.parent as IHasConstants, this.pos.i, this.getEndOfLineI());
      } else if (file) {
        object = new OFileVariable(this.parent as IHasFileVariables, this.pos.i, this.getEndOfLineI());
      } else {
        object = new OSignal(this.parent as IHasSignals, this.pos.i, this.getEndOfLineI());
      }
      object.name = new OName(object, this.pos.i, this.pos.i);
      object.name.text = this.getNextWord();
      object.name.range.end.i = object.name.range.start.i + object.name.text.length;
      objects.push(object);

    } while (this.getToken().getLText() === ',');
    this.expect(':');
    if (file) {
      let startI = this.pos.i;
      const typeText = this.getNextWord();
      for (const file of objects) {
        const typeRead = new ORead(file, startI, this.pos.i, typeText);
        file.type = [typeRead];
        // TODO: Parse optional parts of file definition
        file.range.end.i = this.pos.i;
      }
    } else {
      for (const signal of objects) {
        const { typeReads, defaultValueReads } = this.getType(signal, false);
        signal.type = typeReads;
        signal.defaultValue = defaultValueReads;
        signal.range.end.i = this.pos.i;
      }

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