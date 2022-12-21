import { ComponentParser } from './component-parser';
import { ObjectDeclarationParser } from './object-declaration-parser';
import { implementsIHasComponents,  OArchitecture, OEntity, OPackage, OPackageBody, OProcess, OSubprogram, OType, ParserError } from './objects';
import { ParserBase, ParserState } from './parser-base';
import { SubprogramParser } from './subprogram-parser';
import { SubtypeParser } from './subtype-parser';
import { TypeParser } from './type-parser';
import { UseClauseParser } from './use-clause-parser';
import { PackageInstantiationParser } from './package-instantiation-parser';
import { AliasParser } from './alias-parser';

export class DeclarativePartParser extends ParserBase {
  type: string;
  constructor(state: ParserState, private parent: OArchitecture | OEntity | OPackage | OPackageBody | OProcess | OSubprogram | OType) {
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
      } else if (nextToken.getLText() === 'for') {
        // skip simple configurations for now (§ 7.3.1)
        this.advanceSemicolon(true);
        // optional `end for;`
        if (this.getToken(0, true).getLText() == 'end' && this.getToken(1, true).getLText() == 'for') {
          this.advanceSemicolon();
        }
      } else {
        throw new ParserError(`Unknown Ding: '${nextToken.text}' on line ${this.getLine()}`, this.state.pos.getRangeToEndLine());
      }
      nextToken = this.getToken();
    }
  }

}
