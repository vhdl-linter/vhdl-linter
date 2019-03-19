import { TextEditor, CompositeDisposable } from 'atom';
import { VhdlLinter, Message } from './vhdl-linter';
import { Parser } from './parser/parser';
import { ProjectParser } from './project-parser';
module.exports = {
  subscriptions: CompositeDisposable,
  projectParser: ProjectParser,
  parser: Parser,
  activate(): void {
    // console.log('activate', this);
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'vhdl-linter:copy-parsed': () => {
        const editor = atom.workspace.getActiveTextEditor();
        if (editor) {
          this.parser = new Parser(editor.getText(), editor.getPath() || '');
          const tree = this.parser.parse();
          let target: any = {};
          const filter = (object: any) => {
            const target: any = {};
            if (!object) {
              return;
            }
            for (const key of Object.keys(object)) {
              if (key === 'parent') {
                continue;
              } else if (Array.isArray(object[key])) {
                target[key] = object[key].map(filter);

              } else if (typeof object[key] === 'object') {
                target[key] = filter(object[key]);
              } else {
                target[key] = object[key];
              }
            }
            return target;
          };
          target = filter(tree);
          atom.clipboard.write(JSON.stringify(target));
          atom.notifications.addInfo('copied tree');
        }
      }
    }));
    this.projectParser = new ProjectParser(this.subscriptions);
  },

  deactivate(): void {
    this.subscriptions.dispose();
  },



  provideLinter() {
    return {
      name: 'Vhdl-Linter',
      scope: 'file', // or 'project'
      lintsOnChange: true, // or true
      grammarScopes: ['source.vhdl'],
      async lint(textEditor: TextEditor): Promise<Message[]> {
        // console.log('lint', this);

        const vhdlLinter = new VhdlLinter(textEditor.getPath() || '', textEditor.getText(), module.exports.projectParser);
        const messages = await vhdlLinter.checkAll();
        return messages;
      }
    };
  }

};
