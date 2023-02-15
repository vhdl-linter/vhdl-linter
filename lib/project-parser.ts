import { FSWatcher, watch } from 'chokidar';
import { EventEmitter } from 'events';
import { existsSync, promises } from 'fs';
import { basename, join, sep } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { WorkDoneProgressReporter } from 'vscode-languageserver';
import { Elaborate } from './elaborate/elaborate';
import { SetAdd } from './languageFeatures/findReferencesHandler';
import { OArchitecture, OContext, OEntity, OPackage, OPackageInstantiation } from './parser/objects';
import { SettingsGetter, VhdlLinter } from './vhdl-linter';

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

  public cachedFiles: FileCache[] = [];
  public packages: OPackage[] = [];
  public packageInstantiations: OPackageInstantiation[] = [];
  public contexts: OContext[] = [];
  public entities: OEntity[] = [];
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
      const watcher = watch(fileURLToPath(url).replaceAll(sep, '/') + '/**/*.vhd?(l)', { ignoreInitial: true });
      watcher.on('add', (path) => {
        const handleEvent = async () => {
          const cachedFile = await (FileCache.create(pathToFileURL(path), this));
          this.cachedFiles.push(cachedFile);
          this.flattenProject();
          this.events.emit('change', 'add', path);
        };
        handleEvent().catch(console.error);
      });
      watcher.on('change', (path) => {
        const handleEvent = async () => {
          // console.log('change', path);
          const cachedFile = process.platform === 'win32'
            ? this.cachedFiles.find(cachedFile => fileURLToPath(cachedFile.uri).toLowerCase() === path.toLowerCase())
            : this.cachedFiles.find(cachedFile => fileURLToPath(cachedFile.uri) === path);
          if (cachedFile) {
            await cachedFile.parse();
            this.flattenProject();
            this.events.emit('change', 'change', path);
          } else {
            console.error('modified file not found', path);
          }
          this.cachedElaborate = undefined;
        };
        handleEvent().catch(console.error);
      });
      watcher.on('unlink', path => {
        const cachedFileIndex = this.cachedFiles.findIndex(cachedFile => cachedFile.uri.pathname === path);
        if (cachedFileIndex > -1) {
          this.cachedFiles.splice(cachedFileIndex, 1);
          this.flattenProject();
          this.events.emit('change', 'unlink', path);
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
    files.add(...(await this.parseDirectory(joinURL(rootDirectory, 'ieee2008'))).map(url => url.toString()));
    let index = 0;
    for (const file of files) {
      if (this.progress) {
        const percent = Math.round(index / files.size * 100);
        this.progress.report(index / files.size * 100, `ProjectParser ${percent}% current file: ${basename(fileURLToPath(file))}`);
        index++;
      }
      const cachedFile = await FileCache.create(new URL(file), this);
      this.cachedFiles.push(cachedFile);
    }
    this.cachedFiles.sort((a, b) => b.lintingTime - a.lintingTime);
    // console.log('Times: \n' + this.cachedFiles.slice(0, 10).map(file => `${file.path}: ${file.lintingTime}ms`).join('\n'));
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
          if (entry.match(/\.vhdl?$/i) && (ignoreRegex === null || !filePath.pathname.match(ignoreRegex))) {
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
    this.packages = [];
    this.packageInstantiations = [];
    this.entities = [];
    this.architectures = [];
    for (const cachedFile of this.cachedFiles) {
      this.entities.push(...cachedFile.entities);
      this.architectures.push(...cachedFile.linter.file.architectures);
      if (cachedFile.packages) {
        this.packages.push(...cachedFile.packages);
      }
      if (cachedFile.packageInstantiations) {
        this.packageInstantiations.push(...cachedFile.packageInstantiations);
      }
      if (cachedFile.contexts) {
        this.contexts.push(...cachedFile.contexts);
      }
    }
  }
  // Cache the elaboration result. Caution this can get invalid super easy. Therefore it is completely removed on any file change.
  private cachedElaborate: string | undefined = undefined;
  async elaborateAll(filter: string) {
    if (this.cachedElaborate === filter) {
      return;
    }
    const cachedFiles = this.cachedFiles.filter(cachedFile => cachedFile.linter.file.lexerTokens.find(token => token.getLText() === filter));
    for (const cachedFile of cachedFiles) {
      Elaborate.clear(cachedFile.linter);
    }

    for (const cachedFile of cachedFiles) {
      if (cachedFile.linter.file.lexerTokens.find(token => token.getLText() === filter)) {
        await Elaborate.elaborate(cachedFile.linter);
      }
    }
    this.cachedElaborate = filter;

  }
}

class FileCache {
  packages?: OPackage[];
  packageInstantiations?: OPackageInstantiation[];
  contexts: OContext[] = [];
  entities: OEntity[] = [];
  linter: VhdlLinter;
  lintingTime: number;
  // Constructor can not be async. So constructor is private and use factory to create
  public static async create(uri: URL, projectParser: ProjectParser) {
    const cache = new FileCache(uri, projectParser);
    await cache.parse();
    return cache;
  }
  private constructor(public uri: URL, public projectParser: ProjectParser) {
  }
  async parse() {
    let text = await promises.readFile(this.uri, { encoding: 'utf8' });
    text = text.replaceAll('\r\n', '\n');
    this.linter = new VhdlLinter(this.uri, text, this.projectParser, this.projectParser.settingsGetter);
    this.replaceLinter(this.linter);
  }
  replaceLinter(vhdlLinter: VhdlLinter) {
    this.linter = vhdlLinter;
    this.packages = this.linter.file.packages.filter((p): p is OPackage => p instanceof OPackage);
    this.packageInstantiations = this.linter.file.packageInstantiations;
    this.entities = this.linter.file.entities;
    this.contexts = this.linter.file.contexts;
  }

}