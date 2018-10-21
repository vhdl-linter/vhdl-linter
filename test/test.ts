import {Parser} from '../lib/parser/parser';
import * as fs from 'fs';
import * as util from 'util';
import * as prettyjson from 'prettyjson';
let text = fs.readFileSync('./test/test3.vhd').toString();
let parser = new Parser(text);
const tree = parser.parse();
console.log(JSON.stringify(tree, null, 2))
const files = fs.readdirSync('./test');
files.filter(file => file.match(/\.vhdl?/i)).forEach(file => {
  console.log(`parsing ${file}`)
  let parser = new Parser(fs.readFileSync('./test/' + file, {encoding: 'utf8'}));
  const tree = parser.parse();
})
// console.log(prettyjson.render(tree))
