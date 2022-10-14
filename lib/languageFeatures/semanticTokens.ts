import { DocumentSemanticTokensProvider, TextDocument, SemanticTokensBuilder, SemanticTokensLegend, Position, Range } from "vscode";
import { IHasLexerToken, implementsIHasDefinitions, implementsIHasLexerToken, OIRange, OPort, OSignal } from "../parser/objects";
import { ProjectParser } from "../project-parser";
import { VhdlLinter } from "../vhdl-linter";

const tokenTypes = ['variable', 'parameter'];
const tokenModifiers = ['declaration', 'readonly'];
export const semanticTokensLegend = new SemanticTokensLegend(tokenTypes, tokenModifiers);

const range2Range = (range: OIRange) => {
  return new Range(new Position(range.start.line, range.start.character), new Position(range.end.line, range.end.character));
}

const provideDocumentSemanticTokens = async (document: TextDocument) => {
  const tokensBuilder = new SemanticTokensBuilder(semanticTokensLegend);

  // TODO: get the already linted file + project parser
  // somehow move this to the lsp instead of the client?
  const linter = new VhdlLinter(document.uri.path, document.getText(), new ProjectParser([], ''));
  await linter.elaborate();

  for (const obj of (linter.file.objectList.filter(obj => implementsIHasLexerToken(obj)) as IHasLexerToken[])) {
    if (obj instanceof OPort && obj.direction === 'in') {
      tokensBuilder.push(range2Range(obj.lexerToken.range), 'variable', ['readonly', 'declaration']);
    } else if (obj instanceof OPort || obj instanceof OSignal) {
      tokensBuilder.push(range2Range(obj.lexerToken.range), 'variable', ['declaration']);
    }
    if (implementsIHasDefinitions(obj)) {
      if (obj.definitions.filter(def => def instanceof OPort && def.direction === 'in').length > 0) {
        tokensBuilder.push(range2Range(obj.lexerToken.range), 'variable', ['readonly']);
      } else if (obj.definitions.filter(def => def instanceof OPort || def instanceof OSignal).length > 0) {
        tokensBuilder.push(range2Range(obj.lexerToken.range), 'variable', []);
      }
    }
  }

  return tokensBuilder.build();
}

export const semanticTokensProvider: DocumentSemanticTokensProvider = {
  provideDocumentSemanticTokens
};