"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
class ProjectParser {
    constructor() {
        this.cachedFiles = [];
    }
    parseDirectory(directory) {
        const files = [];
        for (const entry of directory.getEntriesSync()) {
            if (entry instanceof atom_1.File) {
                if (entry.getBaseName().match(/\.vhdl?$/i)) {
                    files.push(entry);
                }
            }
            else {
                files.push(...this.parseDirectory(entry));
            }
        }
        return files;
    }
    removeFile(path) {
        const index = this.cachedFiles.findIndex(cachedFile => cachedFile.path === path);
        this.cachedFiles.splice(index, 1);
    }
    getPackages() {
        return __awaiter(this, void 0, void 0, function* () {
            let files = [];
            for (const directory of atom.project.getDirectories()) {
                files.push(...this.parseDirectory(directory));
            }
            for (const file of files) {
                let cachedFile = this.cachedFiles.find(cachedFile => cachedFile.path === file.getPath());
                // if (cachedFile && cachedFile.digest !== await file.getDigest()) {
                //   cachedFile.parsePackage(file);
                // }
                if (!cachedFile) {
                    let cachedFile = new OFileCache();
                    cachedFile.path = file.getPath();
                    yield cachedFile.parsePackage(file);
                    this.cachedFiles.push(cachedFile);
                }
            }
            let packages = this.cachedFiles.map(cachedFile => cachedFile.package);
            let packagesFiltered = packages.filter(package_ => typeof package_ !== 'undefined');
            return packagesFiltered;
        });
    }
}
exports.ProjectParser = ProjectParser;
class OPackage {
    constructor() {
        this.things = [];
    }
}
exports.OPackage = OPackage;
class OFileCache {
    parsePackage(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const text = yield file.read();
            if (!text) {
                return;
            }
            this.digest = yield file.getDigest();
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
                this.package.things.push(...m[2].split(',').map(thing => thing.trim()));
            }
        });
    }
}
exports.OFileCache = OFileCache;
// type t_packet is (p_NONE, p_CM_REQ, p_CM_REJ, p_CM_REP, p_CM_RTU, p_CM_DREQ, p_CM_DREP, p_RC_MR, p_RC_SIZE, p_RC_DECLINE, p_RDMA_F, p_RDMA_M, p_RDMA_L, p_RDMA_O, p_ACK);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC1wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvcHJvamVjdC1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLCtCQUF1QztBQUV2QyxNQUFhLGFBQWE7SUFFeEI7UUFEUSxnQkFBVyxHQUFpQixFQUFFLENBQUM7SUFFdkMsQ0FBQztJQUNPLGNBQWMsQ0FBRSxTQUFvQjtRQUMxQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsS0FBSyxNQUFNLEtBQUssSUFBSSxTQUFTLENBQUMsY0FBYyxFQUFFLEVBQUU7WUFDOUMsSUFBSSxLQUFLLFlBQVksV0FBSSxFQUFFO2dCQUN6QixJQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUU7b0JBQzFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ25CO2FBQ0Y7aUJBQU07Z0JBQ0wsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUM1QztTQUNGO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBQ00sVUFBVSxDQUFDLElBQVk7UUFDNUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDO1FBQ2pGLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBQ1ksV0FBVzs7WUFDdEIsSUFBSSxLQUFLLEdBQVcsRUFBRSxDQUFDO1lBQ3ZCLEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRTtnQkFDckQsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFJ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