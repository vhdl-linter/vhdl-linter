/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, expect, jest, test } from '@jest/globals';
import * as child_process from 'child_process';
import { ExecException } from 'child_process';
import * as fs from 'fs';
import { platform } from 'process';
import { pathToFileURL } from 'url';
import { CancellationTokenSource, Position } from 'vscode-languageserver';
import { attachWorkDone } from 'vscode-languageserver/lib/common/progress';
import { connection } from '../../../lib/languageServer';
import { handleDocumentFormatting } from '../../../lib/languageFeatures/documentFormatting';
import * as PP from '../../../lib/projectParser';

const text = 'dummy Text';
const expectedTest = 'expected dummy result';
const nullProgressReporter = attachWorkDone(undefined as any, /* params */ undefined);
beforeEach(() => {
  jest.clearAllMocks();
});
// jest.mock('vscode-languageserver');
jest.mock('../../../lib/language-server', () => {
  return {
    documents: {
      get: () => {
        return {
          getText: jest.fn(() => text),
          positionAt: jest.fn(() => Position.create(0, 0))
        };
      },
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
const mockConnection = jest.mocked(connection);
jest.mock('child_process');
jest.mock('fs', () => {
  const originalModule = jest.requireActual('fs') as any;
  return {
    __esModule: true,
    ...originalModule,
    promises: {
      readFile: jest.fn(),
      mkdtemp: jest.fn(),
      writeFile: jest.fn()
    }
  };
});
jest.mock('../../../lib/project-parser', () => {
  const originalModule = jest.requireActual('../../../lib/project-parser') as any;
  return {
    __esModule: true,
    ...originalModule,
    getRootDirectory: jest.fn()
  };
});
const testOnWindows = platform === 'win32' ? test : test.skip;
const skipOnWindows = platform !== 'win32' ? test : test.skip;
const mockFs = jest.mocked(fs);
const mockChild_process = jest.mocked(child_process);
const mockProjectParser = jest.mocked(PP);
testOnWindows('Testing formatting call on win32', async () => {
  const uri = 'file:///c/dummy.vhd';
  const rootURI = pathToFileURL('C:\\dummyRoot');
  const cancellationTokenSource = new CancellationTokenSource();
  mockProjectParser.getRootDirectory.mockImplementation(() => rootURI);
  mockChild_process.exec.mockImplementationOnce(((_command: string, callback: () => void) => {
    callback();
  }) as any);
  mockChild_process.exec.mockImplementationOnce(((_command: string, callback: () => void) => {
    callback();
  }) as any);


  mockFs.promises.readFile.mockResolvedValueOnce(expectedTest);
  mockFs.promises.mkdtemp.mockResolvedValueOnce('tmpName');
  mockFs.promises.writeFile.mockResolvedValueOnce();
  const formatting = await handleDocumentFormatting({
    textDocument: {
      uri: uri
    },
    options: {
      tabSize: 2,
      insertSpaces: true
    }
  }, cancellationTokenSource.token, nullProgressReporter);
  expect(mockChild_process.exec.mock.calls[0]?.[0]).toMatchInlineSnapshot(`"emacs --batch"`);
  expect(mockChild_process.exec.mock.calls[1]?.[0]).toMatchInlineSnapshot(`"emacs --batch --eval "(setq-default vhdl-basic-offset 2)"  -l C:\\dummyRoot\\emacs\\emacs-vhdl-formatting-script.lisp -f vhdl-batch-indent-region tmpName\\beautify"`);


  expect(formatting).not.toBeNull();
  expect(formatting![0]!.newText).toBe(expectedTest);
  expect(formatting).toMatchSnapshot();
  expect((mockConnection.window.createWorkDoneProgress.mock.results[0]!.value as any).done).toHaveBeenCalled();
});

skipOnWindows('Testing formatting call on linux (non win32)', async () => {
  const uri = 'file:///dummy.vhd';
  const rootURI = 'file:///dummyRoot';
  const cancellationTokenSource = new CancellationTokenSource();
  mockProjectParser.getRootDirectory.mockImplementation(() => new URL(rootURI));
  mockChild_process.exec.mockImplementationOnce(((_command: string, callback: () => void) => {
    callback();
  }) as any);

  mockChild_process.spawn.mockImplementationOnce(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
      on: (eventName: string, callback: (par: any) => void) => {
        if (eventName === 'close') {
          callback(0);
        }
      },
      stderr: {
        on: jest.fn()
      }
    } as any;
  });


  mockFs.promises.readFile.mockResolvedValueOnce(expectedTest);
  mockFs.promises.mkdtemp.mockResolvedValueOnce('tmpName');
  mockFs.promises.writeFile.mockResolvedValueOnce();
  const formatting = await handleDocumentFormatting({
    textDocument: {
      uri: uri
    },
    options: {
      tabSize: 2,
      insertSpaces: true
    }
  }, cancellationTokenSource.token, nullProgressReporter);

  expect(mockChild_process.exec.mock.calls[0]?.[0]).toMatchInlineSnapshot(`"command -v emacs"`);
  expect(mockChild_process.spawn.mock.calls[0]?.[0]).toMatchInlineSnapshot(`"sh"`);
  expect(mockChild_process.spawn.mock.calls[0]?.[1]).toMatchInlineSnapshot(`
[
  "-c",
  "emacs --batch --eval "(setq-default vhdl-basic-offset 2)" --eval "(setq load-path (cons (expand-file-name \\"/dummyRoot/emacs\\") load-path))"  -l /dummyRoot/emacs/emacs-vhdl-formatting-script.lisp -f vhdl-batch-indent-region tmpName/beautify",
]
`);

  expect(formatting).not.toBeNull();
  expect(formatting![0]!.newText).toBe(expectedTest);
  expect(formatting).toMatchSnapshot();
  expect((mockConnection.window.createWorkDoneProgress.mock.results[0]!.value as any).done).toHaveBeenCalled();
});
test(`Testing detection for missing emacs`, async () => {
  const uri = platform === 'win32' ? 'file:///c/dummy.vhd' : 'file:///dummy.vhd';
  const rootURI = platform === 'win32' ? 'file:///c:/dummyRoot'  :'file:///dummyRoot';
  const cancellationTokenSource = new CancellationTokenSource();

  mockProjectParser.getRootDirectory.mockImplementation(() => new URL(rootURI));
  mockChild_process.exec.mockImplementationOnce(((_command: string, callback: (error: ExecException | null) => void) => {
    callback(new Error("Emacs not found mock"));
  }) as any);
  const formatting = await handleDocumentFormatting({
    textDocument: {
      uri: uri
    },
    options: {
      tabSize: 2,
      insertSpaces: true
    }
  }, cancellationTokenSource.token, nullProgressReporter);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  expect(mockConnection.window.showErrorMessage).toHaveBeenCalled();
  expect(mockConnection.window.showErrorMessage.mock.calls[0]?.[0]).toBe('vhdl-linter is using emacs for formatting. Install emacs for formatting to work.');
  expect(formatting).toBeNull();
  expect(mockChild_process.exec.mock.calls[0]?.[0]).toBe(platform === 'win32' ? "emacs --batch" : "command -v emacs");

});