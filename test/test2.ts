import {tokenizer} from '../lib/parser/tokenizer';
console.log(tokenizer.tokenize('s_emptyDataA(i)', []));
class Counter implements Iterable<number> {
    arr = ['a', 'b'];
    public [Symbol.iterator]() {
        let counter = 0;
        return {
            next: function () {
                return {
                    done: counter === this.arr.length,
                    value: this.arr[counter++]
                };
            }.bind(this)
        };
    }
}
let c = new Counter();
for (let i of c) console.log(i);
console.log('ccc');
for (let i of c) console.log(i);
