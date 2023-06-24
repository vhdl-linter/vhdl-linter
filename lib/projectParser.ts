import { FSWatcher, watch } from 'chokidar';
import { EventEmitter } from 'events';
import { existsSync, promises } from 'fs';
import { realpath } from 'fs/promises';
import { basename, dirname, join, sep } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { CancellationToken, Diagnostic, DiagnosticSeverity, WorkDoneProgressReporter } from 'vscode-languageserver';
import { Elaborate } from './elaborate/elaborate';
import { ElaborateTargetLibrary } from './elaborate/elaborateTargetLibrary';
import { SetAdd } from './languageFeatures/findReferencesHandler';
import { implementsIHasDefinitions } from './parser/interfaces';
import { OArchitecture, OConfigurationDeclaration, OContext, OEntity, OPackage, OPackageInstantiation } from './parser/objects';
import { VerilogParser } from './verilogParser';
import { SettingsGetter, VhdlLinter } from './vhdlLinter';

export function joinURL(url: URL, ...additional: string[]) {
  const path = join(fileURLToPath(url), ...additional);

  return pathToFileURL(path);
}
export function getRootDirectory() {
  let currentDir = pathToFileURL(__dirname);
  let iterations = 10;
  while (!existsSync(joinURL(currentDir, 'package.json'))) {
    currentDir = joinURL(currentDir, '..');
    if (iterations-- === 0) {
      throw new Error('Could not find root directory');
    }
  }
  return currentDir;
}
interface LibraryMapping {
  library: string;
  definitionFile: URL; // the csv file which defines the mapping
  definitionLine: number;
}

export class ProjectParser {

  public cachedFiles: (FileCacheVhdl | FileCacheVerilog | FileCacheLibraryList)[] = [];
  public libraryMap = new Map<string, LibraryMapping>();
  public packages: OPackage[] = [];
  public packageInstantiations: OPackageInstantiation[] = [];
  public contexts: OContext[] = [];
  public entities: OEntity[] = [];
  public configurations: OConfigurationDeclaration[] = [];
  public architectures: OArchitecture[] = [];
  events = new EventEmitter();
  private watchers: FSWatcher[] = [];
  // Constructor can not be async. So constructor is private and use factory to create
  public static async create(workspaces: URL[], fileIgnoreRegex: string, settingsGetter: SettingsGetter, disableWatching = false,
    progress?: WorkDoneProgressReporter) {
    const projectParser = new ProjectParser(workspaces, fileIgnoreRegex, settingsGetter, progress);
    await projectParser.init(disableWatching);
    return projectParser;
  }
  private constructor(public workspaces: URL[], public fileIgnoreRegex: string, public settingsGetter: SettingsGetter, public progress?: WorkDoneProgressReporter) { }
  public async addFolders(urls: URL[]) {
    for (const url of urls) {
      const settings = await this.settingsGetter(url);
      // Chokidar does not accept win style line endings
      // Chokidar sometimes throws this error message on hitting weird symlink. But this is a upstream issue
      // [Error: EISDIR: illegal operation on a directory, read] {
      //   errno: -21,
      //     code: 'EISDIR',
      //       syscall: 'read'
      // }
      const watcher = watch([
        fileURLToPath(url).replaceAll(sep, '/') + '/**/*.vhd?(l)',
        fileURLToPath(url).replaceAll(sep, '/') + '/**/*.csv',
        ...settings.analysis.verilogAnalysis ? [fileURLToPath(url).replaceAll(sep, '/') + '/**/*.?(s)v'] : [],
      ], { ignoreInitial: true, followSymlinks: false });
      watcher.on('add', (path) => {
        const handleEvent = async () => {
          const url = pathToFileURL(path);
          if (path.match(/\.s?v$/i)) {
            const cachedFile = await FileCacheVerilog.create(url, this, false);
            this.cachedFiles.push(cachedFile);
          } else if (path.match(/\.csv$/i)) {
            const libraryFile = await FileCacheLibraryList.create(url, this);
            this.cachedFiles.push(libraryFile);
          } else {
            const cachedFile = await FileCacheVhdl.create(url, this, false);
            this.cachedFiles.push(cachedFile);
          }
          this.flattenProject();
          this.events.emit('change', 'add', url.toString());
        };
        handleEvent().catch(console.error);
      });
      watcher.on('change', (path) => {
        const handleEvent = async () => {
          for (const cachedFile of this.cachedFiles) {
            if (cachedFile instanceof FileCacheVhdl) {
              for (const obj of cachedFile.linter.file.objectList) {
                if (implementsIHasDefinitions(obj)) {
                  obj.definitions = [];
                }
              }
            }
          }
          const url = pathToFileURL(path);

          const cachedFile = process.platform === 'win32'
            ? this.cachedFiles.find(cachedFile => cachedFile.uri.toString() === url.toString().toLowerCase())
            : this.cachedFiles.find(cachedFile => cachedFile.uri.toString() === url.toString());
          if (cachedFile) {
            await cachedFile.parse();
            this.flattenProject();
            this.events.emit('change', 'change', url.toString());
          } else {
            console.error('modified file not found', path);
          }
          this.cachedElaborate = undefined;
        };
        handleEvent().catch(console.error);
      });
      watcher.on('unlink', path => {
        const url = pathToFileURL(path);

        const cachedFileIndex = process.platform === 'win32'
          ? this.cachedFiles.findIndex(cachedFile => cachedFile.uri.toString() === url.toString().toLowerCase())
          : this.cachedFiles.findIndex(cachedFile => cachedFile.uri.toString() === url.toString());
        if (cachedFileIndex > -1) {
          this.cachedFiles.splice(cachedFileIndex, 1);
          this.flattenProject();
          this.events.emit('change', 'unlink', url.toString());
        }
      });
      this.watchers.push(watcher);
    }
  }
  private async init(disableWatching: boolean) {
    const files = new SetAdd<string>();
    await Promise.all(this.workspaces.map(async (directory) => {
      const settings = await this.settingsGetter(directory);
      const directories = await this.parseDirectory(directory, settings.analysis.verilogAnalysis);
      files.add(...directories.map(url => url.toString()));
    }));
    const rootDirectory = getRootDirectory();
    const builtinFiles = (await this.parseDirectory(joinURL(rootDirectory, 'ieee2008'), false)).map(url => url.toString());
    files.add(...builtinFiles);
    let index = 0;
    for (const file of files) {
      if (this.progress) {
        const percent = Math.round(index / files.size * 100);
        this.progress.report(index / files.size * 100, `ProjectParser ${percent}% current file: ${basename(fileURLToPath(file))}`);
        index++;
      }
      const builtIn = builtinFiles.includes(file);
      if (file.match(/\.s?v$/i)) {
        const cachedFile = await FileCacheVerilog.create(new URL(file), this, builtIn);
        this.cachedFiles.push(cachedFile);
      } else if (file.match(/\.csv$/i)) {
        const libraryFile = await FileCacheLibraryList.create(new URL(file), this);
        this.cachedFiles.push(libraryFile);
      } else {
        const cachedFile = await FileCacheVhdl.create(new URL(file), this, builtIn);
        this.cachedFiles.push(cachedFile);
      }
    }
    this.cachedFiles.sort((a, b) => b.lintingTime - a.lintingTime);
    this.flattenProject();
    if (!disableWatching) {
      await this.addFolders(this.workspaces);
    }
  }
  async stop() {
    for (const watcher of this.watchers) {
      await watcher.close();
    }
  }
  private parsedDirectories = new Set<string>();
  private async parseDirectory(directory: URL, parseVerilog: boolean): Promise<URL[]> {
    const files: URL[] = [];
    const entries = await promises.readdir(directory);
    const ignoreRegex = this.fileIgnoreRegex.trim().length > 0 ? new RegExp(this.fileIgnoreRegex) : null;
    // const entries = await promisify(directory.getEntries)()
    await Promise.all(entries.map(async entry => {
      try {
        const filePath = joinURL(directory, entry);
        const fileStat = await promises.stat(filePath);
        if (fileStat.isFile()) {
          if ((entry.match(/\.vhdl?$/i) || (entry.match(/\.s?v$/i) && parseVerilog) || entry.match(/\.csv$/i)) && (ignoreRegex === null || !filePath.pathname.match(ignoreRegex))) {
            files.push(filePath);
          }
        } else if (fileStat.isDirectory()) {
          const realPath = await realpath(filePath);
          // catch infinite recursion in symlink
          if (this.parsedDirectories.has(realPath) === false) {
            this.parsedDirectories.add(await realpath(realPath));
            files.push(... await this.parseDirectory(filePath, parseVerilog));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }));
    return files;
  }
  relativeToWorkspace(url: URL) {
    const path = fileURLToPath(url);
    for (const workspace of this.workspaces) {
      if (path.startsWith(fileURLToPath(workspace))) {
        return path.replace(fileURLToPath(workspace), '').replace(sep, '/');
      }
    }
    return path.replace(sep, '/');
  }
  flattenProject() {
    this.entities = [];
    this.architectures = [];
    this.configurations = [];
    this.packages = [];
    this.packageInstantiations = [];
    this.contexts = [];
    this.libraryMap.clear();

    // do the library mapping at the beginning such that the library elaboration can happen at this stage
    for (const cachedFile of this.cachedFiles) {
      if (cachedFile instanceof FileCacheLibraryList) {
        for (const [file, lib] of cachedFile.libraryMap.entries()) {
          const existing = this.libraryMap.get(file);
          if (existing !== undefined && existing.library !== lib.library) {
            const message = {
              message: `This file has another and different library association: ${this.relativeToWorkspace(existing.definitionFile)}:${existing.definitionLine + 1} (library ${existing.library}).`,
              range: { start: { line: lib.definitionLine, character: 0 }, end: { line: lib.definitionLine, character: 1000 } },
              severity: DiagnosticSeverity.Warning,
            };
            // avoid duplicate messages
            if (cachedFile.messages.some(m => m.message === message.message && m.range.start.line === message.range.start.line) === false) {
              cachedFile.messages.push(message);
            }
            continue;
          }
          this.libraryMap.set(file, lib);
        }
      }
    }
    for (const cachedFile of this.cachedFiles) {

      if (cachedFile instanceof FileCacheVhdl) {
        new ElaborateTargetLibrary(cachedFile.linter).elaborate();
        this.entities.push(...cachedFile.linter.file.entities);
        this.architectures.push(...cachedFile.linter.file.architectures);
        this.configurations.push(...cachedFile.linter.file.configurations);
        this.packages.push(...cachedFile.linter.file.packages.filter(pkg => pkg instanceof OPackage) as OPackage[]);
        this.packageInstantiations.push(...cachedFile.linter.file.packageInstantiations);
        this.contexts.push(...cachedFile.linter.file.contexts);
      } else if (cachedFile instanceof FileCacheVerilog) {
        this.entities.push(...cachedFile.parser.file.entities);
      }

    }
  }
  // Cache the elaboration result. Caution this can get invalid super easy. Therefore it is completely removed on any file change.
  private cachedElaborate: string | undefined = undefined;
  async elaborateAll(filter: string, token?: CancellationToken) {
    if (this.cachedElaborate === filter) {
      return;
    }
    const cachedFiles = this.cachedFiles.filter(cachedFile => cachedFile instanceof FileCacheVhdl && cachedFile.linter.file.lexerTokens.find(token => token.getLText() === filter)) as FileCacheVhdl[];
    for (const cachedFile of cachedFiles) {
      Elaborate.clear(cachedFile.linter);
    }

    for (const cachedFile of cachedFiles) {
      if (cachedFile.linter.file.lexerTokens.find(token => token.getLText() === filter)) {
        cachedFile.linter.token = token;
        await Elaborate.elaborate(cachedFile.linter);
      }
    }
    this.cachedElaborate = filter;

  }
}

export class FileCacheLibraryList {
  public messages: Diagnostic[] = [];
  public libraryMap = new Map<string, LibraryMapping>();
  lintingTime: number;
  public builtIn = false;
  // Constructor can not be async. So constructor is private and use factory to create
  public static async create(uri: URL, projectParser: ProjectParser) {
    const cache = new FileCacheLibraryList(uri, projectParser);
    await cache.parse();
    return cache;
  }
  private constructor(public uri: URL, public projectParser: ProjectParser) {
  }
  async parse() {
    this.libraryMap.clear();
    this.messages = [];
    const text = await promises.readFile(this.uri, { encoding: 'utf8' });
    const lines = text.replaceAll('\r\n', '\n').split('\n');
    for (const [i, line] of lines.entries()) {
      // expect `library,path`
      const split = line.split(',');
      if (split.length !== 2) {
        this.messages.push({
          message: `Expected library,path but got ${split.length} parts.`,
          range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
          severity: DiagnosticSeverity.Warning,
        });
        continue;
      }
      if (split[1]!.startsWith('/')) {
        // absolute path
        this.messages.push({
          message: `Only relative paths are allowed.`,
          range: { start: { line: i, character: split[0]!.length + 1 }, end: { line: i, character: line.length } },
          severity: DiagnosticSeverity.Warning,
        });
        continue;
      }
      const path = pathToFileURL(dirname(fileURLToPath(this.uri)));
      const url = joinURL(path, split[1]!);
      if (existsSync(fileURLToPath(url)) === false) {
        this.messages.push({
          message: `${this.projectParser.relativeToWorkspace(url)} does not exist.`,
          range: { start: { line: i, character: split[0]!.length + 1 }, end: { line: i, character: line.length } },
          severity: DiagnosticSeverity.Warning,
        });
      }
      const existing = this.libraryMap.get(url.toString());
      if (existing !== undefined) {
        this.messages.push({
          message: `This file already has a library associated with it (${existing.library} in line ${existing.definitionLine + 1}).`,
          range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
          severity: DiagnosticSeverity.Warning,
        });
        continue;
      }
      this.libraryMap.set(url.toString(), {
        library: split[0]!,
        definitionFile: this.uri,
        definitionLine: i
      });
    }
  }

}
export class FileCacheVhdl {
  contexts: OContext[] = [];
  entities: OEntity[] = [];
  linter: VhdlLinter;
  lintingTime: number;
  // Constructor can not be async. So constructor is private and use factory to create
  public static async create(uri: URL, projectParser: ProjectParser, builtIn: boolean) {
    const cache = new FileCacheVhdl(uri, projectParser, builtIn);
    await cache.parse();
    return cache;
  }
  private constructor(public uri: URL, public projectParser: ProjectParser, public builtIn: boolean) {
  }
  async parse() {
    let text = await promises.readFile(this.uri, { encoding: 'utf8' });
    text = text.replaceAll('\r\n', '\n');
    this.linter = new VhdlLinter(this.uri, text, this.projectParser, await this.projectParser.settingsGetter(this.uri));
    this.replaceLinter(this.linter);
  }
  replaceLinter(vhdlLinter: VhdlLinter) {
    this.linter = vhdlLinter;
  }

}
class FileCacheVerilog {
  lintingTime: number;
  parser: VerilogParser;
  // Constructor can not be async. So constructor is private and use factory to create
  public static async create(uri: URL, projectParser: ProjectParser, builtIn: boolean) {
    const cache = new FileCacheVerilog(uri, projectParser, builtIn);
    await cache.parse();
    return cache;
  }
  private constructor(public uri: URL, public projectParser: ProjectParser, public builtIn: boolean) {
  }
  async parse() {
    const stat = await promises.stat(this.uri);
    let text;
    if (stat.size > 50 * 1024) {
      text = '';
      // throw new O.ParserError('this.file too large', new O.OIRange(this.file), 0, 100));
    } else {
      text = await promises.readFile(this.uri, { encoding: 'utf8' });
      text = text.replaceAll('\r\n', '\n');
    }
    this.parser = new VerilogParser(this.uri, text, this.projectParser);
  }

}