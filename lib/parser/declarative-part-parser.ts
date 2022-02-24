import { ComponentParser } from './component-parser';
import { EntityParser } from './entity-parser';
import { ObjectDeclarationParser } from './object-declaration-parser';
import { implementsIHasComponents, implementsIHasSubprograms, OArchitecture, OEntity, OI, OName, OPackage, OPackageBody, OProcess, OSignal, OSubprogram, OType, OVariable, ParserError } from './objects';
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
    let nextWord = this.getNextWord({ consume: false }).toLowerCase();
    while (nextWord !== lastWord) {
      if (nextWord === 'signal'
       || nextWord === 'constant'
       || nextWord === 'shared'
       || nextWord === 'variable'
       || nextWord === 'file') {
        const objectDeclarationParser = new ObjectDeclarationParser(this.text, this.pos, this.file, this.parent);
        objectDeclarationParser.parse(nextWord);
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
      } else if (nextWord === 'component' && implementsIHasComponents(this.parent)) {
        this.getNextWord();
        const componentParser = new ComponentParser(this.text, this.pos, this.file, this.parent);
        this.parent.components.push(componentParser.parse());
      } else if (nextWord === 'procedure' || nextWord === 'impure' || nextWord === 'pure' || nextWord === 'function') {
        const subprogramParser = new SubprogramParser(this.text, this.pos, this.file, this.parent);
        this.parent.subprograms.push(subprogramParser.parse(this.pos.i));
        this.expect(';');
      } else if (nextWord === 'package' || nextWord === 'generic') {
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
