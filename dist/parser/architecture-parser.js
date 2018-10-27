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
                ifGenerate.conditionReads = this.extractReadsOrWrite(ifGenerate, condition, conditionI);
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
                let type = this.getType();
                if (type.indexOf(':=') > -1) {
                    const split = type.split(':=');
                    type = split[0].trim();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0dXJlLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9wYXJzZXIvYXJjaGl0ZWN0dXJlLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtDQUEyQztBQUMzQyxxREFBaUQ7QUFDakQsaUVBQTZEO0FBRTdELHVDQUEwRztBQUMxRywyREFBdUQ7QUFFdkQsTUFBYSxrQkFBbUIsU0FBUSx3QkFBVTtJQUdoRCxZQUFZLElBQVksRUFBRSxHQUFtQixFQUFFLElBQVksRUFBVSxNQUFjLEVBQUUsSUFBYTtRQUNoRyxLQUFLLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUQ0QyxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBRWpGLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEIsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ25CLElBQUksSUFBSSxFQUFFO1lBQ1IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7U0FDbEI7SUFDSCxDQUFDO0lBQ0QsS0FBSyxDQUFDLFNBQVMsR0FBRyxLQUFLLEVBQUUsYUFBYSxHQUFHLGNBQWM7UUFDckQsSUFBSSxZQUFZLEdBQUcsSUFBSSx1QkFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5RCxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUU7WUFDdEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ25CO1FBRUQsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLGFBQWEsS0FBSyxjQUFjLENBQUMsQ0FBQztRQUNyRyxZQUFZLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUMvQixZQUFZLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUUzQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ3BDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDckMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDYixTQUFTO2FBQ1Y7WUFDRCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDaEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDbEMsSUFBSSxRQUFRLEtBQUssS0FBSyxFQUFFO2dCQUN0QixJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUM5QixJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7b0JBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzNCO2dCQUNELElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtvQkFDYixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDM0I7Z0JBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdEIsTUFBTTthQUNQO1lBQ0QsSUFBSSxLQUFLLENBQUM7WUFDVixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7Z0JBQ2pDLEtBQUssR0FBRyxRQUFRLENBQUM7Z0JBQ2pCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3pCLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7YUFDL0I7WUFBQyxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUU7Z0JBQzVCLE1BQU0sYUFBYSxHQUFHLElBQUksOEJBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDdEYsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2FBQ3pEO2lCQUFNLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDNUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUMsQ0FBQztnQkFDekMsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ2pELE1BQU0sZUFBZSxHQUFHLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNwRyxNQUFNLFVBQVUsR0FBSSxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxVQUFVLENBQWlCLENBQUM7Z0JBQzVFLFVBQVUsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO2dCQUNqQyxVQUFVLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUN4RixZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUV6QztpQkFBTSxJQUFJLFFBQVEsS0FBSyxLQUFLLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztnQkFDakMsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDMUMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDcEcsTUFBTSxRQUFRLEdBQWtCLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBa0IsQ0FBQztnQkFDekYsUUFBUSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7Z0JBQ3ZCLFFBQVEsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO2dCQUNuQixRQUFRLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztnQkFDN0IsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDdkM7aUJBQU0sSUFBSSxRQUFRLEtBQUssTUFBTSxFQUFFO2dCQUM5QixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3RCO2lCQUFNLEVBQUUsZUFBZTtnQkFDdEIsSUFBSSxLQUFLLEVBQUU7b0JBQ1QsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLDBDQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO29CQUNsRyxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7aUJBQzlFO3FCQUFNLEVBQUUsYUFBYTtvQkFDcEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUM7b0JBQzlCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxvQ0FBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztvQkFDNUYsTUFBTSxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQzVDLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUUxQyxTQUFTO2lCQUNWO2FBQ0Y7U0FDRjtRQUNELE9BQU8sWUFBWSxDQUFDO0lBQ3RCLENBQUM7SUFHRCxvQkFBb0IsQ0FBQyxNQUFxQixFQUFFLFdBQW9CLEtBQUs7UUFDbkUsTUFBTSxPQUFPLEdBQWMsRUFBRSxDQUFDO1FBQzlCLE1BQU0sS0FBSyxHQUFZLEVBQUUsQ0FBQztRQUMxQixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbEUsSUFBSSxZQUFZLEdBQWEsRUFBRSxDQUFDO1FBQ2hDLE9BQU8sUUFBUSxLQUFLLE9BQU8sRUFBRTtZQUMzQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbkIsSUFBSSxRQUFRLEtBQUssUUFBUSxJQUFJLFFBQVEsS0FBSyxVQUFVLEVBQUU7Z0JBQ3BELE1BQU0sTUFBTSxHQUFHLElBQUksaUJBQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFL0MsTUFBTSxDQUFDLFFBQVEsR0FBRyxRQUFRLEtBQUssVUFBVSxDQUFDO2dCQUMxQyxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO29CQUNqQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN4QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNqQixTQUFTO2lCQUNWO2dCQUNELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2pCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO29CQUMzQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMvQixJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUN2QixNQUFNLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztpQkFFdkM7Z0JBQ0QsS0FBSyxNQUFNLGVBQWUsSUFBSSxZQUFZLEVBQUU7b0JBQzFDLE1BQU0sV0FBVyxHQUFHLElBQUksaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDNUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7b0JBQ25DLFdBQVcsQ0FBQyxJQUFJLEdBQUcsZUFBZSxDQUFDO29CQUNuQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2lCQUMzQjtnQkFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNyQixZQUFZLEdBQUcsRUFBRSxDQUFDO2FBQ25CO2lCQUFNLElBQUksUUFBUSxLQUFLLFdBQVcsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUN2QjtpQkFBTSxJQUFJLFFBQVEsS0FBSyxNQUFNLEVBQUU7Z0JBQzlCLE1BQU0sSUFBSSxHQUFHLElBQUksZUFBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakIsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUN4RCxNQUFNLEtBQUssR0FBRyxJQUFJLGdCQUFNLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUN6QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNqQyxJQUFJLEtBQUssRUFBRTt3QkFDVCxLQUFLLENBQUMsS0FBSyxHQUFHLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO3FCQUMxQzt5QkFBTTt3QkFDTCxLQUFLLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQztxQkFDeEI7b0JBQ0QsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ3pCLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztvQkFDNUMsUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUM7b0JBQ3hCLFFBQVEsRUFBRSxDQUFDO29CQUNYLE9BQU8sS0FBSyxDQUFDO2dCQUNmLENBQUMsQ0FBQyxDQUFDO2dCQUNILEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDbEI7aUJBQU0sSUFBSSxRQUFRLEtBQUssV0FBVyxFQUFFO2dCQUNuQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2xCO2lCQUFNLElBQUksUUFBUSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDO2FBQzNCO2lCQUFNO2dCQUNMLE1BQU0sSUFBSSxxQkFBVyxDQUFDLGtCQUFrQixRQUFRLGFBQWEsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUM1RjtZQUNELFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7U0FDL0Q7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDNUIsQ0FBQztDQUVGO0FBdEtELGdEQXNLQyJ9