import { OLexerToken } from '../lexer';
import * as I from '../parser/interfaces';
import { OConcurrentStatements, OProcess } from './concurrentStatements';
import { OAlias, OComponent, ODeclaration, OPackageInstantiation, OSubprogram, OSubtypeIndication } from './declarations';
import { OGenericAssociationList, OInstantiation } from './instantiations';
import { OFile, OIRange, ObjectBase } from './linterObjects';
import { OLibrary, OName, OSelectedName } from './name';
// this includes everything that is at the toplevel of a file (and related objects)
export class OEntity extends ObjectBase implements I.IHasDefinitions, I.IHasDeclarations,
  I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken,
  I.IHasLibraries, I.IHasGenerics, I.IHasPorts, I.IHasNameLinks, I.IMayHaveEndingLexerToken, I.IHasStatements {
  constructor(public parent: OFile, range: OIRange) {
    super(parent, range);
  }
  nameLinks: OName[] = [];
  referenceComponents: OComponent[] = [];
  referenceConfigurations: OConfigurationDeclaration[] = [];
  libraries: OLibrary[] = [];
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  aliasLinks: OAlias[] = [];
  lexerToken: OLexerToken;
  endingLexerToken: OLexerToken | undefined;
  useClauses: OUseClause[] = [];
  contextReferences: OContextReference[] = [];
  portRange?: OIRange;
  ports: OPort[] = [];
  genericRange?: OIRange;
  generics: OGeneric[] = [];
  statements: OConcurrentStatements[] = [];
  statementsRange: OIRange;
  definitions: OEntity[] = [];
  correspondingArchitectures: OArchitecture[] = [];
}

export class OPort extends ObjectBase implements I.IVariableBase, I.IHasDefinitions, I.IHasLexerToken {
  parent: OEntity | OSubprogram;
  direction: 'in' | 'out' | 'inout';
  directionRange: OIRange;
  definitions: OPort[] = [];
  lexerToken: OLexerToken;
  nameLinks: OName[] = [];
  subtypeIndication: OSubtypeIndication;
  defaultValue?: OName[] = [];
  aliasLinks: OAlias[] = [];
  registerProcess?: OProcess;
}
export abstract class OStatementBody extends ObjectBase implements I.IHasDeclarations,
  I.IHasUseClauses, I.IHasContextReference, I.IHasLibraries, I.IHasNameLinks, I.IHasStatements {
  nameLinks: OName[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  aliasLinks: OAlias[] = [];
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  contextReferences: OContextReference[] = [];
  libraries: OLibrary[] = [];
  statements: OConcurrentStatements[] = [];
  statementsRange: OIRange;
  correspondingEntity?: OEntity;
}
export class OArchitecture extends OStatementBody implements I.IHasLexerToken, I.IMayHaveEndingLexerToken {
  lexerToken: OLexerToken;
  entityName: OLexerToken;
  declarationsRange: OIRange;
  endingLexerToken?: OLexerToken;
}
export class OContext extends ObjectBase implements I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken, I.IHasLibraries {
  parent: OFile;
  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
  libraries: OLibrary[] = [];
}
export class OConfigurationDeclaration extends ObjectBase implements I.IHasLibraries, I.IHasDefinitions, I.IHasNameLinks,
  I.IHasDeclarations, I.IHasUseClauses, I.IHasContextReference {
  lexerToken: OLexerToken;
  entityName: OLexerToken;
  libraries: OLibrary[] = [];
  definitions: OEntity[] = [];
  nameLinks: OInstantiation[] = [];
  aliasLinks: OAlias[] = [];
  declarations: ODeclaration[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
}
export abstract class OGeneric extends ObjectBase implements I.IHasDefinitions, I.IHasNameLinks {
  parent: OEntity | OPackage;
  definitions: (OGeneric | OPackage)[] = [];
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
  lexerToken: OLexerToken;
  defaultValue?: ObjectBase[];
}
export class OGenericConstant extends OGeneric implements I.IVariableBase, I.IHasSubtypeIndication, I.IHasDefaultValue {
  definitions: OGenericConstant[] = [];
  subtypeIndication: OSubtypeIndication;
  defaultValue?: OName[];

}
export class OInterfacePackage extends OGeneric implements I.IHasNameLinks, I.IHasUseClauses, I.IHasContextReference, I.IHasLibraries,
  I.IHasLexerToken, I.IMayHaveGenericAssociationList {
  aliasLinks: OAlias[] = [];
  lexerToken: OLexerToken;
  uninstantiatedPackage: OName[] = [];
  genericAssociationList?: OGenericAssociationList;
  nameLinks: OName[] = [];
  libraries: OLibrary[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
  box: boolean;

}
export class OPackage extends ObjectBase implements I.IHasDeclarations, I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken,
  I.IHasLibraries, I.IHasGenerics, I.IHasNameLinks, I.IMayHaveEndingLexerToken, I.IHasGenerics {
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  parent: OFile;
  libraries: OLibrary[] = [];
  generics: OGeneric[] = [];
  genericRange?: OIRange;
  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  contextReferences: OContextReference[] = [];
  endingLexerToken?: OLexerToken;
  correspondingPackageBodies: OPackageBody[] = [];
}

export class OPackageBody extends ObjectBase implements I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken, I.IHasLibraries,
  I.IHasNameLinks, I.IMayHaveEndingLexerToken, I.IHasDeclarations {
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
  lexerToken: OLexerToken;
  libraries: OLibrary[] = [];
  packageDefinitions: OPackage[] = [];
  useClauses: OUseClause[] = [];
  contextReferences: OContextReference[] = [];
  parent: OFile;
  correspondingPackage?: OPackage;
  endingLexerToken?: OLexerToken;
}

export type ORootElements = OArchitecture | OEntity | OPackage | OPackageInstantiation | OPackageBody | OContext | OConfigurationDeclaration;
export class OContextReference extends ObjectBase {
  constructor(public parent: OContext | ObjectBase | OFile, range: OIRange) {
    super(parent, range);
  }
  names: OName[];
  toString() { // Shows nicer info on debug
    return this.names.map(name => name.nameToken.text).join('.');
  }
}
export class OUseClause extends ObjectBase {
  names: [OName, ...OSelectedName[]];
  toString() { // Shows nicer info on debug
    return this.names.map(name => name.nameToken.text).join('.');
  }
}