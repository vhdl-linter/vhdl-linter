import * as I from '../parser/interfaces';
import * as O from './objectsIndex';
export class OAssociationList extends ObjectBase {
  constructor(public parent: OInstantiation | OPackage | OPackageInstantiation | OInterfacePackage, range: OIRange) {
    super(parent, range);
  }
  public children: OAssociation[] = [];

}
export class OGenericAssociationList extends OAssociationList {
  constructor(public parent: OInstantiation | OPackageInstantiation | OInterfacePackage, range: OIRange) {
    super(parent, range);
  }
}
export class OPortAssociationList extends OAssociationList {
  constructor(public parent: OInstantiation, range: OIRange) {
    super(parent, range);
  }
}

export class OInstantiation extends OName implements I.IHasDefinitions, I.IMayHaveLabel, I.IHasPostponed {
  constructor(public parent: OStatementBody | OEntity | OProcess | OLoop | OIf, lexerToken: OLexerToken, public type: 'entity' | 'component' | 'configuration' | 'subprogram' | 'unknown' = 'unknown') {
    super(parent, lexerToken);
  }
  postponed = false;
  definitions: (OEntity | OSubprogram | OComponent | OAliasWithSignature | OConfigurationDeclaration)[] = [];
  instantiatedUnit: [OName, ...OSelectedName[]];
  package?: OLexerToken;
  portAssociationList?: OPortAssociationList;
  genericAssociationList?: OGenericAssociationList;

  archIdentifier?: OLexerToken;
  label?: OLexerToken;
  labelLinks: OLabelName[] = [];
  convertedInstantiation = false;
}
export class OAssociation extends ObjectBase implements I.IHasDefinitions {
  constructor(public parent: OAssociationList, range: OIRange) {
    super(parent, range);
  }
  definitions: (OPort | OGeneric | OTypeMark)[] = [];
  formalPart: OFormalName[] = [];
  actualIfInput: OName[] = [];
  actualIfOutput: OName[] = [];
  actualIfInoutput: OName[] = [];
}