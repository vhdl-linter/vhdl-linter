import { Position } from 'vscode-languageserver';
import { findObjectFromPosition } from './languageFeatures/findObjects';
import { OArchitecture, OEntity, OGeneric, OPort } from './parser/objects';
import { ISettings } from './settingsGenerated';
import { VhdlLinter } from './vhdlLinter';


function longestInArray(array: OPort[] | OGeneric[]) {
    let longest = 0;
    for (const object of array) {
        if (object.lexerToken.text.length > longest) {
            longest = object.lexerToken.text.length;
        }
    }
    return longest;
}
export function instanceTemplate(entity: OEntity, settings: ISettings) {
    let text = `${settings.style.instantiationLabelPrefix}${entity.lexerToken.text}${settings.style.instantiationLabelSuffix} : entity work.${entity.lexerToken.text}`;
    const indentString = '  ';
    if (entity.generics.length > 0) {
        text += `\ngeneric map (\n`;
        const longest = longestInArray(entity.generics);
        for (const generic of entity.generics) {
            const name = generic.lexerToken.text.padEnd(longest, ' ');
            text += `${indentString}${name} => ${settings.style.genericPrefix}${generic.lexerToken.text}${settings.style.genericSuffix},\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }

    if (entity.ports.length > 0) {
        text += `\nport map (\n`;
        const longest = longestInArray(entity.ports);
        for (const port of entity.ports) {
            const name = port.lexerToken.text.padEnd(longest, ' ');
            text += `${indentString}${name} => ${settings.style.signalPrefix}${port.lexerToken.text}${settings.style.signalSuffix},\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }

    text += `;\n`;
    return text;
}
export function componentTemplate(entity: OEntity) {
    let text = `component ${entity.lexerToken.text} is`;
    const indentString = '  ';
    if (entity.generics.length > 0) {
        text += `\ngeneric (\n`;
        for (const generic of entity.generics) {
            text += `${indentString}${generic.range.getText()};\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n);`;
    }

    if (entity.ports.length > 0) {
        text += `\nport (\n`;
        for (const port of entity.ports) {
            text += `${indentString}${port.range.getText()};\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n);`;
    }

    text += `\nend component;\n`;
    return text;
}

export function sysVerilogTemplate(entity: OEntity, settings: ISettings) {
    let text = entity.lexerToken.text;
    const indentString = '  ';
    if (entity.generics.length > 0) {
        text += ` #(\n`;
        const longest = longestInArray(entity.generics);
        for (const generic of entity.generics) {
            const name = generic.lexerToken.text.padEnd(longest, ' ');
            text += `${indentString}.${name}(${settings.style.genericPrefix}${generic.lexerToken.text}${settings.style.genericSuffix}),\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }

    if (entity.ports.length > 0) {
        text += ` ${settings.style.instantiationLabelPrefix}${entity.lexerToken.text}${settings.style.instantiationLabelSuffix} (\n`;
        const longest = longestInArray(entity.ports);
        for (const port of entity.ports) {
            const name = port.lexerToken.text.padEnd(longest, ' ');
            text += `${indentString}.${name}(${settings.style.signalPrefix}${port.lexerToken.text}${settings.style.signalSuffix}),\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }

    text += `;\n`;
    return text;
}
export function signalsTemplate(entity: OEntity, settings: ISettings) {
    let text = '';
    if (entity.ports.length > 0) {
        const longest = longestInArray(entity.ports);
        for (const port of entity.ports) {
            const name = port.lexerToken.text.padEnd(longest, ' ');
            let typeText: string | undefined;
            if (port.subtypeIndication.typeNames.length > 0) {
                typeText = port.subtypeIndication.typeNames[0]!.range.copyWithNewEnd(port.range.end).getText();
            }
            text += `signal ${settings.style.signalPrefix}${name}${settings.style.signalSuffix} : ${typeText ?? 'unknown_type'};\n`;
        }
    }
    return text;
}
export type converterTypes = 'instance' | 'signals' | 'sysverilog' | 'component';
export function entityConverter(vhdlLinter: VhdlLinter, type: converterTypes, settings: ISettings, position?: Position) {
    let entity;
    if (position === undefined) {
        entity = vhdlLinter.file.entities[0];
    } else {
        const rootElement = findObjectFromPosition(vhdlLinter, position)[0]?.getRootElement();
        if (rootElement instanceof OEntity) {
            entity = rootElement;
        } else if (rootElement instanceof(OArchitecture) && rootElement.correspondingEntity) {
            entity = rootElement.correspondingEntity;
        } else {
            // Fallback to first entity
            entity = vhdlLinter.file.entities[0];
        }
    }
    if (!entity) {
        return;
    }
    if (type === 'instance') {
        return instanceTemplate(entity, settings);
    } else if (type === 'signals') {
        return signalsTemplate(entity, settings);
    } else if (type === 'sysverilog') {
        return sysVerilogTemplate(entity, settings);
    } else if (type === 'component') {
        return componentTemplate(entity);
    }
}