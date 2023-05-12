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
  parsePortOrParameter(parent: O.OEntity, str: string, offset: number, parameter: boolean) {
    const regex = /^(\s*(input|inout|output|parameter)?\s+(supply0|supply1|tri|triand|trior|tri0|tri1|uwire|wire|wand|wor|reg|logic|longint)?\s*(?:\[.*?\])?\s*)([a-zA-Z]\w*)\s*(?:\[.*?\])?\s*(?:=\s*(\S+))?/s;
    // groups:
    // 1: everything until name
    // 2 (optional): in, out, parameter etc.
    // 3 (optional): net_type
    // 4: name
    // 5 (optional): default value
    const match = str.match(regex);
    if (match) {
      let port: O.OGenericConstant | O.OPort;
      if (parameter) {
        port = new O.OGenericConstant(parent, new O.OIRange(this.file, offset, offset + str.length));
      } else {
        port = new O.OPort(parent, new O.OIRange(this.file, offset, offset + str.length));
        if (match[2] === 'output') {
          port.direction = 'out';
        } else if (match[2] === 'inout') {
          port.direction = 'inout';
        } else { // default to input
          port.direction = 'in';
        }
      }
      port.lexerToken = new OLexerToken(match[4]!, new O.OIRange(this.file, offset + match[1]!.length, offset + match[1]!.length + match[4]!.length), TokenType.implicit, this.file);
      if (match[5] !== undefined) {
        port.defaultValue = [new O.OName(port, new OLexerToken(match[5].replace(/=\s*/s, ''), new OIRange(this.file, 0, 0), TokenType.implicit, this.file))];
      }
      if (port instanceof O.OGenericConstant) {
        parent.generics.push(port);
      } else {
        parent.ports.push(port);
      }
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
        let offset = this.pos + match.index! + 2;
        this.pos += match.index! + match[0].length;
        const parametersString = match[1]!;
        for (const parameterString of parametersString.split(',')) {
          this.parsePortOrParameter(module, parameterString, offset, true);
          offset += parameterString.length + 1;
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
          this.parsePortOrParameter(module, portString, offset, false);
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