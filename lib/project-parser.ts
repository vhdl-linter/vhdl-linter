import { FSWatcher, watch } from 'chokidar';
import { EventEmitter } from 'events';
import { promises, readFileSync } from 'fs';
import { join, sep } from 'path';
import { OEntity, OFileWithEntity, OFileWithPackages, OPackage } from './parser/objects';
import { VhdlLinter } from './vhdl-linter';

export class ProjectParser {

  public cachedFiles: OFileCache[] = [];
  private packages: OPackage[];
  private entities: OEntity[];
  events = new EventEmitter();
  constructor(public workspaces: string[]) { }
  async init() {
    let files = new Set<string>();
    await Promise.all(this.workspaces.map(async (directory) => {
      console.log('dir', directory);
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
      files.add(join(pkg, `${sep}..${sep}..${sep}standard.vhd`));
      files.add(join(pkg, `${sep}..${sep}..${sep}textio.vhd`));
      files.add(join(pkg, `${sep}..${sep}..${sep}env.vhd`));
    }
    for (const file of files) {
      let cachedFile = new OFileCache(file, this);
      this.cachedFiles.push(cachedFile);
    }
    this.fetchEntitesAndPackages();
    for (const workspace of this.workspaces) {
      const watcher = watch(workspace.replace(sep, '/') + '/**/*.vhd', { ignoreInitial: true });
      watcher.on('add', async (path) => {
        let cachedFile = new OFileCache(path, this);
        this.cachedFiles.push(cachedFile);
        this.fetchEntitesAndPackages();
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
        this.fetchEntitesAndPackages();
        this.events.emit('change', 'change', path);
      });
      watcher.on('unlink', path => {
        const cachedFileIndex = this.cachedFiles.findIndex(cachedFile => cachedFile.path === path);
        this.cachedFiles.splice(cachedFileIndex, 1);
        this.fetchEntitesAndPackages();
        this.events.emit('change', 'unlink', path);
      });

    }
  }
  private async parseDirectory(directory: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await promises.readdir(directory);

    // const entries = await promisify(directory.getEntries)()
    await Promise.all(entries.map(async entry => {
      try {
        const fileStat = await promises.stat(directory + '/' + entry);
        if (fileStat.isFile()) {
          if (entry.match(/\.vhdl?$/i)) {
            files.push(directory + '/' + entry);
          }
        } else {
          files.push(... await this.parseDirectory(directory + '/' + entry));
        }
      } catch (e) {
        console.log(e);
      }
    }));
    return files;
  }
  private fetchEntitesAndPackages() {
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
    }
  }
  watcher: FSWatcher;
  addFolders(folders: string[]) {
    this.watcher.add(folders.map(folder => folder.replace(sep, '/') + '/**/*.vhd'));
  }
  public getPackages(): OPackage[] {
    return this.packages;
  }
  public getEntities(): OEntity[] {
    return this.entities;
  }
}

export class OFileCache {

  path: string;
  digest: string;
  packages?: OPackage[];
  entity?: OEntity;
  text: string;
  linter: VhdlLinter;
  constructor(file: string, public projectParser: ProjectParser) {
    const text = readFileSync(file, { encoding: 'utf8' });
    if (!text) {
      return;
    }
    this.text = text;
    // this.digest = await file.getDigest();
    this.path = file;
    this.linter = new VhdlLinter(this.path, this.text, this.projectParser);
    this.parsePackages();
    this.parseEntity();
  }
  reparse() {
    this.text = readFileSync(this.path, { encoding: 'utf8' });
    this.linter = new VhdlLinter(this.path, this.text, this.projectParser);
    this.parsePackages();
    this.parseEntity();
  }
  private parsePackages(): void {
    if ((this.linter.tree instanceof OFileWithPackages)) {
      this.packages = this.linter.tree.packages;
    }


  }
  private parseEntity(): void {
    if ((this.linter.tree instanceof OFileWithEntity)) {
      this.entity = this.linter.tree.entity;
    }
  }
}
// type t_packet is (p_NONE, p_CM_REQ, p_CM_REJ, p_CM_REP, p_CM_RTU, p_CM_DREQ, p_CM_DREP, p_RC_MR, p_RC_SIZE, p_RC_DECLINE, p_RDMA_F, p_RDMA_M, p_RDMA_L, p_RDMA_O, p_ACK);
