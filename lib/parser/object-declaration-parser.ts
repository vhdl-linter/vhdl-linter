import { IHasConstants, IHasSignals, IHasVariables, implementsIHasConstants, implementsIHasSignals, implementsIHasVariables, OConstant, OName, OSignal, OVariable, ParserError, IHasFileVariables, OFileVariable, implementsIHasFileVariables, ORead } from './objects';
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
    const constant = nextWord.toLowerCase() === 'constant';
    const variable = nextWord.toLowerCase() === 'variable';
    const file = nextWord.toLowerCase() === 'file';
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
        object = new OVariable(this.parent as IHasVariables, this.getToken().range);
      } else if (constant) {
        object = new OConstant(this.parent as IHasConstants, this.getToken().range);
      } else if (file) {
        object = new OFileVariable(this.parent as IHasFileVariables, this.getToken().range);
      } else {
        object = new OSignal(this.parent as IHasSignals, this.getToken().range);
      }
      const name = this.consumeToken();
      object.name = new OName(object, name.range);
      object.name.text = name.text;

      objects.push(object);

    } while (this.getToken().getLText() === ',');
    this.expect(':');
    if (file) {
      const typeText = this.consumeToken();
      for (const file of objects) {
        const typeRead = new ORead(file, typeText.range, typeText.text);
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