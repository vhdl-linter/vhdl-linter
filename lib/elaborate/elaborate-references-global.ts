// import { implementsIHasLibraries, implementsIHasPorts, implementsIHasUseClause, OArchitecture, ObjectBase, OFile, OReference, scope } from "../parser/objects";
// import { ProjectParser } from "../project-parser";
// import { VhdlLinter } from "../vhdl-linter";

// export function elaborateReferences(file: OFile, projectParser: ProjectParser, vhdlLinter: VhdlLinter) {
//   // This is caching all visible reads from packets for every object that can reference packages/have use clauses
//   const readObjectMap = new Map<ObjectBase, Map<string, ObjectBase>>();
//   for (const object of file.objectList) {
//     if (implementsIHasUseClause(object)) {
//       const innerMap = new Map<string, ObjectBase>();
//       const packages = object.packageDefinitions;
//       for (const pkg of packages) {
//         for (const constant of pkg.constants) {
//           innerMap.set(constant.lexerToken.getLText(), constant);
//         }
//         for (const subprogram of pkg.subprograms) {
//           innerMap.set(subprogram.lexerToken.getLText(), subprogram);
//         }
//         for (const subprogramAlias of pkg.aliases) {
//           innerMap.set(subprogramAlias.lexerToken.getLText(), subprogramAlias);
//         }
//         for (const type of pkg.types) {
//           type.addReadsToMap(innerMap);
//         }
//         for (const generic of pkg.generics) {
//           innerMap.set(generic.lexerToken.getLText(), generic);
//         }
//       }
//       readObjectMap.set(object, innerMap);
//     }
//   }

//   for (const reference of file.objectList.filter(object => object instanceof OReference) as OReference[]) {
//     for (const [object] of scope(reference)) {
//       const match = readObjectMap.get(object)?.get(reference.referenceToken.getLText());
//       if (match) {
//         reference.definitions.push(match);
//       }
//       if (implementsIHasLibraries(object)) {
//         const match = object.libraries.find(library => library.lexerToken.getLText() === reference.referenceToken.getLText());
//         if (match) {
//           reference.definitions.push(match);
//         }
//       }
//     }
//     const rootElement = reference.getRootElement();
//     if (implementsIHasPorts(rootElement)) {
//       for (const port of rootElement.ports) {
//         if (port.lexerToken.getLText() === reference.referenceToken.getLText()) {
//           reference.definitions.push(port);
//           port.references.push(reference);
//         }
//       }
//     } else if (rootElement instanceof OArchitecture) {
//       for (const port of rootElement.correspondingEntity?.ports ?? []) {
//         if (port.lexerToken.getLText() === reference.referenceToken.getLText()) {
//           reference.definitions.push(port);
//           port.references.push(reference);
//         }
//       }
//     }

//     }
//   }
