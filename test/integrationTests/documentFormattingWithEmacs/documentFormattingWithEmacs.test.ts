
import { beforeEach, expect, jest, test } from '@jest/globals';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { CancellationTokenSource, Position } from 'vscode-languageserver';
import { attachWorkDone } from 'vscode-languageserver/lib/common/progress';
import { documents } from '../../../lib/languageServer';
import { handleDocumentFormatting } from '../../../lib/languageFeatures/documentFormatting';

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
const nullProgressReporter = attachWorkDone(undefined as any, /* params */ undefined);
beforeEach(() => {
  jest.clearAllMocks();
});
// jest.mock('vscode-languageserver');
jest.mock('../../../lib/language-server', () => {
  return {
    documents: {
      get: jest.fn()
    },
    connection: {
      window: {
        createWorkDoneProgress: jest.fn(() => ({
          begin: jest.fn(),
          done: jest.fn(),
          report: jest.fn()
        })),
        showErrorMessage: jest.fn()
      }
    }
  };
});
const mockDocuments = jest.mocked(documents);


test('Testing full formatter workflow with emacs', async () => {
  const uri = pathToFileURL(__dirname + '/test_stateMachineCase.vhd');
  const cancellationTokenSource = new CancellationTokenSource();
  mockDocuments.get.mockImplementationOnce(() => {
    return {
      uri: uri.toString(),
      getText: () => fs.readFileSync(uri, {encoding: 'utf8'}),
      languageId: 'vhdl',
      version: 0,
      offsetAt: () => 0,
      positionAt: () => Position.create(0, 0),
      lineCount: 0,

    };
  });
  const formatting = await handleDocumentFormatting({
    textDocument: {
      uri: uri.toString()
    },
    options: {
      tabSize: 2,
      insertSpaces: true
    }
  }, cancellationTokenSource.token, nullProgressReporter);

  expect(formatting).toMatchSnapshot();
});
