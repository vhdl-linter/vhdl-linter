import { AssociationListParser } from './association-list-parser';
import { OArchitecture, OEntity, OInstantiation, OIRange, OName, ParserError } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';

export class InstantiationParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: OArchitecture | OEntity) {
    super(pos, file);
    this.debug(`start`);

  }
  parse(nextWord: string, label: string | undefined, startI: number): OInstantiation {
    const instantiation = new OInstantiation(this.parent, new OIRange(this.parent, startI, this.getEndOfLineI()));
    instantiation.label = label;
    const savedI = this.pos.i;
    if (nextWord === 'entity') {
      this.getNextWord();
      instantiation.type = 'entity';
      const libraryToken = this.consumeToken();
      this.expect('.');
      instantiation.library = libraryToken.text;
    } else if (nextWord === 'component') {
      this.getNextWord();
      instantiation.type = 'component';
    }
    // all names may have multiple '.' in them...
    nextWord = this.getNextWord().toLowerCase();
    while (this.getToken().text === '.') {
      this.consumeToken();
      nextWord = this.getNextWord().toLowerCase();
    }
    const name = nextWord.replace(/^.*\./, '');
    instantiation.componentName = new OName(instantiation, new OIRange(this.parent, savedI, savedI + nextWord.length));
    instantiation.componentName.text = name;
    let hasPortMap = false;
    let hasGenericMap = false;
    let lastI;
    while (this.getToken().getLText() !== ';') {
      nextWord = this.getNextWord({consume: false}).toLowerCase();
      if (nextWord === 'port' && instantiation.type !== 'subprogram') {
        if (instantiation.type === 'unknown') {
          instantiation.type = 'component';
        }
        hasPortMap = true;
        this.getNextWord();
        this.expect('map');
        instantiation.portAssociationList = new AssociationListParser(this.pos, this.filePath, instantiation).parse();

      } else if (nextWord === 'generic' && instantiation.type !== 'subprogram') {
        if (instantiation.type === 'unknown') {
          instantiation.type = 'component';
        }
        hasGenericMap = true;
        this.getNextWord();
        this.expect('map');
        instantiation.genericAssociationList = new AssociationListParser(this.pos, this.filePath, instantiation).parse('generic');
      } else if (nextWord === '(' && !hasGenericMap && !hasPortMap) { // is subprogram call
        instantiation.type = 'subprogram';
        instantiation.portAssociationList = new AssociationListParser(this.pos, this.filePath, instantiation).parse();
      }
      if (lastI === this.pos.i) {
        throw new ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.getRangeToEndLine());
      }
      lastI = this.pos.i;
    }
    instantiation.range = instantiation.range.copyWithNewEnd(this.getToken(-1, true).range.end);
    this.expect(';');
    return instantiation;
  }
}
