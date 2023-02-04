import { FSWatcher, watch } from 'chokidar';
import { EventEmitter } from 'events';
import { existsSync, promises } from 'fs';
import { sep } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Elaborate } from './elaborate/elaborate';
import { OArchitecture, OContext, OEntity, OPackage, OPackageInstantiation } from './parser/objects';
import { SettingsGetter, VhdlLinter } from './vhdl-linter';

export function joinURL(url: URL, ...additional: string[]) {
  return pathToFileURL(url.pathname + additional.map(a => '/' + a).join(''));
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
  public static async create(workspaces: URL[], fileIgnoreRegex: string, settingsGetter: SettingsGetter, disableWatching = false) {
    const projectParser = new ProjectParser(workspaces, fileIgnoreRegex, settingsGetter);
    await projectParser.init(disableWatching);
    return projectParser;
  }
  private constructor(public workspaces: URL[], public fileIgnoreRegex: string, public settingsGetter: SettingsGetter) { }
  public addFolders(urls: URL[]) {
    for (const url of urls) {
      const watcher = watch(fileURLToPath(url).replace(sep, '/') + '/**/*.vhd?(l)', { ignoreInitial: true });
      watcher.on('add', async (path) => {
        const cachedFile = await (FileCache.create(pathToFileURL(path), this));
        this.cachedFiles.push(cachedFile);
        this.flattenProject();
        this.events.emit('change', 'add', path);
      });
      watcher.on('change', async (path) => {
        // console.log('change', path);
        const cachedFile = process.platform === 'win32'
          ? this.cachedFiles.find(cachedFile => cachedFile.uri.pathname.toLowerCase() === path.toLowerCase())
          : this.cachedFiles.find(cachedFile => cachedFile.uri.pathname === path);
        if (cachedFile) {
          await cachedFile.parse();
          this.flattenProject();
          this.events.emit('change', 'change', path);
        } else {
          console.error('modified file not found', path);
        }
        this.cachedElaborate = undefined;
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
    const files = new Set<string>();
    await Promise.all(this.workspaces.map(async (directory) => {
      const directories = await this.parseDirectory(directory);
      return (await Promise.all(directories.map(file => promises.realpath(file)))).forEach(file => files.add(file));
    }));
    const rootDirectory = getRootDirectory();
    (await this.parseDirectory(joinURL(rootDirectory, 'ieee2008'))).forEach(file => files.add(file.pathname));

    for (const file of files) {
      const cachedFile = await FileCache.create(pathToFileURL(file), this);
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
        } else {
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
  private cachedElaborate: string|undefined = undefined;
  async elaborateAll(filter: string) {
    if (this.cachedElaborate === filter) {
      return;
    }
    const cachedFiles = this.cachedFiles.filter(cachedFile => cachedFile.linter.file.lexerTokens?.find(token => token.getLText() === filter));
    for (const cachedFile of cachedFiles) {
      Elaborate.clear(cachedFile.linter);
    }

    for (const cachedFile of cachedFiles) {
      if (cachedFile.linter.file.lexerTokens?.find(token => token.getLText() === filter)) {
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
  text: string;
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
  async parse(vhdlLinter?: VhdlLinter) {
    this.text = await (await promises.readFile(this.uri, { encoding: 'utf8' })).replaceAll('\r\n', '\n');
    if (vhdlLinter) {
      this.linter = vhdlLinter;
    } else {
      this.linter = new VhdlLinter(this.uri, this.text, this.projectParser, this.projectParser.settingsGetter);
    }
    this.packages = this.linter.file.packages.filter((p): p is OPackage => p instanceof OPackage);
    this.packageInstantiations = this.linter.file.packageInstantiations;
    this.entities = this.linter.file.entities;
    this.contexts = this.linter.file.contexts;
  }

}