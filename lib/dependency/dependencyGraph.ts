import { writeFileSync } from "fs";
import { OSelectedName } from "../parser/objects";
import { FileCacheVhdl, ProjectParser } from "../projectParser";

export class DependencyGraph {
  constructor(public projectParser: ProjectParser) {

  }

  built() {
    const dependency: Record<string, string[]> = {}
    this.projectParser.cachedFiles.filter((file): file is FileCacheVhdl => file instanceof FileCacheVhdl && file.builtIn === false).map(file => {
      const dependsOn = new Set<string>();
      for (const obj of file.linter.file.objectList) {
        if (obj instanceof OSelectedName) {
          // Check if selected name is library.something assuming that this is the only way to reference global stuff.
          if (obj.getRootElement().libraries.some(library => library.lexerToken.getLText() === obj.prefixTokens[0].nameToken.getLText())) {
            // console.log(`${obj.prefixTokens.map(token => token.nameToken.text).join('.')} + ${obj.nameToken.text}`);
            // Search for the thing
            // TODO: To this not only based on the name (also on type)
            const matches = [...this.projectParser.packageInstantiations, ...this.projectParser.entities,
              ...this.projectParser.packages, ...this.projectParser.configurations, ...this.projectParser.contexts]
              .filter(decl => decl.lexerToken.getLText() === obj.nameToken.getLText());
            for (const match of matches) {
              dependsOn.add(match.rootFile.uri.toString());
            }
          }
        }
      }
      dependency[file.uri.pathname.split('/').at(-1)!] = Array.from(dependsOn).map(uri => uri.split('/').at(-1)!);
      // console.log(`${file.uri.toString()} depends on ${[...dependsOn.values()].join(',')}`);
    });
    const graph = `
    digraph D {
     ${Object.entries(dependency).map(([file, dependencies]) => {
      return `"${file}"\n ${dependencies.map(fileDependency => `"${file}" -> "${fileDependency}"`).join('\n')}`;
     }).join('\n')}
    }`;
    writeFileSync(`/home/anton/bastels/vhdl-linter/test/unitTests/dependencyGraph/test`, graph);
    console.log(graph);
  }
}