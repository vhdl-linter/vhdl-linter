"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_base_1 = require("./parser-base");
const objects_1 = require("./objects");
class EntityParser extends parser_base_1.ParserBase {
    constructor(text, pos, file, parent) {
        super(text, pos, file);
        this.parent = parent;
        this.debug(`start`);
        this.start = pos.i;
    }
    parse() {
        const entity = new objects_1.OEntity(this.parent, this.pos.i);
        entity.name = this.getNextWord();
        this.expect('is');
        let lastI;
        while (this.pos.i < this.text.length) {
            if (this.text[this.pos.i].match(/\s/)) {
                this.pos.i++;
                continue;
            }
            let nextWord = this.getNextWord().toLowerCase();
            if (nextWord === 'port') {
                entity.ports = this.parsePortsAndGenerics(false, entity);
            }
            else if (nextWord === 'generic') {
                entity.generics = this.parsePortsAndGenerics(true, entity);
            }
            else if (nextWord === 'end') {
                this.maybeWord('entity');
                this.maybeWord(entity.name);
                this.expect(';');
                break;
            }
            if (lastI === this.pos.i) {
                throw new objects_1.ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.i);
            }
            lastI = this.pos.i;
        }
        this.end = this.pos.i;
        return entity;
    }
    parsePortsAndGenerics(generics, entity) {
        this.debug('start ports');
        this.expect('(');
        let multiPorts = [];
        const ports = [];
        while (this.pos.i < this.text.length) {
            if (this.text[this.pos.i].match(/\s/)) {
                this.pos.i++;
                continue;
            }
            let port;
            if (generics) {
                port = new objects_1.OGeneric(entity, this.pos.i);
            }
            else {
                port = new objects_1.OPort(entity, this.pos.i);
            }
            if (this.text[this.pos.i] === ')') {
                this.pos.i++;
                this.advanceWhitespace();
                this.expect(';');
                break;
            }
            port.name = this.getNextWord();
            if (this.text[this.pos.i] === ',') {
                this.expect(',');
                multiPorts.push(port.name);
                continue;
            }
            this.expect(':');
            let directionString;
            if (port instanceof objects_1.OPort) {
                directionString = this.getNextWord({ consume: false });
                if (directionString !== 'in' && directionString !== 'out' && directionString !== 'inout') {
                    port.direction = 'inout';
                }
                else {
                    port.direction = directionString;
                    this.getNextWord(); // consume direction
                }
            }
            const { type, defaultValue } = this.getTypeDefintion();
            port.type = type;
            port.defaultValue = defaultValue;
            ports.push(port);
            // for (const multiPortName of multiPorts) {
            //   const multiPort = new OPort(this.parent, -1);
            //   Object.assign(port, multiPort);
            //   multiPort.name = multiPortName;
            //   ports.push(multiPort);
            // }
            multiPorts = [];
        }
        return ports;
    }
    getTypeDefintion() {
        let type = '';
        let braceLevel = 0;
        while (this.text[this.pos.i].match(/[^);:]/) || braceLevel > 0) {
            type += this.text[this.pos.i];
            if (this.text[this.pos.i] === '(') {
                braceLevel++;
            }
            else if (this.text[this.pos.i] === ')') {
                braceLevel--;
            }
            this.pos.i++;
        }
        let defaultValue = '';
        if (this.text[this.pos.i] === ':') {
            this.pos.i += 2;
            while (this.text[this.pos.i].match(/[^);]/) || braceLevel > 0) {
                defaultValue += this.text[this.pos.i];
                if (this.text[this.pos.i] === '(') {
                    braceLevel++;
                }
                else if (this.text[this.pos.i] === ')') {
                    braceLevel--;
                }
                this.pos.i++;
            }
        }
        if (this.text[this.pos.i] === ';') {
            this.pos.i++;
        }
        this.advanceWhitespace();
        defaultValue = defaultValue.trim();
        if (defaultValue === '') {
            return {
                type: type.trim(),
            };
        }
        return {
            type: type.trim(),
            defaultValue: defaultValue
        };
    }
}
exports.EntityParser = EntityParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50aXR5LXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9wYXJzZXIvZW50aXR5LXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtDQUF5QztBQUV6Qyx1Q0FBZ0U7QUFFaEUsTUFBYSxZQUFhLFNBQVEsd0JBQVU7SUFDMUMsWUFBWSxJQUFZLEVBQUUsR0FBbUIsRUFBRSxJQUFZLEVBQVUsTUFBYztRQUNqRixLQUFLLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUQ0QyxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBRWpGLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEIsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFDRCxLQUFLO1FBQ0gsTUFBTSxNQUFNLEdBQUcsSUFBSSxpQkFBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxCLElBQUksS0FBSyxDQUFDO1FBQ1YsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNwQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2IsU0FBUzthQUNWO1lBQ0QsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2hE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