"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_base_1 = require("./parser-base");
const process_parser_1 = require("./process-parser");
const instantiation_parser_1 = require("./instantiation-parser");
const objects_1 = require("./objects");
const assignment_parser_1 = require("./assignment-parser");
class ArchitectureParser extends parser_base_1.ParserBase {
    constructor(text, pos, file, parent, name) {
        super(text, pos, file);
        this.parent = parent;
        this.debug('start');
        this.start = pos.i;
        if (name) {
            this.name = name;
        }
    }
    parse(skipStart = false, structureName = 'architecture') {
        let architecture = new objects_1.OArchitecture(this.parent, this.pos.i);
        if (skipStart !== true) {
            this.type = this.getNextWord();
            this.expect('of');
            this.name = this.getNextWord();
            this.expect('is');
        }
        const { signals, types } = this.parseDefinitionBlock(architecture, structureName !== 'architecture');
        architecture.signals = signals;
        architecture.types = types;
        while (this.pos.i < this.text.length) {
            if (this.text[this.pos.i].match(/\s/)) {
                this.pos.i++;
                continue;
            }
            let nextWord = this.getNextWord().toLowerCase();
            console.log(nextWord, 'nextWord');
            if (nextWord === 'end') {
                this.maybeWord(structureName);
                if (this.type) {
                    this.maybeWord(this.type);
                }
                if (this.name) {
                    this.maybeWord(this.name);
                }
                this.expect(';');
                this.end = this.pos.i;
                break;
            }
            let label;
            if (this.text[this.pos.i] === ':') {
                label = nextWord;
                this.pos.i++;
                this.advanceWhitespace();
                nextWord = this.getNextWord();
            }
            if (nextWord === 'process') {
                const processParser = new process_parser_1.ProcessParser(this.text, this.pos, this.file, architecture);
                architecture.processes.push(processParser.parse(label));
            }
            else if (nextWord === 'if') {
                this.debug('parse if generate ' + label);
                let conditionI = this.pos.i;
                let condition = this.advancePast(/^\bgenerate/i);
                const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, architecture, label);
                const ifGenerate = subarchitecture.parse(true, 'generate');
                ifGenerate.condition = condition;
                ifGenerate.conditionReads = this.extractReads(ifGenerate, condition, conditionI);
                architecture.generates.push(ifGenerate);
            }
            else if (nextWord === 'for') {
                this.debug('parse for generate');
                let variable = this.advancePast(/^\bin/i);
                let start = this.advancePast(/^\b(to|downto)/i);
                let end = this.advancePast(/^\bgenerate/i);
                const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, architecture, label);
                const generate = subarchitecture.parse(true, 'generate');
                generate.start = start;
                generate.end = end;
                generate.variable = variable;
                architecture.generates.push(generate);
            }
            else if (nextWord === 'with') {
                console.error('WTF');
            }
            else { // TODO  others
                if (label) {
                    const instantiationParser = new instantiation_parser_1.InstantiationParser(this.text, this.pos, this.file, architecture);
                    architecture.instantiations.push(instantiationParser.parse(nextWord, label));
                }
                else { // statement;
                    this.reverseWhitespace();
                    this.pos.i -= nextWord.length;
                    const assignmentParser = new assignment_parser_1.AssignmentParser(this.text, this.pos, this.file, architecture);
                    const assignment = assignmentParser.parse();
                    architecture.assignments.push(assignment);
                    continue;
                }
            }
        }
        return architecture;
    }
    parseDefinitionBlock(parent, optional = false) {
        const signals = [];
        const types = [];
        let nextWord = this.getNextWord({ consume: false }).toLowerCase();
        let multiSignals = [];
        while (nextWord !== 'begin') {
            this.getNextWord();
            if (nextWord === 'signal' || nextWord === 'constant') {
                const signal = new objects_1.OSignal(parent, this.pos.i);
                signal.constant = nextWord === 'constant';
                signal.name = this.getNextWord();
                if (this.text[this.pos.i] === ',') {
                    multiSignals.push(name);
                    this.expect(',');
                    continue;
                }
                this.expect(':');
                signal.type = this.getType();
                if (signal.type.indexOf(':=') > -1) {
                    const split = signal.type.split(':=');
                    signal.type = split[0].trim();
                    signal.defaultValue = split[1].trim();
                }
                for (const multiSignalName of multiSignals) {
                    const multiSignal = new objects_1.OSignal(parent, -1);
                    Object.assign(signal, multiSignal);
                    multiSignal.name = multiSignalName;
                    signals.push(multiSignal);
                }
                signals.push(signal);
                multiSignals = [];
            }
            else if (nextWord === 'attribute') {
                this.advancePast(';');
            }
            else if (nextWord === 'type') {
                const type = new objects_1.OType(parent, this.pos.i);
                type.name = this.getNextWord();
                this.expect('is');
                if (this.text[this.pos.i] === '(') {
                    this.expect('(');
                    let position = this.pos.i;
                    type.states = this.advancePast(')').split(',').map(type => {
                        const state = new objects_1.OState(type, position);
                        const match = type.match(/^\s*/);
                        if (match) {
                            state.begin = position + match[0].length;
                        }
                        else {
                            state.begin = position;
                        }
                        state.name = type.trim();
                        state.end = state.begin + state.name.length;
                        position += type.length;
                        position++;
                        return state;
                    });
                    types.push(type);
                    this.expect(';');
                }
                else {
                    this.advancePast(';');
                }
            }
            else if (nextWord === 'component') {
                this.advancePast('end');
                this.maybeWord('component');
                this.expect(';');
            }
            else if (optional && signals.length === 0 && types.length === 0) {
                return { signals, types };
            }
            else {
                throw new objects_1.ParserError(`Unknown Ding: '${nextWord}' on line ${this.getLine()}`, this.pos.i);
            }
            nextWord = this.getNextWord({ consume: false }).toLowerCase();
        }
        this.expect('begin');
        return { signals, types };
    }
}
exports.ArchitectureParser = ArchitectureParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0dXJlLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9wYXJzZXIvYXJjaGl0ZWN0dXJlLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtDQUEyQztBQUMzQyxxREFBaUQ7QUFDakQsaUVBQTZEO0FBRTdELHVDQUEwRztBQUMxRywyREFBdUQ7QUFFdkQsTUFBYSxrQkFBbUIsU0FBUSx3QkFBVTtJQUdoRCxZQUFZLElBQVksRUFBRSxHQUFtQixFQUFFLElBQVksRUFBVSxNQUFjLEVBQUUsSUFBYTtRQUNoRyxLQUFLLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUQ0QyxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBRWpGLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEIsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ25CLElBQUksSUFBSSxFQUFFO1lBQ1IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7U0FDbEI7SUFDSCxDQUFDO0lBQ0QsS0FBSyxDQUFDLFNBQVMsR0FBRyxLQUFLLEVBQUUsYUFBYSxHQUFHLGNBQWM7UUFDckQsSUFBSSxZQUFZLEdBQUcsSUFBSSx1QkFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5RCxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUU7WUFDdEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ25CO1FBRUQsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLGFBQWEsS0FBSyxjQUFjLENBQUMsQ0FBQztRQUNyRyxZQUFZLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUMvQixZQUFZLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUUzQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ3BDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDckMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDYixTQUFTO2FBQ1Y7WUFDRCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDaEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDbEMsSUFBSSxRQUFRLEtBQUssS0FBSyxFQUFFO2dCQUN0QixJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUM5QixJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7b0JBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzNCO2dCQUNELElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtvQkFDYixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDM0I7Z0JBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdEIsTUFBTTthQUNQO1lBQ0QsSUFBSSxLQUFLLENBQUM7WUFDVixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7Z0JBQ2pDLEtBQUssR0FBRyxRQUFRLENBQUM7Z0JBQ2pCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3pCLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7YUFDL0I7WUFBQyxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUU7Z0JBQzVCLE1BQU0sYUFBYSxHQUFHLElBQUksOEJBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDdEYsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2FBQ3pEO2lCQUFNLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDNUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUMsQ0FBQztnQkFDekMsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ2pELE1BQU0sZUFBZSxHQUFHLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNwRyxNQUFNLFVBQVUsR0FBSSxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxVQUFVLENBQWlCLENBQUM7Z0JBQzVFLFVBQVUsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO2dCQUNqQyxVQUFVLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDakYsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7YUFFekM7aUJBQU0sSUFBSSxRQUFRLEtBQUssS0FBSyxFQUFFO2dCQUM3QixJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQ2pDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzFDLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDaEQsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxlQUFlLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3BHLE1BQU0sUUFBUSxHQUFrQixlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxVQUFVLENBQWtCLENBQUM7Z0JBQ3pGLFFBQVEsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO2dCQUN2QixRQUFRLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztnQkFDbkIsUUFBUSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7Z0JBQzdCLFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQ3ZDO2lCQUFNLElBQUksUUFBUSxLQUFLLE1BQU0sRUFBRTtnQkFDOUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUN0QjtpQkFBTSxFQUFFLGVBQWU7Z0JBQ3RCLElBQUksS0FBSyxFQUFFO29CQUNULE1BQU0sbUJBQW1CLEdBQUcsSUFBSSwwQ0FBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztvQkFDbEcsWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO2lCQUM5RTtxQkFBTSxFQUFFLGFBQWE7b0JBQ3BCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO29CQUN6QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDO29CQUM5QixNQUFNLGdCQUFnQixHQUFHLElBQUksb0NBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7b0JBQzVGLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDO29CQUM1QyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFFMUMsU0FBUztpQkFDVjthQUNGO1NBQ0Y7UUFDRCxPQUFPLFlBQVksQ0FBQztJQUN0QixDQUFDO0lBR0Qsb0JBQW9CLENBQUMsTUFBcUIsRUFBRSxXQUFvQixLQUFLO1FBQ25FLE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQztRQUM5QixNQUFNLEtBQUssR0FBWSxFQUFFLENBQUM7UUFDMUIsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2xFLElBQUksWUFBWSxHQUFhLEVBQUUsQ0FBQztRQUNoQyxPQUFPLFFBQVEsS0FBSyxPQUFPLEVBQUU7WUFDM0IsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ25CLElBQUksUUFBUSxLQUFLLFFBQVEsSUFBSSxRQUFRLEtBQUssVUFBVSxFQUFFO2dCQUNwRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGlCQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRS9DLE1BQU0sQ0FBQyxRQUFRLEdBQUcsUUFBUSxLQUFLLFVBQVUsQ0FBQztnQkFDMUMsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ2pDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtvQkFDakMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDakIsU0FBUztpQkFDVjtnQkFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQixNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtvQkFDbEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3RDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUM5QixNQUFNLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztpQkFFdkM7Z0JBQ0QsS0FBSyxNQUFNLGVBQWUsSUFBSSxZQUFZLEVBQUU7b0JBQzFDLE1BQU0sV0FBVyxHQUFHLElBQUksaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDNUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7b0JBQ25DLFdBQVcsQ0FBQyxJQUFJLEdBQUcsZUFBZSxDQUFDO29CQUNuQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2lCQUMzQjtnQkFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNyQixZQUFZLEdBQUcsRUFBRSxDQUFDO2FBQ25CO2lCQUFNLElBQUksUUFBUSxLQUFLLFdBQVcsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUN2QjtpQkFBTSxJQUFJLFFBQVEsS0FBSyxNQUFNLEVBQUU7Z0JBQzlCLE1BQU0sSUFBSSxHQUFHLElBQUksZUFBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO29CQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNqQixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ3hELE1BQU0sS0FBSyxHQUFHLElBQUksZ0JBQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7d0JBQ3pDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQ2pDLElBQUksS0FBSyxFQUFFOzRCQUNULEtBQUssQ0FBQyxLQUFLLEdBQUcsUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7eUJBQzFDOzZCQUFNOzRCQUNMLEtBQUssQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO3lCQUN4Qjt3QkFDRCxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDekIsS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO3dCQUM1QyxRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQzt3QkFDeEIsUUFBUSxFQUFFLENBQUM7d0JBQ1gsT0FBTyxLQUFLLENBQUM7b0JBQ2YsQ0FBQyxDQUFDLENBQUM7b0JBQ0gsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDbEI7cUJBQU07b0JBQ0wsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDdkI7YUFDRjtpQkFBTSxJQUFJLFFBQVEsS0FBSyxXQUFXLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDbEI7aUJBQU0sSUFBSSxRQUFRLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUM7YUFDM0I7aUJBQU07Z0JBQ0wsTUFBTSxJQUFJLHFCQUFXLENBQUMsa0JBQWtCLFFBQVEsYUFBYSxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzVGO1lBQ0QsUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztTQUMvRDtRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUM1QixDQUFDO0NBRUY7QUExS0QsZ0RBMEtDIn0=