import { readdirSync } from "fs";
import { cwd } from "process";
import { DiagnosticSeverity } from "vscode-languageserver";
import { OIRange } from "../parser/objects";
import { joinURL } from "../projectParser";
import { OIDiagnostic } from "../vhdlLinter";

export interface MessageWrapper {
  file: string,
  messages: (OIDiagnostic | { message: string })[]
}
function isOIDiagnostic(obj: unknown): obj is OIDiagnostic {
  if ((obj as OIDiagnostic).range instanceof OIRange) {
    return true;
  }
  return false;
}
export function readDirPath(path: URL) {
  return readdirSync(path).map(file => joinURL(path, file));
}
function getMessageColor(message: OIDiagnostic | { message: string }) {
  if (isOIDiagnostic(message) && message.severity === DiagnosticSeverity.Error) {
    return '\u001b[31m';
  } else if (isOIDiagnostic(message) && message.severity === DiagnosticSeverity.Warning) {
    return '\u001b[33m';
  }
  return '\u001b[34m';
}
export function prettyPrintMessages(messages: MessageWrapper[]) {
  return messages.map(message => {
    const filename = message.file.replace(cwd(), '');
    return message.messages.slice(0, 5).map((innerMessage) => {
      const messageText = `${getMessageColor(innerMessage)}${innerMessage.message}\u001b[0m`;
      if (isOIDiagnostic(innerMessage)) {
        return `${filename}:${innerMessage.range.start.line + 1} (r: ${innerMessage.range.start.line}:${innerMessage.range.start.character} - ${innerMessage.range.end.line}:${innerMessage.range.end.character})\n  ${messageText}`; // lines are 0 based in OI
      }
      return `${filename}\n  ${messageText}`;
    }).join('\n') + (message.messages.length > 5 ? `\n\u001b[31m ... and ${message.messages.length - 5} more\u001b[0m` : '');
  }).join('\n');
}
