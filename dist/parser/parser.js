"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const entity_parser_1 = require("./entity-parser");
const architecture_parser_1 = require("./architecture-parser");
const parser_base_1 = require("./parser-base");
const parser_position_1 = require("./parser-position");
const objects_1 = require("./objects");
class Parser extends parser_base_1.ParserBase {
    constructor(text, file) {
        super(text, new parser_position_1.ParserPosition(), file);
        this.removeComments();
    }
    parse() {
        const file = new objects_1.OFile();
        while (this.pos.i < this.text.length) {
            if (this.text[this.pos.i].match(/\s/)) {
                this.pos.i++;
                continue;
            }
            let nextWord = this.getNextWord().toLowerCase();
            if (nextWord === 'library') {
                file.libraries.push(this.getNextWord());
                this.expect(';');
            }
            else if (nextWord === 'use') {
                file.useStatements.push(this.getUseStatement(file));
                this.expect(';');
            }
            else if (nextWord === 'entity') {
                const entity = new entity_parser_1.EntityParser(this.text, this.pos, this.file, file);
                file.entity = entity.parse();
                // console.log(file, typeof file.entity, 'typeof');
            }
            else if (nextWord === 'architecture') {
                if (file.architecture) {
                    this.message('Second Architecture not supported');
                }
                const architecture = new architecture_parser_1.ArchitectureParser(this.text, this.pos, this.file, file);
                file.architecture = architecture.parse();
            }
            else {
                this.pos.i++;
            }
        }
        return file;
    }
    removeComments() {
        let i = 0;
        while (i < this.text.length) {
            if (this.text.substr(i, 2) === '--') {
                let start = i;
                while (this.text[i] !== '\n') {
                    i++;
                }
                let end = i;
                this.text = this.text.substr(0, start) + ' '.repeat(end - start) + this.text.substr(end);
            }
            i++;
        }
    }
    getUseStatement(file) {
        let useStatement = new objects_1.OUseStatement(file, this.pos.i);
        useStatement.begin = this.pos.i;
        useStatement.text = '';
        while (this.text[this.pos.i].match(/[\w.]/)) {
            useStatement.text += this.text[this.pos.i];
            this.pos.i++;
        }
        useStatement.end = useStatement.begin + useStatement.text.length;
        this.advanceWhitespace();
        return useStatement;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL3BhcnNlci9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtREFBNkM7QUFDN0MsK0RBQXlEO0FBQ3pELCtDQUF5QztBQUN6Qyx1REFBaUQ7QUFDakQsdUNBQXVFO0FBR3ZFLE1BQWEsTUFBTyxTQUFRLHdCQUFVO0lBRXBDLFlBQVksSUFBWSxFQUFFLElBQVk7UUFDcEMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLGdDQUFjLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4QyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUNELEtBQUs7UUFDSCxNQUFNLElBQUksR0FBRyxJQUFJLGVBQUssRUFBRSxDQUFDO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDcEMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNyQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNiLFNBQVM7YUFDVjtZQUNELElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNoRCxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO2dCQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2xCO2lCQUFNLElBQUksUUFBUSxLQUFLLEtBQUssRUFBRTtnQkFDN0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJ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