import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { join } from "path";
import { pathToFileURL } from "url";
import { Position } from "vscode-languageserver";
import { converterTypes, entityConverter } from "../../../lib/entityConverter";
import { ProjectParser } from "../../../lib/projectParser";
import { defaultSettingsGetter, defaultSettingsWithOverwrite } from "../../../lib/settings";
import { VhdlLinter } from "../../../lib/vhdlLinter";
import { readFileSyncNorm } from "../../readFileSyncNorm";

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});
describe('Testing entityConverter', () => {
  test('Testing entity converter for with different configurations', () => {
    const path = join(__dirname, 'test_entity.vhd');
    const uri = pathToFileURL(path);
    const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, defaultSettingsGetter());
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
          const getter = defaultSettingsWithOverwrite(overwrite);
          const template = entityConverter(linter, type, getter());
          expect(template).toMatchSnapshot(`type ${type} overwrite ${JSON.stringify(overwrite)}`);

        }
      }
    }
  });
  test('Testing position based fetch of correct entity', () => {
    const path = join(__dirname, 'two_entities.vhd');
    const uri = pathToFileURL(path);
    const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, defaultSettingsGetter());
    {
      const template = entityConverter(linter, 'instance', defaultSettingsGetter());
      expect(template).toContain('first_entity');
    }
    {
      const template = entityConverter(linter, 'instance', defaultSettingsGetter(), Position.create(10, 10));
      expect(template).toContain('first_entity');
    }
    {
      const template = entityConverter(linter, 'instance', defaultSettingsGetter(), Position.create(16, 5));
      expect(template).toContain('second_entity');
    }
    {
      const template = entityConverter(linter, 'instance', defaultSettingsGetter(), Position.create(25, 0));
      expect(template).toContain('first_entity');
    }
  });
  test('Testing fetching in empty file', () => {
    const path = join(__dirname, 'fileWithoutEntity.vhd');
    const uri = pathToFileURL(path);
    const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, defaultSettingsGetter());
    {
      const template = entityConverter(linter, 'instance', defaultSettingsGetter());
      expect(template).toBeUndefined();
    }
    {
      const template = entityConverter(linter, 'instance', defaultSettingsGetter(), Position.create(25, 0));
      expect(template).toBeUndefined();
    }
    {
      const template = entityConverter(linter, 'instance', defaultSettingsGetter(), Position.create(31, 0));
      expect(template).toBeUndefined();
    }

  });
});