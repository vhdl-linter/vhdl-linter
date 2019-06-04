import { TextEditor, CompositeDisposable } from 'atom';
import { VhdlLinter, Message } from './vhdl-linter';
import { Parser } from './parser/parser';
import { ProjectParser, OProjectEntity } from './project-parser';
import { browser } from './browser';
module.exports = {
  subscriptions: CompositeDisposable,
  projectParser: ProjectParser,
  parser: Parser,
  activate(): void {
    //    console.log('activate', this);
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();
    //    console.log(browser);
    // browser.getView();
    atom.workspace.addRightPanel({
      item: browser.getView()
    });
    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'vhdl-linter:copy-parsed': () => {
        //        console.log('activat2e', this);
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
  },

  provideHyper() {
    return {
      priority: 1,
      grammarScopes: ['source.vhdl'], // JavaScript files
      wordRegExp: /entity\s+[a-z][\w.]*/ig,
      getSuggestionForWord: async (
        textEditor: TextEditor,
        text: string,
        range: Range
      ) => {
        console.log(text, range);
        const match = text.match(/(entity\s+)(\w+)\.(\w+)/i);
        if (!match) {
          return;
        }
        const [, whatever, library, entityName] = match;
        const entities = (await this.projectParser.getEntities()).filter((entity: OProjectEntity) => {
          return entity.name === entityName && (entity.library ? entity.library === library : true);
        });
        return {
          range,
          callback() {
            console.log('callback', entities);
            atom.workspace.open(entities[0].file.getPath());
          },
        };
      },
    };
  }
};
