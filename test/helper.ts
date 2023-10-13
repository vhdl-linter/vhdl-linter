import { join } from "path";
import { pathToFileURL } from "url";
import { DeepPartial } from "utility-types";
import { CodeAction, Position, Range } from "vscode-languageserver";
import { readFileSyncNorm } from "../lib/cli/readFileSyncNorm";
import { ProjectParser } from "../lib/projectParser";
import { ISettings } from "../lib/settingsGenerated";
import { overwriteSettings } from "../lib/settingsUtil";
import { VhdlLinter } from "../lib/vhdlLinter";

export function makeRangePrintable(range: Range) {
  return `${range.start.line + 1}:${range.start.character + 1} - ${range.end.line + 1}:${range.end.character + 1}`;
}
export function makePositionPrintable(position: Position) {
  return `${position.line + 1}:${position.character + 1}`;
}

export function createPrintableRange(line: number, startCharacter: number, endCharacter: number) {
  const range = {
    start: {
      line: line - 1,
      character: startCharacter - 1
    },
    end: {
      line: line - 1,
      character: endCharacter - 1
    },
    toString: () => makeRangePrintable(range)
  };
  return range;
}
// Expects line and character with with one indexed numbers (for easy copying from editor)
export function createPrintablePosition(onesLine: number, onesCharacter: number) {
  const position = {
    line: onesLine - 1,
    character: onesCharacter - 1,
    toString: () => makePositionPrintable(position)
  };
  return position;
}

export async function runLinterGetMessages(folder: string, file: string, settingsOverwrite: DeepPartial<ISettings> = {}) {

  const [messages] = await runLinterGetMessagesAndLinter(folder, file, settingsOverwrite);
  return messages;
}
export async function runLinterGetMessagesAndLinter(folder: string, file: string, settingsOverwrite: DeepPartial<ISettings> = {}) {

  const projectParser = await ProjectParser.create([pathToFileURL(folder)]);
  const uri = pathToFileURL(join(folder, file));
  const linter = new VhdlLinter(uri, readFileSyncNorm(join(folder, file), { encoding: 'utf8' }), projectParser,
    overwriteSettings(await projectParser.getDocumentSettings(uri), settingsOverwrite));
  const messages = await linter.checkAll();
  await projectParser.stop();
  return [messages, linter] as const;
}
export function sanitizeActions(actions: CodeAction[]) {
  for (const action of actions) {
    for (const key of Object.keys(action.edit?.changes ?? {})) {
      const newKey = key.split('/').at(-1)!;
      action.edit!.changes![newKey] = action.edit!.changes![key]!;
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete action.edit!.changes![key];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (typeof action.command?.arguments?.[0].textDocumentUri === 'string') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      action.command.arguments[0].textDocumentUri = (action.command.arguments[0].textDocumentUri as string).split('/').at(-1);
    }
  }
}