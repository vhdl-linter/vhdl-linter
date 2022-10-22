import { ComponentParser } from './component-parser';
import { ObjectDeclarationParser } from './object-declaration-parser';
import { implementsIHasComponents,  OArchitecture, OEntity, OPackage, OPackageBody, OProcess, OSubprogram, OType, ParserError } from './objects';
import { ParserBase } from './parser-base';
import { SubprogramParser } from './subprogram-parser';
import { SubtypeParser } from './subtype-parser';
import { TypeParser } from './type-parser';
import { UseClauseParser } from './use-clause-parser';
import { ParserPosition } from './parser';
import { PackageInstantiationParser } from './package-instantiation-parser';
import { AliasParser } from './alias-parser';

export class DeclarativePartParser extends ParserBase {
  type: string;
  constructor(pos: ParserPosition, file: string, private parent: OArchitecture | OEntity | OPackage | OPackageBody | OProcess | OSubprogram | OType) {
    super(pos, file);
    this.debug('start');
  }
  parse(optional = false, lastWord = 'begin') {
    let nextToken = this.getToken();
    while (nextToken.getLText() !== lastWord) {
      if (nextToken.getLText() === 'signal'
        || nextToken.getLText() === 'constant'
        || nextToken.getLText() === 'shared'
        || nextToken.getLText() === 'variable'
        || nextToken.getLText() === 'file') {
        const objectDeclarationParser = new ObjectDeclarationParser(this.pos, this.filePath, this.parent);
        objectDeclarationParser.parse(nextToken);
      } else if (nextToken.getLText() === 'attribute') {
        this.consumeToken();
        this.advanceSemicolonToken(true);
      } else if (nextToken.getLText() === 'type') {
        const typeParser = new TypeParser(this.pos, this.filePath, this.parent);
        this.parent.types.push(typeParser.parse());
      } else if (nextToken.getLText() === 'subtype') {
        const subtypeParser = new SubtypeParser(this.pos, this.filePath, this.parent);
        this.parent.types.push(subtypeParser.parse());
      } else if (nextToken.getLText() === 'alias') {
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
          const subprogramAlias = new AliasParser(this.pos, this.filePath, this.parent).parse();
          this.parent.subprogramAliases.push(subprogramAlias);
        } else {
          const type = new OType(this.parent, this.getToken().range.copyExtendEndOfLine());

          type.lexerToken = this.consumeToken();
          type.alias = true;
          if (this.getToken().getLText() === ':') {
            this.consumeToken();
            this.advanceWhitespace();
            this.consumeToken();
            type.reads.push(...this.getType(type, false).typeReads);
          }
          this.expectToken('is');
          this.parent.types.push(type);
          this.advanceSemicolonToken(true);
        }

      } else if (nextToken.getLText() === 'component' && implementsIHasComponents(this.parent)) {
        this.consumeToken();
        const componentParser = new ComponentParser(this.pos, this.filePath, this.parent);
        this.parent.components.push(componentParser.parse());
      } else if (nextToken.getLText() === 'procedure' || nextToken.getLText() === 'impure' || nextToken.getLText() === 'pure' || nextToken.getLText() === 'function') {
        const subprogramParser = new SubprogramParser(this.pos, this.filePath, this.parent);
        this.parent.subprograms.push(subprogramParser.parse());
        this.expectToken(';');
      } else if (nextToken.getLText() === 'package') {
        this.consumeToken(); // consume 'package
        this.parent.packageInstantiations.push(new PackageInstantiationParser(this.pos, this.filePath, this.parent).parse());
        this.expectToken(';');
      } else if (nextToken.getLText() === 'generic') {
        this.advanceSemicolonToken();
      } else if (nextToken.getLText() === 'disconnect') {
        this.advanceSemicolonToken();
      } else if (optional) {
        return;
      } else if (nextToken.getLText() === 'use') {
        this.consumeToken();
        const useClauseParser = new UseClauseParser(this.pos, this.filePath, this.parent);
        this.parent.useClauses.push(useClauseParser.parse());
      } else {
        throw new ParserError(`Unknown Ding: '${nextToken.text}' on line ${this.getLine()}`, this.pos.getRangeToEndLine());
      }
      nextToken = this.getToken();
    }
  }

}
