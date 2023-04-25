import { OLexerToken, TokenType } from "./lexer";
import * as O from "./parser/objects";
import { OIRange } from "./parser/objects";
import { OEntity, OFile } from "./parser/objects";
import { ProjectParser } from "./projectParser";
import { SettingsGetter } from "./vhdlLinter";

export class VerilogParser {
  file: OFile;
  pos = 0;
  advanceWhitespace() {
    const match = this.text.substring(this.pos).match(/^\s+/);
    if (match) {
      this.pos += match[0].length;
    }
  }
  constructor(public uri: URL, public text: string, public projectParser: ProjectParser,
    public settingsGetter: SettingsGetter,
  ) {
    const originalText = this.text;

    // remove multi line and single line comments
    this.text = this.text.replaceAll(/\/\*(.*?)\*\//sg, match => match.replaceAll(/[^\n]/g, ' '));
    this.text = this.text.replaceAll(/\/\/.*/g, match => ' '.repeat(match.length));
    let match;
    this.file = new OFile(this.text, this.uri, originalText, []);
    let iterationCounter = 100;
    // find modules
    // eslint-disable-next-line no-cond-assign
    while (match = this.text.substring(this.pos).match(/\b(module\s+)(\w+)/s)) {
      if ((iterationCounter-- === 0)) {
        console.log(`Infinite loop in ${uri.toString()}`);
        return;
      }
      const moduleName = new OLexerToken(match[2]!, new O.OIRange(this.file, this.pos + match.index! + match[1]!.length, this.pos + match.index! + match[2]!.length), TokenType.implicit, this.file);
      const module = new OEntity(this.file, new O.OIRange(this.file, this.pos + match.index!, 0));
      this.pos += match.index! + match[0].length;
      this.advanceWhitespace();
      // find parameters, i.e. #(...)
      // eslint-disable-next-line no-cond-assign
      if (match = this.text.substring(this.pos).match(/#\((.*?)\)/s)) {
        const baseOffset = this.pos + match.index! + 2;
        this.pos += match.index! + match[0].length;
        const parameterString = match[1]!;
        const parameterRegex = /(parameter\s+)(\w+)\s*(=\s*\w+)?([^,)])*,?/gs;
        let parameterMatch;
        // eslint-disable-next-line no-cond-assign
        while (parameterMatch = parameterRegex.exec(parameterString)) {
          const offset = baseOffset + parameterMatch.index;
          const parameter = new O.OGenericConstant(module, new O.OIRange(this.file, offset, parameterMatch[0]!.length + offset));
          parameter.lexerToken = new OLexerToken(parameterMatch[2]!, new O.OIRange(this.file, offset + parameterMatch[1]!.length, offset + parameterMatch[1]!.length + parameterMatch[2]!.length), TokenType.implicit, this.file);
          if (parameterMatch[3] !== undefined) {
            parameter.defaultValue = [new O.OName(parameter, new OLexerToken(parameterMatch[3].replace(/=\s*/s, ''), new OIRange(this.file, 0, 0), TokenType.implicit, this.file))];
          }
          module.generics.push(parameter);
        }
      }
      this.advanceWhitespace();
      // find port declaration, i.e. (...)
      // eslint-disable-next-line no-cond-assign
      if (match = this.text.substring(this.pos).match(/\((.*?)\)/s)) {
        let offset = this.pos + match.index! + 1;
        this.pos += match.index! + match[0].length;
        const portsString = match[1]!;
        for (const portString of portsString.split(',')) {
          //           net_type ::=
          // supply0 | supply1
          // | tri | triand | trior | tri0 | tri1
          // | uwire | wire | wand | wor
          const portMatch = portString.match(/^((\s*)(input|inout|output)?\s*(supply0|supply1|tri|triand|trior|tri0|tri1|uwire|wire|wand|wor|reg)?\s*(signed)?(\[.*?\])?\s*)(\w+)/s);
          if (portMatch) {
            const port = new O.OPort(module, new O.OIRange(this.file, portMatch[2]!.length + offset, portMatch[0]!.length + offset));
            port.lexerToken = new OLexerToken(portMatch[7]!, new O.OIRange(this.file, offset + portMatch[2]!.length, offset + portMatch[2]!.length + portMatch[7]!.length), TokenType.implicit, this.file);
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
      match = this.text.substring(this.pos).match(/\bendmodule\b/);
      module.lexerToken = moduleName;
      if (match) {
        module.range = module.range.copyWithNewEnd(new O.OI(this.file, this.pos + match.index!));
        this.pos += match.index! + match[0].length;
      }

      this.file.entities.push(module);
    }
  }
}