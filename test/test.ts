import {Parser} from '../lib/parser/parser';
import {AssignmentParser} from '../lib/parser/assignment-parser';
import {ParserPosition} from '../lib/parser/parser-position';

import * as fs from 'fs';
import * as util from 'util';
import * as prettyjson from 'prettyjson';
let text = fs.readFileSync('./test/_test.vhd').toString();
let parser = new Parser(text, './test/_test.vhd');
const tree = parser.parse();
console.log(JSON.stringify(tree, null, 2))
const files = fs.readdirSync('./test');
// files.filter(file => file.match(/\.vhdl?/i)).forEach(file => {
//   console.log(`parsing ${file}`)
//   let parser = new Parser(fs.readFileSync('./test/' + file, {encoding: 'utf8'}), file);
//   const tree = parser.parse();
// })
// console.log(prettyjson.render(tree))

const texyytCh = 's_wrdatafifoempty<= s_txDataFifoEmpty when r_fifoSelectData     else s_txCommandFifoEmpty;';
const assignmentParser = new AssignmentParser(texyytCh, new ParserPosition(), 'YOLO');
console.log(assignmentParser.parse());
