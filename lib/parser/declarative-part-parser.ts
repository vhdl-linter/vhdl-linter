import { EntityParser } from './entity-parser';
import { OArchitecture, OEntity, OI, OName, OPackage, OPackageBody, OProcess, OSignal, OSubprogram, OType, OVariable, ParserError } from './objects';
import { ParserBase } from './parser-base';
import { SubprogramParser } from './subprogram-parser';
import { SubtypeParser } from './subtype-parser';
import { TypeParser } from './type-parser';

export class DeclarativePartParser extends ParserBase {
  type: string;
  constructor(text: string, pos: OI, file: string, private parent: OArchitecture | OEntity | OPackage | OPackageBody | OProcess | OSubprogram | OType) {
    super(text, pos, file);
    this.debug('start');
  }
  parse(optional: boolean = false, lastWord = 'begin') {
    const canHaveSignal = !(this.parent instanceof OProcess || this.parent instanceof OSubprogram);
    let nextWord = this.getNextWord({ consume: false }).toLowerCase();
    while (nextWord !== lastWord) {
      if ((nextWord === 'signal' && canHaveSignal)
       || nextWord === 'constant'
       || nextWord === 'shared'
       || nextWord === 'variable') {
        if (nextWord === 'shared') {
          this.getNextWord();
        }
        const signals = [];
        const constant = this.getNextWord() === 'constant';
        do {
          this.maybeWord(',');
          const signal = canHaveSignal
            ? new OSignal(this.parent, this.pos.i, this.getEndOfLineI())
            : new OVariable(this.parent, this.pos.i, this.getEndOfLineI());
          signal.constant = constant;
          signal.name = new OName(signal, this.pos.i, this.pos.i);
          signal.name.text = this.getNextWord();
          signal.name.range.end.i = signal.name.range.start.i + signal.name.text.length;
          signals.push(signal);

        } while (this.text[this.pos.i] === ',');
        this.expect(':');
        for (const signal of signals) {
          const { typeReads, defaultValueReads } = this.getType(signal, false);
          signal.type = typeReads;
          signal.defaultValue = defaultValueReads;
          signal.range.end.i = this.pos.i;
        }
        this.advanceSemicolon();
        if (this.parent instanceof OPackage || this.parent instanceof OPackageBody) {
          this.parent.constants.push(...signals as OSignal[]);
        } else if (this.parent instanceof OProcess || this.parent instanceof OSubprogram) { //. should be canHaveSignal but linter doesn't like it
          
          this.parent.variables.push(...signals);
        } else {
          this.parent.signals.push(...signals as OSignal[]);
        }
      } else if (nextWord === 'attribute') {
        this.getNextWord();
        this.advanceSemicolon(true);
      } else if (nextWord === 'type') {
        const typeParser = new TypeParser(this.text, this.pos, this.file, this.parent);
        this.parent.types.push(typeParser.parse());
      } else if (nextWord === 'subtype') {
        const subtypeParser = new SubtypeParser(this.text, this.pos, this.file, this.parent);
        this.parent.types.push(subtypeParser.parse());
      } else if (nextWord === 'alias') {
        const type = new OType(this.parent, this.pos.i, this.getEndOfLineI());
        this.getNextWord();
        const startTypeName = this.pos.i;
        const typeName = this.getNextWord();
        type.name = new OName(type, startTypeName, startTypeName + typeName.length + 1);
        type.name.text = typeName;
        if (this.text[this.pos.i] === ':') {
          this.pos.i++;
          this.advanceWhitespace();
          this.getNextWord();
          type.reads.push(...this.getType(type, false).typeReads);
        }
        this.expect('is');
        this.parent.types.push(type);
        this.advanceSemicolon(true);
      } else if (nextWord === 'component') {
        this.getNextWord();
        if (this.parent instanceof OArchitecture) {
          const entityParser = new EntityParser(this.text, this.pos, this.file, this.parent);
          this.parent.components.push(entityParser.parse());
        } else {
          const componentName = this.getNextWord();
          this.advancePast(/\bend\b/i, { allowSemicolon: true });
          this.maybeWord('component');
          this.maybeWord(componentName);
          this.expect(';');
        }
      } else if (nextWord === 'procedure' || nextWord === 'impure' || nextWord === 'pure' || nextWord === 'function') {
        const subprogramParser = new SubprogramParser(this.text, this.pos, this.file, this.parent);
        this.parent.subprograms.push(subprogramParser.parse(this.pos.i));
      } else if (nextWord === 'package' || nextWord === 'generic') {
        this.advanceSemicolon();
      } else if (nextWord === 'file') {
        this.advanceSemicolon();
      } else if (nextWord === 'disconnect') {
        this.advanceSemicolon();
      } else if (optional) {
        return;
      }  else {
        throw new ParserError(`Unknown Ding: '${nextWord}' on line ${this.getLine()}`, this.pos.getRangeToEndLine());
      }
      nextWord = this.getNextWord({ consume: false }).toLowerCase();
    }
  }

}
