import { FSWatcher, watch } from 'chokidar';
import { EventEmitter } from 'events';
import { promises } from 'fs';
import { join, sep } from 'path';
import { cwd } from 'process';
import { OContext, OEntity, OPackage, OPackageInstantiation } from './parser/objects';
import { SettingsGetter, VhdlLinter } from './vhdl-linter';

export class ProjectParser {

  public cachedFiles: FileCache[] = [];
  public packages: OPackage[] = [];
  public packageInstantiations: OPackageInstantiation[] = [];
  public contexts: OContext[] = [];
  public entities: OEntity[] = [];
  events = new EventEmitter();
  private watchers: FSWatcher[] = [];
  // Constructor can not be async. So constructor is private and use factory to create
  public static async create(workspaces: string[], fileIgnoreRegex: string, settingsGetter: SettingsGetter, disableWatching = false) {
    const projectParser = new ProjectParser(workspaces, fileIgnoreRegex, settingsGetter);
    await projectParser.init(disableWatching);
    return projectParser;
  }
  private constructor(public workspaces: string[], public fileIgnoreRegex: string, public settingsGetter: SettingsGetter) { }
  public addFolders(pathes: string[]) {
    for (const path of pathes) {
      const watcher = watch(path.replace(sep, '/') + '/**/*.vhd?(l)', { ignoreInitial: true });
      watcher.on('add', async (path) => {
        const cachedFile = await (FileCache.create(path, this));
        this.cachedFiles.push(cachedFile);
        this.flattenProject();
        this.events.emit('change', 'add', path);
      });
      watcher.on('change', async (path) => {
        // console.log('change', path);
        const cachedFile = process.platform === 'win32'
          ? this.cachedFiles.find(cachedFile => cachedFile.path.toLowerCase() === path.toLowerCase())
          : this.cachedFiles.find(cachedFile => cachedFile.path === path);
        if (cachedFile) {
          await cachedFile.parse();
          this.flattenProject();
          this.events.emit('change', 'change', path);
        } else {
          console.error('modified file not found', path);
        }
      });
      watcher.on('unlink', path => {
        const cachedFileIndex = this.cachedFiles.findIndex(cachedFile => cachedFile.path === path);
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
    (await this.parseDirectory(join(cwd(), 'ieee2008'))).forEach(file => files.add(file));

    for (const file of files) {
      const cachedFile = await FileCache.create(file, this);
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
  private async parseDirectory(directory: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await promises.readdir(directory);
    const ignoreRegex = this.fileIgnoreRegex.trim().length > 0 ? new RegExp(this.fileIgnoreRegex) : null;

    // const entries = await promisify(directory.getEntries)()
    await Promise.all(entries.map(async entry => {
      try {
        const filePath = directory + sep + entry;
        const fileStat = await promises.stat(filePath);
        if (fileStat.isFile()) {
          if (entry.match(/\.vhdl?$/i) && (ignoreRegex === null || !filePath.match(ignoreRegex))) {
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
  private flattenProject() {
    this.packages = [];
    this.packageInstantiations = [];
    this.entities = [];
    for (const cachedFile of this.cachedFiles) {
      this.entities.push(...cachedFile.entities);
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

}

export class FileCache {
  packages?: OPackage[];
  packageInstantiations?: OPackageInstantiation[];
  contexts: OContext[] = [];
  entities: OEntity[] = [];
  text: string;
  linter: VhdlLinter;
  lintingTime: number;
  // Constructor can not be async. So constructor is private and use factory to create
  public static async create(path: string, projectParser: ProjectParser) {
    const cache = new FileCache(path, projectParser);
    await cache.parse();
    return cache;
  }
  private constructor(public path: string, public projectParser: ProjectParser) {
  }
  async parse() {
    this.text = await promises.readFile(this.path, { encoding: 'utf8' });
    this.linter = new VhdlLinter(this.path, this.text, this.projectParser, this.projectParser.settingsGetter);
    this.packages = this.linter.file.packages.filter((p): p is OPackage => p instanceof OPackage);
    this.packageInstantiations = this.linter.file.packageInstantiations;
    this.entities = this.linter.file.entities;
    this.contexts = this.linter.file.contexts;
  }

}