import { AliasParser } from './aliasParser';
import { AttributeParser } from './attributeParser';
import { ComponentParser } from './componentParser';
import { ConfigurationSpecificationParser } from './configurationSpecificationParser';
import { IHasDeclarations, implementsIHasUseClause } from './interfaces';
import { ObjectDeclarationParser } from './objectDeclarationParser';
import { OAttributeDeclaration, ObjectBase, OI } from './objects';
import { PackageInstantiationParser } from './packageInstantiationParser';
import { PackageParser } from './packageParser';
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
        || nextToken.getLText() === 'file'
        ) {
        const objects = new ObjectDeclarationParser(this.state, this.parent).parse(nextToken);
        this.parent.declarations.push(...objects);
      } else if (nextToken.getLText() === 'attribute') {
        const obj = new AttributeParser(this.state, this.parent).parse();
        if (obj instanceof OAttributeDeclaration) {
          this.parent.declarations.push(obj);
        } else {
          this.parent.declarations.push(obj);
        }
      } else if (nextToken.getLText() === 'type') {
        const type = new TypeParser(this.state, this.parent).parse();
        this.parent.declarations.push(type);
      } else if (nextToken.getLText() === 'subtype') {
        const subtype = new SubtypeParser(this.state, this.parent).parse();
        this.parent.declarations.push(subtype);
      } else if (nextToken.getLText() === 'alias') {
        const alias = new AliasParser(this.state, this.parent).parse();
        this.parent.declarations.push(alias);
      } else if (nextToken.getLText() === 'component') {
        this.consumeToken();
        const component = new ComponentParser(this.state, this.parent).parse();
        this.expect(';');
        this.parent.declarations.push(component);
      } else if (nextToken.getLText() === 'procedure' || nextToken.getLText() === 'impure' || nextToken.getLText() === 'pure' || nextToken.getLText() === 'function') {
        const subprogramParser = new SubprogramParser(this.state, this.parent);
        this.parent.declarations.push(subprogramParser.parse());
        this.expect(';');
      } else if (nextToken.getLText() === 'package') {
        this.consumeToken(); // consume 'package
        if (this.getToken(2, true).getLText() === 'new') {
          const packageInst = new PackageInstantiationParser(this.state, this.parent).parse();

          this.parent.declarations.push(packageInst);
          this.expect(';');
        } else {
          this.parent.declarations.push(new PackageParser(this.state).parse(this.parent));
        }
      } else if (nextToken.getLText() === 'generic') {
        this.advanceSemicolon();
      } else if (nextToken.getLText() === 'disconnect') {
        this.advanceSemicolon();

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
        this.parent.declarations.push(new ConfigurationSpecificationParser(this.state, this.parent).parse());
      } else if (optional) {
        return;
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
