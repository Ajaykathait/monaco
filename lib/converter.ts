import yaml from 'js-yaml';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export type Format = 'json' | 'yaml' | 'xml';

export interface ConversionResult {
    data: any;
    error?: string;
}

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: true,
});

const xmlBuilder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: "  ",
});

export const parseContent = (content: string, format: Format): ConversionResult => {
    try {
        let data;
        if (format === 'json') {
            data = JSON.parse(content);
        } else if (format === 'yaml') {
            data = yaml.load(content);
        } else if (format === 'xml') {
            data = xmlParser.parse(content);
            // Flatten root if it exists and is the only key
            if (data && typeof data === 'object' && Object.keys(data).length === 1 && 'root' in data) {
                const inner = data['root'];
                // Only flatten if inner is an object (including array), otherwise we lose the root tag for primitives
                if (typeof inner === 'object' && inner !== null) {
                    data = inner;
                }
            }
        }
        return { data };
    } catch (e: any) {
        return { data: null, error: e.message };
    }
};

export const convertContent = (data: any, targetFormat: Format): string => {
    if (data === null || data === undefined) return '';

    try {
        if (targetFormat === 'json') {
            return JSON.stringify(data, null, 2);
        } else if (targetFormat === 'yaml') {
            return yaml.dump(data, { indent: 2 });
        } else if (targetFormat === 'xml') {
            // Flatten root if it exists in data before converting to XML
            let xmlData = data;
            if (xmlData && typeof xmlData === 'object' && Object.keys(xmlData).length === 1 && 'root' in xmlData) {
                const inner = xmlData['root'];
                // Only flatten if inner is an object (including array), otherwise we lose the root tag for primitives
                if (typeof inner === 'object' && inner !== null) {
                    xmlData = inner;
                }
            }

            // XML requires a single root element. If data is an array or has multiple keys, wrap it.
            if (Array.isArray(xmlData)) {
                xmlData = { root: { item: xmlData } };
            } else if (typeof xmlData === 'object' && xmlData !== null) {
                const keys = Object.keys(xmlData);
                if (keys.length > 1 || (keys.length === 1 && keys[0] !== 'root' && Array.isArray(xmlData[keys[0]]))) {
                    if (keys.length > 1) {
                        xmlData = { root: xmlData };
                    }
                }
            }
            return xmlBuilder.build(xmlData);
        }
    } catch (e) {
        console.error("Conversion error", e);
        return String(e);
    }
    return '';
};

export const detectFormat = (content: string): Format => {
    const trimmed = content.trim();
    if (trimmed.startsWith('<')) return 'xml';
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
    return 'yaml'; // Default fallback
};
