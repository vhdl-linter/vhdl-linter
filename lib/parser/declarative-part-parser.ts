import { ComponentParser } from './component-parser';
import { ObjectDeclarationParser } from './object-declaration-parser';
import { OArchitecture, OEntity, OPackage, OPackageBody, OProcess, OStatementBody, OSubprogram, OType, ParserError } from './objects';
import { ParserBase, ParserState } from './parser-base';
import { SubprogramParser } from './subprogram-parser';
import { SubtypeParser } from './subtype-parser';
import { TypeParser } from './type-parser';
import { UseClauseParser } from './use-clause-parser';
import { PackageInstantiationParser } from './package-instantiation-parser';
import { AliasParser } from './alias-parser';
import { implementsIHasComponents } from './interfaces';

export class DeclarativePartParser extends ParserBase {
  type: string;
  constructor(state: ParserState, private parent: OStatementBody | OEntity | OPackage | OPackageBody | OProcess | OSubprogram | OType) {
    super(state);
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
        const objectDeclarationParser = new ObjectDeclarationParser(this.state, this.parent);
        objectDeclarationParser.parse(nextToken);
      } else if (nextToken.getLText() === 'attribute') {
        this.consumeToken();
        this.advanceSemicolon(true);
      } else if (nextToken.getLText() === 'type') {
        const typeParser = new TypeParser(this.state, this.parent);
        this.parent.types.push(typeParser.parse());
      } else if (nextToken.getLText() === 'subtype') {
        const subtypeParser = new SubtypeParser(this.state, this.parent);
        this.parent.types.push(subtypeParser.parse());
      } else if (nextToken.getLText() === 'alias') {
        const alias = new AliasParser(this.state, this.parent).parse();
        this.parent.aliases.push(alias);



      } else if (nextToken.getLText() === 'component' && implementsIHasComponents(this.parent)) {
        if (this.parent instanceof OEntity) {
          throw new ParserError(`Components are not allowed in entity`, this.getToken().range);
        }
        if (this.parent instanceof OPackageBody) {
          throw new ParserError(`Components are not allowed in package body`, this.getToken().range);
        }
        if (this.parent instanceof OProcess) {
          throw new ParserError(`Components are not allowed in process`, this.getToken().range);
        }
        if (this.parent instanceof OSubprogram) {
          throw new ParserError(`Components are not allowed in subprogram`, this.getToken().range);
        }
        if (this.parent instanceof OType) {
          throw new ParserError(`Components are not allowed in type`, this.getToken().range);
        }
        this.consumeToken();
        const componentParser = new ComponentParser(this.state, this.parent);
        this.parent.components.push(componentParser.parse());
        this.expect(';');
      } else if (nextToken.getLText() === 'procedure' || nextToken.getLText() === 'impure' || nextToken.getLText() === 'pure' || nextToken.getLText() === 'function') {
        const subprogramParser = new SubprogramParser(this.state, this.parent);
        this.parent.subprograms.push(subprogramParser.parse());
        this.expect(';');
      } else if (nextToken.getLText() === 'package') {
        this.consumeToken(); // consume 'package
        this.parent.packageInstantiations.push(new PackageInstantiationParser(this.state, this.parent).parse());
        this.expect(';');
      } else if (nextToken.getLText() === 'generic') {
        this.advanceSemicolon();
      } else if (nextToken.getLText() === 'disconnect') {
        this.advanceSemicolon();
      } else if (optional) {
        return;
      } else if (nextToken.getLText() === 'use') {
        this.consumeToken();
        const useClauseParser = new UseClauseParser(this.state, this.parent);
        this.parent.useClauses.push(useClauseParser.parse());
      } else {
        throw new ParserError(`Unknown Ding: '${nextToken.text}' on line ${this.getLine()}`, this.state.pos.getRangeToEndLine());
      }
      nextToken = this.getToken();
    }
  }

}
