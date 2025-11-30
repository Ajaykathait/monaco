// components/SurveyEditor.tsx
'use client';
import React, { useEffect, useState } from 'react';
import type { Question } from '@/lib/surveyMapping';
import {
  buildLabelIdMap,
  saveMapToLocalStorage,
  loadMapFromLocalStorage,
  stripIdsForEditor,
  restoreIdsByLabel,
  clearMapFromLocalStorage
} from '@/lib/surveyMapping';

type Props = {
  surveyId: string;
  initialQuestions: Question[];             // authoritative JSON with ids from API
  onSave: (questionsWithIds: Question[]) => Promise<void> | void;
};

export default function SurveyEditor({ surveyId, initialQuestions, onSave }: Props) {
  const [editorJson, setEditorJson] = useState<Question[]>([]);
  const [mappingLoadedFromStorage, setMappingLoadedFromStorage] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // on mount: if localStorage has a mapping/editor json, use it; else build from initialQuestions
  useEffect(() => {
    const saved = loadMapFromLocalStorage(surveyId);
    if (saved && saved.editorJson) {
      setEditorJson(saved.editorJson);
      setMappingLoadedFromStorage(true);
      return;
    }
    // otherwise build fresh mapping & editor copy and save to localStorage
    const map = buildLabelIdMap(initialQuestions);
    const noId = stripIdsForEditor(initialQuestions);
    saveMapToLocalStorage(surveyId, map, noId);
    setEditorJson(noId);
  }, [surveyId, initialQuestions]);

  function handleEditorChangeText(value: string) {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        setError('Editor content must be a JSON array of questions');
        return;
      }
      setError(null);
      setEditorJson(parsed);
    } catch (e: any) {
      setError('Invalid JSON');
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const stored = loadMapFromLocalStorage(surveyId);
      const map = stored?.map ?? {};
      const { restored, summary } = restoreIdsByLabel(editorJson, map);
      setSummary(summary);

      // persist the new mapping + editorJson to localStorage so editing survives refresh
      // if you prefer to clear mapping after save, call clearMapFromLocalStorage(surveyId)
      const newMap = buildLabelIdMap(restored); // update mapping so new items get mapped too
      saveMapToLocalStorage(surveyId, newMap, stripIdsForEditor(restored));

      // call provided onSave to let parent persist to server if needed
      await onSave(restored);
    } catch (err: any) {
      console.error(err);
      setError('Save failed. See console for details.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', gap: 12, display: 'flex', flexDirection: 'column' }}>
      <h3>Survey JSON Editor</h3>
      <div>
        <small>
          Edit questions (ids removed). On save, ids will be restored by label (localStorage mapping used).
        </small>
      </div>
      <textarea
        aria-label="editor"
        style={{ width: '100%', height: 360, fontFamily: 'monospace', fontSize: 13 }}
        value={JSON.stringify(editorJson, null, 2)}
        onChange={(e) => handleEditorChangeText(e.target.value)}
      />
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save & Restore IDs'}
        </button>
        <button onClick={() => {
          // Discard localStorage mapping and reload from initialQuestions
          clearMapFromLocalStorage(surveyId);
          const map = buildLabelIdMap(initialQuestions);
          const noId = stripIdsForEditor(initialQuestions);
          saveMapToLocalStorage(surveyId, map, noId);
          setEditorJson(noId);
          setSummary(null);
        }}>
          Reset to Server JSON
        </button>
      </div>

      {summary && (
        <details style={{ marginTop: 8 }}>
          <summary>Restore summary</summary>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(summary, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
