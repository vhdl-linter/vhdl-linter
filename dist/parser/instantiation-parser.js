"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_base_1 = require("./parser-base");
const objects_1 = require("./objects");
class InstantiationParser extends parser_base_1.ParserBase {
    constructor(text, pos, file, parent) {
        super(text, pos, file);
        this.parent = parent;
        this.debug(`start`);
    }
    parse(nextWord, label) {
        const instantiation = new objects_1.OInstantiation(this.parent, this.pos.i);
        instantiation.label = label;
        if (nextWord === 'entity') {
            nextWord = this.getNextWord({ re: /[\w.]/ });
        }
        instantiation.componentName = nextWord;
        let hasPortMap = false;
        let lastI;
        while (this.text[this.pos.i] !== ';') {
            nextWord = this.getNextWord();
            console.log(nextWord, 'nextWord');
            if (nextWord === 'port') {
                hasPortMap = true;
                this.expect('map');
                this.expect('(');
                instantiation.portMappings = this.parseMapping(instantiation);
            }
            else if (nextWord === 'generic') {
                this.expect('map');
                this.expect('(');
                instantiation.genericMappings = this.parseMapping(instantiation);
            }
            if (lastI === this.pos.i) {
                throw new objects_1.ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.i);
            }
            lastI = this.pos.i;
        }
        this.expect(';');
        if (!hasPortMap) {
            throw new Error(`Instantiation has no Port Map. line ${this.getLine()}`);
        }
        return instantiation;
    }
    parseMapping(instantiation) {
        this.debug(`parseMapping`);
        const mappings = [];
        while (this.pos.i < this.text.length) {
            const mapping = new objects_1.OMapping(instantiation, this.pos.i);
            mapping.name = this.getNextWord({ re: /[^=]/ });
            this.expect('=>');
            mapping.mapping = '';
            let braceLevel = 0;
            while (this.text[this.pos.i].match(/[,)]/) === null || braceLevel > 0) {
                mapping.mapping += this.text[this.pos.i];
                if (this.text[this.pos.i] === '(') {
                    braceLevel++;
                }
                else if (this.text[this.pos.i] === ')') {
                    braceLevel--;
                }
                this.pos.i++;
            }
            mapping.name = mapping.name.trim();
            mapping.mapping = mapping.mapping.trim();
            mappings.push(mapping);
            if (this.text[this.pos.i] === ',') {
                this.pos.i++;
                this.advanceWhitespace();
            }
            else if (this.text[this.pos.i] === ')') {
                this.pos.i++;
                break;
            }
        }
        return mappings;
    }
}
exports.InstantiationParser = InstantiationParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFudGlhdGlvbi1wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9saWIvcGFyc2VyL2luc3RhbnRpYXRpb24tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0NBQXlDO0FBRXpDLHVDQUFnRTtBQUVoRSxNQUFhLG1CQUFvQixTQUFRLHdCQUFVO0lBQ2pELFlBQVksSUFBWSxFQUFFLEdBQW1CLEVBQUUsSUFBWSxFQUFVLE1BQWM7UUFDakYsS0FBSyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFENEMsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUVqRixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRXRCLENBQUM7SUFDRCxLQUFLLENBQUMsUUFBZ0IsRUFBRSxLQUFjO1FBQ3BDLE1BQU0sYUFBYSxHQUFHLElBQUksd0JBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEUsYUFBYSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDNUIsSUFBSSxRQUFRLEtBQUssUUFBUSxFQUFFO1lBQ3pCLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUMsRUFBRSxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUM7U0FDNUM7UUFDRCxhQUFhLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQztRQUN2QyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDdkIsSUFBSSxLQUFLLENBQUM7UUFDVixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7WUFDcEMsUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNsQyxJ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