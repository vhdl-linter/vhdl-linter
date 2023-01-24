import { DiagnosticSeverity } from "vscode-languageserver/node";
import { OFile, OPackage, OPackageBody } from "../parser/objects";
import { VhdlLinter } from "../vhdl-linter";
import { elaborateAliases } from "./elaborate-aliases";
import { elaborateAssociations } from "./elaborate-association";
import { elaborateComponents } from "./elaborate-components";
import { elaborateInstantiations } from "./elaborate-instantiations";
import { ElaborateReferences } from "./elaborate-references";
import { elaborateUseClauses } from "./elaborate-use-clauses";

export class Elaborate {
  file: OFile;
  private constructor(public vhdlLinter: VhdlLinter) {
    this.file = vhdlLinter.file;
  }
  public static async elaborate(vhdlLinter: VhdlLinter) {
    const elaborator = new Elaborate(vhdlLinter);
    await elaborator.elaborateAll();
  }
  async elaborateAll() {

    await this.vhdlLinter.handleCanceled();

    // const start = Date.now();
    // Map architectures to entity
    for (const architecture of this.file.architectures) {
      if (architecture.entityName === undefined) {
        continue;
      }
      // Find entity first in this file
      let entity = this.file.entities.find(entity => entity.lexerToken.getLText() === architecture.entityName?.getLText());
      if (!entity) { // Find entity in all files
        entity = this.vhdlLinter.projectParser.entities.find(entity => entity.lexerToken.getLText() === architecture.entityName?.getLText());
      }
      if (entity) {
        architecture.correspondingEntity = entity;
      }

    }
    // Map package body to package
    for (const pkg of this.file.packages) {
      if (pkg instanceof OPackageBody) {

        // Find entity first in this file
        let pkgHeader: OPackage | undefined = this.file.packages.find(pkgHeader => pkgHeader instanceof OPackage && pkgHeader.lexerToken.getLText() === pkg.lexerToken.getLText()) as OPackage | undefined;
        if (!pkgHeader) { // Find entity in all files
          pkgHeader = this.vhdlLinter.projectParser.packages.find(pkgHeader => pkgHeader instanceof OPackage && pkgHeader.lexerToken.getLText() === pkg.lexerToken.getLText()) as OPackage | undefined;
        }
        if (pkgHeader) {
          pkg.correspondingPackage = pkgHeader;
        } else {
          this.vhdlLinter.addMessage({
            range: pkg.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `Can not find package for package body.`
          }, 'elaborate');
        }

      }
    }
    //     console.log(packages);
    elaborateUseClauses(this.file, this.vhdlLinter.projectParser, this.vhdlLinter);
    await this.vhdlLinter.handleCanceled();
    //     console.log(packages);
    // elaborateReferences(this.file);


    // console.log(`elaboration: reads for: ${Date.now() - start} ms.`);
    // start = Date.now();
    await this.vhdlLinter.handleCanceled();
    elaborateComponents(this.file, this.vhdlLinter.projectParser);
    await this.vhdlLinter.handleCanceled();
    elaborateInstantiations(this.file, this.vhdlLinter.projectParser);

    // console.log(`elaboration: instantiations for: ${Date.now() - start} ms.`);
    // start = Date.now();
    await this.vhdlLinter.handleCanceled();

    // console.log(`elaboration: components for: ${Date.now() - start} ms.`);
    // start = Date.now();
    await this.vhdlLinter.handleCanceled();
    ElaborateReferences.elaborate(this.vhdlLinter);
    await this.vhdlLinter.handleCanceled();
    elaborateAssociations(this.file);
    await this.vhdlLinter.handleCanceled();
    elaborateAliases(this.file);
    // console.log(`elaboration: associations for: ${Date.now() - start} ms.`);
    // start = Date.now();
    await this.vhdlLinter.handleCanceled();

  }







}