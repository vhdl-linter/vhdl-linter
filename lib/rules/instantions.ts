import { RuleBase, IRule } from "./rules-base";
import { CodeAction, CodeActionKind, DiagnosticSeverity, Range, TextEdit } from "vscode-languageserver";
import { IHasLexerToken, implementsIHasInstantiations, implementsIHasLexerToken, implementsIHasPorts, implementsIHasSubprograms, OArchitecture, OAssociationList, ObjectBase, OCase, OComponent, OEntity, OFile, OGeneric, OHasSequentialStatements, OIf, OIRange, OPort, OSubprogramAlias, OTypeMark } from "../parser/objects";
import { findBestMatch } from "string-similarity";

export class RInstantiation extends RuleBase implements IRule {
  public name = 'instantiation';
  file: OFile;
  checkAssociations(availableInterfaceElements: (OPort | OGeneric | OTypeMark)[][], associationList: OAssociationList | undefined, typeName: string, range: OIRange, kind: 'port' | 'generic') {
    const availableInterfaceElementsFlat = availableInterfaceElements.flat().filter((v, i, self) => self.findIndex(o => o.lexerTokenEquals(v)) === i);
    const foundElements: (OPort | OGeneric | OTypeMark)[] = [];
    let elementsWithoutFormal = false;
    let allElementsWithoutFormal = true;
    if (associationList) {
      for (const association of associationList.children) {
        if (association.formalPart.length === 0) {
          elementsWithoutFormal = true;
          continue;
        }
        allElementsWithoutFormal = false;
        const interfaceElement = availableInterfaceElementsFlat.find(port => {
          for (const part of association.formalPart) {
            if (port instanceof OTypeMark) {
              return false;
            }
            if (part.lexerToken.getLText() === port.lexerToken.getLText()) {
              return true;
            }
          }
          return false;
        });
        if (!interfaceElement) {
          let code: number | undefined = undefined;
          const possibleMatches = availableInterfaceElementsFlat.filter(implementsIHasLexerToken).map(element => (element as IHasLexerToken).lexerToken.text);
          if (possibleMatches.length > 0) {
            const bestMatch = findBestMatch(association.formalPart[0].lexerToken.text, possibleMatches);
            code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              actions.push(CodeAction.create(
                `Replace with ${bestMatch.bestMatch.target} (score: ${bestMatch.bestMatch.rating})`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(Range.create(association.formalPart[0].range.start, association.formalPart[association.formalPart.length - 1].range.end)
                      , bestMatch.bestMatch.target)]
                  }
                },
                CodeActionKind.QuickFix));
              return actions;
            });
          }
          this.addMessage({
            range: association.range,
            severity: DiagnosticSeverity.Error,
            message: `no ${kind} ${association.formalPart.map(name => name.lexerToken.text).join(', ')} on ${typeName}`,
            code
          });
        } else {
          foundElements.push(interfaceElement);
        }
      }
    }
    if (allElementsWithoutFormal) {
      const counts = [...new Set(availableInterfaceElements.flatMap(elements => {
        const totalLength = elements.length;
        // TODO: Implement alias function loopkup for optional parameters
        // This assumes all SubprogramAlias Parameters are optional. This actually depends on the function definition
        const withDefault = elements.filter(p => (p instanceof OTypeMark) || p.defaultValue !== undefined).length;
        const result = [];
        for (let i = totalLength; i >= totalLength - withDefault; i--) {
          result.push(i);
        }
        return result;
      }))].sort((a, b) => a - b);
      const actualCount = associationList?.children.length ?? 0;
      if (!counts.includes(actualCount)) {
        let portCountString: string;
        if (counts.length > 1) {
          const last = counts.pop();
          portCountString = `${counts.join(', ')} or ${last}`;
        } else {
          portCountString = `${counts[0]}`;
        }
        this.addMessage({
          range: range,
          severity: DiagnosticSeverity.Error,
          message: `Got ${actualCount} ${kind}s but expected ${portCountString} ${kind}s.`
        });
      }
    } else {
      if (elementsWithoutFormal) {
        this.addMessage({
          range: range,
          severity: DiagnosticSeverity.Warning,
          message: `some ${kind}s have no formal part while others have. Associations are not verified accurately.`
        });
      } else {
        // check which interfaceElements are missing from the different possible interfaces
        const missingElements: (OPort | OGeneric)[][] = availableInterfaceElements.map(_interface => {
          const missing: (OPort | OGeneric)[] = [];
          for (const element of _interface) {
            if (((element instanceof OPort && element.direction === 'in') || element instanceof OGeneric)
              && typeof element.defaultValue === 'undefined'
              && typeof foundElements.find(search => search.lexerTokenEquals(element)) === 'undefined') {
              missing.push(element);
            }
          }
          return missing;
        });
        // if one interface has no missing elements, don't add a message
        if (!missingElements.find(elements => elements.length === 0)) {
          const elementString = [...new Set(missingElements.map(elements => elements.map(e => e.lexerToken.text).join(', ')))].join(') or (');
          this.addMessage({
            range: range,
            severity: DiagnosticSeverity.Warning,
            message: `${kind} map is incomplete: ${kind}s (${elementString}) are missing.`
          });
        }
      }
    }
  }
  checkInstantiations(object: ObjectBase) {
    if (!object) {
      return;
    }
    if (implementsIHasInstantiations(object)) {
      for (const instantiation of object.instantiations) {
        if (instantiation.definitions.length === 0) {
          this.addMessage({
            range: instantiation.range.start.getRangeToEndLine(),
            severity: DiagnosticSeverity.Warning,
            message: `can not find ${instantiation.type} ${instantiation.componentName}`
          });
        } else {
          const range = instantiation.range.start.getRangeToEndLine();
          const availablePorts = instantiation.definitions.map(e => {
            if (implementsIHasPorts(e)) {
              return e.ports
            }
            if (e instanceof OSubprogramAlias) {
              return e.typeMarks;
            }
            return [];
          });
          this.checkAssociations(availablePorts, instantiation.portAssociationList, instantiation.type, range, 'port');
          const availableGenerics = instantiation.definitions.map(d => (d instanceof OComponent || d instanceof OEntity) ? d.generics : []);
          this.checkAssociations(availableGenerics, instantiation.genericAssociationList, instantiation.type, range, 'generic');
        }
      }
    }
    if (implementsIHasSubprograms(object)) {
      for (const subprograms of object.subprograms) {
        this.checkInstantiations(subprograms);
      }
    }
    if (object instanceof OArchitecture) {
      for (const statement of object.statements) {
        this.checkInstantiations(statement);
      }
    }
    if (object instanceof OIf) {
      for (const clause of object.clauses) {
        this.checkInstantiations(clause);
      }
      if (object.else) {
        this.checkInstantiations(object.else);
      }
    }
    if (object instanceof OCase) {
      for (const clause of object.whenClauses) {
        this.checkInstantiations(clause);
      }
    }
    if (object instanceof OHasSequentialStatements) {
      for (const cases of object.cases) {
        this.checkInstantiations(cases);
      }
      for (const assignments of object.assignments) {
        this.checkInstantiations(assignments);
      }
      for (const ifs of object.ifs) {
        this.checkInstantiations(ifs);
      }
      for (const loops of object.loops) {
        this.checkInstantiations(loops);
      }
      for (const instantiations of object.instantiations) {
        this.checkInstantiations(instantiations);
      }
    }
  }
  async check() {
    for (const architecture of this.file.architectures) {
      this.checkInstantiations(architecture);
    }
    for (const pkg of this.file.packages) {
      this.checkInstantiations(pkg);
    }
  }
}