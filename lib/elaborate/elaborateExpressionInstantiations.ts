import * as O from "../parser/objects";

export function elaborateExpressionInstantiations(file: O.OFile) {
  for (const obj of file.objectList) {
    if (obj instanceof O.OName) {
      if (obj instanceof O.OInstantiation === false && obj.parent instanceof O.OInstantiation === false
        && O.getNameParent(obj) instanceof O.OAliasWithSignature === false
        && O.getNameParent(obj) instanceof O.OSubtypeIndication === false
        && O.getNameParent(obj) instanceof O.OUseClause === false
        && obj.nameToken.isLiteral() === false // No infix operators
        && obj.write === false
        && obj.definitions.length > 0 && obj.definitions.every(def => def instanceof O.OSubprogram)) {
        // An association actual can also be the name of a subprogram (LRM 6.5.7.1). In that case do not cast to instantiation
        if (obj.parent instanceof O.OAssociation && obj.children.length === 0) {
          continue;
        }

        Object.setPrototypeOf(obj, O.OInstantiation.prototype);

        (obj as O.OInstantiation).type = 'subprogram';
        (obj as O.OInstantiation).postponed = false;
        (obj as O.OInstantiation).instantiatedUnit = [obj];
        (obj as O.OInstantiation).convertedInstantiation = true;
        (obj as O.OInstantiation).labelLinks = [];
        if (obj.children.length > 0) {
          (obj as O.OInstantiation).portAssociationList = new O.OPortAssociationList((obj as O.OInstantiation), obj.range.copyWithNewEnd(obj.children.at(-1)!.range));
          (obj as O.OInstantiation).portAssociationList!.children = [];
          let association: O.OAssociation | undefined;
          for (const name of obj.children) {
            if (name.afterComma && association) {
              (obj as O.OInstantiation).portAssociationList!.children.push(association);
              association = undefined;
            }
            if (!association) {
              association = new O.OAssociation((obj as O.OInstantiation).portAssociationList!, (obj as O.OInstantiation).portAssociationList!.range);
            }
            if (name instanceof O.OFormalName) {
              association.formalPart.push(name);
            } else {
              association.actualIfInput.push(name);
            }
          }
          if (association) {
            (obj as O.OInstantiation).portAssociationList!.children.push(association);
            association = undefined;

          }
        }
      }
    }
  }
}