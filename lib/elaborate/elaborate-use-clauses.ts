import { DiagnosticSeverity } from "vscode-languageserver/node";
import { implementsIHasUseClause, implementsIHasContextReference, scope, implementsIHasPackageInstantiations, OPackage, IHasContextReference, IHasUseClauses, OArchitecture, ObjectBase, OFile, OPackageBody } from "../parser/objects";
import { ProjectParser } from "../project-parser";
import { VhdlLinter } from "../vhdl-linter";

export function elaborateUseClauses(file: OFile, projectParser: ProjectParser, vhdlLinter: VhdlLinter) {

  const packages = projectParser.packages;
  const packageInstantiations = projectParser.packageInstantiations;

  for (const obj of file.objectList) {
    if (implementsIHasUseClause(obj) || implementsIHasContextReference(obj)) {
      for (const useClause of getUseClauses(obj, vhdlLinter, projectParser)) {
        let found = false;
        // if library is defined, uses a "normal" Package; i.e. not an uninstantiated package
        // or an instantiated package
        if (useClause.library !== undefined) {
          for (const foundPkg of packages) {
            if (foundPkg.lexerToken.getLText() === useClause.packageName.getLText()) {
              obj.packageDefinitions.push(foundPkg);
              found = true;
            }
          }

          for (const foundPkg of packageInstantiations) {
            if (foundPkg.lexerToken.getLText() === useClause.packageName.getLText()) {
              found = true;
              const uninstantiatedPackage = packages.find(p => p.lexerToken.getLText() === foundPkg.uninstantiatedPackageToken.getLText());
              if (uninstantiatedPackage) {
                obj.packageDefinitions.push(uninstantiatedPackage);
              } else {
                vhdlLinter.addMessage({
                  range: useClause.range,
                  severity: DiagnosticSeverity.Warning,
                  message: `could not find instantiated package from package ${useClause.library}.${useClause.packageName}`
                });
                break;
              }
            }
          }
        } else { // if using package directly, it is an instantiated package
          const pkgInstantations = [];
          // go through scope to find all package instantiations
          for (const [iterator] of scope(obj)) {
            if (implementsIHasPackageInstantiations(iterator)) {
              pkgInstantations.push(...iterator.packageInstantiations);
            }
          }

          const packageInstantiation = pkgInstantations.find(inst => inst.lexerToken.getLText() === useClause.packageName.getLText());
          if (!packageInstantiation) {
            found = true;
            if (useClause.rootFile.file === file.file) {
              vhdlLinter.addMessage({
                range: useClause.range,
                severity: DiagnosticSeverity.Warning,
                message: `could not find package instantiation for ${useClause.packageName}`
              });
            } else {
              vhdlLinter.addMessage({
                range: obj.getRootElement().range.getLimitedRange(1),
                severity: DiagnosticSeverity.Warning,
                message: `could not find package instantiation for ${useClause.packageName} (in ${useClause.rootFile.file})`
              });
            }
            continue;
          }
          const uninstantiatedPackage = (packages.filter(p => p instanceof OPackage) as OPackage[]).find(p => p.lexerToken.getLText() === packageInstantiation.uninstantiatedPackageToken.text.toLowerCase());
          if (uninstantiatedPackage) {
            obj.packageDefinitions.push(uninstantiatedPackage);
            found = true;

          } else {
            vhdlLinter.addMessage({
              range: useClause.range,
              severity: DiagnosticSeverity.Warning,
              message: `could not find uninstantiated package of package instantiation ${packageInstantiation.lexerToken.text}.`
            });
          }
        }
        if (!found) {
          if (useClause.rootFile.file === file.file) {
            vhdlLinter.addMessage({
              range: useClause.range,
              severity: DiagnosticSeverity.Warning,
              message: `could not find package for ${useClause.library !== undefined ? `${useClause.library}.` : ''}${useClause.packageName}`
            });
          }
        }
      }
    }
  }
}
function getUseClauses(parent: ObjectBase & (IHasUseClauses | IHasContextReference), vhdlLinter: VhdlLinter, projectParser: ProjectParser) {
  const useClauses = implementsIHasUseClause(parent) ? parent.useClauses.slice() : [];
  const contextReferences = implementsIHasContextReference(parent) ? parent.contextReferences.slice() : [];
  if (parent instanceof OPackageBody && parent.correspondingPackage) {
    useClauses.push(...parent.correspondingPackage.useClauses);
    contextReferences.push(...parent.correspondingPackage.contextReferences);
  } else if (parent instanceof OArchitecture && parent.correspondingEntity) {
    useClauses.push(...parent.correspondingEntity.useClauses);
    contextReferences.push(...parent.correspondingEntity.contextReferences);
  }
  if (contextReferences.length > 0) {
    const contexts = projectParser.contexts;
    for (const reference of contextReferences) {
      const context = contexts.find(c => c.lexerToken.getLText() === reference.contextName.toLowerCase());
      if (!context) {
        vhdlLinter.addMessage({
          range: reference.range,
          severity: DiagnosticSeverity.Warning,
          message: `could not find context for ${reference.library}.${reference.contextName}`
        });
      } else {
        reference.definitions.push(context);
        useClauses.push(...getUseClauses(context, vhdlLinter, projectParser));
      }
    }
  }
  return useClauses;
}