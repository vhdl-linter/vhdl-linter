import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { getTokenFromPosition } from '../../../lib/languageFeatures/findReferencesHandler';
import { ProjectParser } from '../../../lib/projectParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../readFileSyncNorm";
import { overwriteSettings } from '../../../lib/settingsUtil';

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
});
afterAll(async () => {
  await projectParser.stop();
});

test('Testing conditional analysis true', async () => {
  const path = join(__dirname, 'test_conditional.vhd');
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, overwriteSettings(await projectParser.getDocumentSettings(pathToFileURL(path)), {
    analysis: {
      conditionalAnalysis: {
        DEVICE: 'TEST1'
      }
    }
  }));
  await linter.checkAll();

  expect(linter.messages).toHaveLength(0);
});
test('Testing conditional analysis true not set', async () => {
  const path = join(__dirname, 'test_conditional.vhd');
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, await projectParser.getDocumentSettings(pathToFileURL(path)));
  await linter.checkAll();
  expect(linter.messages).toHaveLength(1);
});
test('Testing conditional analysis conditions', async () => {
  const path = join(__dirname, 'test_conditional2.vhd');
  const text = readFileSyncNorm(path, { encoding: 'utf8' });
  const linter = new VhdlLinter(pathToFileURL(path), text,
    projectParser, overwriteSettings(await projectParser.getDocumentSettings(pathToFileURL(path)), {
      analysis: {
        conditionalAnalysis: {
          VALUE5: "5",
          VALUE6: "6"
        }
      }
    }));

  const matches = [...text.matchAll(/TRUE/ig)];
  await linter.checkAll();
  expect(linter.messages).toHaveLength(matches.length);
  const wrongMessages = linter.messages.filter(message => message.message.includes('TRUE') === false || message.message.includes('FALSE'));
  expect(wrongMessages).toHaveLength(0);
});
test.each([
  'test_tool_unknown.vhd',
  'test_tool_unknown2.vhd',
])('Testing unknown tool directive in file %s', async filename => {
  const path = join(__dirname, filename);
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, await projectParser.getDocumentSettings(pathToFileURL(path)));
  await linter.checkAll();
  expect(linter.messages).toHaveLength(1);
  expect(linter.messages[0]?.message).toBe(`Unknown tool directive 'UNKNOWN' (parser)`);
});
test('Testing hover for conditional', async () => {
  const path = join(__dirname, 'test_hover.vhd');
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser,
    overwriteSettings(await projectParser.getDocumentSettings(pathToFileURL(path)), {
      analysis: {
        conditionalAnalysis: {
          VALUE5: "5"
        }
      }
    }));
  await linter.checkAll();
  const lexerToken = getTokenFromPosition(linter, {
    line: 1,
    character: 9
  }, false);
  expect(lexerToken?.hoverInfo).toBe("VALUE5: \"5\"");
});
test('Regression test', async() => {
  const path = join(__dirname, 'test_regression.vhd');
  {
    const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser,
      overwriteSettings(await projectParser.getDocumentSettings(pathToFileURL(path)), {
        analysis: {
          conditionalAnalysis: {
            DEVICE: "Arria10"
          }
        }
      }));
    await linter.checkAll();
    expect(linter.messages).toHaveLength(1);
    expect(linter.messages[0]?.message).toEqual(expect.stringContaining('Device Arria'));
  }
  {
    const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser,
      overwriteSettings(await projectParser.getDocumentSettings(pathToFileURL(path)), {
        analysis: {
          conditionalAnalysis: {
            DEVICE: "SomethingElse"
          }
        }
      }));
    await linter.checkAll();
    expect(linter.messages).toHaveLength(1);
    expect(linter.messages[0]?.message).toEqual(expect.stringContaining('Device Other'));

  }
});