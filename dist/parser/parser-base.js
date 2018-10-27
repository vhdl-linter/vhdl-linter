"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const escapeStringRegexp = require('escape-string-regexp');
const objects_1 = require("./objects");
class ParserBase {
    constructor(text, pos, file) {
        this.text = text;
        this.pos = pos;
        this.file = file;
    }
    debug(message) {
        // console.log(`${this.constructor.name}: ${message} in line: ${this.getLine()}, (${this.file})`);
    }
    debugObject(object) {
        let target = {};
        const filter = (object) => {
            const target = {};
            if (!object) {
                return;
            }
            for (const key of Object.keys(object)) {
                if (key === 'parent') {
                    continue;
                }
                else if (Array.isArray(object[key])) {
                    target[key] = object[key].map(filter);
                }
                else if (typeof object[key] === 'object') {
                    target[key] = filter(object[key]);
                }
                else {
                    target[key] = object[key];
                }
            }
            return target;
        };
        target = filter(object);
        console.log(`${this.constructor.name}: ${JSON.stringify(target, null, 2)} in line: ${this.getLine()}, (${this.file})`);
    }
    message(message, severity = 'error') {
        if (severity === 'error') {
            throw new objects_1.ParserError(message + ` in line: ${this.getLine()}`, this.pos.i);
        }
        else {
        }
    }
    advanceWhitespace() {
        while (this.text[this.pos.i] && this.text[this.pos.i].match(/\s/)) {
            this.pos.i++;
        }
    }
    reverseWhitespace() {
        while (this.text[this.pos.i - 1] && this.text[this.pos.i - 1].match(/\s/)) {
            this.pos.i--;
        }
    }
    advancePast(search) {
        let text = '';
        let searchStart = this.pos.i;
        if (typeof search === 'string') {
            while (this.text.substr(this.pos.i, search.length).toLowerCase() !== search.toLowerCase()) {
                text += this.text[this.pos.i];
                this.pos.i++;
                if (this.pos.i > this.text.length) {
                    throw new objects_1.ParserError(`could not find ${search}`, searchStart);
                }
            }
            this.pos.i += search.length;
        }
        else {
            let match = this.text.substr(this.pos.i).match(search);
            while (match === null) {
                text += this.text[this.pos.i];
                this.pos.i++;
                if (this.pos.i > this.text.length) {
                    throw new objects_1.ParserError(`could not find ${search}`, searchStart);
                }
                match = this.text.substr(this.pos.i).match(search);
            }
            this.pos.i += match[0].length;
        }
        this.advanceWhitespace();
        return text.trim();
    }
    advanceSemicolon() {
        let text = '';
        while (this.text[this.pos.i].match(/[^;]/)) {
            text += this.text[this.pos.i];
            this.pos.i++;
        }
        this.pos.i++;
        this.advanceWhitespace();
        return text;
    }
    getNextWord(options = {}) {
        let { re, consume, withCase } = options;
        if (!re) {
            re = /\w/;
        }
        if (typeof consume === 'undefined') {
            consume = true;
        }
        if (typeof withCase === 'undefined') {
            withCase = false;
        }
        if (consume) {
            let word = '';
            while (this.text[this.pos.i].match(re)) {
                word += this.text[this.pos.i];
                this.pos.i++;
            }
            this.advanceWhitespace();
            return word;
        }
        let word = '';
        let j = 0;
        while (this.text[this.pos.i + j].match(re)) {
            word += this.text[this.pos.i + j];
            j++;
        }
        if (withCase) {
            return word;
        }
        return word.toLowerCase();
    }
    getLine(position) {
        if (!position) {
            position = this.pos.i;
        }
        let line = 1;
        for (let counter = 0; counter < position; counter++) {
            if (this.text[counter] === '\n') {
                line++;
            }
        }
        return line;
    }
    expect(expected) {
        if (!Array.isArray(expected)) {
            expected = [expected];
        }
        let hit = false;
        for (const exp of expected) {
            const word = this.text.substr(this.pos.i, exp.length);
            if (word.toLowerCase() === exp.toLowerCase()) {
                hit = true;
                this.pos.i += word.length;
                this.advanceWhitespace();
            }
        }
        if (!hit) {
            throw new objects_1.ParserError(`expected '${expected.join(', ')}' found '${this.getNextWord()}' line: ${this.getLine()}`, this.pos.i);
        }
    }
    maybeWord(expected) {
        const word = this.text.substr(this.pos.i, expected.length);
        if (word.toLowerCase() === expected.toLowerCase()) {
            this.pos.i += word.length;
            this.advanceWhitespace();
        }
    }
    getType() {
        let type = '';
        while (this.text[this.pos.i].match(/[^;]/)) {
            type += this.text[this.pos.i];
            this.pos.i++;
        }
        this.expect(';');
        this.advanceWhitespace();
        return type;
    }
    extractReadsOrWrite(parent, text, i) {
        return this.tokenize(text).filter(token => token.type === 'VARIABLE' || token.type === 'FUNCTION').map(token => {
            const write = new objects_1.OWrite(parent, i);
            write.begin = i;
            // write.begin = leftHandSideI + token.offset;
            write.end = write.begin + token.value.length;
            write.text = token.value;
            return write;
        });
    }
    tokenize(text) {
        const operators = [
            ['**', 'abs', 'not'],
            ['*', '/'],
            ['+', '-'],
            ['+', '-', '&'],
            ['sll', 'srl', 'sla', 'sra', 'rol', 'ror'],
            ['=', '/=', '<=', '>', '>=', '?=', '?/=', '?<', '?<=', '?>', '?>='],
            ['and', 'or', 'nand', 'nor', 'xor', 'xnor'],
            ['downto', 'to', 'others']
        ];
        const tokenTypes = [
            { regex: /^\s+/, tokenType: 'WHITESPACE' },
            { regex: /^[()]/, tokenType: 'BRACE' },
            { regex: /^,/, tokenType: 'COMMA' },
            { regex: /^[0-9]+/, tokenType: 'INTEGER_LITERAL' },
            { regex: /^"[0-9]+"/, tokenType: 'LOGIC_LITERAL' },
            { regex: /^x"[0-9A-F]+"/i, tokenType: 'LOGIC_LITERAL' },
            { regex: /^'[0-9]+'/, tokenType: 'LOGIC_LITERAL' },
            { regex: /^[a-z]\w*(?!\s*[(]|\w)/i, tokenType: 'VARIABLE' },
            { regex: /^\w+(?=\s*\()/, tokenType: 'FUNCTION' },
        ];
        const specialChars = '[*/&-?=<>+]';
        for (const operatorGroup of operators) {
            for (const operator of operatorGroup) {
                if (operator.match(/[^a-z]/i)) {
                    tokenTypes.unshift({
                        regex: new RegExp('^' + escapeStringRegexp(operator) + '(?!\s*' + specialChars + ')'),
                        tokenType: 'OPERATION',
                    });
                }
                else {
                    tokenTypes.unshift({
                        regex: new RegExp('^\\b' + operator + '\\b', 'i'),
                        tokenType: 'OPERATION',
                    });
                }
            }
        }
        // console.log(tokenTypes);
        const tokens = [];
        let foundToken;
        let offset = 0;
        do {
            foundToken = false;
            for (const tokenType of tokenTypes) {
                let match = tokenType.regex.exec(text);
                if (match) {
                    const token = { type: tokenType.tokenType, value: match[0], offset };
                    tokens.push(token);
                    text = text.substring(match[0].length);
                    offset += match[0].length;
                    foundToken = true;
                    break;
                }
            }
        } while (text.length > 0 && foundToken);
        return tokens;
    }
}
exports.ParserBase = ParserBase;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLWJhc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9saWIvcGFyc2VyL3BhcnNlci1iYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUMzRCx1Q0FBdUQ7QUFRdkQsTUFBYSxVQUFVO0lBR3JCLFlBQXNCLElBQVksRUFBWSxHQUFtQixFQUFZLElBQVk7UUFBbkUsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUFZLFFBQUcsR0FBSCxHQUFHLENBQWdCO1FBQVksU0FBSSxHQUFKLElBQUksQ0FBUTtJQUV6RixDQUFDO0lBQ0QsS0FBSyxDQUFDLE9BQWU7UUFDbkIsa0dBQWtHO0lBQ3BHLENBQUM7SUFDRCxXQUFXLENBQUMsTUFBVztRQUNyQixJQUFJLE1BQU0sR0FBUSxFQUFFLENBQUM7UUFDckIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxNQUFXLEVBQUUsRUFBRTtZQUM3QixNQUFNLE1BQU0sR0FBUSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDWCxPQUFPO2FBQ1I7WUFDRCxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3JDLElBQUksR0FBRyxLQUFLLFFBQVEsRUFBRTtvQkFDcEIsU0FBUztpQkFDVjtxQkFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7b0JBQ3JDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUV2QztxQkFBTSxJQUFJLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLFFBQVEsRUFBRTtvQkFDMUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMs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