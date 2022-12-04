import { TextEdit } from "vscode-languageserver";
import { OLexerToken } from "../lexer";
import { OIDiagnostic } from "../vhdl-linter";
import { OReference, OUseClause, OPackage, OContextReference, ObjectBase, OAlias, OPackageInstantiation, OSubprogram, OType, OComponent, OInstantiation, OIfGenerate, OForGenerate, OSignal, OFileVariable, OConstant, OVariable, OLibrary, OGeneric, OIRange, OPort, OLabelReference } from "./objects";

export interface IHasLabel {
  label: OLexerToken;
  labelReferences: OLabelReference[];
}
export interface IMayHaveLabel {
  label?: OLexerToken;
  labelReferences: OLabelReference[];
}
export function implementsIHasLabel(obj: ObjectBase): obj is ObjectBase & IHasLabel {
  return (obj as ObjectBase & IHasLabel).label !== undefined;
}
export interface IHasTypeReference {
  typeReference: OReference[];
}
export interface IHasDefaultValue {
  defaultValue?: OReference[];
}
export interface IVariableBase extends IHasReferences, IHasLexerToken, IHasTypeReference, IHasDefaultValue {
  lexerToken: OLexerToken;
}
export interface IHasUseClauses {
  useClauses: OUseClause[];
  packageDefinitions: OPackage[];
}
export interface IHasLexerToken {
  lexerToken: OLexerToken;
}
export interface IHasReferenceToken {
  referenceToken: OLexerToken;
}

export interface IHasContextReference {
  contextReferences: OContextReference[];
  packageDefinitions: OPackage[];

}
export function implementsIHasUseClause(obj: ObjectBase): obj is ObjectBase & IHasUseClauses {
  return (obj as ObjectBase & IHasUseClauses).useClauses !== undefined;
}
export function implementsIHasLexerToken(obj: ObjectBase): obj is ObjectBase & IHasLexerToken {
  return (obj as ObjectBase & IHasLexerToken).lexerToken !== undefined;
}
export function implementsIHasReferenceToken(obj: ObjectBase): obj is ObjectBase & IHasReferenceToken {
  return (obj as ObjectBase & IHasReferenceToken).referenceToken !== undefined;
}

export function implementsIHasContextReference(obj: ObjectBase): obj is ObjectBase & IHasContextReference {
  return (obj as ObjectBase & IHasContextReference).contextReferences !== undefined;
}
export interface IHasReferences {
  references: OReference[];
  aliasReferences: OAlias[];
}
export function implementsIHasReference(obj: ObjectBase): obj is ObjectBase & IHasReferences {
  return (obj as ObjectBase & IHasReferences).references !== undefined
    && (obj as ObjectBase & IHasReferences).aliasReferences !== undefined;
}
export interface IHasDefinitions {
  definitions: ObjectBase[];
}
export function implementsIHasDefinitions(obj: ObjectBase): obj is ObjectBase & IHasDefinitions {
  return (obj as ObjectBase & IHasDefinitions).definitions !== undefined;
}
export function implementsIHasPackageInstantiations(obj: ObjectBase): obj is ObjectBase & IHasPackageInstantiations {
  return (obj as ObjectBase & IHasPackageInstantiations).packageInstantiations !== undefined;
}
export interface IHasPackageInstantiations {
  packageInstantiations: OPackageInstantiation[];
}
export interface IHasSubprograms {
  subprograms: OSubprogram[];
}
export function implementsIHasSubprograms(obj: ObjectBase): obj is ObjectBase & IHasSubprograms {
  return (obj as ObjectBase & IHasSubprograms).subprograms !== undefined;
}
export interface IHasTypes {
  types: OType[];
}
export function implementsIHasTypes(obj: ObjectBase): obj is ObjectBase & IHasTypes {
  return (obj as ObjectBase & IHasTypes).types !== undefined;
}
export interface IHasAliases {
  aliases: OAlias[];
}
export function implementsIHasAliases(obj: ObjectBase): obj is ObjectBase & IHasAliases {
  return (obj as ObjectBase & IHasAliases).aliases !== undefined;
}
export interface IHasComponents {
  components: OComponent[];
}
export function implementsIHasComponents(obj: ObjectBase): obj is ObjectBase & IHasComponents {
  return (obj as ObjectBase & IHasComponents).components !== undefined;
}
export interface IHasInstantiations {
  instantiations: OInstantiation[];
}
export function implementsIHasInstantiations(obj: ObjectBase): obj is ObjectBase & IHasInstantiations {
  return (obj as ObjectBase & IHasInstantiations).instantiations !== undefined;
}
export interface IHasIfGenerates {
  ifGenerates: OIfGenerate[];
}
export function implementsIHasIfGenerates(obj: ObjectBase): obj is ObjectBase & IHasIfGenerates {
  return (obj as ObjectBase & IHasIfGenerates).ifGenerates !== undefined;
}
export interface IHasForGenerates {
  forGenerates: OForGenerate[];
}
export function implementsIHasForGenerates(obj: ObjectBase): obj is ObjectBase & IHasForGenerates {
  return (obj as ObjectBase & IHasForGenerates).forGenerates !== undefined;
}
export interface IHasSignals {
  signals: OSignal[];
}
export interface IHasFileVariables {
  files: OFileVariable[];
}
export function implementsIHasFileVariables(obj: ObjectBase): obj is ObjectBase & IHasFileVariables {
  return (obj as ObjectBase & IHasFileVariables).files !== undefined;
}
export function implementsIHasSignals(obj: ObjectBase): obj is ObjectBase & IHasSignals {
  return (obj as ObjectBase & IHasSignals).signals !== undefined;
}
export interface IHasConstants {
  constants: OConstant[];
}
export function implementsIHasConstants(obj: ObjectBase): obj is ObjectBase & IHasConstants {
  return (obj as ObjectBase & IHasConstants).constants !== undefined;
}
export interface IHasVariables {
  variables: OVariable[];
}
export function implementsIHasVariables(obj: ObjectBase): obj is ObjectBase & IHasVariables {
  return (obj as ObjectBase & IHasVariables).variables !== undefined;
}
export interface IHasLibraries {
  libraries: OLibrary[];
}
export function implementsIHasLibraries(obj: ObjectBase): obj is ObjectBase & IHasLibraries {
  return (obj as ObjectBase & IHasLibraries).libraries !== undefined;
}
export interface IHasLibraryReference {
  library?: OLexerToken;
}
export function implementsIHasLibraryReference(obj: ObjectBase): obj is ObjectBase & IHasLibraryReference {
  return (obj as ObjectBase & IHasLibraryReference).library !== undefined;
}
export interface IHasGenerics {
  generics: OGeneric[];
  genericRange?: OIRange;
}
export function implementsIHasGenerics(obj: ObjectBase): obj is ObjectBase & IHasGenerics {
  return (obj as ObjectBase & IHasGenerics).generics !== undefined;
}
export interface IHasPorts {
  ports: OPort[];
  portRange?: OIRange;
}
export function implementsIHasPorts(obj: ObjectBase): obj is ObjectBase & IHasPorts {
  return (obj as ObjectBase & IHasPorts).ports !== undefined;
}
export interface OIDiagnosticWithSolution extends OIDiagnostic {
  solution?: { message: string, edits: TextEdit[] };
}