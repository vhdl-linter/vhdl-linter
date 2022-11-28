import { DiagnosticSeverity } from "vscode-languageserver/node";
import { ObjectBase, implementsIHasUseClause, ORead, scope, implementsIHasLibraries, implementsIHasPorts, OArchitecture, OSelectedNameRead, OPackage, implementsIHasPackageInstantiations, implementsIHasVariables, OFile } from "../parser/objects";
import { ProjectParser } from "../project-parser";
import { VhdlLinter } from "../vhdl-linter";

export function elaborateGlobalReads(file: OFile, projectParser: ProjectParser, vhdlLinter: VhdlLinter) {
  // This is caching all visible reads from packets for every object that can reference packages/have use clauses
  const readObjectMap = new Map<ObjectBase, Map<string, ObjectBase>>();
  for (const object of file.objectList) {
    if (implementsIHasUseClause(object)) {
      const innerMap = new Map<string, ObjectBase>();
      const packages = object.packageDefinitions;
      for (const pkg of packages) {
        for (const constant of pkg.constants) {
          innerMap.set(constant.lexerToken.getLText(), constant);
        }
        for (const subprogram of pkg.subprograms) {
          innerMap.set(subprogram.lexerToken.getLText(), subprogram);
        }
        for (const subprogramAlias of pkg.subprogramAliases) {
          innerMap.set(subprogramAlias.lexerToken.getLText(), subprogramAlias);
        }
        for (const type of pkg.types) {
          type.addReadsToMap(innerMap);
        }
        for (const generic of pkg.generics) {
          innerMap.set(generic.lexerToken.getLText(), generic);
        }
      }
      readObjectMap.set(object, innerMap);
    }
  }

  for (const read of file.objectList.filter(object => object instanceof ORead) as ORead[]) {
    for (const [object] of scope(read)) {
      const match = readObjectMap.get(object)?.get(read.referenceToken.getLText());
      if (match) {
        read.definitions.push(match);
      }
      if (implementsIHasLibraries(object)) {
        const match = object.libraries.find(library => library.lexerToken.getLText() === read.referenceToken.getLText())
        if (match) {
          read.definitions.push(match);
        }
      }
    }
    const rootElement = read.getRootElement();
    if (implementsIHasPorts(rootElement)) {
      for (const port of rootElement.ports) {
        if (port.lexerToken.getLText() === read.referenceToken.getLText()) {
          read.definitions.push(port);
          port.references.push(read);
        }
      }
    } else if (rootElement instanceof OArchitecture) {
      for (const port of rootElement.correspondingEntity?.ports ?? []) {
        if (port.lexerToken.getLText() === read.referenceToken.getLText()) {
          read.definitions.push(port);
          port.references.push(read);
        }
      }
    }
    if (read instanceof OSelectedNameRead) {
      if (read.prefixTokens.length === 2) {
        const [libraryToken, pkgToken] = read.prefixTokens;
        let library;
        for (const [obj] of scope(read)) {
          if (implementsIHasLibraries(obj)) {
            for (const findLibrary of obj.libraries) {
              if (findLibrary.lexerToken.getLText() == libraryToken.getLText()) {
                library = findLibrary;
              }
            }
          }
        }
        if (library) {
          for (const pkg of projectParser.packages) {
            if (pkg.lexerToken.getLText() === pkgToken.getLText()) {
              for (const constant of pkg.constants) {
                if (constant.lexerToken.getLText() === read.lexerToken.getLText()) {
                  read.definitions.push(constant);
                }
              }
              for (const subprogram of pkg.subprograms) {
                if (subprogram.lexerToken.getLText() === read.lexerToken.getLText()) {
                  read.definitions.push(subprogram);
                }
              }
              for (const generic of pkg.generics) {
                if (generic.lexerToken.getLText() === read.lexerToken.getLText()) {
                  read.definitions.push(generic);
                }
              }
              for (const type of pkg.types) {
                const map = new Map();
                type.addReadsToMap(map);
                const definition = map.get(read.lexerToken.getLText());
                if (definition) {
                  read.definitions.push(definition)
                }
              }

            }
          }
        }

      } else if (read.prefixTokens.length === 1) {
        // If first token is library this is referencing a package
        // Otherwise object from package
        let library;
        for (const [obj] of scope(read)) {
          if (implementsIHasLibraries(obj)) {
            for (const findLibrary of obj.libraries) {
              if (findLibrary.lexerToken.getLText() == read.prefixTokens[0].getLText()) {
                library = findLibrary;
              }
            }
          }
        }
        if (library) {
          for (const pkg of projectParser.packages) {
            if (read.lexerToken.getLText() === pkg.lexerToken.getLText()) {
              read.definitions.push(pkg);
            }
          }
          for (const pkg of projectParser.packageInstantiations) {
            if (read.lexerToken.getLText() === pkg.lexerToken.getLText()) {
              read.definitions.push(pkg);
            }
          }
        } else {
          const packages: OPackage[] = [];
          for (const [obj] of scope(read)) {
            if (implementsIHasPackageInstantiations(obj)) {
              for (const pkgInst of obj.packageInstantiations) {
                if (pkgInst.lexerToken?.getLText() === read.prefixTokens[0].getLText()) {
                  const pkg = projectParser.packages.filter(pkg => pkg.lexerToken.getLText() === pkgInst.uninstantiatedPackageToken.getLText());
                  packages.push(...pkg);
                }
              }
            }
          }
          for (const pkg of packages) {
            for (const constant of pkg.constants) {
              if (constant.lexerToken.getLText() === read.lexerToken.getLText()) {
                read.definitions.push(constant);
              }
            }
            for (const subprogram of pkg.subprograms) {
              if (subprogram.lexerToken.getLText() === read.lexerToken.getLText()) {
                read.definitions.push(subprogram);
              }
            }
            for (const generic of pkg.generics) {
              if (generic.lexerToken.getLText() === read.lexerToken.getLText()) {
                read.definitions.push(generic);
              }
            }
            for (const type of pkg.types) {
              const map = new Map();
              type.addReadsToMap(map);
              const definition = map.get(read.lexerToken.getLText());
              if (definition) {
                read.definitions.push(definition)
              }
            }
          }
          for (const [obj] of scope(read)) {
            if (implementsIHasVariables(obj)) {
              for (const variable of obj.variables) {
                // TODO: Find out way to check for proteced
                if (variable.lexerToken.getLText() === read.prefixTokens[0].getLText()) {
                  // TODO: Link the actual subprogramm
                  read.definitions.push(variable);
                }
              }
            }
          }
        }
      } else {
        vhdlLinter.addMessage({
          range: read.range,
          severity: DiagnosticSeverity.Warning,
          message: `selected name found with ${read.prefixTokens.length} prefixes. This is unexpected.`
        });
      }
    }
  }
}