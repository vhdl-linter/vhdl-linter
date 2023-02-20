import { DiagnosticSeverity } from "vscode-languageserver";
import { OLexerToken } from "../lexer";
import * as I from "../parser/interfaces";
import { OArchitecture, OAttributeDeclaration, ObjectBase, OConstant, OFile, OPackageBody, OSignal, OType, OVariable } from "../parser/objects";
import { IRule, RuleBase } from "./rules-base";
type objListType = ObjectBase | { lexerToken: OLexerToken };
export class RMultipleDefinition extends RuleBase implements IRule {
  public static readonly ruleName = 'multiple-definition';
  file: OFile;
  checkMultipleDefinitions(objList: objListType[]) {
    for (const obj of objList) {
      if (I.implementsIHasLexerToken(obj as ObjectBase) && objList.find(o => {
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
          range: (obj as I.IHasLexerToken).lexerToken.range,
          severity: DiagnosticSeverity.Error,
          message: `${(obj as I.IHasLexerToken).lexerToken.text} defined multiple times`
        });
      }
    }
  }
  extractObjects (obj: ObjectBase) {
    const objList: ObjectBase[] = [];
    if (I.implementsIHasDeclarations(obj)) {
      for (const declaration of obj.declarations) {
        if (declaration instanceof OType) {
          if (declaration.alias) { // Aliases can be overloaded like subprograms.
            continue;
          }
          if (declaration.incomplete) { // Incomplete types can be overloaded
            continue;
          }
          objList.push(declaration);
        } else if (declaration instanceof OSignal
          || declaration instanceof OVariable
          || declaration instanceof OConstant
          || declaration instanceof OAttributeDeclaration
          ) {
          objList.push(declaration);
        }
      }
    }



    if (I.implementsIHasStatements(obj)) {
      objList.push(...obj.statements);
    }
    if (I.implementsIHasPorts(obj)) {
      objList.push(...obj.ports);
    }
    if (I.implementsIHasGenerics(obj)) {
      objList.push(...obj.generics);
    }
    return objList;
  }
  check() {
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
        if (I.implementsIHasLabel(obj)) {
          return { lexerToken: obj.label };
        }
        return obj;
      }));
    }
  }
}