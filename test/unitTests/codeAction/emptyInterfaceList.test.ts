import { expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { CancellationTokenSource, Position } from 'vscode-languageserver';
import { ProjectParser } from '../../../lib/projectParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../../lib/cli/readFileSyncNorm";

// Check the proposed solution/changes/code actions for diagnostic
test.each([
  ['empty_interface_list_generic.vhd', {
    start: {
      character: 2,
      line: 1,
    },
    end: {
      character: 4,
      line: 2,
    }
  }
  ],
  ['empty_interface_list_parameter.vhd', {
    start: {
      character: 18,
      line: 1,
    },
    end: {
      character: 20,
      line: 1,
    }

  }
  ],
  ['empty_interface_list.vhd', {
    start: {
      character: 2,
      line: 1,
    },
    end: {
      character: 4,
      line: 2,
    }
  }
  ]
])('testing proposed solutions for diagnostic with file %s', async (filename: string, range) => {
  const path = join(__dirname, filename);
  const projectParser = await ProjectParser.create([]);
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, await projectParser.getDocumentSettings(pathToFileURL(path)));
  await linter.checkAll();
  const changes = (await Promise.all(linter.diagnosticCodeActionRegistry
    .map(async callback => await callback(path, new CancellationTokenSource().token)))).flat()
    .map(actions => {
      return Object.values(actions.edit?.changes ?? {});
    }).flat(2)
    .map(message => ({ // Remove Parent from OIRanges so jest does not explode
      ...message,
      range: {
        start: Position.create(message.range.start.line, message.range.start.character),
        end: Position.create(message.range.end.line, message.range.end.character)
      },
    }));
  expect(changes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        "newText": "",
        "range": range,
      })
    ])
  );
});
