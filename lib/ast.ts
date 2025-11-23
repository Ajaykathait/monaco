import parseJSON, { PropertyNode, ValueNode } from 'json-to-ast';

export interface Range {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

interface IdOccurrence {
    value: string | number;
    range: Range;
}

export interface FixableRange {
    range: Range;
    newValue: number;
}

const filterUniqueIds = (occurrences: IdOccurrence[]): Range[] => {
    const counts = new Map<string | number, number>();
    occurrences.forEach(occ => {
        const val = occ.value;
        counts.set(val, (counts.get(val) || 0) + 1);
    });

    return occurrences
        .filter(occ => counts.get(occ.value) === 1)
        .map(occ => occ.range);
};

const getJsonIdOccurrencesFallback = (code: string): IdOccurrence[] => {
    const occurrences: IdOccurrence[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
        // Match "id": value
        const match = line.match(/^(\s*"id"\s*:\s*)(.+)$/);
        if (match) {
            const prefix = match[1];
            const valueStr = match[2];
            // Basic check to ensure it's a scalar value
            if (valueStr.trim() && !valueStr.trim().startsWith('{') && !valueStr.trim().startsWith('[')) {
                // Remove trailing comma if present
                let valueLength = valueStr.length;
                let cleanValue = valueStr.trim();
                if (cleanValue.endsWith(',')) {
                    cleanValue = cleanValue.slice(0, -1);
                    const trimmed = valueStr.trim();
                    const leadingSpace = valueStr.length - valueStr.trimLeft().length;
                    valueLength = leadingSpace + (trimmed.endsWith(',') ? trimmed.length - 1 : trimmed.length);
                }

                // Try to parse value to handle numbers/strings correctly for comparison
                let parsedValue: string | number = cleanValue;
                if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
                    parsedValue = cleanValue.slice(1, -1);
                } else if (!isNaN(Number(cleanValue))) {
                    parsedValue = Number(cleanValue);
                }

                occurrences.push({
                    value: parsedValue,
                    range: {
                        startLine: index + 1,
                        startColumn: prefix.length + 1,
                        endLine: index + 1,
                        endColumn: prefix.length + valueLength + 1
                    }
                });
            }
        }
    });
    return occurrences;
};

const getJsonIdOccurrences = (code: string): IdOccurrence[] => {
    try {
        const ast = parseJSON(code, { loc: true });
        const occurrences: IdOccurrence[] = [];

        const traverse = (node: ValueNode | PropertyNode) => {
            if (node.type === 'Object') {
                node.children.forEach(traverse);
            } else if (node.type === 'Array') {
                node.children.forEach(traverse);
            } else if (node.type === 'Property') {
                if (node.key.value === 'id') {
                    if (node.value.loc && node.value.type === 'Literal') {
                        const val = node.value.value;
                        if (typeof val === 'string' || typeof val === 'number') {
                            occurrences.push({
                                value: val,
                                range: {
                                    startLine: node.value.loc.start.line,
                                    startColumn: node.value.loc.start.column,
                                    endLine: node.value.loc.end.line,
                                    endColumn: node.value.loc.end.column,
                                }
                            });
                        }
                    }
                }
                traverse(node.value);
            }
        };

        if (ast) {
            traverse(ast as unknown as ValueNode);
        }

        return occurrences;
    } catch (e) {
        return getJsonIdOccurrencesFallback(code);
    }
};

const getYamlIdOccurrences = (code: string): IdOccurrence[] => {
    const occurrences: IdOccurrence[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
        // Match "id: value" or "- id: value"
        const match = line.match(/^(\s*-?\s*id:\s*)(.+)$/);
        if (match) {
            const prefix = match[1];
            const valueStr = match[2];
            if (valueStr.trim() && !valueStr.trim().startsWith('{') && !valueStr.trim().startsWith('[')) {
                let cleanValue = valueStr.trim();
                let parsedValue: string | number = cleanValue;
                if (!isNaN(Number(cleanValue))) {
                    parsedValue = Number(cleanValue);
                }

                occurrences.push({
                    value: parsedValue,
                    range: {
                        startLine: index + 1,
                        startColumn: prefix.length + 1,
                        endLine: index + 1,
                        endColumn: prefix.length + valueStr.length + 1
                    }
                });
            }
        }
    });
    return occurrences;
};

const getXmlIdOccurrences = (code: string): IdOccurrence[] => {
    const occurrences: IdOccurrence[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
        // Match <id>value</id>
        const match = line.match(/<id>(.*?)<\/id>/);
        if (match) {
            const fullMatch = match[0];
            const valueStr = match[1];
            const startIndex = line.indexOf(fullMatch);
            const startColumn = startIndex + 4 + 1; // 4 is length of <id>

            let parsedValue: string | number = valueStr;
            if (!isNaN(Number(valueStr))) {
                parsedValue = Number(valueStr);
            }

            occurrences.push({
                value: parsedValue,
                range: {
                    startLine: index + 1,
                    startColumn: startColumn,
                    endLine: index + 1,
                    endColumn: startColumn + valueStr.length
                }
            });
        }
    });
    return occurrences;
};

const findAllIds = (code: string, format: string): IdOccurrence[] => {
    if (format === 'json') return getJsonIdOccurrences(code);
    if (format === 'yaml') return getYamlIdOccurrences(code);
    if (format === 'xml') return getXmlIdOccurrences(code);
    return [];
};

export const getReadOnlyRanges = (code: string, format: string = 'json'): Range[] => {
    const occurrences = findAllIds(code, format);
    return occurrences.map(occ => occ.range);
};

export const getFixableDuplicateRanges = (code: string, format: string): FixableRange[] => {
    const occurrences = findAllIds(code, format);
    const fixes: FixableRange[] = [];
    const seen = new Set<string | number>();
    let maxId = 0;

    // First pass: find max ID
    occurrences.forEach(occ => {
        if (typeof occ.value === 'number' && occ.value > maxId) {
            maxId = occ.value;
        }
    });

    // Second pass: identify duplicates
    occurrences.forEach(occ => {
        if (seen.has(occ.value)) {
            maxId++;
            fixes.push({
                range: occ.range,
                newValue: maxId
            });
        } else {
            seen.add(occ.value);
        }
    });

    return fixes;
};
