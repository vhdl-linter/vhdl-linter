import { readdirSync, statSync, readFileSync } from 'fs';
import { OEntity } from './parser/objects';
import { VhdlLinter } from './vhdl-linter';
import {watch, FSWatcher} from 'chokidar';

export class ProjectParser {

  private cachedFiles: OFileCache[] = [];
  private packages: OPackage[];
  private entities: OEntity[];
  constructor(public workspaces: string[]) {
    let files: string[] = [];
    for (const directory of this.workspaces) {
      files.push(... this.parseDirectory(directory));
    }
    const pkg = __dirname;
    if (pkg) {
      //       console.log(pkg, new Directory(pkg + '/ieee2008'));
      files.push(... this.parseDirectory((pkg + '/../../ieee2008')));
    }
    for (const file of files) {
      let cachedFile = this.cachedFiles.find(cachedFile => cachedFile.path === file);
      // if (cachedFile && cachedFile.digest !== await file.getDigest()) {
      //   cachedFile.parsePackage(file);
      // }
      if (!cachedFile) {
        let cachedFile = new OFileCache(this);
        cachedFile.path = file;
        cachedFile.parseFile(file);
        this.cachedFiles.push(cachedFile);
      }
    }
    this.fetchEntitesAndPackages();
    for (const workspace of this.workspaces) {
      const watcher = watch(workspace + '/**/*.vhd');
      watcher.on('add', async (path) => {
        let cachedFile = new OFileCache(this);
        cachedFile.path = path;
        cachedFile.parseFile(path);
        this.cachedFiles.push(cachedFile);
        this.fetchEntitesAndPackages();
      });
      watcher.on('change', async (path) => {
        const cachedFile = this.cachedFiles.find(cachedFile => cachedFile.path === path);
        if (cachedFile) {
          cachedFile.parseFile(path);
        } else {
          console.error('modified file not found', event);
        }
        this.fetchEntitesAndPackages();
      });
      watcher.on('unlink', path => {
        const cachedFileIndex = this.cachedFiles.findIndex(cachedFile => cachedFile.path === path);
        this.cachedFiles.splice(cachedFileIndex, 1);
        this.fetchEntitesAndPackages();
      });

    }
  }
  private parseDirectory(directory: string): string[] {
    const files = [];
    const entries = readdirSync(directory);

    // const entries = await promisify(directory.getEntries)()

    for (const entry of entries) {
      const fileStat = statSync(directory + '/' + entry);
      if (fileStat.isFile()) {
        if (entry.match(/\.vhdl?$/i)) {
          files.push(directory + '/' + entry);
        }
      } else {
        files.push(... this.parseDirectory(directory + '/' + entry));
      }
    }
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
      if (cachedFile.package) {
        this.packages.push(cachedFile.package);
      }
    }
  }
  watcher: FSWatcher;
  addFolders(folders: string[]) {
    this.watcher.add(folders.map(folder => folder + '/**/*.vhd'));
  }
  public async getPackages(): Promise<OPackage[]> {
    return this.packages;
  }
  public async getEntities(): Promise<OEntity[]> {
    return this.entities;
  }
}
export class OPackage {
  things: OThing[] = [];
  referencePackage?: string;
  constructor(public path: string, public name: string, public fileCache: OFileCache) {}
}
export class OThing {
  constructor(public parent: OPackage, public name: string, public startI: number, public endI: number) { }
}
export class OProjectPorts {
  constructor(
    public name: string,
    public direction: 'in' | 'out' | 'inout',
    public hasDefault: boolean,
    public startI: number,
    public endI: number,
  ) {}
}
export class OFileCache {
  path: string;
  digest: string;
  package?: OPackage;
  entity?: OEntity;
  text: string;
  constructor(public projectParser: ProjectParser) {}
  parseFile(file: string): void {
    const text = readFileSync(file, { encoding: 'utf8' });
    if (!text) {
      return;
    }
    this.text = text;
    // this.digest = await file.getDigest();
    this.path = file;
    this.parsePackage();
    this.parseEntity();
  }
  private parsePackage(): void {
    const match = this.text.match(/package\s+(\w+)\s+is/i);
    if (!match) {
      return;
    }
    this.package = new OPackage(this.path, match[1], this);
    // console.log(  this.package.name, 'parsing package');

    let re = /constant\s+(\w+).*?;/sg;
    let m;
    while (m = re.exec(this.text)) {
      this.package.things.push(new OThing(this.package, m[1], m.index, m.index + m[0].length));
    }
    re = /function\s+(\w+).*?;/sg;
    while (m = re.exec(this.text)) {
      this.package.things.push(new OThing(this.package, m[1], m.index, m.index + m[0].length));
    }
    re = /(?:subtype|type)\s+(\w+)/sg;
    while (m = re.exec(this.text)) {
      this.package.things.push(new OThing(this.package, m[1], m.index, m.index + m[0].length));
    }
    re = /type\s+(\w+)\s+is\s*\(([^)]*)\)\s*;/sg;
    while (m = re.exec(this.text)) {
      let j = m.index;
      const pkg = this.package;
      this.package.things.push(...m[2].split(',').map(thing => {
        const thing2 = new OThing(pkg, thing.trim(), j, j + thing.trim().length);
        j += 1 + thing.length;
        return thing2;
      }));
    }
    const matchReference = this.text.match(/is\s+new\s+(\w+).(\w+)/i);
    if (matchReference) {
      this.package.referencePackage = matchReference[2];
    }
    // console.log(this.package);

  }
  private parseEntity(): void {
    const linter = new VhdlLinter(this.path, this.text, this.projectParser, true);
    if (linter.tree && linter.tree.entity) {
      this.entity = linter.tree.entity;
    }
  }
}
// type t_packet is (p_NONE, p_CM_REQ, p_CM_REJ, p_CM_REP, p_CM_RTU, p_CM_DREQ, p_CM_DREP, p_RC_MR, p_RC_SIZE, p_RC_DECLINE, p_RDMA_F, p_RDMA_M, p_RDMA_L, p_RDMA_O, p_ACK);
