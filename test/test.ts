import {Parser} from '../lib/parser/parser';
import * as fs from 'fs';
import * as util from 'util';
import * as prettyjson from 'prettyjson';
let text = fs.readFileSync('./test/test.vhd').toString();
let parser = new Parser(text);
const tree = parser.parse();
console.log(JSON.stringify(tree, null, 2))
// console.log(prettyjson.render(tree))
