import { OArchitecture, OEntity, OPackage, OPackageBody, OProcess, OSubprogram, OAliasWithSignature, OType, OTypeMark, OAlias } from "./objects";
import { ParserPosition } from "./parser";
import { ParserBase } from "./parser-base";
// TODO: Use for all kinds of aliases
export class AliasParser extends ParserBase {
    constructor(pos: ParserPosition, file: string, private parent: OArchitecture | OEntity | OPackage | OPackageBody | OProcess | OSubprogram | OType) {
        super(pos, file);
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
            aliasWithSignature.subtypeReads.push(...this.getType(aliasWithSignature, false).typeReads);
        }
        this.expect('is');
        aliasWithSignature.name = this.consumeNameRead(aliasWithSignature);
        this.expect('[');
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (this.getToken().getLText() !== 'return') {
                aliasWithSignature.typeMarks.push(new OTypeMark(aliasWithSignature, this.consumeNameRead(aliasWithSignature)));
            } else {
                this.expect('return');
                aliasWithSignature.return = this.consumeNameRead(aliasWithSignature);
            }
            if (this.getToken().getLText() === ',') {
                this.expect(',');
            } else if (this.getToken().getLText() === 'return') {
                this.expect('return');
                aliasWithSignature.typeMarks.push(new OTypeMark(aliasWithSignature, this.consumeNameRead(aliasWithSignature)));
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
            alias.reads.push(...this.getType(alias, false).typeReads);
        }
        this.expect('is');
        const [tokens] = this.advanceParentheseAware([';'], true, false);
        alias.name.push(...this.extractReads(alias, tokens));
        this.advanceSemicolon(true);
        return alias;
    }
}