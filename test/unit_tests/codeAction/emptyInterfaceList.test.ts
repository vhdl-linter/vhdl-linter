import { expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Position } from 'vscode-languageserver';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
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
  const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }),
    await ProjectParser.create([], '', defaultSettingsGetter), defaultSettingsGetter);
  await linter.checkAll();
  const changes = linter.diagnosticCodeActionRegistry
    .map(callback => callback(path)).flat()
    .map(actions => {
      return Object.values(actions.edit?.changes ?? {})
    }).flat(2)
    .map(message => ({ // Remove Parent from OIRanges so jest does not explode
      ...message,
      range: {
        start: Position.create(message.range.start.line, message.range.start.character),
        end: Position.create(message.range.end.line, message.range.end.character)
      },
    }))
  expect(changes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        "newText": "",
        "range": range,
      })
    ])
  );
});