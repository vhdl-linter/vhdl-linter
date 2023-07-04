import { beforeEach, expect, jest, test } from '@jest/globals';
import { pathToFileURL } from 'url';
import { CancellationTokenSource, ResponseError } from 'vscode-languageserver';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { LinterManager } from '../../../lib/linterManager';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsGetter } from '../../../lib/settings';
import * as vhdlModule from '../../../lib/vhdlLinter';

jest.mock('../../../lib/vhdlLinter');
jest.mock('../../../lib/elaborate/elaborate');
beforeEach(() => {
  jest.resetAllMocks();
});
jest.mock('../../../lib/projectParser', () => {
  return {
    ProjectParser: {
      create: async () => {
        return Promise.resolve({
          cachedFiles: []
        });
      }
    }
  };
}
);
let version = 0;
async function triggerWrapper(linterManager: LinterManager, uri: string, text: string, projectParser: ProjectParser, parsedSuccessfully: boolean, delayElaborate?: number,) {
  jest.spyOn(Elaborate, 'elaborate').mockImplementationOnce(() => {
    return new Promise(resolve => {
      setTimeout(resolve, delayElaborate ?? Math.round(Math.random() * 10));
    });
  });
  jest.spyOn(vhdlModule, 'VhdlLinter').mockImplementationOnce(() => {
    return {
      text: text,
      parsedSuccessfully
    } as vhdlModule.VhdlLinter;
  });
  await linterManager.triggerRefresh(uri, text, projectParser, defaultSettingsGetter, version++, true);
}


test.each([
  [5, 5],
  [0, 0],
  [10, 5],
  [10, 10],
])('Testing manager with random delays unsuccessful runs before %i, after %i', async (wrongBefore, wrongAfter) => {
  const projectParser = await ProjectParser.create([], defaultSettingsGetter);
  const linterManager = new LinterManager();
  const uri = pathToFileURL(__filename).toString();
  const dummyTextCorrect = 'correct linter';
  const returnedLinterPromise = linterManager.getLinter(uri, undefined, false);
  for (let i = 0; i <= wrongBefore; i++) {
    await triggerWrapper(linterManager, uri, String(i) + 'b', projectParser, false).catch(err => {
      if (err instanceof ResponseError !== false) {
        throw err;
      }
    });
  }

  await triggerWrapper(linterManager, uri, dummyTextCorrect, projectParser, true).catch(err => {
    if (err instanceof ResponseError !== false) {
      throw err;
    }
  });


  for (let i = 0; i <= wrongAfter; i++) {
    await triggerWrapper(linterManager, uri, String(i) + 'a', projectParser, false).catch(err => {
      if (err instanceof ResponseError !== false) {
        throw err;
      }
    });

  }

  const returnedLinter = await returnedLinterPromise;
  expect(returnedLinter.text).toBe(dummyTextCorrect);

});
test('Running linterManager cancel test', async () => {
  // Trigger 3 times, to simulate race condition.
  // The first two times elaborate is delayed so the third call which is not delayed shall correctly cancel the first two ones.
  const projectParser = await ProjectParser.create([], defaultSettingsGetter);
  const linterManager = new LinterManager();
  const uri = pathToFileURL(__filename).toString();
  const dummyTextCorrect = 'correct linter';
  const returnedLinterPromise = linterManager.getLinter(uri, undefined, false);
  let firstRequestCanceled = false;

  triggerWrapper(linterManager, uri, 'WRONG1', projectParser, true, 15).catch(err => {
    if (err instanceof ResponseError) {
      firstRequestCanceled = true;
    } else {
      throw err;
    }
  });

  await delay(2);
  let secondRequestCanceled = false;

  void triggerWrapper(linterManager, uri, 'WRONG2', projectParser, true, 17).catch(err => {
    if (err instanceof ResponseError) {
      secondRequestCanceled = true;
    } else {
      throw err;
    }
  });
  await delay(2);
  let thirstRequestCanceled = false;

  void triggerWrapper(linterManager, uri, dummyTextCorrect, projectParser, true, 0).catch(err => {
    if (err instanceof ResponseError) {
      thirstRequestCanceled = true;
    } else {
      throw err;
    }
  });
  await delay(2);


  const returnedLinter = await returnedLinterPromise;
  expect(returnedLinter.text).toBe(dummyTextCorrect);
  // Wait for the delays on the elaborate mock
  await delay(15);

  expect(firstRequestCanceled).toBe(true);
  expect(secondRequestCanceled).toBe(true);
  expect(thirstRequestCanceled).toBe(false);
});

test('Running linterManager cancel getLinter', async () => {
  // Trigger 3 times, to simulate race condition.
  // The first two times elaborate is delayed so the third call which is not delayed shall correctly cancel the first two ones.
  const projectParser = await ProjectParser.create([], defaultSettingsGetter);
  const linterManager = new LinterManager();
  const uri = pathToFileURL(__filename).toString();
  const cancellationTokenSources = new CancellationTokenSource();
  const returnedLinterPromise = linterManager.getLinter(uri, cancellationTokenSources.token, false);

  void triggerWrapper(linterManager, uri, 'DO NOT CARE TEXT', projectParser, true, 15);

  await delay(2);
  cancellationTokenSources.cancel();
  let getLinterCancelHandled = false;
  try {
    await returnedLinterPromise;
  } catch (err) {
    if (err instanceof ResponseError) {
      getLinterCancelHandled = true;
    }
  }

  expect(getLinterCancelHandled).toBe(true);
  await delay(15);

});
function delay(delayValue: number) {
  return new Promise(resolve => setTimeout(resolve, delayValue));
}