import { AliasParser } from './aliasParser';
import { AttributeParser } from './attributeParser';
import { ComponentParser } from './componentParser';
import { IHasDeclarations, implementsIHasUseClause } from './interfaces';
import { ObjectDeclarationParser } from './objectDeclarationParser';
import { OAttributeDeclaration, ObjectBase, OEntity, OI, OPackageBody, OProcess, OSubprogram, OType } from './objects';
import { PackageInstantiationParser } from './packageInstantiationParser';
import { ParserBase, ParserState } from './parserBase';
import { SubprogramParser } from './subprogramParser';
import { SubtypeParser } from './subtypeParser';
import { TypeParser } from './typeParser';
import { UseClauseParser } from './useClauseParser';

export class DeclarativePartParser extends ParserBase {
  type: string;
  constructor(state: ParserState, private parent: ObjectBase & IHasDeclarations) {
    super(state);
    this.debug('start');
  }
  parse(optional = false, lastWord = 'begin', consumeLastWord = true) {
    const start = this.getToken(-1, true).range;
    let nextToken = this.getToken();
    while (nextToken.getLText() !== lastWord) {
      if (nextToken.getLText() === 'signal'
        || nextToken.getLText() === 'constant'
        || nextToken.getLText() === 'shared'
        || nextToken.getLText() === 'variable'
        || nextToken.getLText() === 'file') {
        const objects = new ObjectDeclarationParser(this.state, this.parent).parse(nextToken);
        this.parent.declarations.push(...objects);
        if (this.parent instanceof OType && this.parent.protected) {
          this.state.messages.push({
            message: `object declarations are not allowed in protected types`,
            range: objects[0]?.range ?? this.getToken().range
          });
        }
      } else if (nextToken.getLText() === 'attribute') {
        const obj = new AttributeParser(this.state, this.parent).parse();
        if (obj instanceof OAttributeDeclaration) {
          if (this.parent instanceof OType && this.parent.protected) {
            this.state.messages.push({
              message: `attribute declarations are not allowed in protected types`,
              range: obj.range
            });
          }
          this.parent.declarations.push(obj);
        } else {
          this.parent.declarations.push(obj);
        }
      } else if (nextToken.getLText() === 'type') {
        const type = new TypeParser(this.state, this.parent).parse();
        if (this.parent instanceof OType && this.parent.protected) {
          this.state.messages.push({
            message: `type declarations are not allowed in protected types`,
            range: type.range
          });
        }
        this.parent.declarations.push(type);
      } else if (nextToken.getLText() === 'subtype') {
        const subtype = new SubtypeParser(this.state, this.parent).parse();
        if (this.parent instanceof OType && this.parent.protected) {
          this.state.messages.push({
            message: `subtype declarations are not allowed in protected types`,
            range: subtype.range
          });
        }
        this.parent.declarations.push(subtype);
      } else if (nextToken.getLText() === 'alias') {
        const alias = new AliasParser(this.state, this.parent).parse();
        if (this.parent instanceof OType && this.parent.protected) {
          this.state.messages.push({
            message: `alias declarations are not allowed in protected types`,
            range: alias.range
          });
        }
        this.parent.declarations.push(alias);
      } else if (nextToken.getLText() === 'component') {
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
        const packageInst = new PackageInstantiationParser(this.state, this.parent).parse();
        this.parent.declarations.push(packageInst);
        this.expect(';');
        if (this.parent instanceof OType && this.parent.protected) {
          this.state.messages.push({
            message: `package instantiations are not allowed in protected types`,
            range: packageInst.range
          });
        }
      } else if (nextToken.getLText() === 'generic') {
        this.advanceSemicolon();
      } else if (nextToken.getLText() === 'disconnect') {
        this.advanceSemicolon();
      } else if (optional) {
        return;
      } else if (nextToken.getLText() === 'use') {
        this.consumeToken();
        const useClause = new UseClauseParser(this.state, this.parent).parse();
        if (implementsIHasUseClause(this.parent)) {
          this.parent.useClauses.push(useClause);
        } else {
          this.state.messages.push({
            message: 'Use clause is not allowed here',
            range: useClause.range
          });
        }
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
    if (this.parent.declarations.length > 0 || !optional) {
      this.parent.declarationsRange = start.copyWithNewEnd(this.getToken(-1).range);
    }
    if (consumeLastWord) {
      this.expect(lastWord);
    }
  }

}
