import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, verbose: true });

export interface ValidationError {
    path: string;
    message: string;
    line?: number;
    column?: number;
}

export const validateSchema = (data: any, schema: any): ValidationError[] => {
    try {
        const validate = ajv.compile(schema);
        const valid = validate(data);
        if (!valid && validate.errors) {
            return validate.errors.map(err => ({
                path: err.instancePath,
                message: err.message || 'Unknown error',
            }));
        }
        return [];
    } catch (e: any) {
        return [{ path: '', message: `Schema error: ${e.message}` }];
    }
};

export const validateSyntax = (content: string, format: 'json' | 'yaml' | 'xml'): ValidationError[] => {
    // Basic syntax check is often handled by the parser in `parseContent` or the editor itself.
    // But we can add explicit checks here if needed.
    // For now, returning empty as Monaco handles syntax errors visually.
    return [];
};

export const generateStrictSchema = (data: any): any => {
    if (data === null) return { type: 'null' };
    if (Array.isArray(data)) {
        const itemSchemas = data.length > 0 ? generateStrictSchema(data[0]) : {};
        return {
            type: 'array',
            items: itemSchemas,
        };
    }
    if (typeof data === 'object') {
        const properties: Record<string, any> = {};
        const required: string[] = [];
        Object.keys(data).forEach(key => {
            properties[key] = generateStrictSchema(data[key]);
            required.push(key);
        });
        return {
            type: 'object',
            properties,
            required,
            additionalProperties: false,
        };
    }
    return { type: typeof data };
};

export const validateDuplicates = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (data && Array.isArray(data.questions)) {
        const seenIds = new Map<number, number>(); // id -> index
        data.questions.forEach((q: any, index: number) => {
            if (q && typeof q.id === 'number') {
                if (seenIds.has(q.id)) {
                    errors.push({
                        path: `/questions/${index}/id`,
                        message: `Duplicate ID found: ${q.id}. IDs must be unique.`
                    });
                    // Also add error for the first occurrence if not already added
                    const firstIndex = seenIds.get(q.id)!;
                    // We don't want to spam errors, but technically both are invalid in a unique set.
                    // For simplicity, we'll just flag the duplicates as they are encountered.
                } else {
                    seenIds.set(q.id, index);
                }
            }
        });
    }
    return errors;
};
