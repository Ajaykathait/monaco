
export const fixDuplicates = (data: any): { fixedData: any, modified: boolean } => {
    if (!data || !Array.isArray(data.questions)) {
        return { fixedData: data, modified: false };
    }

    const questions = [...data.questions];
    let maxId = 0;
    const seenIds = new Set<number>();
    let modified = false;

    // First pass: find max ID and identify duplicates
    questions.forEach((q: any) => {
        if (q && typeof q.id === 'number') {
            if (q.id > maxId) maxId = q.id;
        }
    });

    // Second pass: reassign duplicates
    const newQuestions = questions.map((q: any) => {
        if (q && typeof q.id === 'number') {
            if (seenIds.has(q.id)) {
                maxId++;
                modified = true;
                return { ...q, id: maxId };
            } else {
                seenIds.add(q.id);
                return q;
            }
        }
        return q;
    });

    return {
        fixedData: { ...data, questions: newQuestions },
        modified
    };
};
