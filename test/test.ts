import { cpus } from 'os';
import PQueue from 'p-queue';
import { cwd } from 'process';
import { pathToFileURL } from 'url';
import { isMainThread, Worker } from 'worker_threads';
import { joinURL } from '../lib/projectParser';
import { MessageWrapper, readDirPath } from './testUtil';
const threadNum = cpus().length / 2;
const queue = new PQueue({ concurrency: threadNum });


// Take each directory in path as a project run test on every file
async function run_test_folder(path: URL, error_expected: boolean): Promise<MessageWrapper[]> {
  const messageWrappers: MessageWrapper[] = [];

  const messages = (await Promise.all(readDirPath(path).map(async subPath => await run_test(subPath, error_expected)))).flat();
  messageWrappers.push(...messages);
  return messageWrappers;
}
// Take path as a project run test on every file
async function run_test(path: URL, error_expected: boolean): Promise<MessageWrapper[]> {
  return await queue.add(() => {
    const worker = new Worker(__dirname + '/testWorker.js', { workerData: { path: path.toString(), error_expected } });
    return new Promise((resolve, reject) => {

      worker.on("message", msg => resolve(msg as MessageWrapper[]));
      worker.on("error", err => reject(err));
    });
  }, {
    priority: path.toString().includes('OSVVM') ? 1 : 0
  });


}
console.log('Starting tests on test_files');
console.log(`Running ${threadNum} threads in parallel`);

(async () => {
  if (isMainThread) {
    const start = new Date().getTime();
    const promises = [];
    promises.push(run_test_folder(joinURL(pathToFileURL(cwd()), 'test', 'test_files', 'test_error_expected'), true));
    promises.push(run_test_folder(joinURL(pathToFileURL(cwd()), 'test', 'test_files', 'test_no_error'), false));
    promises.push(run_test(joinURL(pathToFileURL(cwd()), 'ieee2008'), false));
    const messages = (await Promise.all(promises)).flat();
    const timeTaken = new Date().getTime() - start;
    let timeOutError = 0;
    const TIMEOUT_TIME = 130;
    if (timeTaken > TIMEOUT_TIME * 1000) {
      console.error(`Time toke more than ${TIMEOUT_TIME}s (${timeTaken / 1000} s)`);
      timeOutError++;
    } else {
      console.log(`Test took ${timeTaken / 1000} s`);
    }
    console.log("---- Summary of files with error: ");
    for (const message of messages) {
      console.log(message.file);
    }
    process.exit(messages.length + timeOutError);
  }
})().catch(err => console.error(err));
