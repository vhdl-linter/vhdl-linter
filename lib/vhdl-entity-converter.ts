import * as vscode from 'vscode';
import { OEntity, OGeneric, OPort } from './parser/objects';
import { ProjectParser } from './project-parser';
import { VhdlLinter } from './vhdl-linter';
import { clientConfigurationGetter } from './vscode';
async function getEntity() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const vhdlLinter = new VhdlLinter(editor.document.uri.path, editor.document.getText(), await ProjectParser.create([], '', clientConfigurationGetter), clientConfigurationGetter, true);
    if (vhdlLinter.file.entities[0] !== undefined) {
        return vhdlLinter.file.entities[0];
    }
}
export enum CopyTypes {
    Instance, Sysverilog, Signals
}
export async function copy(type: CopyTypes) {
    const entity = await getEntity();
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
    vscode.window.showInformationMessage(`Instance for '${entity.lexerToken}' copied to the clipboard`);

}
function longestinArray(array: OPort[]|OGeneric[]) {
    let longest = 0;
    for (const object of array) {
        if (object.lexerToken.text.length > longest) {
            longest = object.lexerToken.text.length;
        }
    }
    return longest;
}
// TODO: Make the formatting configurable
function instanceTemplate(entity: OEntity) {
    let text = `inst_${entity.lexerToken} : entity work.${entity.lexerToken}`;
    const indentString = '  ';
    if (entity.generics.length > 0) {
        text += `\ngeneric map (\n`;
        const longest = longestinArray(entity.generics);
        for (const generic of entity.generics) {
            const name = generic.lexerToken.text.padEnd(longest, ' ');
            text += `${indentString}${name} => ${generic.lexerToken},\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }

    if (entity.ports.length > 0) {
        text += `\nport map (\n`;
        const longest = longestinArray(entity.ports);
        for (const port of entity.ports) {
            const name = port.lexerToken.text.padEnd(longest, ' ');
            text += `${indentString}${name} => ${port.lexerToken},\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }

    text += `;\n`;
    return text;
}

function sysVerilogTemplate(entity: OEntity) {
    let text = entity.lexerToken.text;
    const indentString = '  ';
    if (entity.generics.length > 0) {
        text += ` #(\n`;
        const longest = longestinArray(entity.generics);
        for (const generic of entity.generics) {
            const name = generic.lexerToken.text.padEnd(longest, ' ');
            text += `${indentString}.${name}(dut_${generic.lexerToken}),\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }

    if (entity.ports.length > 0) {
        text += ` i_dut (\n`;
        const longest = longestinArray(entity.ports);
        for (const port of entity.ports) {
            const name = port.lexerToken.text.padEnd(longest, ' ');
            text += `${indentString}.${name}(dut_s_${port.lexerToken}),\n`;
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
        for (const port of entity.ports) {
            const name = port.lexerToken.text.padEnd(longest, ' ');
            text += `signal s_${name} : ${port.typeReference};\n`;
        }
    }
    return text;
}