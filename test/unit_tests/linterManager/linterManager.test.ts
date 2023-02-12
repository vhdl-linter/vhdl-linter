import { beforeEach, expect, jest, test } from '@jest/globals';
import { ResponseError } from 'vscode-languageserver';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { LinterManager } from '../../../lib/linter-manager';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import * as vhdlModule from '../../../lib/vhdl-linter';

jest.mock('../../../lib/vhdl-linter');
const mockLinter = jest.mocked(vhdlModule.VhdlLinter);
jest.mock('../../../lib/elaborate/elaborate');
beforeEach(() => {
  // Clear all instances and calls to constructor and all methods:
  mockLinter.mockClear();
});
jest.mock('../../../lib/project-parser');

test.each([
  [5, 5],
  [0, 0],
  [10, 5],
  [10, 10],
])('Testing manager with random delays unsuccessful runs before %i, after %i', async (wrongBefore, wrongAfter) => {
  const projectParser = await ProjectParser.create([], '', defaultSettingsGetter);
  const linterManager = new LinterManager();
  const uri = 'file:///asd';
  const dummyTextCorrect = 'correct linter';
  const returnedLinterPromise = linterManager.getLinter(uri, undefined, false);

  for (let i = 0; i <= wrongBefore; i++) {
    jest.spyOn(Elaborate, 'elaborate').mockImplementationOnce(() => {
      return new Promise(resolve => {
        setTimeout(resolve, Math.round(Math.random() * 10));
      });
    });
    jest.spyOn(vhdlModule, 'VhdlLinter').mockImplementationOnce(() => {
      return {
        text: String(i) + 'x',
        parsedSuccessfully: false
      } as vhdlModule.VhdlLinter;
    });
    await linterManager.triggerRefresh(uri, String(i), projectParser, defaultSettingsGetter);
  }


  jest.spyOn(vhdlModule, 'VhdlLinter').mockImplementationOnce(() => {
    return {
      text: dummyTextCorrect,
      parsedSuccessfully: true
    } as vhdlModule.VhdlLinter;
  });
  jest.spyOn(Elaborate, 'elaborate').mockImplementationOnce(() => {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  });
  await linterManager.triggerRefresh(uri, 'X', projectParser, defaultSettingsGetter);

  for (let i = 0; i <= wrongAfter; i++) {
    jest.spyOn(Elaborate, 'elaborate').mockImplementationOnce(() => {
      return new Promise(resolve => {
        setTimeout(resolve, Math.round(Math.random() * 10));
      });
    });
    jest.spyOn(vhdlModule, 'VhdlLinter').mockImplementationOnce(() => {
      return {
        text: String(i),
        parsedSuccessfully: false
      } as vhdlModule.VhdlLinter;
    });
    await linterManager.triggerRefresh(uri, String(i), projectParser, defaultSettingsGetter);
  }

  const returnedLinter = await returnedLinterPromise;
  expect(returnedLinter.text).toBe(dummyTextCorrect);

});
test('Running linterManager cancel test', async () => {
  const projectParser = await ProjectParser.create([], '', defaultSettingsGetter);
  const linterManager = new LinterManager();
  const uri = 'file:///asd';
  const dummyTextCorrect = 'correct linter';
  const returnedLinterPromise = linterManager.getLinter(uri, undefined, false);


  jest.spyOn(vhdlModule, 'VhdlLinter').mockImplementationOnce(() => {
    return {
      text: 'WRONG1',
      parsedSuccessfully: true
    } as vhdlModule.VhdlLinter;
  });
  jest.spyOn(Elaborate, 'elaborate').mockImplementationOnce(() => {
    return new Promise(resolve => {
      setTimeout(resolve, 10);
    });
  });
  linterManager.triggerRefresh(uri, 'X', projectParser, defaultSettingsGetter).catch(err => {
    if (!(err instanceof ResponseError)) {
      throw err;
    }
  });
  await delay(2);
  jest.spyOn(vhdlModule, 'VhdlLinter').mockImplementationOnce(() => {
    return {
      text: 'WRONG2',
      parsedSuccessfully: true
    } as vhdlModule.VhdlLinter;
  });
  jest.spyOn(Elaborate, 'elaborate').mockImplementationOnce(() => {
    return new Promise(resolve => {
      setTimeout(resolve, 10);
    });
  });
  void linterManager.triggerRefresh(uri, 'X', projectParser, defaultSettingsGetter).catch(err => {
    if (!(err instanceof ResponseError)) {
      throw err;
    }
  });
  await delay(2);

  jest.spyOn(vhdlModule, 'VhdlLinter').mockImplementationOnce(() => {
    return {
      text: dummyTextCorrect,
      parsedSuccessfully: true
    } as vhdlModule.VhdlLinter;
  });
  jest.spyOn(Elaborate, 'elaborate').mockImplementationOnce(() => {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  });
  void linterManager.triggerRefresh(uri, 'X', projectParser, defaultSettingsGetter);

  const returnedLinter = await returnedLinterPromise;
  expect(returnedLinter.text).toBe(dummyTextCorrect);
});
function delay(delayValue: number) {
  return new Promise(resolve => setTimeout(resolve, delayValue));
}