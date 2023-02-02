import { afterAll, beforeAll, expect, test, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { ErrorCodes, Position, Range, ResponseError } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { prepareRenameHandler, renameHandler } from '../../../lib/languageFeatures/rename';
import { OIRange } from '../../../lib/parser/objects';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
import { createPrintableRange, makeRangePrintable } from '../../helper';
let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([__dirname], '', defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});
// use dummy Path to avoid having path in snapshots
interface TestSetup {
  occurrences: occurrence[],
  description: string
}
type occurrence = [
  string,
  Range
];
jest.setTimeout(20 * 1000);

test.each([
  {
    occurrences:
      [['entity.vhd', createPrintableRange(5, 8, 19)],
      ['entity.vhd', createPrintableRange(6, 5, 16)],
      ['entity.vhd', createPrintableRange(8, 22, 33)],

      ],
    description: 'three occurrences of entity name(test_entity)'
  },

  {
    occurrences:
      [['entity.vhd', createPrintableRange(8, 14, 18)],
      ['entity.vhd', createPrintableRange(11, 18, 22)]],
    description: 'two occurrences of architecture name (arch)'
  },
  {
    occurrences:
      [['signal.vhd', createPrintableRange(11, 10, 13)],
      ['signal.vhd', createPrintableRange(16, 3, 6)],
      ['signal.vhd', createPrintableRange(17, 24, 27)]],
    description: 'three occurrences of the signal name foo'
  },
  {
    occurrences: [['signal.vhd', createPrintableRange(13, 21, 27)],
    ['package.vhd', createPrintableRange(5, 8, 14)],
    ['package.vhd', createPrintableRange(9, 15, 21)]],
    description: '3 occurrences of t_enum'
  },
  {
    occurrences: [
      ['signal.vhd', createPrintableRange(14, 21, 29)],
      ['package.vhd', createPrintableRange(7, 8, 16)]],
    description: '2 occurrences of t_record'
  },
  {
    occurrences:
      [['signal.vhd', createPrintableRange(19, 12, 20)],
      ['package.vhd', createPrintableRange(9, 5, 13)]],
    description: '2 occurrences of element1 of t_record'
  },
  {
    occurrences:
      [['package.vhd', createPrintableRange(4, 9, 17)],
      ['signal.vhd', createPrintableRange(4, 10, 18)], // also expect renaming in signal.vhd:4
      ['package.vhd', createPrintableRange(12, 13, 21)],
      ['package.vhd', createPrintableRange(13, 14, 22)],
      ['package.vhd', createPrintableRange(14, 18, 26)]],
    description: '5 occurrences of package name (test_pkg)'
  },
  {
    occurrences:
      [['entity_split.vhd', createPrintableRange(2, 8, 25)],
      ['entity_split.vhd', createPrintableRange(6, 5, 22)],
      ['architecture_split.vhd', createPrintableRange(1, 22, 39)],
      ['instantiation.vhd', createPrintableRange(9, 32, 49)],
      ],
    description: 'split entity and architecture file'
  },
  {
    occurrences:
      [['entity_split.vhd', createPrintableRange(4, 5, 8)],
      ['architecture_split.vhd', createPrintableRange(5, 10, 13)],
      ['instantiation.vhd', createPrintableRange(10, 10, 13)],
      ],
    description: 'port name'
  },
  {
    occurrences:
      [['entity2.vhd', createPrintableRange(11, 25, 29)],
      ['entity2.vhd', createPrintableRange(15, 26, 30)],
      ['entity2.vhd', createPrintableRange(16, 5, 9)],
      ['package2.vhd', createPrintableRange(5, 12, 16)],
      ['package2.vhd', createPrintableRange(6, 12, 16)],
      ['package2.vhd', createPrintableRange(7, 12, 16)],
      ['package2.vhd', createPrintableRange(10, 12, 16)],
      ['package2.vhd', createPrintableRange(13, 16, 20)],
      ['package2.vhd', createPrintableRange(14, 12, 16)],
      ['package2.vhd', createPrintableRange(17, 16, 20)],
      ],
    description: 'function split over files'
  },
  {
    occurrences:
      [['entity2.vhd', createPrintableRange(16, 10, 11)],
      ['package2.vhd', createPrintableRange(7, 17, 18)],
      ],
    description: 'function parameter name'
  },
])('testing rename for %j', async (testSetup: TestSetup) => {
  const { occurrences } = testSetup;
  interface Operations {
    [path: string]: string[]

  }
  // Build expected operations
  const expectedOperations: Operations = {};
  for (const [name, range] of occurrences) {
    const uri = URI.file(__dirname + `/${name}`).toString();
    if (Array.isArray(expectedOperations[uri]) === false) {
      expectedOperations[uri] = [];
    }
    expectedOperations[uri].push(makeRangePrintable(range));
  }
  for (const key of Object.keys(expectedOperations)) {
    expectedOperations[key].sort();
  }
  for (const [name, range] of occurrences) {
    const path = __dirname + `/${name}`;

    const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }),
      projectParser, defaultSettingsGetter);
    await linter.checkAll();
    await projectParser.stop();
    const newName = 'foo_bar';
    const pos = range.start;
    const { start, end } = range;
    // Test start, middle, end
    const characters = new Set([start.character, end.character, Math.round((end.character + start.character) / 2)]);
    for (const character of characters) {
      let result;
      try {
        result = await prepareRenameHandler(linter, Position.create(start.line, character));
      } catch (err) {
        if (err.code === ErrorCodes.InvalidRequest) {
          throw new Error(`Unexpected invalid request on ${name}:${start.line + 1}:${character + 1}`);
        } else {
          throw err;
        }
      }
      expect(result).toBeInstanceOf(OIRange);
      expect(result.start.line).toBe(start.line);
      expect(result.start.character).toBe(start.character);
      expect(result.end.line).toBe(end.line);
      expect(result.end.character).toBe(end.character);
      const renameOperations = await renameHandler(linter, pos, newName);
      const operations: Operations = {};
      for (const [path, edits] of Object.entries(renameOperations.changes)) {
        if (Array.isArray(operations[path]) === false) {
          operations[path] = [];
        }
        for (const edit of edits) {
          expect(edit.newText).toBe(newName);
          operations[path].push(makeRangePrintable(edit.range));
        }
      }
      for (const key of Object.keys(operations)) {
        operations[key].sort();
      }
      expect(operations).toStrictEqual(expectedOperations);

    }
  }

});
test.each([
  ['entity.vhd', createPrintableRange(5, 1, 7), 0], // No rename entity keyword
  ['entity.vhd', createPrintableRange(8, 1, 13), 0], // No rename architecture keyword
])('testing rename for %s in %s where it is not possible', async (name, range) => {
  const path = __dirname + `/${name}`;

  const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter);
  await linter.checkAll();
  await projectParser.stop();
  const { start, end } = range;


  for (let character = start.character; character <= end.character; character++) {

    let err;
    try {
      await prepareRenameHandler(linter, Position.create(start.line, character));
    } catch (_err) {
      err = _err;
    }
    expect(err).toBeInstanceOf(ResponseError);
    expect(err.message).toBe('Can not rename this element');
  }
});
test('testing handling of invalid rename Handler', async () => {
  const filename = 'entity.vhd';
  const path = __dirname + `/${filename}`;
  const dummyPath = `/file/${filename}`;
  const linter = new VhdlLinter(dummyPath, readFileSync(path, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter);
  await linter.checkAll();
  await projectParser.stop();
  let err;
  try {
    await renameHandler(linter, Position.create(7, 1), 'test');
  } catch (_err) {
    err = _err;
  }
  expect(err).toBeInstanceOf(ResponseError);
  expect(err.code).toBe(ErrorCodes.InvalidRequest);
});