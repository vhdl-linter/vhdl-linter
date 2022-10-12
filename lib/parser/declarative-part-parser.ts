import { ComponentParser } from './component-parser';
import { ObjectDeclarationParser } from './object-declaration-parser';
import { implementsIHasComponents,OArchitecture, OEntity, OName, OPackage, OPackageBody, OProcess, OSubprogram, OType, ParserError } from './objects';
import { ParserBase } from './parser-base';
import { SubprogramParser } from './subprogram-parser';
import { SubtypeParser } from './subtype-parser';
import { TypeParser } from './type-parser';
import { UseClauseParser } from './use-clause-parser';
import { ParserPosition } from './parser';
import { PackageInstantiationParser } from './package-instantiation-parser';

export class DeclarativePartParser extends ParserBase {
  type: string;
  constructor(pos: ParserPosition, file: string, private parent: OArchitecture | OEntity | OPackage | OPackageBody | OProcess | OSubprogram | OType) {
    super(pos, file);
    this.debug('start');
  }
  parse(optional = false, lastWord = 'begin') {
    let nextWord = this.getNextWord({ consume: false }).toLowerCase();
    while (nextWord !== lastWord) {
      if (nextWord === 'signal'
        || nextWord === 'constant'
        || nextWord === 'shared'
        || nextWord === 'variable'
        || nextWord === 'file') {
        const objectDeclarationParser = new ObjectDeclarationParser(this.pos, this.filePath, this.parent);
        objectDeclarationParser.parse(nextWord);
      } else if (nextWord === 'attribute') {
        this.getNextWord();
        this.advanceSemicolonToken(true);
      } else if (nextWord === 'type') {
        const typeParser = new TypeParser(this.pos, this.filePath, this.parent);
        this.parent.types.push(typeParser.parse());
      } else if (nextWord === 'subtype') {
        const subtypeParser = new SubtypeParser(this.pos, this.filePath, this.parent);
        this.parent.types.push(subtypeParser.parse());
      } else if (nextWord === 'alias') {
        const type = new OType(this.parent, this.getToken().range.copyExtendEndOfLine());
        this.getNextWord();
        const typeName = this.consumeToken();
        type.name = new OName(type, typeName.range);
        type.name.text = typeName.text;
        type.alias = true;
        if (this.getToken().getLText() === ':') {
          this.consumeToken();
          this.advanceWhitespace();
          this.getNextWord();
          type.reads.push(...this.getType(type, false).typeReads);
        }
        this.expect('is');
        this.parent.types.push(type);
        this.advanceSemicolonToken(true);
      } else if (nextWord === 'component' && implementsIHasComponents(this.parent)) {
        this.getNextWord();
        const componentParser = new ComponentParser(this.pos, this.filePath, this.parent);
        this.parent.components.push(componentParser.parse());
      } else if (nextWord === 'procedure' || nextWord === 'impure' || nextWord === 'pure' || nextWord === 'function') {
        const subprogramParser = new SubprogramParser(this.pos, this.filePath, this.parent);
        this.parent.subprograms.push(subprogramParser.parse());
        this.expect(';');
      } else if (nextWord === 'package') {
        this.parent.packageInstantiations.push(new PackageInstantiationParser(this.pos, this.filePath, this.parent).parse());
        this.expect(';');
      } else if (nextWord === 'generic') {
        this.advanceSemicolonToken();
      } else if (nextWord === 'disconnect') {
        this.advanceSemicolonToken();
      } else if (optional) {
        return;
      } else if (nextWord === 'use') {
        this.getNextWord();
        const useClauseParser = new UseClauseParser(this.pos, this.filePath, this.parent.getRoot());
        this.parent.useClauses.push(useClauseParser.parse());
      } else {
        throw new ParserError(`Unknown Ding: '${nextWord}' on line ${this.getLine()}`, this.pos.getRangeToEndLine());
      }
      nextWord = this.getNextWord({ consume: false }).toLowerCase();
    }
  }

}
