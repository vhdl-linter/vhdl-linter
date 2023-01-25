import { DiagnosticSeverity } from "vscode-languageserver";
import { OLexerToken } from "../lexer";
import { IHasLexerToken, implementsIHasConstants, implementsIHasGenerics, implementsIHasInstantiations, implementsIHasLabel, implementsIHasLexerToken, implementsIHasPorts, implementsIHasSignals, implementsIHasTypes, implementsIHasVariables } from "../parser/interfaces";
import { OArchitecture, ObjectBase, OFile, OPackageBody, OType } from "../parser/objects";
import { IRule, RuleBase } from "./rules-base";
type objListType = ObjectBase | { lexerToken: OLexerToken };
export class RMultipleDefinition extends RuleBase implements IRule {
  public name = 'multiple-definition';
  file: OFile;
  checkMultipleDefinitions(objList: objListType[]) {
    for (const obj of objList) {
      if (implementsIHasLexerToken(obj as ObjectBase) && objList.find(o => {
        if (obj.lexerToken !== o.lexerToken && obj.lexerToken?.getLText() === o.lexerToken?.getLText()) { // Object has same token but is not itself
          if (obj instanceof OType && o instanceof OType) { // Special handling for protected type and protected type body
            if (obj.protected && o.protectedBody || obj.protectedBody && o.protected) {
              return false;
            }
          }
          return true;
        }
        return false;
      })) {
        this.addMessage({
          range: (obj as IHasLexerToken).lexerToken.range,
          severity: DiagnosticSeverity.Error,
          message: `${(obj as IHasLexerToken).lexerToken.text} defined multiple times`
        });
      }
    }
  }
  extractObjects (obj: ObjectBase) {
    const objList: ObjectBase[] = [];
    if (implementsIHasSignals(obj)) {
      objList.push(...obj.signals);
    }
    if (implementsIHasVariables(obj)) {
      objList.push(...obj.variables);
    }
    if (implementsIHasConstants(obj)) {
      objList.push(...obj.constants);
    }


    // if ()
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
      objList.push(...obj.statements);
    }
    return objList;
  }
  async check() {
    for (const obj of this.file.objectList) {
      const objList = new Set<ObjectBase>();
      this.extractObjects(obj).forEach(obj => objList.add(obj));
      if (obj instanceof OArchitecture && obj.correspondingEntity) {
        this.extractObjects(obj.correspondingEntity).forEach(obj => objList.add(obj));
      }
      if (obj instanceof OPackageBody && obj.correspondingPackage) {
        obj.correspondingPackage.generics.forEach(obj => objList.add(obj));
      }
      this.checkMultipleDefinitions([...objList.values()].map(obj => {
        if (implementsIHasLabel(obj)) {
          return { lexerToken: obj.label };
        }
        return obj;
      }));
    }
  }
}