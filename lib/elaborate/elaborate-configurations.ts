import { OConfiguration, OFile, OInstantiation } from "../parser/objects";
import { ProjectParser } from "../project-parser";

export function elaborateConfigurations(file: OFile, projectParser: ProjectParser) {
  for (const configuration of file.objectList) {
    if (configuration instanceof OConfiguration) {
      // find project entities
      configuration.definitions = projectParser.entities.filter(e => e.lexerToken.getLText() === configuration.entityName.getLText());
      for (const subprogram of configuration.definitions) {
        // subprogram.referenceLinks.push(configuration);
      }
    }
  }
}
