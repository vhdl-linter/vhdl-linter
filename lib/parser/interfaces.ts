import { OLexerToken } from "../lexer";
import * as O from './objects';
export interface IHasLabel {
  label: OLexerToken;
  lexerToken: undefined;
  labelLinks: O.OLabelReference[];
}
export interface IMayHaveLabel {
  label?: OLexerToken;
  labelLinks: O.OLabelReference[];
}
export function implementsIHasLabel(obj: O.ObjectBase): obj is O.ObjectBase & IHasLabel {
  return (obj as O.ObjectBase & Partial<IHasLabel>).label !== undefined && Array.isArray((obj as O.ObjectBase & IHasLabel).labelLinks);
}
export interface IHasPostponed {
  postponed: boolean;
}
export function implementsIHasPostponed(obj: O.ObjectBase): obj is O.ObjectBase & IHasPostponed {
  return (obj as O.ObjectBase & Partial<IHasPostponed>).postponed !== undefined;
}
export interface IHasTypeReference {
  typeReference: O.OReference[];
}
export function implementsIHasTypeReference(obj: O.ObjectBase): obj is O.ObjectBase & IHasTypeReference {
  return Array.isArray((obj as O.ObjectBase & IHasTypeReference).typeReference);
}
export interface IHasDefaultValue {
  defaultValue?: O.OReference[];
}
export interface IVariableBase extends IHasReferenceLinks, IHasLexerToken, IHasTypeReference, IHasDefaultValue {
  lexerToken: OLexerToken;
}
export interface IHasUseClauses {
  useClauses: O.OUseClause[];
  packageDefinitions: O.OPackage[];
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
  lexerToken: undefined;
}

export interface IHasContextReference {
  contextReferences: O.OContextReference[];
  packageDefinitions: O.OPackage[];

}
export function implementsIHasUseClause(obj: O.ObjectBase): obj is O.ObjectBase & IHasUseClauses {
  return (obj as O.ObjectBase & Partial<IHasUseClauses>).useClauses !== undefined;
}
export function implementsIHasLexerToken(obj: O.ObjectBase): obj is O.ObjectBase & IHasLexerToken {
  return (obj as O.ObjectBase & Partial<IHasLexerToken>).lexerToken !== undefined;
}
export function implementsIHasEndingLexerToken(obj: O.ObjectBase): obj is O.ObjectBase & IHasEndingLexerToken {
  return (obj as O.ObjectBase & Partial<IMayHaveEndingLexerToken>).endingLexerToken !== undefined;
}
export function implementsIHasReferenceToken(obj: O.ObjectBase): obj is O.ObjectBase & IHasReferenceToken {
  return (obj as O.ObjectBase & Partial<IHasReferenceToken>).referenceToken !== undefined;
}

export function implementsIHasContextReference(obj: O.ObjectBase): obj is O.ObjectBase & IHasContextReference {
  return (obj as O.ObjectBase & Partial<IHasContextReference>).contextReferences !== undefined;
}
export interface IHasReferenceLinks {
  referenceLinks: O.OReference[];
  aliasReferences: O.OAlias[];
}
export function implementsIHasReference(obj: O.ObjectBase): obj is O.ObjectBase & IHasReferenceLinks {
  return (obj as O.ObjectBase & Partial<IHasReferenceLinks>).referenceLinks !== undefined
    && (obj as O.ObjectBase & Partial<IHasReferenceLinks>).aliasReferences !== undefined;
}
export interface IHasDefinitions {
  definitions: O.ObjectBase[];
}
export function implementsIHasDefinitions(obj: O.ObjectBase): obj is O.ObjectBase & IHasDefinitions {
  return (obj as O.ObjectBase & Partial<IHasDefinitions>).definitions !== undefined;
}


export interface IHasDeclarations {
  declarations: O.ODeclaration[];
  declarationsRange?: O.OIRange;
}
export function implementsIHasDeclarations(obj: O.ObjectBase): obj is O.ObjectBase & IHasDeclarations {
  return (obj as O.ObjectBase & Partial<IHasDeclarations>).declarations !== undefined;
}

export interface IHasLibraries {
  libraries: O.OLibrary[];
}
export function implementsIHasLibraries(obj: O.ObjectBase): obj is O.ObjectBase & IHasLibraries {
  return (obj as O.ObjectBase & Partial<IHasLibraries>).libraries !== undefined;
}

export interface IHasLibraryReference {
  library?: O.OLibraryReference;
}
export function implementsIHasLibraryReference(obj: O.ObjectBase): obj is O.ObjectBase & IHasLibraryReference {
  return (obj as O.ObjectBase & Partial<IHasLibraryReference>).library !== undefined;
}
export interface IHasGenerics {
  generics: O.OGeneric[];
  genericRange?: O.OIRange;
}
export function implementsIHasGenerics(obj: O.ObjectBase): obj is O.ObjectBase & IHasGenerics {
  return (obj as O.ObjectBase & Partial<IHasGenerics>).generics !== undefined;
}
export interface IHasPorts {
  ports: O.OPort[];
  portRange?: O.OIRange;
}
export function implementsIHasPorts(obj: O.ObjectBase): obj is O.ObjectBase & IHasPorts {
  return (obj as O.ObjectBase & Partial<IHasPorts>).ports !== undefined;
}
export interface IHasStatements {
  statements: (O.OConcurrentStatements | O.OSequentialStatement)[];
  statementsRange: O.OIRange;
}
export function implementsIHasStatements(obj: O.ObjectBase): obj is O.ObjectBase & IHasStatements {
  const o = obj as O.ObjectBase & Partial<IHasStatements>;
  return Array.isArray(o.statements) && o.statementsRange !== undefined;
}