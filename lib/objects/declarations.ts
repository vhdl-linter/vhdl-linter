import { OLexerToken } from '../lexer';
import * as I from '../parser/interfaces';
import { OProcess, OSequenceOfStatements } from './concurrentStatements';
import { OPackage, OPackageBody, OUseClause, OPort, OGeneric, OEntity, OContextReference } from './designEntites';
import { OGenericAssociationList } from './instantiations';
import { ObjectBase, OIRange } from './linterObjects';
import { OName, OLibrary } from './name';
// ODeclaration also includes specifications
export type ODeclaration = OSignal | OAttributeSpecification | OAttributeDeclaration | OVariable | OConstant | OFileVariable | OType
  | OAlias | OSubprogram | OComponent | OPackageInstantiation | OConfigurationSpecification | OPackage | OPackageBody;

export class OType extends ObjectBase implements I.IHasNameLinks,
  I.IHasUseClauses, I.IHasLexerToken, I.IHasDeclarations {
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  incomplete = false;
  aliasLinks: OAlias[] = [];
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  nameLinks: OName[] = [];
  units: OUnit[] = [];
  alias = false;
  lexerToken: OLexerToken;
  protected = false;
  protectedBody = false;
}
export class OUnit extends ObjectBase implements I.IHasNameLinks, I.IHasLexerToken {
  constructor(parent: OType, public lexerToken: OLexerToken) {
    super(parent, lexerToken.range);
  }
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];

}
export class OAccessType extends OType implements I.IHasSubtypeIndication {
  subtypeIndication: OSubtypeIndication;
}
export class OFileType extends OType implements I.IHasSubtypeIndication {
  subtypeIndication: OSubtypeIndication;

}
export class OSubType extends OType implements I.IHasSubtypeIndication {
  subtypeIndication: OSubtypeIndication;

}
export class OEnum extends OType {
  literals: OEnumLiteral[] = [];
}
export class OEnumLiteral extends ObjectBase implements I.IHasNameLinks, I.IHasLexerToken {
  nameLinks: OName[] = [];
  public parent: OEnum;
  public lexerToken: OLexerToken;
  aliasLinks: OAlias[] = [];

}
export class ORecord extends OType implements I.IMayHaveEndingLexerToken {
  children: ORecordChild[] = [];
  endingLexerToken?: OLexerToken;
}
export class OArray extends OType implements I.IHasSubtypeIndication {
  indexNames: OName[] = [];
  subtypeIndication: OSubtypeIndication;

}
export class OSubtypeIndication extends ObjectBase {
  resolutionIndication: OName[] = [];
  typeNames: OName[] = [];
  constraint: OName[] = [];
}
export class ORecordChild extends OType implements I.IHasSubtypeIndication {
  public parent: ORecord;
  subtypeIndication: OSubtypeIndication;

}
export class OFileVariable extends ObjectBase implements I.IVariableBase {
  aliasLinks: OAlias[] = [];

  nameLinks: OName[] = [];
  subtypeIndication: OSubtypeIndication;
  defaultValue?: OName[] = [];
  lexerToken: OLexerToken;
  openKind?: OName[];
  logicalName?: OName[];
  constructor(parent: I.IHasDeclarations, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OVariable extends ObjectBase implements I.IVariableBase {
  nameLinks: OName[] = [];
  subtypeIndication: OSubtypeIndication;
  defaultValue?: OName[] = [];
  lexerToken: OLexerToken;
  aliasLinks: OAlias[] = [];
  shared = false;
  constructor(parent: I.IHasDeclarations, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OSignal extends ObjectBase implements I.IVariableBase {
  nameLinks: OName[] = [];
  subtypeIndication: OSubtypeIndication;
  defaultValue?: OName[] = [];
  lexerToken: OLexerToken;
  aliasLinks: OAlias[] = [];
  registerProcess?: OProcess;
  constructor(parent: (ObjectBase & I.IHasDeclarations), range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OConstant extends ObjectBase implements I.IVariableBase {
  nameLinks: OName[] = [];
  subtypeIndication: OSubtypeIndication;
  defaultValue?: OName[] = [];
  lexerToken: OLexerToken;
  aliasLinks: OAlias[] = [];

  constructor(parent: I.IHasDeclarations, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OComponent extends ObjectBase implements I.IHasDefinitions, I.IHasDeclarations,
  I.IHasPorts, I.IHasGenerics, I.IHasNameLinks, I.IHasLexerToken {
  constructor(parent: ObjectBase & I.IHasDeclarations, public lexerToken: OLexerToken) {
    super((parent as unknown) as ObjectBase, lexerToken.range);
  }
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
  endingReferenceToken?: OLexerToken;
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  portRange?: OIRange;
  genericRange?: OIRange;
  ports: OPort[] = [];
  generics: OGeneric[] = [];
  definitions: OEntity[] = [];
}
export class OAttributeSpecification extends ObjectBase implements I.IHasNameToken, I.IHasDefinitions {
  nameToken: OLexerToken;
  definitions: OAttributeDeclaration[] = [];
  names: OName[] = [];
  entityClass: OLexerToken;
  lexerToken: undefined;
}
export class OConfigurationSpecification extends ObjectBase {
  lexerToken: undefined;
}

export class OAttributeDeclaration extends ObjectBase implements I.IHasLexerToken, I.IHasNameLinks, I.IHasSubtypeIndication {
  lexerToken: OLexerToken;
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
  aliasDefinitions: ObjectBase[] = [];
  subtypeIndication: OSubtypeIndication;
}
export class OAlias extends ObjectBase implements I.IHasLexerToken, I.IHasNameLinks, I.IHasSubtypeIndication {
  name: OName[] = []; // The thing being aliased
  nameLinks: OName[] = [];
  aliasLinks: never[] = []; // recursive aliases are not allowed
  aliasDefinitions: ObjectBase[] = [];
  lexerToken: OLexerToken;
  subtypeIndication: OSubtypeIndication; // subtype_indication
}
export class OAliasWithSignature extends OAlias implements I.IHasLexerToken, I.IHasSubtypeIndication {
  typeMarks: OTypeMark[] = [];
  nameLinks: OName[] = [];
  lexerToken: OLexerToken;
  subtypeIndication: OSubtypeIndication;
  return: OName;
}
export class OTypeMark extends ObjectBase {
  constructor(public parent: ObjectBase, public name: OName) {
    super(parent, name.range);
  }
}
export class OSubprogram extends OSequenceOfStatements implements I.IHasNameLinks, I.IHasDeclarations, I.IHasPorts,
  I.IHasUseClauses, I.IHasLexerToken, I.IMayHaveEndingLexerToken, I.IHasDefinitions {
  hasBody = false;
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  parent: OPackage;
  labelLinks: OName[] = [];
  ports: OPort[] = [];
  portRange?: OIRange;
  return: OName[] = [];
  lexerToken: OLexerToken;
  endingLexerToken?: OLexerToken;
  definitions: OSubprogram[] = [];
}
export class OPackageInstantiation extends ObjectBase implements I.IHasDefinitions, I.IHasNameLinks,
  I.IHasUseClauses, I.IHasContextReference, I.IHasLibraries, I.IMayHaveGenericAssociationList, I.IHasLexerToken {
  definitions: OPackage[] = [];
  aliasLinks: OAlias[] = [];
  lexerToken: OLexerToken;
  uninstantiatedPackage: OName[] = [];
  genericAssociationList?: OGenericAssociationList;
  nameLinks: OName[] = [];
  libraries: OLibrary[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
}