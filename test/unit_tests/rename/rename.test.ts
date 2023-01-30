import { expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { Position, Range, ResponseError } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { prepareRenameHandler, renameHandler } from '../../../lib/languageFeatures/rename';
import { OIRange } from '../../../lib/parser/objects';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
import { createPrintableRange, makeRangePrintable } from '../../helper';

test.each([
  ['entity.vhd', createPrintableRange(5, 8, 5, 19), true], // three occurrences of entity name (test_entity)
  ['entity.vhd', createPrintableRange(6, 5, 6, 16), true],
  ['entity.vhd', createPrintableRange(8, 22, 8, 33), true],
  ['entity.vhd', createPrintableRange(5, 1, 5, 7), false], // No rename entity keyword
  ['entity.vhd', createPrintableRange(8, 1, 8, 13), false], // No rename architecture keyword
  ['entity.vhd', createPrintableRange(8, 14, 8, 18), true], // two occurrences of architecture name (arch)
  ['entity.vhd', createPrintableRange(11, 18, 11, 22), true],
  ['signal.vhd', createPrintableRange(10, 10, 10, 13), true], // two occurrences of the signal name foo
  ['signal.vhd', createPrintableRange(13, 3, 13, 6), true],
])('testing rename for %s in %s %p', async (name: string, range: Range, allowRename = true) => {
  const projectParser = await ProjectParser.create([__dirname], '', defaultSettingsGetter);
  const path = __dirname + `/${name}`;
  const linter = new VhdlLinter(`dummy.vhd`, readFileSync(path, { encoding: 'utf8' }),
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
      const operations = renameOperations.changes[URI.file('dummy.vhd').toString()].map(op => makeRangePrintable(op.range));
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