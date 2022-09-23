import { FSWatcher, watch } from 'chokidar';
import { EventEmitter } from 'events';
import { promises, readFileSync } from 'fs';
import { join, sep } from 'path';
import { OContext, OEntity, OFile, OPackage, OPackageBody, OSubprogram } from './parser/objects';
import { VhdlLinter } from './vhdl-linter';

export class ProjectParser {

  public cachedFiles: OFileCache[] = [];
  private packages: (OPackage | OPackageBody)[];
  private contexts: OContext[] = [];
  private entities: OEntity[];
  events = new EventEmitter();
  constructor(public workspaces: string[], public fileIgnoreRegex: string) { }
  async init() {
    let files = new Set<string>();
    await Promise.all(this.workspaces.map(async (directory) => {
      // console.log('dir', directory);
      const directories = await this.parseDirectory(directory);
      return (await Promise.all(directories.map(file => promises.realpath(file)))).forEach(file => files.add(file));
    }));
    // for (const directory of this.workspaces) {
    //   this.parseDirectory(directory).forEach(file => files.add(realpathSync(file)));
    // }
    const pkg = __dirname;
    if (pkg) {
      //       console.log(pkg, new Directory(pkg + '/ieee2008'));
      (await this.parseDirectory(join(pkg, `${sep}..${sep}..${sep}ieee2008`))).forEach(file => files.add(file));
    }

    for (const file of files) {
      let cachedFile = new OFileCache(file, this);
      this.cachedFiles.push(cachedFile);
    }
    this.cachedFiles.sort((a, b) => b.lintingTime - a.lintingTime);
    console.log('Times: \n' + this.cachedFiles.slice(0, 10).map(file => `${file.path}: ${file.lintingTime}ms`).join('\n'));
    this.fetchEntitesAndPackagesAndContexts();
    for (const workspace of this.workspaces) {
      const watcher = watch(workspace.replace(sep, '/') + '/**/*.vhd', { ignoreInitial: true });
      watcher.on('add', async (path) => {
        let cachedFile = new OFileCache(path, this);
        this.cachedFiles.push(cachedFile);
        this.fetchEntitesAndPackagesAndContexts();
        this.events.emit('change', 'add', path);
      });
      watcher.on('change', async (path) => {
        // console.log('change', path);
        const cachedFile = process.platform === 'win32'
          ? this.cachedFiles.find(cachedFile => cachedFile.path.toLowerCase() === path.toLowerCase())
          : this.cachedFiles.find(cachedFile => cachedFile.path === path);
        if (cachedFile) {
          cachedFile.reparse();
        } else {
          console.error('modified file not found', path);
        }
        this.fetchEntitesAndPackagesAndContexts();
        this.events.emit('change', 'change', path);
      });
      watcher.on('unlink', path => {
        const cachedFileIndex = this.cachedFiles.findIndex(cachedFile => cachedFile.path === path);
        this.cachedFiles.splice(cachedFileIndex, 1);
        this.fetchEntitesAndPackagesAndContexts();
        this.events.emit('change', 'unlink', path);
      });

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
  private fetchEntitesAndPackagesAndContexts() {
    //     console.log(this.cachedFiles);
    this.packages = [];
    this.entities = [];
    for (const cachedFile of this.cachedFiles) {
      if (cachedFile.entity) {
        this.entities.push(cachedFile.entity);
      }
      if (cachedFile.packages) {
        this.packages.push(...cachedFile.packages);
      }
      if (cachedFile.contexts) {
        this.contexts.push(...cachedFile.contexts);
      }
    }
  }
  watcher: FSWatcher;
  addFolders(folders: string[]) {
    this.watcher.add(folders.map(folder => folder.replace(sep, '/') + '/**/*.vhd'));
  }
  public getPackages() {
    return this.packages;
  }
  public getContexts() {
    return this.contexts;
  }
  public getEntities() {
    return this.entities;
  }
}

export class OFileCache {

  path: string;
  digest: string;
  packages?: (OPackage | OPackageBody)[];
  contexts: OContext[] = [];
  entity?: OEntity;
  text: string;
  linter: VhdlLinter;
  lintingTime: number;
  constructor(file: string, public projectParser: ProjectParser) {
    const text = readFileSync(file, { encoding: 'utf8' });
    if (!text) {
      return;
    }
    this.text = text;
    // this.digest = await file.getDigest();
    this.path = file;
    const date = Date.now();
    this.linter = new VhdlLinter(this.path, this.text, this.projectParser, true);
    this.lintingTime = Date.now() - date;
    this.parsePackages();
    this.parseEntity();
    this.parseContexts();
  }
  reparse() {
    this.text = readFileSync(this.path, { encoding: 'utf8' });
    this.linter = new VhdlLinter(this.path, this.text, this.projectParser);
    this.parsePackages();
    this.parseEntity();
    this.parseContexts();
  }
  private parsePackages(): void {
    this.packages = this.linter.file.packages;
  }
  private parseContexts(): void {
    this.contexts = this.linter.file.contexts;
  }
  private parseEntity(): void {
    if (this.linter.file.entity !== undefined) {
      this.entity = this.linter.file.entity;
    }
  }
}