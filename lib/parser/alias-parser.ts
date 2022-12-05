import { OEntity, OPackage, OPackageBody, OProcess, OSubprogram, OAliasWithSignature, OType, OTypeMark, OAlias, OStatementBody } from "./objects";
import { ParserBase, ParserState } from "./parser-base";
export class AliasParser extends ParserBase {
    constructor(state: ParserState, private parent: OStatementBody | OEntity | OPackage | OPackageBody | OProcess | OSubprogram | OType) {
        super(state);
        this.debug('start');
    }
    parse() {
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
            return this.parseAliasWithSignature();
        }
        return this.parseAlias();

    }
    parseAliasWithSignature() {
        const aliasWithSignature = new OAliasWithSignature(this.parent, this.getToken().range.copyExtendEndOfLine());
        aliasWithSignature.lexerToken = this.consumeToken();
        if (this.getToken().getLText() === ':') {
            this.consumeToken();
            this.advanceWhitespace();
            this.consumeToken();
            aliasWithSignature.subtypeIndication.push(...this.getType(aliasWithSignature, false).typeReads);
        }
        this.expect('is');
        const [tokens] = this.advanceParenthesisAware(['['], true, false);
        aliasWithSignature.name.push(...this.parseExpression(aliasWithSignature, tokens));
        this.expect('[');
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (this.getToken().getLText() !== 'return') {
                aliasWithSignature.typeMarks.push(new OTypeMark(aliasWithSignature, this.consumeNameReference(aliasWithSignature)));
            } else {
                this.expect('return');
                aliasWithSignature.return = this.consumeNameReference(aliasWithSignature);
            }
            if (this.getToken().getLText() === ',') {
                this.expect(',');
            } else if (this.getToken().getLText() === 'return') {
                this.expect('return');
                aliasWithSignature.typeMarks.push(new OTypeMark(aliasWithSignature, this.consumeNameReference(aliasWithSignature)));
                this.expect(']');
                break;
            } else {
                this.expect(']');
                break;
            }
        }
        this.expect(';');
        return aliasWithSignature;
    }
    parseAlias() {
        const alias = new OAlias(this.parent, this.getToken().range.copyExtendEndOfLine());

        alias.lexerToken = this.consumeToken();
        if (this.getToken().getLText() === ':') {
            this.consumeToken();
            this.advanceWhitespace();
            this.consumeToken();
            alias.subtypeIndication.push(...this.getType(alias, false).typeReads);
        }
        this.expect('is');
        const [tokens] = this.advanceParenthesisAware([';'], true, false);
        alias.name.push(...this.parseExpression(alias, tokens));
        this.advanceSemicolon(true);
        return alias;
    }
}