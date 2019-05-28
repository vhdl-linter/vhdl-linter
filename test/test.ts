import {Parser} from '../lib/parser/parser';
import {AssignmentParser} from '../lib/parser/assignment-parser';
import {ParserPosition} from '../lib/parser/parser-position';
import {ParserBase} from '../lib/parser/parser-base';
import * as glob from 'glob';


import * as fs from 'fs';
import * as util from 'util';
// const files = fs.readdirSync('./test');
// files.filter(file => file.match(/\.vhdl?/i)).forEach(file => {
// //   console.log(`parsing ${file}`)
//   let parser = new Parser(fs.readFileSync('./test/' + file, {encoding: 'utf8'}), file);
//   const tree = parser.parse();
// })
// // console.log(prettyjson.render(tree))

// const texyytCh = 's_wrdatafifoempty<= s_txDataFifoEmpty when r_fifoSelectData     else s_txCommandFifoEmpty;';
// const assignmentParser = new AssignmentParser(texyytCh, new ParserPosition(), 'YOLO', {});
// // console.log(assignmentParser.parse());


// const filename = '/home/schulte/Documents/work/TCP/svn_ESG_netstack/branches/0-1.schulte/_src/SpeedApplication2/_sim/../../UDPStack_TX/_src/ICMPHandler.vhd';
//
// let text = fs.readFileSync(filename).toString();
// let parser = new Parser(text, filename);
// const tree = parser.parse();
// // console.log(util.inspect(tree, true, 3, true));
// const vhdlLinter = new VhdlLinter(filename, fs.readFileSync(filename).toString());
// // console.log(util.inspect(vhdlLinter.checkAll(), true, 5));
//
// glob("/home/schulte/Documents/work/TCP/svn_ESG_netstack/branches/0-1.schulte/**/*.vhd", function (er, files) {
//   for (const filename of files) {
// //     console.log(`starting: ${filename}`);
//     let text = fs.readFileSync(filename).toString();
//     try {
//       let parser = new Parser(text, filename);
//       const tree = parser.parse();
// //       console.log(`done: ${filename}`);
//     } catch(e) {
//       console.error(e);
//     }
//   }
// })
const parserBase = new ParserBase('yolo', new ParserPosition(), 'yolo.txt');
//
console.log(parserBase.extractReadsOrWrite(new ParserPosition, `  (s_PlaneDatum, s_NBinVec)`, 5));
