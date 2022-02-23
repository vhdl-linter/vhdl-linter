import { IHasConstants, IHasSignals, IHasVariables, implementsIHasConstants, implementsIHasSignals, implementsIHasVariables, OConstant, OI, OName, OSignal, OVariable, ParserError } from "./objects";
import { ParserBase } from "./parser-base";

export class ObjectDeclarationParser extends ParserBase {

  constructor(text: string, pos: OI, file: string, private parent: IHasSignals | IHasConstants | IHasVariables) {
    super(text, pos, file);
    this.debug('start');
  }
  parse(nextWord: string) {

    if (nextWord === 'shared') {
      nextWord = this.getNextWord();
    }
    const objects = [];
    const constant = nextWord === 'constant';
    const variable = nextWord === 'variable';
    if (variable && !implementsIHasVariables(this.parent)) {
      throw new ParserError(`No variables allowed here.`, this.pos.getRangeToEndLine());
    }
    if (constant && !implementsIHasConstants(this.parent)) {
      throw new ParserError(`No constants allowed here.`, this.pos.getRangeToEndLine());
    }
    if (!variable && !constant && !implementsIHasSignals(this.parent)) {
      throw new ParserError(`No signals allowed here`, this.pos.getRangeToEndLine());
    }
    this.getNextWord()
    do {
      this.maybeWord(',');
      let object;
      if (variable) {
        object = new OVariable(this.parent as IHasVariables, this.pos.i, this.getEndOfLineI())
      } else if (constant) {
        object = new OConstant(this.parent as IHasConstants, this.pos.i, this.getEndOfLineI());
      } else {
        object = new OSignal(this.parent as IHasSignals, this.pos.i, this.getEndOfLineI());
      }
      object.name = new OName(object, this.pos.i, this.pos.i);
      object.name.text = this.getNextWord();
      object.name.range.end.i = object.name.range.start.i + object.name.text.length;
      objects.push(object);

    } while (this.text[this.pos.i] === ',');
    this.expect(':');
    for (const signal of objects) {
      const { typeReads, defaultValueReads } = this.getType(signal, false);
      signal.type = typeReads;
      signal.defaultValue = defaultValueReads;
      signal.range.end.i = this.pos.i;
    }
    this.advanceSemicolon();
    if (constant) {
      (this.parent as IHasConstants).constants.push(...objects as OSignal[]);
    } else if (variable) {
      (this.parent as IHasVariables).variables.push(...objects);
    } else {
      (this.parent as IHasSignals).signals.push(...objects as OSignal[]);
    }
  }
}