import { commands, env, ExtensionContext, Position, window, workspace } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';
import { converterTypes } from './entityConverter';
import { IAddSignalCommandArguments } from './vhdlLinter';
import { setupYamlSupport } from './yamlSupport';


let client: LanguageClient;

export async function activate(context: ExtensionContext) {
  // The server is implemented in node
  const serverModule = require.resolve('./languageServer');
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6011', '--enable-source-maps'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used


  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: 'file', language: 'vhdl' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
    }
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'VhdlLinter',
    'VhdlLinter',
    serverOptions,
    clientOptions
  );
  setupYamlSupport(context);
  void settingsDeprecationWarning(context);

  // Start the client. This will also launch the server
  await client.start();
  context.subscriptions.push(commands.registerCommand('vhdl-linter:add-signal', async (args: IAddSignalCommandArguments) => {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }
    const length = await window.showInputBox({
      prompt: 'Give Length for ' + args.signalName,
      // validateInput: (value: string) => isNaN(parseInt(value, 10)) ? 'Not a Number' : ''
    });
    if (length === undefined) {
      return;
    }
    await editor.edit(editBuilder => {
      const { preferredLogicTypeSignal } = workspace.getConfiguration('VhdlLinter.style');
      let typePart = 'std_ulogic';
      if (preferredLogicTypeSignal === 'resolved') {
        typePart = 'std_logic';
      }
      const type = parseInt(length, 10) === 1 ? typePart : `${typePart}_vector(${length} - 1 downto 0)`;
      editBuilder.insert(new Position(args.position.line, args.position.character), `  signal ${args.signalName} : ${type};\n`);
    });

  }));

  async function getTemplate(type: converterTypes) {
    const editor = window.activeTextEditor;
    if (!editor) {
      return undefined;
    }
    return await client.sendRequest<string>('vhdl-linter/template', {
      textDocument: {
        uri: editor.document.uri.toString()
      },
      position: editor.selection.active,
      type
    });
  }
  context.subscriptions.push(commands.registerCommand('vhdl-linter:copy-as-instance', async () => {
    const text = await getTemplate('instance');
    if (text !== undefined) {
      await env.clipboard.writeText(text);
      await window.showInformationMessage(`Instance copied to the clipboard`);
    }
  }));
  context.subscriptions.push(commands.registerCommand('vhdl-linter:copy-as-signals', async () => {
    const text = await getTemplate('signals');
    if (text !== undefined) {
      await env.clipboard.writeText(text);
      await window.showInformationMessage(`Signals copied to the clipboard`);
    }
  }));
  context.subscriptions.push(commands.registerCommand('vhdl-linter:copy-as-sysverilog', async () => {
    const text = await getTemplate('sysverilog');
    if (text !== undefined) {
      await env.clipboard.writeText(text);
      await window.showInformationMessage(`Instance copied to the clipboard as system verilog`);
    }
  }));
  context.subscriptions.push(commands.registerCommand('vhdl-linter:copy-as-component', async () => {
    const text = await getTemplate('component');
    if (text !== undefined) {
      await env.clipboard.writeText(text);
      await window.showInformationMessage(`Component copied to the clipboard`);
    }
  }));


}

export function deactivate(): Thenable<void> | undefined {
  return client.stop();
}

// show a warning that the vs code settings are being deprecated soon.
const DO_NOT_SHOW_SETTINGS_DEPRECATION = 'DO_NOT_SHOW_SETTINGS_DEPRECATION';
async function settingsDeprecationWarning(context: ExtensionContext) {
  if (context.globalState.get(DO_NOT_SHOW_SETTINGS_DEPRECATION) === true) {
    return;
  }
  const choice = await window.showInformationMessage(
    "The vhdl-linter settings in the VS Code settings page are being deprecated in favor of `vhdl-linter.yml` project settings. You should migrate soon.",
    'Ok',
    "Don't show again.",
  );
  if (choice === "Don't show again.") {
    await context.globalState.update(DO_NOT_SHOW_SETTINGS_DEPRECATION, true);
  }
}