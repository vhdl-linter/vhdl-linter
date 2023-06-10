import { findBestMatch } from "string-similarity";
import { CodeAction, CodeActionKind, DiagnosticSeverity, Range, TextEdit } from "vscode-languageserver";
import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
import { IRule, RuleBase } from "./rulesBase";

export class RuleInstantiation extends RuleBase implements IRule {
  public static readonly ruleName = 'instantiation';
  file: O.OFile;
  checkAssociations(availableInterfaceElements: (O.OPort | O.OGeneric | O.OTypeMark)[][], associationList: O.OAssociationList | undefined, typeName: string, range: O.OIRange, kind: 'port' | 'generic') {

    const numberedArguments = [];
    const namedArguments: Record<string, O.OAssociation> = {};
    if (associationList) {
      for (const association of associationList.children) {
        if (association.formalPart.length === 0) {
          if (Object.keys(namedArguments).length > 0) {
            this.addMessage({
              message: 'Positional argument after named argument',
              range: association.range
            });
            return;
          }
          numberedArguments.push(association);
        } else {
          if (association.formalPart.length > 1) {
            throw new O.ParserError('Multiple Formals', association.range);
          }
          namedArguments[association.formalPart[0]!.nameToken.getLText()] = association;

        }
      }
    }
    // Filter all interface Elements
    const fittingInterfaceElements = [];
    const incompleteInterfaceElements = [];
    for (const interfaceElement of availableInterfaceElements) {
      let valid = Object.keys(namedArguments).every(argument => interfaceElement.some(port => port.lexerToken?.getLText() === argument));
      if (interfaceElement.length - Object.keys(namedArguments).length < numberedArguments.length) {
        valid = false;
      }
      if (valid === false) {
        continue;
      }
      const missingPorts = [];
      for (const port of interfaceElement.slice(numberedArguments.length)) {
        if (port instanceof O.OTypeMark || port.defaultValue || (port instanceof O.OPort && port.direction === 'out')) {
          continue;
        }
        if (Object.keys(namedArguments).includes(port.lexerToken.getLText()) === false) {
          missingPorts.push(port);
        }
      }
      if (missingPorts.length > 0) {
        incompleteInterfaceElements.push(missingPorts);
      } else {
        fittingInterfaceElements.push(interfaceElement);
      }
    }
    if (fittingInterfaceElements.length > 0) { // No error some are fitting
      // Check for open without default
      for (const association of associationList?.children ?? []) {
        if (association.actualIfInput.length === 1 && association.actualIfInput[0]!.nameToken.getLText() === 'open'
          && association.definitions.every(def => (def instanceof O.OPort && def.direction === 'in' && def.defaultValue === undefined || def instanceof O.OGenericConstant && def.defaultValue === undefined))) {
          this.addMessage({
            range: association.range,
            severity: DiagnosticSeverity.Error,
            message: association.parent instanceof O.OPortAssociationList ?
              `port ${association.formalPart[0]?.nameToken.text ?? 'unknown'} is an input without default value and must not be open.` :
              `generic ${association.formalPart[0]?.nameToken.text ?? 'unknown'} has no default value and must not be open.`
          });
        }
      }
    } else if (incompleteInterfaceElements.length > 0) {
      const shortestMissing = incompleteInterfaceElements.reduce((ports, missingPortsThis) => {
        if (ports.length < missingPortsThis.length) {
          return ports;
        }
        return missingPortsThis;
      }, incompleteInterfaceElements[0]!);

      this.addMessage({
        range: range,
        severity: DiagnosticSeverity.Error,
        message: `Missing connection for ${shortestMissing[0] instanceof O.OPort ? 'ports' : 'generics'} ${shortestMissing.map(port => `'${port.lexerToken.text}'`).join(', ')}`
      });
    } else {
      const availableInterfaceElementsFlat = availableInterfaceElements.flat().filter((v, i, self) => self.findIndex(o => o.lexerTokenEquals(v)) === i);
      for (const association of associationList?.children ?? []) {
        // instantiations only care for the first children of names
        const formals = association.formalPart.map(formal => formal instanceof O.OFormalName === false && formal.children[0] && formal.children[0][0] ? formal.children[0][0] : formal);
        if (formals.length === 0) {
          continue;
        }
        const interfaceElement = availableInterfaceElementsFlat.find(port => {
          for (const part of formals) {
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
          const firstFormal = formals[0];
          if (possibleMatches.length > 0 && firstFormal) {
            const bestMatch = findBestMatch(firstFormal.nameToken.text, possibleMatches);
            code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              actions.push(CodeAction.create(
                `Replace with ${bestMatch.bestMatch.target} (score: ${bestMatch.bestMatch.rating})`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(Range.create(firstFormal.range.start, formals[association.formalPart.length - 1]!.range.end)
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
            message: `no ${kind} ${formals.map(name => name.nameToken.text).join(', ')} on ${typeName}`,
            code
          });
        }
      }
      const longestAvailable = availableInterfaceElements.reduce((prev, curr) => Math.max(prev, curr.length), 0);
      if (associationList && longestAvailable < associationList.children.length) {
        this.addMessage({
          range: associationList.range,
          severity: DiagnosticSeverity.Error,
          message: `To many associations, was expecting at most ${longestAvailable}`
        });
      }
    }
  }
  check() {
    for (const instantiation of this.file.objectList) {
      if (instantiation instanceof O.OInstantiation) {
        let definitions = instantiation.definitions.get();
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