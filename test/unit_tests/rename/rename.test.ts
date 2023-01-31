import { expect, test, beforeAll, afterAll } from '@jest/globals';
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
const dummyPath = '/file/dummy.vhd';

test.each([
  ['entity.vhd', createPrintableRange(5, 8, 5, 19), true], // three occurrences of entity name (test_entity)
  ['entity.vhd', createPrintableRange(6, 5, 6, 16), true],
  ['entity.vhd', createPrintableRange(8, 22, 8, 33), true],
  ['entity.vhd', createPrintableRange(5, 1, 5, 7), false], // No rename entity keyword
  ['entity.vhd', createPrintableRange(8, 1, 8, 13), false], // No rename architecture keyword
  ['entity.vhd', createPrintableRange(8, 14, 8, 18), true], // two occurrences of architecture name (arch)
  ['entity.vhd', createPrintableRange(11, 18, 11, 22), true],
  ['signal.vhd', createPrintableRange(10, 10, 10, 13), true], // three occurrences of the signal name foo
  ['signal.vhd', createPrintableRange(13, 3, 13, 6), true],
  ['signal.vhd', createPrintableRange(14, 10, 14, 13), true],
  ['package.vhd', createPrintableRange(1, 9, 1, 17), true], // 4 occurrences of package name (test_pkg)
  ['package.vhd', createPrintableRange(3, 13, 3, 21), true],
  ['package.vhd', createPrintableRange(4, 14, 4, 22), true],
  ['package.vhd', createPrintableRange(5, 18, 5, 26), true],
])('testing rename for %s in %s (allowed: %p)', async (name, range, allowRename) => {
  const path = __dirname + `/${name}`;
  const linter = new VhdlLinter(dummyPath, readFileSync(path, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter);
  await linter.checkAll();
  await projectParser.stop();
  const newName = 'foo_bar';
  const pos = range.start;
  const { start, end } = range;
  if (allowRename) {
    let lastOperations;
    for (let character = start.character; character <= end.character; character++) {
      const result = await prepareRenameHandler(linter, Position.create(start.line, character));
      expect(result).toBeInstanceOf(OIRange);
      expect(result.start.line).toBe(start.line);
      expect(result.start.character).toBe(start.character);
      expect(result.end.line).toBe(end.line);
      expect(result.end.character).toBe(end.character);
      const renameOperations = await renameHandler(linter, pos, newName);
      const operations = renameOperations.changes[URI.file(dummyPath).toString()].map(op => makeRangePrintable(op.range));
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
  const projectParser = await ProjectParser.create([__dirname], '', defaultSettingsGetter);
  const path = __dirname + `/entity.vhd`;
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