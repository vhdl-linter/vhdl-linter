import * as O from "../objects/objectsIndex";
import { ProjectParser } from "../projectParser";
import { VhdlLinter } from "../vhdlLinter";

function getEntities(comp: O.OComponent, projectParser: ProjectParser): O.OEntity[] {
  return projectParser.entities.filter(e => e.lexerToken.getLText() === comp.lexerToken.text.toLowerCase());
}
export function elaborateComponents(vhdlLinter: VhdlLinter) {
  for (const component of vhdlLinter.file.objectList) {
    if (component instanceof O.OComponent) {
      for (const entity of getEntities(component, vhdlLinter.projectParser)) {
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