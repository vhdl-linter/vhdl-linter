import { OConfigurationDeclaration, OFile } from "../parser/objects";
import { ProjectParser } from "../projectParser";

export function elaborateConfigurations(file: OFile, projectParser: ProjectParser) {
  for (const configuration of file.objectList) {
    if (configuration instanceof OConfigurationDeclaration) {
      // find project entities
      configuration.definitions.add(file.uri, projectParser.entities.filter(e => e.lexerToken.getLText() === configuration.entityName.getLText()));
      for (const configurations of configuration.definitions.it()) {
        configurations.referenceConfigurations.push(configuration);
      }
    }
  }
}
