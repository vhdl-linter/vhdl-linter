import { expect, test, beforeAll, afterAll } from '@jest/globals';
import { readFileSync } from 'fs';
import { ErrorCodes, Position, ResponseError } from 'vscode-languageserver';
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

test.each([
  // testing stuff in one file
  ['entity.vhd', createPrintableRange(5, 8, 5, 19), 3], // three occurrences of entity name (test_entity)
  ['entity.vhd', createPrintableRange(6, 5, 6, 16), 3],
  ['entity.vhd', createPrintableRange(8, 22, 8, 33), 3],
  ['entity.vhd', createPrintableRange(5, 1, 5, 7), 0], // No rename entity keyword
  ['entity.vhd', createPrintableRange(8, 1, 8, 13), 0], // No rename architecture keyword
  ['entity.vhd', createPrintableRange(8, 14, 8, 18), 2], // two occurrences of architecture name (arch)
  ['entity.vhd', createPrintableRange(11, 18, 11, 22), 2],
  ['signal.vhd', createPrintableRange(11, 10, 11, 13), 3], // three occurrences of the signal name foo
  ['signal.vhd', createPrintableRange(16, 3, 16, 6), 3],
  ['signal.vhd', createPrintableRange(17, 24, 17, 27), 3],

  // testing stuff over multiple files
  ['signal.vhd', createPrintableRange(13, 21, 13, 27), 3], // 3 occurences of t_enum
  ['package.vhd', createPrintableRange(5, 8, 5, 14), 3],
  ['package.vhd', createPrintableRange(9, 15, 9, 21), 3],

  ['signal.vhd', createPrintableRange(14, 21, 14, 29), 2], // 2 occurences of t_record
  ['package.vhd', createPrintableRange(7, 8, 7, 16), 2],

  ['signal.vhd', createPrintableRange(19, 12, 19, 20), 2], // 2 occurences of element1 of t_record
  ['package.vhd', createPrintableRange(9, 5, 9, 13), 2],

  ['package.vhd', createPrintableRange(4, 9, 4, 17), 5], // 5 occurrences of package name (test_pkg)
  ['signal.vhd', createPrintableRange(4, 10, 4, 18), 5], // also expect renaming in signal.vhd:4
  ['package.vhd', createPrintableRange(12, 13, 12, 21), 5],
  ['package.vhd', createPrintableRange(13, 14, 13, 22), 5],
  ['package.vhd', createPrintableRange(14, 18, 14, 26), 5],
  // Testing split entity and architecture file
  ['entity_split.vhd', createPrintableRange(2, 8, 2, 25), 3], // two occurrences in entity file
  ['entity_split.vhd', createPrintableRange(3, 5, 3, 22), 3],
  ['architecture_split.vhd', createPrintableRange(1, 22, 1, 39), 3],

])('testing rename for %s in %s (expected %d occurences)', async (name, range, expectOccurences) => {
  const path = __dirname + `/${name}`;
  const dummyDirname = `/file`;

  const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter);
  await linter.checkAll();
  await projectParser.stop();
  const newName = 'foo_bar';
  const pos = range.start;
  const { start, end } = range;
  if (expectOccurences > 0) {
    let lastOperations;
    for (let character = start.character; character <= end.character; character++) {
      const result = await prepareRenameHandler(linter, Position.create(start.line, character));
      expect(result).toBeInstanceOf(OIRange);
      expect(result.start.line).toBe(start.line);
      expect(result.start.character).toBe(start.character);
      expect(result.end.line).toBe(end.line);
      expect(result.end.character).toBe(end.character);
      const renameOperations = await renameHandler(linter, pos, newName);
      const operations = Object.entries(renameOperations.changes).map(([file, ops]) => ({ file: file.replace(__dirname, dummyDirname), changes: ops.map(op => makeRangePrintable(op.range)) }));
      expect(operations.flatMap(o => o.changes)).toHaveLength(expectOccurences);
      if (lastOperations) {
        expect(operations).toStrictEqual(lastOperations);
      } else {
        expect(operations).toMatchSnapshot();
        lastOperations = operations;
      }

    }
  } else {
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
  expect(err.message).toBe('Can not rename this element');
  expect(err.code).toBe(ErrorCodes.InvalidRequest);
});