import { OConfigurationDeclaration, OFile } from "../objects/objectsIndex";
import { ProjectParser } from "../projectParser";

export function elaborateConfigurations(file: OFile, projectParser: ProjectParser) {
  for (const configuration of file.objectList) {
    if (configuration instanceof OConfigurationDeclaration) {
      // find project entities
      configuration.definitions.push(...projectParser.entities.filter(e => e.lexerToken.getLText() === configuration.entityName.getLText()));
      for (const configurations of configuration.definitions) {
        configurations.referenceConfigurations.push(configuration);
      }
    }
  }
}
