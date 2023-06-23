import { DiagnosticSeverity } from "vscode-languageserver/node";
import { implementsIHasDefinitions, implementsIHasNameLinks } from "../parser/interfaces";
import { OArchitecture, OEntity, OFile, OPackage, OPackageBody } from "../parser/objects";
import { VhdlLinter } from "../vhdlLinter";
import { elaborateAliases } from "./elaborateAliases";
import { elaborateAssociations } from "./elaborateAssociation";
import { elaborateComponents } from "./elaborateComponents";
import { elaborateConfigurations } from "./elaborateConfigurations";
import { elaborateExpressionInstantiations } from "./elaborateExpressionInstantiations";
import { elaborateInstantiations } from "./elaborateInstantiations";
import { ElaborateNames } from "./elaborateNames";

export class Elaborate {
  file: OFile;
  private constructor(public vhdlLinter: VhdlLinter) {
    this.file = vhdlLinter.file;
  }
  public static async elaborate(vhdlLinter: VhdlLinter) {

    const elaborator = new Elaborate(vhdlLinter);
    await elaborator.elaborateAll();
    vhdlLinter.elaborated = true;
  }
  public static clear(vhdlLinter: VhdlLinter) {
    for (const obj of vhdlLinter.file.objectList) {
      if (implementsIHasNameLinks(obj)) {
        obj.nameLinks = [];
        obj.aliasLinks = [];
      }
      if (implementsIHasDefinitions(obj)) {
        obj.definitions = [];
      }
      if (obj instanceof OEntity) {
        obj.correspondingArchitectures = [];
      } else if (obj instanceof OArchitecture) {
        obj.correspondingEntity = undefined;
      } else if (obj instanceof OPackageBody) {
        obj.correspondingPackage = undefined;
      } else if (obj instanceof OPackage) {
        obj.correspondingPackageBodies = [];
      }

    }
  }
  async elaborateAll() {

    await this.vhdlLinter.handleCanceled();

    const start = Date.now();
    // Map architectures to entity
    for (const architecture of this.file.architectures) {
      if (architecture.entityName === undefined) {
        continue;
      }
      // Find entity first in this file
      let entity = this.file.entities.find(entity => entity.lexerToken.getLText() === architecture.entityName.getLText());
      if (!entity) { // Find entity in all files
        entity = this.vhdlLinter.projectParser.entities.find(entity => entity.lexerToken.getLText() === architecture.entityName.getLText());
      }
      if (entity) {
        architecture.correspondingEntity = entity;
      }

    }
    for (const entity of this.file.entities) {
      entity.correspondingArchitectures = this.vhdlLinter.projectParser.architectures.filter(architecture => entity.lexerToken.getLText() === architecture.entityName.getLText());
    }
    console.log(`elaborate A ${this.file.uri.pathname} ${Date.now() - start}ms`);

    // Map package body to package
    for (const pkg of this.file.packages) {
      if (pkg instanceof OPackageBody) {

        // Find entity first in this file
        let pkgHeader: OPackage | undefined = this.file.packages.find(pkgHeader => pkgHeader instanceof OPackage && pkgHeader.lexerToken.getLText() === pkg.lexerToken.getLText()) as OPackage | undefined;
        if (!pkgHeader) { // Find entity in all files
          pkgHeader = this.vhdlLinter.projectParser.packages.find(pkgHeader => pkgHeader instanceof OPackage && pkgHeader.lexerToken.getLText() === pkg.lexerToken.getLText());
        }
        if (pkgHeader) {
          pkg.correspondingPackage = pkgHeader;
          pkgHeader.correspondingPackageBodies.push(pkg);
        } else {
          this.vhdlLinter.addMessage({
            range: pkg.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `Can not find package for package body.`
          }, 'elaborate');
        }

      }
    }
    console.log(`elaborate B ${this.file.uri.pathname} ${Date.now() - start}ms`);

    await this.vhdlLinter.handleCanceled();
    await ElaborateNames.elaborate(this.vhdlLinter);
    console.log(`elaborate B1 ${this.file.uri.pathname} ${Date.now() - start}ms`);

    elaborateExpressionInstantiations(this.vhdlLinter.file);
    console.log(`elaborate B2 ${this.file.uri.pathname} ${Date.now() - start}ms`);
    await this.vhdlLinter.handleCanceled();
    elaborateComponents(this.vhdlLinter);
    console.log(`elaborate B3 ${this.file.uri.pathname} ${Date.now() - start}ms`);
    await this.vhdlLinter.handleCanceled();
    elaborateInstantiations(this.vhdlLinter);
    console.log(`elaborate B4 ${this.file.uri.pathname} ${Date.now() - start}ms`);
    await this.vhdlLinter.handleCanceled();
    elaborateConfigurations(this.file, this.vhdlLinter.projectParser);
    console.log(`elaborate C ${this.file.uri.pathname} ${Date.now() - start}ms`);

    await this.vhdlLinter.handleCanceled();

    await this.vhdlLinter.handleCanceled();
    elaborateAssociations(this.file);
    await this.vhdlLinter.handleCanceled();
    elaborateAliases(this.file);
    await this.vhdlLinter.handleCanceled();
    console.log(`elaborate D ${this.file.uri.pathname} ${Date.now() - start}ms`);

  }







}