import { FSWatcher, watch } from 'chokidar';
import { EventEmitter } from 'events';
import { existsSync, promises } from 'fs';
import { basename, join, sep } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { CancellationToken, WorkDoneProgressReporter } from 'vscode-languageserver';
import { Elaborate } from './elaborate/elaborate';
import { SetAdd } from './languageFeatures/findReferencesHandler';
import { OArchitecture, OConfigurationDeclaration, OContext, OEntity, OPackage, OPackageInstantiation } from './parser/objects';
import { SettingsGetter, VhdlLinter } from './vhdlLinter';
import { VerilogParser } from './verilogParser';

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
export class ProjectParser {

  public cachedFiles: (FileCacheVhdl | FileCacheVerilog)[] = [];
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
  public addFolders(urls: URL[]) {
    for (const url of urls) {
      // Chokidar does not accept win style line endings
      const watcher = watch([
        fileURLToPath(url).replaceAll(sep, '/') + '/**/*.vhd?(l)',
        fileURLToPath(url).replaceAll(sep, '/') + '/**/*.?(s)v',
      ], { ignoreInitial: true });
      watcher.on('add', (path) => {
        const handleEvent = async () => {
          const url = pathToFileURL(path);
          const cachedFile = await (FileCacheVhdl.create(url, this, false));
          this.cachedFiles.push(cachedFile);
          this.flattenProject();
          this.events.emit('change', 'add', url.toString());
        };
        handleEvent().catch(console.error);
      });
      watcher.on('change', (path) => {
        const handleEvent = async () => {
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
      const directories = await this.parseDirectory(directory);
      files.add(...directories.map(url => url.toString()));
    }));
    const rootDirectory = getRootDirectory();
    const builtinFiles = (await this.parseDirectory(joinURL(rootDirectory, 'ieee2008'))).map(url => url.toString());
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
      } else {
        const cachedFile = await FileCacheVhdl.create(new URL(file), this, builtIn);
        this.cachedFiles.push(cachedFile);
      }
    }
    this.cachedFiles.sort((a, b) => b.lintingTime - a.lintingTime);
    this.flattenProject();
    if (!disableWatching) {
      this.addFolders(this.workspaces);
    }
  }
  async stop() {
    for (const watcher of this.watchers) {
      await watcher.close();
    }
  }
  private async parseDirectory(directory: URL): Promise<URL[]> {
    const files: URL[] = [];
    const entries = await promises.readdir(directory);
    const ignoreRegex = this.fileIgnoreRegex.trim().length > 0 ? new RegExp(this.fileIgnoreRegex) : null;
    // const entries = await promisify(directory.getEntries)()
    await Promise.all(entries.map(async entry => {
      try {
        const filePath = joinURL(directory, entry);
        const fileStat = await promises.stat(filePath);
        if (fileStat.isFile()) {
          if ((entry.match(/\.vhdl?$/i) || entry.match(/\.s?v$/i)) && (ignoreRegex === null || !filePath.pathname.match(ignoreRegex))) {
            files.push(filePath);
          }
        } else if (fileStat.isDirectory()) {
          files.push(... await this.parseDirectory(filePath));
        }
      } catch (e) {
        console.error(e);
      }
    }));
    return files;
  }
  flattenProject() {
    this.entities = [];
    this.architectures = [];
    this.configurations = [];
    this.packages = [];
    this.packageInstantiations = [];
    this.contexts = [];
    for (const cachedFile of this.cachedFiles) {
      if (cachedFile instanceof FileCacheVhdl) {
        this.entities.push(...cachedFile.linter.file.entities);
        this.architectures.push(...cachedFile.linter.file.architectures);
        this.configurations.push(...cachedFile.linter.file.configurations);
        this.packages.push(...cachedFile.linter.file.packages.filter(pkg => pkg instanceof OPackage) as OPackage[]);
        this.packageInstantiations.push(...cachedFile.linter.file.packageInstantiations);
        this.contexts.push(...cachedFile.linter.file.contexts);
      } else {
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
    const stat = await promises.stat(this.uri)
    let text;
    if (stat.size > 50 * 1024) {
      text = '';
      // throw new O.ParserError('this.file too large', new O.OIRange(this.file), 0, 100));
    } else {
      text = await promises.readFile(this.uri, { encoding: 'utf8' });
      text = text.replaceAll('\r\n', '\n');
    }
    this.parser = new VerilogParser(this.uri, text, this.projectParser, this.projectParser.settingsGetter);
  }

}