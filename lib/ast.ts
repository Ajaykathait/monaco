import parseJSON, { PropertyNode, ValueNode } from 'json-to-ast';

export interface Range {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

const getJsonReadOnlyRangesFallback = (code: string): Range[] => {
    const ranges: Range[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
        // Match "id": value
        const match = line.match(/^(\s*"id"\s*:\s*)(.+)$/);
        if (match) {
            const prefix = match[1];
            const value = match[2];
            // Basic check to ensure it's a scalar value
            if (value.trim() && !value.trim().startsWith('{') && !value.trim().startsWith('[')) {
                // Remove trailing comma if present
                let valueLength = value.length;
                if (value.trim().endsWith(',')) {
                    valueLength = value.lastIndexOf(',') - (value.length - value.trim().length); // Adjust for whitespace
                    // Simpler: just take length of trimmed value minus 1 if it ends with comma, plus leading whitespace
                    const trimmed = value.trim();
                    const leadingSpace = value.length - value.trimLeft().length;
                    valueLength = leadingSpace + (trimmed.endsWith(',') ? trimmed.length - 1 : trimmed.length);
                }

                ranges.push({
                    startLine: index + 1,
                    startColumn: prefix.length + 1,
                    endLine: index + 1,
                    endColumn: prefix.length + valueLength + 1
                });
            }
        }
    });
    return ranges;
};

const getJsonReadOnlyRanges = (code: string): Range[] => {
    try {
        const ast = parseJSON(code, { loc: true });
        const ranges: Range[] = [];

        const traverse = (node: ValueNode | PropertyNode) => {
            if (node.type === 'Object') {
                node.children.forEach(traverse);
            } else if (node.type === 'Array') {
                node.children.forEach(traverse);
            } else if (node.type === 'Property') {
                if (node.key.value === 'id') {
                    if (node.value.loc) {
                        ranges.push({
                            startLine: node.value.loc.start.line,
                            startColumn: node.value.loc.start.column,
                            endLine: node.value.loc.end.line,
                            endColumn: node.value.loc.end.column,
                        });
                    }
                }
                traverse(node.value);
            }
        };

        if (ast) {
            traverse(ast as unknown as ValueNode);
        }

        return ranges;
    } catch (e) {
        return getJsonReadOnlyRangesFallback(code);
    }
};

const getYamlReadOnlyRanges = (code: string): Range[] => {
    const ranges: Range[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
        // Match "id: value" or "- id: value"
        // This is a simple regex approach. It assumes standard formatting.
        const match = line.match(/^(\s*-?\s*id:\s*)(.+)$/);
        if (match) {
            const prefix = match[1];
            const value = match[2];
            // Basic check to ensure it's a scalar value (number or string) and not an object start
            if (value.trim() && !value.trim().startsWith('{') && !value.trim().startsWith('[')) {
                ranges.push({
                    startLine: index + 1,
                    startColumn: prefix.length + 1,
                    endLine: index + 1,
                    endColumn: prefix.length + value.length + 1
                });
            }
        }
    });
    return ranges;
};

const getXmlReadOnlyRanges = (code: string): Range[] => {
    const ranges: Range[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
        // Match <id>value</id>
        const match = line.match(/<id>(.*?)<\/id>/);
        if (match) {
            const fullMatch = match[0];
            const value = match[1];
            const startIndex = line.indexOf(fullMatch);
            const startColumn = startIndex + 4 + 1; // 4 is length of <id>

            ranges.push({
                startLine: index + 1,
                startColumn: startColumn,
                endLine: index + 1,
                endColumn: startColumn + value.length
            });
        }
    });
    return ranges;
};

export const getReadOnlyRanges = (code: string, format: string = 'json'): Range[] => {
    if (format === 'json') return getJsonReadOnlyRanges(code);
    if (format === 'yaml') return getYamlReadOnlyRanges(code);
    if (format === 'xml') return getXmlReadOnlyRanges(code);
    return [];
};
