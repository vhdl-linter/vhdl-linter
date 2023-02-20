import { OConfiguration, OFile } from "../parser/objects";
import { ProjectParser } from "../project-parser";

export function elaborateConfigurations(file: OFile, projectParser: ProjectParser) {
  for (const configuration of file.objectList) {
    if (configuration instanceof OConfiguration) {
      // find project entities
      configuration.definitions.push(...projectParser.entities.filter(e => e.lexerToken.getLText() === configuration.entityName.getLText()));
      for (const configurations of configuration.definitions) {
        configurations.referenceConfigurations.push(configuration);
      }
    }
  }
}
