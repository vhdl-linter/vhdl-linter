import { ComponentParser } from './component-parser';
import { ObjectDeclarationParser } from './object-declaration-parser';
import { implementsIHasComponents, OArchitecture, OEntity, OPackage, OPackageBody, OProcess, OSubprogram, OSubprogramAlias, OType, OTypeMark, ParserError } from './objects';
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
        this.consumeToken();
        let i = 0;
        let foundSignature = false;
        while (this.getToken(i).getLText() !== ';') {
          if (this.getToken(i).getLText() === '[') {
            foundSignature = true;
            break;
          }
          i++;
        }
        if (foundSignature) {
          const subprogramAlias = new OSubprogramAlias(this.parent, this.getToken().range.copyExtendEndOfLine());
          subprogramAlias.lexerToken = this.consumeToken();
          if (this.getToken().getLText() === ':') {
            this.consumeToken();
            this.advanceWhitespace();
            this.getNextWord();
            subprogramAlias.subtypeReads.push(...this.getType(subprogramAlias, false).typeReads);
          }
          this.expect('is');
          subprogramAlias.reads = this.consumeNameRead(subprogramAlias);
          this.expect('[');
          // eslint-disable-next-line no-constant-condition
          while (true) {
            if (this.getToken().getLText() !== 'return') {
              subprogramAlias.typeMarks.push(new OTypeMark(subprogramAlias, this.consumeNameRead(subprogramAlias)));
            } else {
              this.expect('return');
              subprogramAlias.return = this.consumeNameRead(subprogramAlias);
            }
            if (this.getToken().getLText() === ',') {
              this.expect(',');
            } else if (this.getToken().getLText() === 'return') {
              this.expect('return');
              subprogramAlias.typeMarks.push(new OTypeMark(subprogramAlias, this.consumeNameRead(subprogramAlias)));
              this.expect(']');
              break;
            } else {
              this.expect(']');
              break;
            }
          }
          this.expect(';');
          this.parent.subprogramAliases.push(subprogramAlias);
        } else {
          const type = new OType(this.parent, this.getToken().range.copyExtendEndOfLine());

          type.lexerToken = this.consumeToken();
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
        }

      } else if (nextWord === 'component' && implementsIHasComponents(this.parent)) {
        this.getNextWord();
        const componentParser = new ComponentParser(this.pos, this.filePath, this.parent);
        this.parent.components.push(componentParser.parse());
      } else if (nextWord === 'procedure' || nextWord === 'impure' || nextWord === 'pure' || nextWord === 'function') {
        const subprogramParser = new SubprogramParser(this.pos, this.filePath, this.parent);
        this.parent.subprograms.push(subprogramParser.parse());
        this.expect(';');
      } else if (nextWord === 'package') {
        this.consumeToken(); // consume 'package
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
        const useClauseParser = new UseClauseParser(this.pos, this.filePath, this.parent);
        this.parent.useClauses.push(useClauseParser.parse());
      } else {
        throw new ParserError(`Unknown Ding: '${nextWord}' on line ${this.getLine()}`, this.pos.getRangeToEndLine());
      }
      nextWord = this.getNextWord({ consume: false }).toLowerCase();
    }
  }

}
