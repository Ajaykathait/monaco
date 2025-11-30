// lib/surveyMapping.ts

export type Question = {
  id?: string;
  label: string;
  type?: string;
  options?: string[];
  [k: string]: any;
};

export type LabelIdMap = Record<string, string>;

export function normalizeLabel(label: string): string {
  return (label ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function generateId(prefix = "sys_"): string {
  if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
    return `${prefix}${(crypto as any).randomUUID()}`;
  }
  const fallback = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return `${prefix}${fallback}`;
}

const LS_PREFIX = "surveyMapping:";

export function buildLabelIdMap(questions: Question[]): LabelIdMap {
  const map: LabelIdMap = {};
  for (const q of questions) {
    if (!q.label || !q.id) continue;
    const norm = normalizeLabel(q.label);
    map[norm] = q.id;
  }
  return map;
}

export function saveMapToLocalStorage(
  surveyId: string,
  map: LabelIdMap,
  alsoSaveEditorJson?: Question[]
) {
  const payload = {
    map,
    savedAt: new Date().toISOString(),
    editorJson: alsoSaveEditorJson ?? null,
  };
  try {
    localStorage.setItem(`${LS_PREFIX}${surveyId}`, JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to save survey mapping to localStorage", err);
  }
}

export function loadMapFromLocalStorage(
  surveyId: string
): { map: LabelIdMap; savedAt?: string; editorJson?: Question[] } | null {
  const raw = localStorage.getItem(`${LS_PREFIX}${surveyId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return { map: parsed.map ?? {}, savedAt: parsed.savedAt, editorJson: parsed.editorJson ?? undefined };
  } catch {
    return null;
  }
}

export function clearMapFromLocalStorage(surveyId: string) {
  localStorage.removeItem(`${LS_PREFIX}${surveyId}`);
}

export function stripIdsForEditor(questions: Question[]): Question[] {
  return questions.map((q) => {
    const { id, ...rest } = q;
    return { ...rest };
  });
}

export type RestoreResult = {
  restored: Question[];
  summary: {
    reused: number;
    generated: number;
    unmatchedLabels: string[];
    duplicatesGenerated: number;
  };
};

export function restoreIdsByLabel(
  editedQuestions: Question[],
  labelIdMap: LabelIdMap
): RestoreResult {
  const usedOriginalIds = new Set<string>();
  const restored: Question[] = [];
  const unmatchedLabels: string[] = [];
  let reused = 0,
    generated = 0,
    duplicatesGenerated = 0;

  for (const q of editedQuestions) {
    const norm = normalizeLabel(q.label ?? "");
    const originalId = labelIdMap[norm];

    if (originalId && !usedOriginalIds.has(originalId)) {
      restored.push({ ...q, id: originalId });
      usedOriginalIds.add(originalId);
      reused++;
    } else if (originalId && usedOriginalIds.has(originalId)) {
      const newId = generateId();
      restored.push({ ...q, id: newId });
      generated++;
      duplicatesGenerated++;
    } else {
      const newId = generateId();
      restored.push({ ...q, id: newId });
      generated++;
      unmatchedLabels.push(q.label ?? "");
    }
  }

  return {
    restored,
    summary: { reused, generated, unmatchedLabels, duplicatesGenerated },
  };
}
