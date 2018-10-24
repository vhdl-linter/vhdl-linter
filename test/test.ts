import {Parser} from '../lib/parser/parser';
import {AssignmentParser} from '../lib/parser/assignment-parser';
import {ParserPosition} from '../lib/parser/parser-position';

import * as fs from 'fs';
import * as util from 'util';
// let text = fs.readFileSync('./test/test2.vhdl').toString();
// let parser = new Parser(text, './test/test2.vhdl');
// const tree = parser.parse();
// console.log(util.inspect(tree, true, 3, true));
// const files = fs.readdirSync('./test');
// files.filter(file => file.match(/\.vhdl?/i)).forEach(file => {
//   console.log(`parsing ${file}`)
//   let parser = new Parser(fs.readFileSync('./test/' + file, {encoding: 'utf8'}), file);
//   const tree = parser.parse();
// })
// console.log(prettyjson.render(tree))

// const texyytCh = 's_wrdatafifoempty<= s_txDataFifoEmpty when r_fifoSelectData     else s_txCommandFifoEmpty;';
// const assignmentParser = new AssignmentParser(texyytCh, new ParserPosition(), 'YOLO', {});
// console.log(assignmentParser.parse());


import {VhdlLinter} from '../lib/index';
const filename = './test/test.vhd';
const vhdlLinter = new VhdlLinter(filename, fs.readFileSync(filename).toString());
console.log(util.inspect(vhdlLinter.checkAll(), true, 5));
