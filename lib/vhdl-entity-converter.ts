import * as vscode from 'vscode';
import {VhdlLinter} from './vhdl-linter';
import { ProjectParser } from './project-parser';
import { OFileWithEntity, OEntity, OPort, OGeneric } from './parser/objects';
import { EntityParser } from './parser/entity-parser';
function getEntity() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const vhdlLinter = new VhdlLinter(editor.document.uri.path, editor.document.getText(), new ProjectParser([]), true);
    if (vhdlLinter.tree instanceof OFileWithEntity) {
        return vhdlLinter.tree.entity;
    }
}
export enum CopyTypes {
    Instance, Sysverilog, Signals
}
export function copy(type: CopyTypes) {
    const entity = getEntity();
    if (!entity) {
        return;
    }
    let text: string;
    if (type === CopyTypes.Instance) {
        text = instanceTemplate(entity);
    } else if (type === CopyTypes.Signals) {
        text = signalsTemplate(entity);
    } else if (type === CopyTypes.Sysverilog) {
        text = sysVerilogTemplate(entity);
    } else {
        text = '';
    }
    vscode.env.clipboard.writeText(text);
    vscode.window.showInformationMessage(`Instance for '${entity.name}' copied to the clipboard`);

}
function longestinArray(array: OPort[]|OGeneric[]) {
    let longest = 0;
    for (let object of array) {
        if (object.name.text.length > longest) {
            longest = object.name.text.length;
        }
    }
    return longest;
}

function instanceTemplate(entity: OEntity) {
    let text = `inst_${entity.name} : entity work.${entity.name}`;
    const indentString = '  ';
    if (entity.generics.length > 0) {
        text += `\ngeneric map (\n`;
        const longest = longestinArray(entity.generics);
        for (let generic of entity.generics) {
            const name = generic.name.text.padEnd(longest, ' ');
            text += `${indentString}${name} => ${generic.name},\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }

    if (entity.ports.length > 0) {
        text += `\nport map (\n`;
        const longest = longestinArray(entity.ports);
        for (let port of entity.ports) {
            const name = port.name.text.padEnd(longest, ' ');
            text += `${indentString}${name} => ${port.name},\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }

    text += `;\n`;
    return text;
}

function sysVerilogTemplate(entity: OEntity) {
    let text = entity.name;
    const indentString = '  ';
    if (entity.generics.length > 0) {
        text += ` #(\n`;
        const longest = longestinArray(entity.generics);
        for (let generic of entity.generics) {
            const name = generic.name.text.padEnd(longest, ' ');
            text += `${indentString}.${name}(dut_${generic.name}),\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }

    if (entity.ports.length > 0) {
        text += ` i_dut (\n`;
        const longest = longestinArray(entity.ports);
        for (let port of entity.ports) {
            const name = port.name.text.padEnd(longest, ' ');
            text += `${indentString}.${name}(dut_s_${port.name}),\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }

    text += `;\n`;
    return text;
}
function signalsTemplate(entity: OEntity) {
    let text = '';
    if (entity.ports.length > 0) {
        const longest = longestinArray(entity.ports);
        for (let port of entity.ports) {
            const name = port.name.text.padEnd(longest, ' ');
            text += `signal s_${name} : ${port.type};\n`;
        }
    }
    return text;
}