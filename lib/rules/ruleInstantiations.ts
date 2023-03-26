import { findBestMatch } from "string-similarity";
import { CodeAction, CodeActionKind, DiagnosticSeverity, Range, TextEdit } from "vscode-languageserver";
import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
import { IRule, RuleBase } from "./rulesBase";

export class RuleInstantiation extends RuleBase implements IRule {
  public static readonly ruleName = 'instantiation';
  file: O.OFile;
  checkAssociations(availableInterfaceElements: (O.OPort | O.OGeneric | O.OTypeMark)[][], associationList: O.OAssociationList | undefined, typeName: string, range: O.OIRange, kind: 'port' | 'generic') {
    const availableInterfaceElementsFlat = availableInterfaceElements.flat().filter((v, i, self) => self.findIndex(o => o.lexerTokenEquals(v)) === i);
    const foundElementsNotOpen: (O.OPort | O.OGeneric | O.OTypeMark)[] = [];
    let elementsWithoutFormal = false;
    let allElementsWithoutFormal = true;
    if (associationList) {
      for (const association of associationList.children) {
        if (association.formalPart.length === 0) {
          elementsWithoutFormal = true;
          continue;
        }
        if (association.formalPart.length > 1) {
          this.addMessage({
            range: association.range,
            severity: DiagnosticSeverity.Warning,
            message: `Multiple formal references parsed (${association.formalPart.map(ref => ref.nameToken.text).join(', ')}). Problem likely`
          });
        }
        allElementsWithoutFormal = false;
        const interfaceElement = availableInterfaceElementsFlat.find(port => {
          for (const part of association.formalPart) {
            if (port instanceof O.OTypeMark) {
              return false;
            }
            if (part.nameToken.getLText() === port.lexerToken.getLText()) {
              return true;
            }
          }
          return false;
        });
        if (!interfaceElement) {
          let code: number | undefined = undefined;
          const possibleMatches = availableInterfaceElementsFlat.filter(I.implementsIHasLexerToken).map(element => (element as I.IHasLexerToken).lexerToken.text);
          const firstFormal = association.formalPart[0];
          if (possibleMatches.length > 0 && firstFormal) {
            const bestMatch = findBestMatch(firstFormal.nameToken.text, possibleMatches);
            code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              actions.push(CodeAction.create(
                `Replace with ${bestMatch.bestMatch.target} (score: ${bestMatch.bestMatch.rating})`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(Range.create(firstFormal.range.start, association.formalPart[association.formalPart.length - 1]!.range.end)
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
            message: `no ${kind} ${association.formalPart.map(name => name.nameToken.text).join(', ')} on ${typeName}`,
            code
          });
        } else if (association.actualIfInput[0]?.nameToken.getLText() !== 'open') {
          foundElementsNotOpen.push(interfaceElement);
        }
      }
    }
    if (allElementsWithoutFormal) {
      const counts = [...new Set(availableInterfaceElements.flatMap(elements => {
        const totalLength = elements.length;
        // TODO: Implement alias function lookup for optional parameters
        // This assumes all SubprogramAlias Parameters are optional. This actually depends on the function definition
        const withDefault = elements.filter(p => (p instanceof O.OTypeMark) || (p as O.OPort).defaultValue !== undefined).length;
        const result = [];
        for (let i = totalLength; i >= totalLength - withDefault; i--) {
          result.push(i);
        }
        return result;
      }))].sort((a, b) => a - b);
      const actualCount = associationList?.children.length ?? 0;
      if (!counts.includes(actualCount)) {
        let portCountString: string;
        const last = counts.pop();
        if (last !== undefined) {
          portCountString = `${counts.join(', ')} or ${last}`;
        } else {
          portCountString = String(counts[0]);
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
        const missingElements: (O.OPort | O.OGeneric)[][] = availableInterfaceElements.map(_interface => {
          const missing: (O.OPort | O.OGeneric)[] = [];
          for (const element of _interface) {
            if (((element instanceof O.OPort && element.direction === 'in') || element instanceof O.OGeneric)
              && (element as O.OPort).defaultValue === undefined
              && foundElementsNotOpen.find(search => search.lexerTokenEquals(element)) === undefined) {
              missing.push(element);
            }
          }
          return missing;
        });
        // if one interface has no missing elements, skip adding a message
        if (!missingElements.find(elements => elements.length === 0)) {
          const elementString = [...new Set(missingElements.map(elements => elements.map(e => e.lexerToken.text).join(', ')))].join(') or (');
          this.addMessage({
            range: range,
            severity: DiagnosticSeverity.Error,
            message: `${kind} map is incomplete: ${kind}s (${elementString}) are missing or open.`
          });
        }
      }
    }
  }
  check() {
    for (const instantiation of this.file.objectList) {
      if (instantiation instanceof O.OInstantiation) {
        let definitions = instantiation.definitions;
        // TODO: Extends checking of instantiations to Subprograms
        // if (definitions.some(def => def instanceof O.OSubprogram || def instanceof O.OAliasWithSignature)) {
        //   continue; // skip functions
        // }
        if (instantiation.type === 'configuration') {
          definitions = definitions.flatMap((definition: O.OConfigurationDeclaration) => {
            const entities = this.vhdlLinter.projectParser.entities.filter(e => e.lexerToken.getLText() === definition.entityName.getLText());
            return entities;
          });
        }
        if (definitions.length > 0) {
          const range = instantiation.range.start.getRangeToEndLine();
          const availablePorts = definitions.map(e => {
            if (I.implementsIHasPorts(e)) {
              return e.ports;
            }
            if (e instanceof O.OAliasWithSignature) {
              return e.typeMarks;
            }
            return [];
          });
          this.checkAssociations(availablePorts, instantiation.portAssociationList, instantiation.type, range, 'port');
          const availableGenerics = definitions.map(d => (I.implementsIHasGenerics(d)) ? d.generics : []);
          this.checkAssociations(availableGenerics, instantiation.genericAssociationList, instantiation.type, range, 'generic');
        }
      }
      if (instantiation instanceof O.OPackageInstantiation || instantiation instanceof O.OInterfacePackage) {
        if (instantiation instanceof O.OInterfacePackage && instantiation.box) { // LRM 6.5.5 Box symbol is used
          continue;
        }
        if (instantiation.definitions.length > 0) {
          const range = instantiation.range.start.getRangeToEndLine();
          const availableGenerics = instantiation.definitions.map(d => (I.implementsIHasGenerics(d)) ? d.generics : []);
          this.checkAssociations(availableGenerics, instantiation.genericAssociationList, 'package', range, 'generic');
        }
      }
    }
  }
}