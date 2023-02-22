import { OComponent, OFile, OPackage } from "../parser/objects";
import { ProjectParser } from "../projectParser";
import { getEntities } from "./elaborateInstantiations";

export function elaborateComponents(file: OFile, projectParser: ProjectParser) {
  for (const architecture of [...file.architectures, ...file.packages.filter(p => p instanceof OPackage) as OPackage[]]) {
    for (const component of architecture.declarations) {
      if (component instanceof OComponent) {
        for (const entity of getEntities(component, projectParser)) {
          component.definitions.push(entity);
          entity.referenceComponents.push(component);
        }
        const entityPorts = component.definitions.flatMap(ent => ent.ports);
        for (const port of component.ports) {
          port.definitions.push(...entityPorts.filter(p => p.lexerTokenEquals(port)));
          // TODO: create referenceLinks for the ports/generics of entities to the ports/generics of its component definitions
        }
        const entityGenerics = component.definitions.flatMap(ent => ent.generics);
        for (const generics of component.generics) {
          generics.definitions.push(...entityGenerics.filter(g => g.lexerTokenEquals(generics)));
        }
      }
    }
  }

}