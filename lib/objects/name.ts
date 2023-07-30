import * as I from '../parser/interfaces';
import * as O from './objectsIndex';

export class OName extends ObjectBase implements I.IHasDefinitions, I.IHasNameToken {
  constructor(public parent: ObjectBase | OFile, public nameToken: OLexerToken, public write = false, range?: OIRange) {
    super(parent, range ?? nameToken.range);
  }
  definitions: ObjectBase[] = [];
  notDeclaredHint?: string;
  lexerToken: undefined;
  constraint = false;
  // Workaround for checking of OWrites in associations. Because of overloading they can not be correctly checked.
  // This avoids false positives
  public inAssociation = false;
  children: OName[][] = [];
  // OName was found in expression after a comma. is used in elaborate to split different actuals when an OName is converted to an OInstantiation
  afterComma = false;
  maybeFormal = false;
  functionInFormalException = false;
}
export class OAggregate extends OName {

}
export class OChoice extends OName {
}
export class OExternalName extends OName {

  typeNames: OName[] = [];
  constructor(public parent: ObjectBase, public path: [OLexerToken], public kind: OLexerToken, range: OIRange) {
    super(parent, path[0], false, range);
  }
}
export class OLabelName extends OName {
}
export class OFormalName extends OName {
}
export class OLibrary extends ObjectBase implements I.IHasLexerToken, I.IHasNameLinks {
  constructor(public parent: ObjectBase | OFile, public lexerToken: OLexerToken) {
    super(parent, lexerToken.range);
  }
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
}
export class OSelectedName extends OName {
  constructor(public parent: ObjectBase, public nameToken: OLexerToken, public prefixTokens: SelectedNamePrefix, public write = false) {
    super(parent, nameToken, write, nameToken.range.copyWithNewStart(prefixTokens[0].range));
  }
}
export type SelectedNamePrefix = [
  first: OName,
  ...rest: OName[]
];
export class OAttributeName extends OName {
  public prefix?: OName;
  constructor(public parent: ObjectBase, public nameToken: OLexerToken) {
    super(parent, nameToken);
  }
}