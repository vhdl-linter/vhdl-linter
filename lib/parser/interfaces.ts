import { TextEdit } from "vscode-languageserver";
import { OLexerToken } from "../lexer";
import { OIDiagnostic } from "../vhdl-linter";
import { OAlias, OAttribute, ObjectBase, OComponent, OConcurrentStatements, OConstant, OContextReference, OFileVariable, OGeneric, OIRange, OLabelReference, OLibrary, OLibraryReference, OPackage, OPackageInstantiation, OPort, OReference, OSequentialStatement, OSignal, OSubprogram, OType, OUseClause, OVariable } from "./objects";

export interface IHasLabel {
  label: OLexerToken;
  labelLinks: OLabelReference[];
}
export interface IMayHaveLabel {
  label?: OLexerToken;
  labelLinks: OLabelReference[];
}
export function implementsIHasLabel(obj: ObjectBase): obj is ObjectBase & IHasLabel {
  return (obj as ObjectBase & Partial<IHasLabel>).label !== undefined && Array.isArray((obj as ObjectBase & IHasLabel).labelLinks);
}
export interface IHasTypeReference {
  typeReference: OReference[];
}
export function implementsIHasTypeReference(obj: ObjectBase): obj is ObjectBase & IHasTypeReference {
  return Array.isArray((obj as ObjectBase & IHasTypeReference).typeReference);
}
export interface IHasDefaultValue {
  defaultValue?: OReference[];
}
export interface IVariableBase extends IHasReferenceLinks, IHasLexerToken, IHasTypeReference, IHasDefaultValue {
  lexerToken: OLexerToken;
}
export interface IHasUseClauses {
  useClauses: OUseClause[];
  packageDefinitions: OPackage[];
}
export interface IHasLexerToken {
  lexerToken: OLexerToken;
}
export interface IMayHaveEndingLexerToken {
  endingLexerToken?: OLexerToken;
}
export interface IHasEndingLexerToken {
  endingLexerToken: OLexerToken;
}
export interface IHasReferenceToken {
  referenceToken: OLexerToken;
}

export interface IHasContextReference {
  contextReferences: OContextReference[];
  packageDefinitions: OPackage[];

}
export function implementsIHasUseClause(obj: ObjectBase): obj is ObjectBase & IHasUseClauses {
  return (obj as ObjectBase & Partial<IHasUseClauses>).useClauses !== undefined;
}
export function implementsIHasLexerToken(obj: ObjectBase): obj is ObjectBase & IHasLexerToken {
  return (obj as ObjectBase & Partial<IHasLexerToken>).lexerToken !== undefined;
}
export function implementsIHasEndingLexerToken(obj: ObjectBase): obj is ObjectBase & IHasEndingLexerToken {
  return (obj as ObjectBase & Partial<IMayHaveEndingLexerToken>).endingLexerToken !== undefined;
}
export function implementsIHasReferenceToken(obj: ObjectBase): obj is ObjectBase & IHasReferenceToken {
  return (obj as ObjectBase & Partial<IHasReferenceToken>).referenceToken !== undefined;
}

export function implementsIHasContextReference(obj: ObjectBase): obj is ObjectBase & IHasContextReference {
  return (obj as ObjectBase & Partial<IHasContextReference>).contextReferences !== undefined;
}
export interface IHasReferenceLinks {
  referenceLinks: OReference[];
  aliasReferences: OAlias[];
}
export function implementsIHasReference(obj: ObjectBase): obj is ObjectBase & IHasReferenceLinks {
  return (obj as ObjectBase & Partial<IHasReferenceLinks>).referenceLinks !== undefined
    && (obj as ObjectBase & Partial<IHasReferenceLinks>).aliasReferences !== undefined;
}
export interface IHasDefinitions {
  definitions: ObjectBase[];
}
export function implementsIHasDefinitions(obj: ObjectBase): obj is ObjectBase & IHasDefinitions {
  return (obj as ObjectBase & Partial<IHasDefinitions>).definitions !== undefined;
}
export function implementsIHasPackageInstantiations(obj: ObjectBase): obj is ObjectBase & IHasPackageInstantiations {
  return (obj as ObjectBase & Partial<IHasPackageInstantiations>).packageInstantiations !== undefined;
}
export interface IHasPackageInstantiations {
  packageInstantiations: OPackageInstantiation[];
}
export interface IHasSubprograms {
  subprograms: OSubprogram[];
}
export function implementsIHasSubprograms(obj: ObjectBase): obj is ObjectBase & IHasSubprograms {
  return (obj as ObjectBase & Partial<IHasSubprograms>).subprograms !== undefined;
}
export interface IHasTypes {
  types: OType[];
}
export function implementsIHasTypes(obj: ObjectBase): obj is ObjectBase & IHasTypes {
  return (obj as ObjectBase & Partial<IHasTypes>).types !== undefined;
}
export interface IHasAliases {
  aliases: OAlias[];
}
export function implementsIHasAliases(obj: ObjectBase): obj is ObjectBase & IHasAliases {
  return (obj as ObjectBase & Partial<IHasAliases>).aliases !== undefined;
}
export interface IHasComponents {
  components: OComponent[];
}
export function implementsIHasComponents(obj: ObjectBase): obj is ObjectBase & IHasComponents {
  return (obj as ObjectBase & Partial<IHasComponents>).components !== undefined;
}


export interface IHasSignals {
  signals: OSignal[];
}
export interface IHasFileVariables {
  files: OFileVariable[];
}
export function implementsIHasFileVariables(obj: ObjectBase): obj is ObjectBase & IHasFileVariables {
  return (obj as ObjectBase & Partial<IHasFileVariables>).files !== undefined;
}
export function implementsIHasSignals(obj: ObjectBase): obj is ObjectBase & IHasSignals {
  return (obj as ObjectBase & Partial<IHasSignals>).signals !== undefined;
}
export interface IHasConstants {
  constants: OConstant[];
}
export function implementsIHasConstants(obj: ObjectBase): obj is ObjectBase & IHasConstants {
  return (obj as ObjectBase & Partial<IHasConstants>).constants !== undefined;
}
export interface IHasVariables {
  variables: OVariable[];
}
export function implementsIHasVariables(obj: ObjectBase): obj is ObjectBase & IHasVariables {
  return (obj as ObjectBase & Partial<IHasVariables>).variables !== undefined;
}
export interface IHasLibraries {
  libraries: OLibrary[];
}
export function implementsIHasLibraries(obj: ObjectBase): obj is ObjectBase & IHasLibraries {
  return (obj as ObjectBase & Partial<IHasLibraries>).libraries !== undefined;
}
export interface IHasAttributes {
  attributes: OAttribute[];
}
export function implementsIHasAttributes(obj: ObjectBase): obj is ObjectBase & IHasAttributes {
  return (obj as ObjectBase & Partial<IHasAttributes>).attributes !== undefined;
}
export interface IHasLibraryReference {
  library?: OLibraryReference;
}
export function implementsIHasLibraryReference(obj: ObjectBase): obj is ObjectBase & IHasLibraryReference {
  return (obj as ObjectBase & Partial<IHasLibraryReference>).library !== undefined;
}
export interface IHasGenerics {
  generics: OGeneric[];
  genericRange?: OIRange;
}
export function implementsIHasGenerics(obj: ObjectBase): obj is ObjectBase & IHasGenerics {
  return (obj as ObjectBase & Partial<IHasGenerics>).generics !== undefined;
}
export interface IHasPorts {
  ports: OPort[];
  portRange?: OIRange;
}
export function implementsIHasPorts(obj: ObjectBase): obj is ObjectBase & IHasPorts {
  return (obj as ObjectBase & Partial<IHasPorts>).ports !== undefined;
}
export interface IHasStatements {
  statements: (OConcurrentStatements | OSequentialStatement)[];
}
export function implementsIHasStatements(obj: ObjectBase): obj is ObjectBase & IHasStatements {
  return Array.isArray((obj as ObjectBase & Partial<IHasStatements>).statements);
}

export interface OIDiagnosticWithSolution extends OIDiagnostic {
  solution?: { message: string, edits: TextEdit[] };
}
