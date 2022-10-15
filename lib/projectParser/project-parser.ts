import { FSWatcher, watch } from 'chokidar';
import { EventEmitter } from 'events';
import { promises, readFileSync } from 'fs';
import { Worker } from 'node:worker_threads';
import { join, sep } from 'path';
import { OContext, OEntity, OFile, OPackage, OPackageBody } from '../parser/objects';
import * as objects from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';
// import { StaticPool } from 'node-worker-threads-pool';
import { Parser } from '../parser/parser';
import { pool } from './parser-pool';
export class ProjectParser {

  public cachedFiles: OFileCache[] = [];
  private packages: (OPackage | OPackageBody)[];
  private contexts: OContext[] = [];
  private entities: OEntity[];
  events = new EventEmitter();
  constructor(public workspaces: string[], public fileIgnoreRegex: string) { }
  async init() {
    const files = new Set<string>();
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
      (await this.parseDirectory(join(pkg, `${sep}..${sep}..${sep}..${sep}ieee2008`))).forEach(file => files.add(file));
    }
    for (const file of files) {
      const cachedFile = new OFileCache(file);
      await cachedFile.parse();
      this.cachedFiles.push(cachedFile);
    }
    // this.cachedFiles.push(...await Promise.all(Array.from(files).map(async file => {
    //   const cachedFile = new OFileCache(file, this);
    //   await cachedFile.parse();
    //   return cachedFile;
    // })));
    this.cachedFiles.sort((a, b) => b.lintingTime - a.lintingTime);
    // console.log('Times: \n' + this.cachedFiles.slice(0, 10).map(file => `${file.path}: ${file.lintingTime}ms`).join('\n'));
    this.fetchEntitesAndPackagesAndContexts();
    for (const workspace of this.workspaces) {
      const watcher = watch(workspace.replace(sep, '/') + '/**/*.vhd', { ignoreInitial: true });
      watcher.on('add', async (path) => {
        const cachedFile = new OFileCache(path);
        await cachedFile.parse();
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
          await cachedFile.parse();
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
      this.entities.push(...cachedFile.entities);
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
  file: OFile;
  packages?: (OPackage | OPackageBody)[];
  contexts: OContext[] = [];
  entities: OEntity[] = [];
  lintingTime: number;
  constructor(file: string) {
    // this.digest = await file.getDigest();
    this.path = file;
  }
  async parse() {
    console.log(this.path, 'start');
    // const parser = new Parser(readFileSync(this.path, { encoding: 'utf-8' }), this.path, true);
    // this.file = parser.parse();

    this.file = await pool.exec({
      path: this.path,
    });
    console.log(this.path, 'end');
    this.packages = this.file.packages;
    this.entities = this.file.entities;
    this.contexts = this.file.contexts;
  }
}