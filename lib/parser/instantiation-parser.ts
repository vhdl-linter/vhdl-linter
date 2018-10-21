import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position'
export class InstantiationParser extends ParserBase {
  constructor(text: string, pos: ParserPosition) {
    super(text, pos);
  }
  parse(nextWord: string, label?: string): IInstantiation {
    const portMappings: {portName: string, portMapping: string}[] = [];
    if (nextWord == 'entity') {
      nextWord = this.getNextWord({re: /[\w.]/});
    }
    const componentName = nextWord;
    console.log(label, 'label', componentName, 'componentName')
    nextWord = this.getNextWord();
    let hasPortMap = false;
    if (nextWord === 'port') {
      hasPortMap = true;
      this.expect('map');
      this.expect('(');
      while(this.pos.i < this.text.length) {
        let portName = this.getNextWord();
        this.expect('=>');
        let portMapping = '';
        let braceLevel = 0;
        while (this.text[this.pos.i].match(/[,)]/) === null || braceLevel > 0) {
          portMapping += this.text[this.pos.i];
          if (this.text[this.pos.i] == '(') {
            braceLevel++;
          } else if (this.text[this.pos.i] == ')') {
            braceLevel--;
          }
          this.pos.i++;
        }
        portMapping = portMapping.trim();
        console.log(portName, 'portName', portMapping, 'portMapping');
        portMappings.push({
          portName, portMapping
        });
        if (this.text[this.pos.i] == ',') {
          this.pos.i++;
          this.advanceWhitespace();
        } else if (this.text[this.pos.i] == ')') {
          this.pos.i++;
          this.advancePast(';');
          break;
        }
      }

    }
    if (!hasPortMap) {
      throw new Error(`Instantiation has no Port Map. line ${this.getLine()}`);
    }
    return {
      label,
      portMappings,
      componentName
    }
  }
}
export interface IInstantiation {
  label?: string;
  componentName: string;
  portMappings: {
    portName: string,
    portMapping: string
  }[]
}
