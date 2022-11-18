import { OFile, OPackage } from "../parser/objects";
import { ProjectParser } from "../project-parser";
import { getEntities } from "./elaborate-instantiations";

export function elaborateComponents(file: OFile, projectParser: ProjectParser) {
  for (const architecture of [...file.architectures, ...file.packages.filter(p => p instanceof OPackage) as OPackage[]]) {
    for (const component of architecture.components) {
      component.definitions.push(...getEntities(component, projectParser));
      const entityPorts = component.definitions.flatMap(ent => ent.ports);
      for (const port of component.ports) {
        port.definitions.push(...entityPorts.filter(p => p.lexerTokenEquals(port)));
      }
      const entityGenerics = component.definitions.flatMap(ent => ent.generics);
      for (const generics of component.generics) {
        generics.definitions.push(...entityGenerics.filter(g => g.lexerTokenEquals(generics)));
      }
    }
  }

}