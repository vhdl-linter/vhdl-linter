import { OLexerToken, TokenType } from "./lexer";
import * as O from "./parser/objects";
import { OEntity, OFile } from "./parser/objects";
import { ProjectParser } from "./projectParser";
import { SettingsGetter } from "./vhdlLinter";

export class VerilogParser {
  file: OFile;
  pos = 0;
  advanceWhitespace() {
    const match = this.text.substring(this.pos).match(/\s+/);
    if (match) {
      this.pos += match[0].length;
    }
  }
  constructor(public uri: URL, public text: string, public projectParser: ProjectParser,
    public settingsGetter: SettingsGetter,
  ) {
    const originalText = this.text;

    this.text = this.text.replaceAll(/\/\*(.*?)\*\//g, match => match.replaceAll(/[^\n]/g, ' '));
    this.text = this.text.replaceAll(/\/\/.*/g, match => ' '.repeat(match.length));
    let match;
    this.file = new OFile(this.text, this.uri, originalText, []);

    let iterationCounter = 100;
    // eslint-disable-next-line no-cond-assign
    while (match = this.text.substring(this.pos).match(/(module\s+)(\w+)/s)) {
      if ((iterationCounter-- === 0)) {
        console.log(`Infinite loop in ${uri.toString()}`);
        return;
      }
      const moduleName = new OLexerToken(match[2]!, new O.OIRange(this.file, this.pos + match.index! + match[1]!.length, this.pos + match.index! + match[2]!.length), TokenType.implicit, this.file);
      const module = new OEntity(this.file, new O.OIRange(this.file, this.pos + match.index!, 0));
      this.pos = match.index! + match[0].length;
      const parameters = [];
      this.advanceWhitespace();
      // eslint-disable-next-line no-cond-assign
      if (match = this.text.substring(this.pos).match(/#\((.*?)\)/s)) {
        this.pos += match.index! + match[0].length;
        const parameterString = match[1]!;
        const parameterRegex = /parameter\s(\w+)/gs;
        // eslint-disable-next-line no-cond-assign
        while (match = parameterRegex.exec(parameterString)) {
          parameters.push(match[1]);
        }
      }
      this.advanceWhitespace();

      // eslint-disable-next-line no-cond-assign
      if (match = this.text.substring(this.pos).match(/(\()(.*?)\)/s)) {
        let offset = this.pos + match.index! + match[1]!.length;
        this.pos += match.index! + match[0].length;
        const portsString = match[2]!;
        for (const portString of portsString.split(',')) {
          //           net_type ::=
          // supply0 | supply1
          // | tri | triand | trior | tri0 | tri1
          // | uwire | wire | wand | wor
          const portMatch = portString.match(/^((\s*)(input|inout|output)?\s*(supply0|supply1|tri|triand|trior|tri0|tri1|uwire|wire|wand|wor|reg)?\s*(signed)?(\[.*?\])?\s*)(\w+)/s);
          if (portMatch) {
            const port = new O.OPort(module, new O.OIRange(this.file, portMatch[2]!.length + offset, portMatch[0]!.length + offset) );
            port.lexerToken = new OLexerToken(portMatch[7]!, new O.OIRange(this.file, offset + portMatch[2]!.length , offset + portMatch[2]!.length + portMatch[7]!.length), TokenType.implicit, this.file);
            if (portMatch[3] === 'input') {
              port.direction = 'in';
            } else if (portMatch[3] === 'output') {
              port.direction = 'out';
            } else if (portMatch[3] === 'inout') {
              port.direction = 'inout';
            }
            module.ports.push(port);
          }
          offset += portString.length + 1;
        }
      }
      match = this.text.substring(this.pos).match(/endmodule/);
      module.lexerToken = moduleName;
      if (match) {
        module.range = module.range.copyWithNewEnd(new O.OI(this.file, this.pos + match.index!));
        this.pos += match.index! + match[0].length;
      }

      this.file.entities.push(module);
    }
  }
}