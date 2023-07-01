import { afterAll, beforeAll, expect, jest, test } from '@jest/globals';
import { pathToFileURL } from 'url';
import { CancellationTokenSource, ErrorCodes, Position, Range, ResponseError } from 'vscode-languageserver';
import { prepareRenameHandler, renameHandler } from '../../../lib/languageFeatures/rename';
import { OIRange } from '../../../lib/parser/objects';
import { FileCacheVhdl, ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { createPrintableRange, makeRangePrintable } from '../../helper';
import { readFileSyncNorm } from '../../readFileSyncNorm';
let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], defaultSettingsGetter);
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
        ['entity.vhd', createPrintableRange(13, 34, 45)],

      ],
    description: 'four occurrences of entity name(test_entity)'
  },
  {
    occurrences:
      [['entity.vhd', createPrintableRange(8, 14, 18)],
        ['entity.vhd', createPrintableRange(11, 18, 22)],

      ],
    description: 'two occurrences of architecture name (arch)'
  },
  {
    occurrences:
      [['entity.vhd', createPrintableRange(13, 15, 30)],
        ['entity.vhd', createPrintableRange(24, 31, 46)],
      ],
    description: 'two occurrences of configuration name (arch)'
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
        ['instantiation.vhd', createPrintableRange(10, 32, 49)],
        ['instantiation.vhd', createPrintableRange(1, 40, 57)],
      ],
    description: 'split entity and architecture file'
  },
  {
    occurrences:
    [
      ['entity2.vhd', createPrintableRange(6, 8, 20)],
      ['entity2.vhd', createPrintableRange(9, 5, 17)],
      ['entity2.vhd', createPrintableRange(11, 22, 34)],
    ],
    description: 'entity with statement part'
  },
  {
    occurrences:
      [['entity_split.vhd', createPrintableRange(4, 5, 8)],
        ['architecture_split.vhd', createPrintableRange(5, 10, 13)],
        ['instantiation.vhd', createPrintableRange(11, 10, 13)],
        ['instantiation.vhd', createPrintableRange(13, 10, 13)],
      ],
    description: 'port name'
  },
  {
    occurrences:
      [['entity2.vhd', createPrintableRange(12, 25, 29)],
        ['entity2.vhd', createPrintableRange(16, 26, 30)],
        ['entity2.vhd', createPrintableRange(17, 5, 9)],
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
      [['entity2.vhd', createPrintableRange(17, 10, 11)],
        ['package2.vhd', createPrintableRange(7, 17, 18)],
      ],
    description: 'function parameter name'
  },
  {
    occurrences:
      [['generic_entity.vhd', createPrintableRange(3, 5, 17)],
        ['generic_instantiation.vhd', createPrintableRange(11, 7, 19)],
      ],
    description: 'function parameter name'
  },
  {
    occurrences:
      [['component_entity.vhd', createPrintableRange(1, 8, 24)],
        ['component_entity.vhd', createPrintableRange(5, 12, 28)],
        ['component_instantiation.vhd', createPrintableRange(6, 13, 29)],
        ['component_instantiation.vhd', createPrintableRange(10, 17, 33)],
        ['component_instantiation.vhd', createPrintableRange(15, 15, 31)],
        ['component_instantiation.vhd', createPrintableRange(20, 26, 42)],
      ],
    description: 'components'
  },
  {
    occurrences:
      [['generic_pkg.vhd', createPrintableRange(1, 9, 20)],
        ['generic_pkg.vhd', createPrintableRange(12, 16, 27)],
        ['generic_pkg.vhd', createPrintableRange(19, 14, 25)],
        ['generic_pkg.vhd', createPrintableRange(27, 14, 25)],
      ],
    description: 'generic package instantiation'
  },
  {
    occurrences:
      [['generic_pkg.vhd', createPrintableRange(3, 5, 22)],
        ['generic_pkg.vhd', createPrintableRange(13, 20, 37)],
        ['generic_pkg.vhd', createPrintableRange(20, 20, 37)],
        ['generic_pkg.vhd', createPrintableRange(20, 63, 80)],
        ['generic_pkg.vhd', createPrintableRange(28, 20, 37)],
      ],
    description: 'generic association in generic package instantiation'
  },
  {
    occurrences:
      [
        ['generic_pkg.vhd', createPrintableRange(26, 11, 27)],
        ['generic_pkg.vhd', createPrintableRange(29, 10, 26)],
      ],
    description: 'package instantiation name'
  },
  // The ports/generics of components are currently not linked
  // {
  //   occurrences:
  //     [['component_entity.vhd', createPrintableRange(3, 5, 10)],
  //     ['component_instantiation.vhd', createPrintableRange(8, 7, 12)],
  //     ['component_instantiation.vhd', createPrintableRange(17, 7, 12)],
  //     ['component_instantiation.vhd', createPrintableRange(22, 7, 12)],
  //     ],
  //   description: 'port of components'
  // },
])('testing rename for %j', async (testSetup: TestSetup) => {
  const { occurrences } = testSetup;
  type Operations = Record<string, string[]>;
  // Build expected operations
  const expectedOperations: Operations = {};
  for (const [name, range] of occurrences) {
    const uri = pathToFileURL(__dirname + `/${name}`).toString();
    const target = expectedOperations[uri] ?? [];
    if (Array.isArray(expectedOperations[uri]) === false) {
      expectedOperations[uri] = target;
    }
    target.push(makeRangePrintable(range));
  }
  for (const expectedOperation of Object.values(expectedOperations)) {
    expectedOperation.sort();
  }
  for (const [name, range] of occurrences) {
    const path = __dirname + `/${name}`;

    const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
      projectParser, defaultSettingsGetter());
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
        result = prepareRenameHandler(linter, Position.create(start.line, character));
      } catch (err) {
        if (err instanceof ResponseError && err.code === ErrorCodes.InvalidRequest) {
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
        const target = operations[path] ?? [];
        if (Array.isArray(operations[path]) === false) {
          operations[path] = target;
        }
        for (const edit of edits) {
          expect(edit.newText).toBe(newName);
          target.push(makeRangePrintable(edit.range));
        }
      }
      for (const operation of Object.values(operations)) {
        operation.sort();
      }
      expect(operations).toStrictEqual(expectedOperations);

    }
  }

});
test.each([
  ['entity.vhd', createPrintableRange(5, 1, 7), 0], // No rename entity keyword
  ['entity.vhd', createPrintableRange(8, 1, 13), 0], // No rename architecture keyword
  ['generic_instantiation.vhd', createPrintableRange(9, 3, 22), 0], // No rename label
])('testing rename for %s in %s where it is not possible', async (name, range) => {
  const path = __dirname + `/${name}`;

  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter());
  await linter.checkAll();
  await projectParser.stop();
  const { start, end } = range;


  for (let character = start.character; character <= end.character; character++) {

    let err: Error | undefined;
    try {
      prepareRenameHandler(linter, Position.create(start.line, character));
    } catch (_err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      err = _err;
    }
    expect(err).toBeInstanceOf(ResponseError);
    expect(err?.message).toBe('Can not rename this element');
  }
});
test('testing handling of invalid rename Handler', async () => {
  const filename = 'entity.vhd';
  const path = __dirname + `/${filename}`;
  const dummyPath = `/file/${filename}`;
  const linter = new VhdlLinter(pathToFileURL(dummyPath), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter());
  await linter.checkAll();
  await projectParser.stop();
  let err;
  try {
    await renameHandler(linter, Position.create(7, 1), 'test');
  } catch (_err) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    err = _err;
  }
  expect(err).toBeInstanceOf(ResponseError);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  expect(err.code).toBe(ErrorCodes.InvalidRequest);
});

test.each([
  ['signal.vhd', createPrintableRange(13, 21, 27)],
])('testing rename with simulated cancel token from linterManager', async (name, range) => {
  const newName = 'foo_bar';

  const path = pathToFileURL(__dirname + `/${name}`);

  // simulate that the cancellationToken of the linter in the project parser has been canceled
  const oldFile = projectParser.cachedFiles.find(f => f.uri.toString() === path.toString()) as FileCacheVhdl;
  const cancelSource = new CancellationTokenSource();
  oldFile.linter.token = cancelSource.token;
  cancelSource.cancel();

  const linter = new VhdlLinter(path, readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter());
  const response = await renameHandler(linter, range.start, newName);
  expect(response.changes).toBeDefined();
});