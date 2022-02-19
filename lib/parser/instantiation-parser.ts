import { TextEdit } from 'vscode-languageserver';
import { AssociationListParser } from './association-list-parser';
import { OArchitecture, OAssociation, OAssociationFormal, ObjectBase, OEntity, OGenericAssociationList, OI, OInstantiation, OIRange, OName, OPortAssociationList, ParserError } from './objects';
import { ParserBase } from './parser-base';

export class InstantiationParser extends ParserBase {
  constructor(text: string, pos: OI, file: string, private parent: OArchitecture | OEntity) {
    super(text, pos, file);
    this.debug(`start`);

  }
  parse(nextWord: string, label: string | undefined, startI: number, procedure: boolean): OInstantiation {
    const instantiation = new OInstantiation(this.parent, startI, this.getEndOfLineI(), procedure ? 'procedure' : 'component');
    instantiation.label = label;
    const savedI = this.pos.i;
    if (procedure) {
      nextWord = this.getNextWord({ re: /^[\w.]+/ }).toLowerCase();
    } else {
      if (nextWord === 'entity') {
        instantiation.type = 'entity';
        nextWord = this.getNextWord({ re: /^[\w.]+/ });
        let libraryMatch = nextWord.match(/^(.*)\./i);
        if (!libraryMatch) {
          throw new ParserError(`Can not parse entity instantiation`, this.pos.getRangeToEndLine());
        }
        instantiation.library = libraryMatch[1];
      } else if (nextWord === 'component') {
        nextWord = this.getNextWord({ re: /^[\w.]+/ }).toLowerCase();
      }
    }
    const name = nextWord.replace(/^.*\./, '');
    instantiation.componentName = new OName(instantiation, savedI, savedI + nextWord.length);
    instantiation.componentName.text = name;
    let hasPortMap = false;
    let lastI;
    while (this.text[this.pos.i] !== ';') {
      const savedI = this.pos.i;
      //       console.log(nextWord, 'nextWord');
      if (procedure) {

        instantiation.portAssociationList = new AssociationListParser(this.text, this.pos, this.file, instantiation).parse();
        hasPortMap = true;
      } else {
        nextWord = this.getNextWord().toLowerCase();
        if (nextWord === 'port') {
          hasPortMap = true;
          this.expect('map');
          instantiation.portAssociationList = new AssociationListParser(this.text, this.pos, this.file, instantiation).parse();

        } else if (nextWord === 'generic') {
          this.expect('map');
          instantiation.genericAssociationList = new AssociationListParser(this.text, this.pos, this.file, instantiation).parse('generic');
        }
      }
      if (lastI === this.pos.i) {
        throw new ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.getRangeToEndLine());
      }
      lastI = this.pos.i;
    }
    instantiation.range.end.i = this.expect(';');
    if (!hasPortMap) {
      throw new ParserError(`Instantiation has no Port Map`, this.pos.getRangeToEndLine());
    }
    return instantiation;
  }
}
