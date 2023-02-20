import { AliasParser } from './alias-parser';
import { AttributeParser } from './attribute-parser';
import { ComponentParser } from './component-parser';
import { implementsIHasDeclarations } from './interfaces';
import { ObjectDeclarationParser } from './object-declaration-parser';
import { OStatementBody, OEntity, OPackage, OPackageBody, OProcess, OSubprogram, OType, OAttributeDeclaration, OI } from './objects';
import { PackageInstantiationParser } from './package-instantiation-parser';
import { ParserBase, ParserState } from './parser-base';
import { SubprogramParser } from './subprogram-parser';
import { SubtypeParser } from './subtype-parser';
import { TypeParser } from './type-parser';
import { UseClauseParser } from './use-clause-parser';

export class DeclarativePartParser extends ParserBase {
  type: string;
  constructor(state: ParserState, private parent: OStatementBody | OEntity | OPackage | OPackageBody | OProcess | OSubprogram | OType) {
    super(state);
    this.debug('start');
  }
  parse(optional = false, lastWord = 'begin', consumeLastWord = true) {
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
        const obj = new AttributeParser(this.state, this.parent).parse();
        if (obj instanceof OAttributeDeclaration) {
          this.parent.declarations.push(obj);
        } else {
          this.parent.declarations.push(obj);
        }
      } else if (nextToken.getLText() === 'type') {
        const typeParser = new TypeParser(this.state, this.parent);
        this.parent.declarations.push(typeParser.parse());
      } else if (nextToken.getLText() === 'subtype') {
        const subtypeParser = new SubtypeParser(this.state, this.parent);
        this.parent.declarations.push(subtypeParser.parse());
      } else if (nextToken.getLText() === 'alias') {
        const alias = new AliasParser(this.state, this.parent).parse();
        this.parent.declarations.push(alias);
      } else if (nextToken.getLText() === 'component' && implementsIHasDeclarations(this.parent)) {
        if (this.parent instanceof OEntity) {
          this.state.messages.push({
            message: `Components are not allowed in entity`,
            range: this.getToken().range
          });
        }
        if (this.parent instanceof OPackageBody) {
          this.state.messages.push({
            message: `Components are not allowed in package body`,
            range: this.getToken().range
          });
        }
        if (this.parent instanceof OProcess) {
          this.state.messages.push({
            message: `Components are not allowed in process`,
            range: this.getToken().range
          });
        }
        if (this.parent instanceof OSubprogram) {
          this.state.messages.push({
            message: `Components are not allowed in subprogram`,
            range: this.getToken().range
          });
        }
        if (this.parent instanceof OType) {
          this.state.messages.push({
            message: `Components are not allowed in type`,
            range: this.getToken().range
          });
        }
        this.consumeToken();
        const componentParser = new ComponentParser(this.state, this.parent);
        this.parent.declarations.push(componentParser.parse());
        this.expect(';');
      } else if (nextToken.getLText() === 'procedure' || nextToken.getLText() === 'impure' || nextToken.getLText() === 'pure' || nextToken.getLText() === 'function') {
        const subprogramParser = new SubprogramParser(this.state, this.parent);
        this.parent.declarations.push(subprogramParser.parse());
        this.expect(';');
      } else if (nextToken.getLText() === 'package') {
        this.consumeToken(); // consume 'package
        this.parent.declarations.push(new PackageInstantiationParser(this.state, this.parent).parse());
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
        this.state.messages.push({
          message: `Unexpected token: '${nextToken.text}' in declarative part. ${lastWord} missing?`,
          range: nextToken.range,
          solution: {
            message: `add ${lastWord}`,
            edits: [
              {
                range: nextToken.range,
                newText: `${lastWord}\n${nextToken.range.copyWithNewStart(new OI(nextToken.range.parent, nextToken.range.start.line, 0)).getText()}`
              }
            ]
          }
        });
        return;
      }
      nextToken = this.getToken();
    }
    if (consumeLastWord) {
      this.expect(lastWord);
    }
  }

}
