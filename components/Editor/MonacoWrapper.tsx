'use client';

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as monaco from 'monaco-editor';
import { useTheme } from 'next-themes';
import { getReadOnlyRanges, getIdLineRanges } from '@/lib/ast';

export interface MonacoEditorHandle {
    triggerFind: () => void;
    executeFind: (searchText: string, matchCase: boolean, wholeWord: boolean) => number;
    findNext: () => void;
    findPrevious: () => void;
    executeReplace: (replaceText: string) => void;
    executeReplaceAll: (searchText: string, replaceText: string) => void;
    cancelFind: () => void;
}

interface MonacoWrapperProps {
    code: string;
    onChange?: (value: string) => void;
    language?: string;
    onMatchCountChange?: (count: number, current: number) => void;
}

const MonacoWrapper = forwardRef<MonacoEditorHandle, MonacoWrapperProps>(({ code, onChange, language = 'json', onMatchCountChange }, ref) => {
    const { theme, systemTheme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
    const searchDecorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
    const subscriptionRef = useRef<monaco.IDisposable | null>(null);
    const isInternalChange = useRef(false);

    const currentMatches = useRef<monaco.editor.FindMatch[]>([]);
    const currentMatchIndex = useRef<number>(-1);

    const currentTheme = theme === 'system' ? systemTheme : theme;
    const editorTheme = currentTheme === 'dark' ? 'vs-dark' : 'vs';

    const lastSearchState = useRef({ text: '', matchCase: false, wholeWord: false });

    const languageRef = useRef(language);

    const updateSearchDecorations = (editor: monaco.editor.IStandaloneCodeEditor, matches: monaco.editor.FindMatch[], currentIndex: number) => {
        const newDecorations: monaco.editor.IModelDeltaDecoration[] = matches.map((match, index) => ({
            range: match.range,
            options: {
                isWholeLine: false,
                inlineClassName: index === currentIndex ? 'findMatch active' : 'findMatch',
                overviewRuler: {
                    color: index === currentIndex ? '#f5d800' : '#d18616',
                    position: monaco.editor.OverviewRulerLane.Center
                }
            }
        }));

        if (searchDecorationsRef.current) {
            searchDecorationsRef.current.clear();
        }
        searchDecorationsRef.current = editor.createDecorationsCollection(newDecorations);
    };

    const performFind = (text: string, matchCase: boolean, wholeWord: boolean, preserveIndex: boolean = false) => {
        console.log('MonacoWrapper: performFind called', { text, matchCase, wholeWord });
        if (!editorRef.current) {
            console.log('MonacoWrapper: editorRef.current is null');
            return 0;
        }
        const model = editorRef.current.getModel();
        if (!model) {
            console.log('MonacoWrapper: model is null');
            return 0;
        }

        if (!text) {
            console.log('MonacoWrapper: text is empty, clearing matches');
            currentMatches.current = [];
            currentMatchIndex.current = -1;
            if (searchDecorationsRef.current) searchDecorationsRef.current.clear();
            onMatchCountChange?.(0, 0);
            return 0;
        }

        // Use regex for whole word search if requested
        let searchString = text;
        let isRegex = false;
        if (wholeWord) {
            // Simple regex escaping
            const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            searchString = `\\b${escaped}\\b`;
            isRegex = true;
        }

        const matches = model.findMatches(searchString, false, isRegex, matchCase, null, true);
        console.log('MonacoWrapper: matches found', matches.length);
        currentMatches.current = matches;

        if (preserveIndex) {
            if (currentMatchIndex.current >= matches.length) {
                currentMatchIndex.current = matches.length > 0 ? matches.length - 1 : -1;
            } else if (currentMatchIndex.current === -1 && matches.length > 0) {
                currentMatchIndex.current = 0;
            }
        } else {
            currentMatchIndex.current = matches.length > 0 ? 0 : -1;
        }

        updateSearchDecorations(editorRef.current, matches, currentMatchIndex.current);

        if (matches.length > 0 && !preserveIndex) {
            editorRef.current.revealRangeInCenter(matches[0].range);
            editorRef.current.setSelection(matches[0].range);
        }

        onMatchCountChange?.(matches.length, matches.length > 0 ? currentMatchIndex.current + 1 : 0);
        return matches.length;
    };

    useImperativeHandle(ref, () => ({
        triggerFind: () => {
            // No-op
        },
        executeFind: (searchText: string, matchCase: boolean, wholeWord: boolean) => {
            console.log('MonacoWrapper: executeFind called', { searchText });
            lastSearchState.current = { text: searchText, matchCase, wholeWord };
            return performFind(searchText, matchCase, wholeWord, false);
        },
        findNext: () => {
            if (!editorRef.current || currentMatches.current.length === 0) return;

            currentMatchIndex.current = (currentMatchIndex.current + 1) % currentMatches.current.length;
            const match = currentMatches.current[currentMatchIndex.current];

            editorRef.current.revealRangeInCenter(match.range);
            editorRef.current.setSelection(match.range);
            updateSearchDecorations(editorRef.current, currentMatches.current, currentMatchIndex.current);
            onMatchCountChange?.(currentMatches.current.length, currentMatchIndex.current + 1);
        },
        findPrevious: () => {
            if (!editorRef.current || currentMatches.current.length === 0) return;

            currentMatchIndex.current = (currentMatchIndex.current - 1 + currentMatches.current.length) % currentMatches.current.length;
            const match = currentMatches.current[currentMatchIndex.current];

            editorRef.current.revealRangeInCenter(match.range);
            editorRef.current.setSelection(match.range);
            updateSearchDecorations(editorRef.current, currentMatches.current, currentMatchIndex.current);
            onMatchCountChange?.(currentMatches.current.length, currentMatchIndex.current + 1);
        },
        executeReplace: (replaceText: string) => {
            if (!editorRef.current || currentMatchIndex.current === -1 || currentMatches.current.length === 0) return;

            const match = currentMatches.current[currentMatchIndex.current];
            const range = match.range;

            // Check if read-only
            const readOnlyRanges = getReadOnlyRanges(editorRef.current.getValue(), languageRef.current);
            const isReadOnly = readOnlyRanges.some(r =>
                range.startLineNumber >= r.startLine && range.endLineNumber <= r.endLine
            );

            if (isReadOnly) return;

            editorRef.current.executeEdits('replace', [{
                range: range,
                text: replaceText,
                forceMoveMarkers: true
            }]);

            // Re-run find to update matches
            const { text, matchCase, wholeWord } = lastSearchState.current;
            performFind(text, matchCase, wholeWord, true);
        },
        executeReplaceAll: (searchText: string, replaceText: string) => {
            if (!editorRef.current) return;
            const model = editorRef.current.getModel();
            if (!model) return;

            // Use regex for whole word search if requested
            let searchString = searchText;
            let isRegex = false;
            const { wholeWord, matchCase } = lastSearchState.current;

            if (wholeWord) {
                const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                searchString = `\\b${escaped}\\b`;
                isRegex = true;
            }

            const matches = model.findMatches(searchString, false, isRegex, matchCase, null, true);
            const readOnlyRanges = getReadOnlyRanges(model.getValue(), languageRef.current);

            const edits = matches
                .filter(match => {
                    const range = match.range;
                    return !readOnlyRanges.some(r =>
                        range.startLineNumber >= r.startLine && range.endLineNumber <= r.endLine
                    );
                })
                .map(match => ({
                    range: match.range,
                    text: replaceText,
                    forceMoveMarkers: true
                }));

            if (edits.length > 0) {
                editorRef.current.executeEdits('replaceAll', edits);
                // Re-run find
                performFind(searchText, matchCase, wholeWord, false);
            }
        },
        cancelFind: () => {
            if (searchDecorationsRef.current) {
                searchDecorationsRef.current.clear();
            }
            currentMatches.current = [];
            currentMatchIndex.current = -1;
            onMatchCountChange?.(0, 0);
            lastSearchState.current = { text: '', matchCase: false, wholeWord: false };
        }
    }));

    useEffect(() => {
        languageRef.current = language;
    }, [language]);

    // Initialize editor
    useEffect(() => {
        if (!containerRef.current) return;

        // Clean up existing editor if any (though this effect should run once)
        if (editorRef.current) {
            editorRef.current.dispose();
        }

        const editor = monaco.editor.create(containerRef.current, {
            value: code,
            language: language,
            theme: editorTheme,
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
        });

        editorRef.current = editor;

        // Handle changes
        const subscription = editor.onDidChangeModelContent(() => {
            const value = editor.getValue();
            isInternalChange.current = true;
            onChange?.(value);
            isInternalChange.current = false;
            updateHiddenAreas(editor, value);
        });
        subscriptionRef.current = subscription;

        // Initial hidden areas
        updateHiddenAreas(editor, code);



        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.dispose();
            }
            if (editorRef.current) {
                editorRef.current.dispose();
                editorRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    // Update theme
    useEffect(() => {
        monaco.editor.setTheme(editorTheme);
    }, [editorTheme]);

    // Update language
    useEffect(() => {
        if (editorRef.current) {
            const model = editorRef.current.getModel();
            if (model) {
                monaco.editor.setModelLanguage(model, language);
                // Re-calculate hidden areas when language changes
                updateHiddenAreas(editorRef.current, editorRef.current.getValue());
            }
        }
    }, [language]);

    // Update code from props
    useEffect(() => {
        if (editorRef.current && !isInternalChange.current) {
            const currentValue = editorRef.current.getValue();
            if (currentValue !== code) {
                editorRef.current.setValue(code);
                updateHiddenAreas(editorRef.current, code);
            }
        }
    }, [code]);

    const updateHiddenAreas = (editor: monaco.editor.IStandaloneCodeEditor, value: string) => {
        const ranges = getIdLineRanges(value, languageRef.current);
        const hiddenRanges = ranges.map(range =>
            new monaco.Range(range.startLine, 1, range.endLine, 1)
        );
        (editor as any).setHiddenAreas(hiddenRanges);
    };

    return (
        <>
            <style jsx global>{`

                .findMatch {
                    background-color: rgba(255, 212, 0, 0.4) !important;
                }
                .findMatch.active {
                    background-color: rgba(255, 212, 0, 0.7) !important;
                    border: 1px solid #f5d800;
                }
            `}</style>
            <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
        </>
    );
});

MonacoWrapper.displayName = 'MonacoWrapper';

export default MonacoWrapper;
