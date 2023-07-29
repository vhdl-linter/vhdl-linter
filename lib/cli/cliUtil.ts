import { readdirSync } from "fs";
import { Worker } from 'worker_threads';
import { DiagnosticSeverity } from "vscode-languageserver";
import { joinURL } from "../projectParser";
import { OIDiagnostic } from "../vhdlLinter";
import { OIRange } from "../parser/objects";
import { createHash } from "crypto";
import { cpus } from "os";
import PQueue from "p-queue";
import { cwd } from "process";
const threadNum = cpus().length / 2;
const queue = new PQueue({ concurrency: threadNum });

// Take path as a project run test on every file
export async function run_test(path: URL, errorExpected: boolean, outputCodeClimate: boolean): Promise<MessageWrapper[]> {
  return await queue.add(() => {
    const worker = new Worker(__dirname + '/lintWorker.js', { workerData: { path: path.toString(), errorExpected, outputCodeClimate } });
    return new Promise((resolve, reject) => {
      worker.on("message", msg => resolve(msg as MessageWrapper[]));
      worker.on("error", err => reject(err));
    });
  });
}

export interface MessageWrapper {
  file: string;
  messages: OIDiagnostic[];
}
export function readDirPath(path: URL) {
  return readdirSync(path).map(file => joinURL(path, file));
}
function getMessageColor(message: OIDiagnostic) {
  if (message.severity === DiagnosticSeverity.Information) {
    return '\u001b[34m';
  } else if (message.severity === DiagnosticSeverity.Warning) {
    return '\u001b[33m';
  }
  return '\u001b[31m';
}
export function printRange(range: OIRange) {
  return `${range.start.line}:${range.start.character} - ${range.end.line}:${range.end.character}`;
}
export function prettyPrintMessages(messages: MessageWrapper[]) {
  return messages.map(message => {
    const filename = message.file.replace(cwd(), '').substring(3);
    return message.messages.slice(0, 5).map((innerMessage) => {
      const messageText = `${getMessageColor(innerMessage)}${innerMessage.message}\u001b[0m`;
      return `${filename}:${innerMessage.range.start.line + 1} (r: ${printRange(innerMessage.range)})\n  ${messageText}`; // lines are 0 based in OI
    }).join('\n') + (message.messages.length > 5 ? `\n\u001b[31m ... and ${message.messages.length - 5} more\u001b[0m` : '');
  }).join('\n');
}

interface CodeClimateLocation {
  path: string;
  lines?: { // 1 based
    begin: number;
    end?: number;
  }
  positions?: {
    begin?: {
      line: number;
      column?: number;
    },
    end?: {
      line: number;
      column?: number;
    }
  }
}
type CodeClimateSeverity = 'info' | 'minor' | 'major' | 'critical' | 'blocker';

// spec: https://github.com/codeclimate/platform/blob/master/spec/analyzers/SPEC.md#issues
// gitlab doc: https://docs.gitlab.com/ee/ci/testing/code_quality.html#implement-a-custom-tool
export interface CodeClimateIssue {
  type: 'issue';
  check_name: string;
  description: string;
  content?: string; // markdown more in depth description
  categories: ('Bug Risk' | 'Clarity' | 'Compatibility' | 'Complexity' | 'Duplication' | 'Performance' | 'Security' | 'Style')[];
  location: CodeClimateLocation;
  severity: CodeClimateSeverity;
  fingerprint: string; // is optional in the spec but required by gitlab
}

function mapSeverity(severity?: DiagnosticSeverity): CodeClimateSeverity {
  if (severity === DiagnosticSeverity.Error) {
    return 'blocker';
  }
  if (severity === DiagnosticSeverity.Warning) {
    return 'major';
  }
  if (severity === DiagnosticSeverity.Information) {
    return 'minor';
  }
  if (severity === DiagnosticSeverity.Hint) {
    return 'info';
  }
  return 'blocker';
}

export function getCodeClimate(messages: MessageWrapper[]): CodeClimateIssue[] {
  return messages.flatMap(wrapper => wrapper.messages.map(message => ({
    type: 'issue',
    check_name: message.source ?? 'vhdl-linter',
    description: message.message,
    categories: ['Style'],
    location: {
      path: wrapper.file,
      positions: {
        begin: {
          line: message.range.start.line,
          column: message.range.start.character,
        },
        end: {
          line: message.range.end.line,
          column: message.range.end.character,
        }
      }
    },
    severity: mapSeverity(message.severity),
    fingerprint: createHash('sha256').update(wrapper.file).update(printRange(message.range)).digest('hex')
  }))
  );
}