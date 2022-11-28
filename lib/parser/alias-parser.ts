import { OArchitecture, OEntity, OPackage, OPackageBody, OProcess, OSubprogram, OAliasWithSignature, OType, OTypeMark } from "./objects";
import { ParserPosition } from "./parser";
import { ParserBase } from "./parser-base";
// TODO: Use for all kinds of aliases
export class AliasParser extends ParserBase {
    constructor(pos: ParserPosition, file: string, private parent: OArchitecture | OEntity | OPackage | OPackageBody | OProcess | OSubprogram | OType) {
        super(pos, file);
        this.debug('start');
    }
    parse() {
        const subprogramAlias = new OAliasWithSignature(this.parent, this.getToken().range.copyExtendEndOfLine());
        subprogramAlias.lexerToken = this.consumeToken();
        if (this.getToken().getLText() === ':') {
            this.consumeToken();
            this.advanceWhitespace();
            this.consumeToken();
            subprogramAlias.subtypeReads.push(...this.getType(subprogramAlias, false).typeReads);
        }
        this.expect('is');
        subprogramAlias.name = this.consumeNameRead(subprogramAlias);
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
        return subprogramAlias;
    }
}