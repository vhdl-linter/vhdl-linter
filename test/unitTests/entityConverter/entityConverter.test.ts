import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { join } from "path";
import { pathToFileURL } from "url";
import { Position } from "vscode-languageserver";
import { converterTypes, entityConverter } from "../../../lib/entityConverter";
import { ProjectParser } from "../../../lib/projectParser";
import { VhdlLinter } from "../../../lib/vhdlLinter";
import { readFileSyncNorm } from "../../readFileSyncNorm";
import { getDocumentSettings, overwriteSettings } from "../../../lib/settingsManager";

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
});
afterAll(async () => {
  await projectParser.stop();
});
describe('Testing entityConverter', () => {
  test('Testing entity converter for with different configurations', async () => {
    const path = join(__dirname, 'test_entity.vhd');
    const uri = pathToFileURL(path);
    const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, await getDocumentSettings(uri, projectParser));
    for (const type of ['instance', 'signals', 'sysverilog', 'component'] as converterTypes[]) {
      const overwritesStyles = {
        instantiationLabelPrefix: ['', 'instPrefix_'],
        instantiationLabelSuffix: ['_instSuffix'],
        signalPrefix: ['sigPrefix_'],
        signalSuffix: ['_sigSuffix'],
        genericPrefix: ['genericPrefix_'],
        genericSuffix: ['_genericSuffix'],
      };
      for (const key of Object.keys(overwritesStyles) as (keyof typeof overwritesStyles)[]) {
        for (const value of overwritesStyles[key]) {
          const overwrite = { style: { [key]: value } };
          const settings = overwriteSettings(await getDocumentSettings(pathToFileURL(path), projectParser), overwrite);
          const template = entityConverter(linter, type, settings);
          expect(template).toMatchSnapshot(`type ${type} overwrite ${JSON.stringify(overwrite)}`);

        }
      }
    }
  });
  test('Testing position based fetch of correct entity', async () => {
    const path = join(__dirname, 'two_entities.vhd');
    const uri = pathToFileURL(path);
    const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, await getDocumentSettings(uri, projectParser));
    {
      const template = entityConverter(linter, 'instance', await getDocumentSettings(uri, projectParser));
      expect(template).toContain('first_entity');
    }
    {
      const template = entityConverter(linter, 'instance', await getDocumentSettings(uri, projectParser), Position.create(10, 10));
      expect(template).toContain('first_entity');
    }
    {
      const template = entityConverter(linter, 'instance', await getDocumentSettings(uri, projectParser), Position.create(16, 5));
      expect(template).toContain('second_entity');
    }
    {
      const template = entityConverter(linter, 'instance', await getDocumentSettings(uri, projectParser), Position.create(25, 0));
      expect(template).toContain('first_entity');
    }
  });
  test('Testing fetching in empty file', async () => {
    const path = join(__dirname, 'fileWithoutEntity.vhd');
    const uri = pathToFileURL(path);
    const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, await getDocumentSettings(uri, projectParser));
    {
      const template = entityConverter(linter, 'instance', await getDocumentSettings(uri, projectParser));
      expect(template).toBeUndefined();
    }
    {
      const template = entityConverter(linter, 'instance', await getDocumentSettings(uri, projectParser), Position.create(25, 0));
      expect(template).toBeUndefined();
    }
    {
      const template = entityConverter(linter, 'instance', await getDocumentSettings(uri, projectParser), Position.create(31, 0));
      expect(template).toBeUndefined();
    }

  });
});