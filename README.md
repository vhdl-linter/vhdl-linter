# vhdl-linter
Introducing the open-source VHDL Linter, written in TypeScript and thoroughly unit-tested for maximum reliability. Our linter is the perfect tool for checking your VHDL code for errors and ensuring that it adheres to coding standards. With its advanced analysis engine, written in TypeScript, the VHDL Linter can quickly and easily identify any issues in your code, such as syntax errors or suboptimal coding practices. Plus, our extensive unit testing ensures that the linter is reliable and accurate, so you can trust the results it provides. Try the VHDL Linter today and see the difference it can make in your design process.

(written by ChatGPT)

![Node CI](https://github.com/vhdl-linter/vhdl-linter/actions/workflows/node.js.yml/badge.svg?branch=main)
![VUnit Compile](https://github.com/vhdl-linter/vhdl-linter/actions/workflows/vunit_compile.yml/badge.svg?branch=main)
![TS Lint](https://github.com/vhdl-linter/vhdl-linter/actions/workflows/tslint.yml/badge.svg?branch=main)

![version](https://vsmarketplacebadges.dev/version-short/g0t00.vhdl-linter.png)
![installs](https://vsmarketplacebadges.dev/installs-short/g0t00.vhdl-linter.png)

# Features (list is still incomplete)
## Project wide rename support
Most identifier can be renamed with the project wide rename feature.
This includes:
- ports
- signals
- package names
- entity names
- project wide definitions in packages (types, functions, etc.)

![rename](./doc/rename.gif)

## Signature Help
Show the signature of the object being instantiated.
Currently working for instantiation of:
- entities
- procedures
- components

Signature help is not yet supported for calling of functions.
![signature-helper](./doc/signature-help.png)
![signature-helper-long](./doc/signature-help2.png)

## Region Folding
Fold regions according to the file content:
- declarations
- statements
- use clauses (incl. library)
- interface lists
- special blocks like instantiations, association lists, case (generate), types (record and protected)

## Style checking
Checks custom naming styles:
![namingStyle](./doc/namingStyle.gif)

## Entity Converter
Automatically convert entities to a commonly used template:
- instantiation
- component
- SystemVerilog instantiation
- ports to signals
![entityConverter](./doc/entityConverter.gif)

## Target library inference
The target library of vhdl design units is parsed from [csv files like vunit](https://vunit.github.io/py/vunit.html#vunit.ui.VUnit.add_source_files_from_csv) in the format
```libary,filename```
- The library is used for auto completion, reference checking and template generation (e.g. instantiation template for entities)