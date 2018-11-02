import { Directory, File, CompositeDisposable, PackageManager } from 'atom';
import { LiteEvent } from 'lite-event';


export class ProjectParser {
  private cachedFiles: OFileCache[] = [];
  private packages: OPackage[];
  private initEvent = new LiteEvent<void, void>();
  private initialized = false;
  constructor(public subscriptions: CompositeDisposable) {
    this.initialize().then(() => {
      this.initEvent.trigger();
    });
  }
  private parseDirectory (directory: Directory): File[] {
    const files = [];
    for (const entry of directory.getEntriesSync()) {
      if (entry instanceof File) {
        if (entry.getBaseName().match(/\.vhdl?$/i)) {
          files.push(entry);
        }
      } else {
        files.push(... this.parseDirectory(entry));
      }
    }
    return files;
  }

  private async initialize(): Promise<void> {
    let files: File[] = [];
    for (const directory of atom.project.getDirectories()) {
      files.push(... this.parseDirectory(directory));
    }
    const pkg = atom.packages.getPackageDirPaths() + '/vhdl-linter';
    if (pkg) {
      console.log(pkg, new Directory(pkg + '/ieee2008'));
      files.push(... this.parseDirectory(new Directory(pkg + '/ieee2008')));
    }
    for (const file of files) {
      let cachedFile = this.cachedFiles.find(cachedFile => cachedFile.path === file.getPath());
      // if (cachedFile && cachedFile.digest !== await file.getDigest()) {
      //   cachedFile.parsePackage(file);
      // }
      if (!cachedFile) {
        let cachedFile = new OFileCache();
        cachedFile.path = file.getPath();
        await cachedFile.parsePackage(file);
        this.cachedFiles.push(cachedFile);
      }
    }
    let packages = this.cachedFiles.map(cachedFile => cachedFile.package);
    this.packages = packages.filter(package_ => typeof package_ !== 'undefined') as OPackage[];
    this.subscriptions.add(atom.project.onDidChangeFiles(async events => {
      for (const event of events) {
        if (event.path.match(/\.vhdl?$/i)) {
          // console.log(event);
          if (event.action === 'created') {
            let cachedFile = new OFileCache();
            cachedFile.path = event.path;
            await cachedFile.parsePackage(new File(event.path));
            this.cachedFiles.push(cachedFile);
          } else if (event.action === 'deleted') {
            const index = this.cachedFiles.findIndex(cachedFile => cachedFile.path === event.path);
            this.cachedFiles.splice(index, 1);
          } else if (event.action === 'modified') {
            console.log(this.cachedFiles);
            const cachedFile = this.cachedFiles.find(cachedFile => cachedFile.path === event.path);
            if (cachedFile) {
              await cachedFile.parsePackage(new File(event.path));
            } else {
              console.error('modified file not found', event);
            }
          } else if (event.action === 'renamed') {
            const cachedFile = this.cachedFiles.find(cachedFile => cachedFile.path === event.oldPath);
            if (cachedFile) {
              await cachedFile.parsePackage(new File(event.path));
            } else {
              console.error('renamed file not found', event);
            }

          }


          let packages = this.cachedFiles.map(cachedFile => cachedFile.package);
          this.packages = packages.filter(package_ => typeof package_ !== 'undefined') as OPackage[];
        }
      }
    }));
    this.initialized = true;
  }
  public async getPackages(): Promise<OPackage[]> {
    if (this.initialized) {
      return this.packages;
    }
    await new Promise(resolve => {
      this.initEvent.on((_arg1, _arg2) => {
        resolve();
      });
    });
    return this.packages;
  }
}
export class OPackage {
  name: string;
  things: string[] = [];
}
export class OFileCache {
  path: string;
  digest: string;
  package?: OPackage;
  async parsePackage(file: File): Promise<void> {
    const text = await file.read();
    if (!text) {
      return;
    }
    this.digest = await file.getDigest();
    this.path = file.getPath();
    const match = text.match(/package\s+(\w+)\s+is/i);
    if (!match) {
      return;
    }
    this.package = new OPackage();
    this.package.name = match[1];
    let re = /constant\s+(\w+)/g;
    let m;
    while (m = re.exec(text)) {
      this.package.things.push(m[1]);
    }
    re = /function\s+(\w+)/g;
    while (m = re.exec(text)) {
      this.package.things.push(m[1]);
    }
    re = /(?:subtype|type)\s+(\w+)/g;
    while (m = re.exec(text)) {
      this.package.things.push(m[1]);
    }
    re = /type\s+(\w+)\s+is\s*\(([^)]*)\)\s*;/g;
    while (m = re.exec(text)) {
      this.package.things.push(... m[2].split(',').map(thing => thing.trim()));
    }
  }
}
// type t_packet is (p_NONE, p_CM_REQ, p_CM_REJ, p_CM_REP, p_CM_RTU, p_CM_DREQ, p_CM_DREP, p_RC_MR, p_RC_SIZE, p_RC_DECLINE, p_RDMA_F, p_RDMA_M, p_RDMA_L, p_RDMA_O, p_ACK);
