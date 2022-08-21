import { AssociationListParser } from './association-list-parser';
import { OArchitecture, OAssociation, OAssociationFormal, ObjectBase, OEntity, OGenericAssociationList, OI, OInstantiation, OIRange, OName, OPortAssociationList, ParserError } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';

export class InstantiationParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: OArchitecture | OEntity) {
    super(pos, file);
    this.debug(`start`);

  }
  parse(nextWord: string, label: string | undefined, startI: number, procedure: boolean): OInstantiation {
    const instantiation = new OInstantiation(this.parent, startI, this.getEndOfLineI(), procedure ? 'subprogram' : 'component');
    instantiation.label = label;
    const savedI = this.pos.i;
    if (procedure) {
      nextWord = this.getNextWord().toLowerCase();
      while (this.getToken().text === '.') {
        this.consumeToken();
        nextWord = this.getNextWord().toLowerCase();
      }
    } else {
      if (nextWord === 'entity') {
        instantiation.type = 'entity';
        const libraryToken = this.consumeToken();
        this.expect('.');
        instantiation.library = libraryToken.text;
      } else if (nextWord === 'component') {
        nextWord = this.getNextWord().toLowerCase();
      }
    }
    const name = nextWord.replace(/^.*\./, '');
    instantiation.componentName = new OName(instantiation, savedI, savedI + nextWord.length);
    instantiation.componentName.text = name;
    let hasPortMap = false;
    let lastI;
    while (this.getToken().getLText() !== ';') {
      const savedI = this.pos.i;
      //       console.log(nextWord, 'nextWord');
      if (procedure) {

        instantiation.portAssociationList = new AssociationListParser(this.pos, this.filePath, instantiation).parse();
        hasPortMap = true;
      } else {
        nextWord = this.getNextWord().toLowerCase();
        if (nextWord === 'port') {
          hasPortMap = true;
          this.expect('map');
          instantiation.portAssociationList = new AssociationListParser(this.pos, this.filePath, instantiation).parse();

        } else if (nextWord === 'generic') {
          this.expect('map');
          instantiation.genericAssociationList = new AssociationListParser(this.pos, this.filePath, instantiation).parse('generic');
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
