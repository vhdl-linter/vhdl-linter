import { Directory, File } from 'atom';

export class ProjectParser {
  private cachedFiles: OFileCache[] = [];
  constructor() {
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
  public removeFile(path: string) {
    const index = this.cachedFiles.findIndex(cachedFile => cachedFile.path === path);
    this.cachedFiles.splice(index, 1);
  }
  public async getPackages(): Promise<OPackage[]> {
    let files: File[] = [];
    for (const directory of atom.project.getDirectories()) {
      files.push(... this.parseDirectory(directory));
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
    let packagesFiltered = packages.filter(package_ => typeof package_ !== 'undefined') as OPackage[];
    return packagesFiltered;
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
    re = /type\s+(\w+)\s+is\s*\(([^)]*)\)\s*;/g;
    while (m = re.exec(text)) {
      this.package.things.push(... m[2].split(',').map(thing => thing.trim()));
    }
  }
}
// type t_packet is (p_NONE, p_CM_REQ, p_CM_REJ, p_CM_REP, p_CM_RTU, p_CM_DREQ, p_CM_DREP, p_RC_MR, p_RC_SIZE, p_RC_DECLINE, p_RDMA_F, p_RDMA_M, p_RDMA_L, p_RDMA_O, p_ACK);
