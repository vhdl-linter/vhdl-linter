import { RuleBase, IRule } from "./rules-base";
import { DiagnosticSeverity } from "vscode-languageserver";
import { implementsIHasConstants, implementsIHasGenerics, implementsIHasInstantiations, implementsIHasLexerToken, implementsIHasPorts, implementsIHasSignals, implementsIHasTypes, implementsIHasVariables, OArchitecture, ObjectBase, OFile, OPackageBody } from "../parser/objects";

export class RMultipleDefinition extends RuleBase implements IRule {
  public name = 'multiple-definition';
  file: OFile;
  checkMultipleDefinitions(objList: ObjectBase[]) {
    for (const obj of objList) {
      if (implementsIHasLexerToken(obj) && objList.find(o => obj !== o && obj.lexerTokenEquals(o))) {
        this.addMessage({
          range: obj.range,
          severity: DiagnosticSeverity.Error,
          message: `${obj.lexerToken.text} defined multiple times`
        });
      }
    }
  }
  async check() {
    const extractObjects = (obj: ObjectBase) => {
      const objList = [];
      if (implementsIHasSignals(obj)) {
        objList.push(...obj.signals);
      }
      if (implementsIHasVariables(obj)) {
        objList.push(...obj.variables);
      }
      if (implementsIHasConstants(obj)) {
        objList.push(...obj.constants);
      }
      // subprograms can be overloaded
      if (implementsIHasTypes(obj)) {
        for (const type of obj.types) {
          if (type.alias) { // Aliases can be overloaded like subprograms.
            continue;
          }
          if (type.incomplete) { // Incomplete types can be overloaded
            continue;
          }
          objList.push(type);
        }
      }
      if (implementsIHasInstantiations(obj)) {
        objList.push(...obj.instantiations);
      }
      if (implementsIHasPorts(obj)) {
        objList.push(...obj.ports);
      }
      if (implementsIHasGenerics(obj)) {
        objList.push(...obj.generics);
      }
      if (obj instanceof OArchitecture) {
        objList.push(...obj.blocks);
        objList.push(...obj.generates);
        objList.push(...obj.processes);
      }
      return objList;
    }
    for (const obj of this.file.objectList) {
      const objList: ObjectBase[] = [];
      objList.push(...extractObjects(obj));
      if (obj instanceof OArchitecture && obj.correspondingEntity) {
        objList.push(...extractObjects(obj.correspondingEntity));
      }
      if (obj instanceof OPackageBody && obj.correspondingPackage) {
        objList.push(...obj.correspondingPackage.generics);
      }
      this.checkMultipleDefinitions(objList);
    }
  }
}