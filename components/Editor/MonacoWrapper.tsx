'use client';

import React, { useEffect, useState, useRef } from 'react';
import Editor, { useMonaco, OnMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { getReadOnlyRanges, Range } from '@/lib/ast';

interface MonacoWrapperProps {
    code: string;
    onChange?: (value: string) => void;
    language?: string;
}

const MonacoWrapper: React.FC<MonacoWrapperProps> = ({ code, onChange, language = 'json' }) => {
    const { theme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const monaco = useMonaco();
    const editorRef = useRef<any>(null);
    const decorationsRef = useRef<string[]>([]);
    const languageRef = useRef(language);

    useEffect(() => {
        languageRef.current = language;
    }, [language]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const currentTheme = theme === 'system' ? systemTheme : theme;
    const editorTheme = currentTheme === 'dark' ? 'vs-dark' : 'light';

    const updateReadOnlyRanges = (editor: any, value: string, monacoInstance?: any) => {
        const m = monacoInstance || monaco;
        if (!m) return;

        const ranges = getReadOnlyRanges(value, language);
        const newDecorations = ranges.map(range => ({
            range: new m.Range(range.startLine, range.startColumn, range.endLine, range.endColumn),
            options: {
                isWholeLine: false,
                className: 'read-only-code',
                hoverMessage: { value: 'This value is read-only (ID)' },
                inlineClassName: 'read-only-inline'
            }
        }));

        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
    };

    const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
        editorRef.current = editor;

        // Initial calculation
        updateReadOnlyRanges(editor, code, monacoInstance);

        // Block edits in read-only ranges
        editor.onKeyDown((e) => {
            const position = editor.getPosition();
            if (!position) return;

            // Allow navigation keys
            if (
                e.keyCode === monacoInstance.KeyCode.UpArrow ||
                e.keyCode === monacoInstance.KeyCode.DownArrow ||
                e.keyCode === monacoInstance.KeyCode.LeftArrow ||
                e.keyCode === monacoInstance.KeyCode.RightArrow ||
                e.keyCode === monacoInstance.KeyCode.PageUp ||
                e.keyCode === monacoInstance.KeyCode.PageDown ||
                e.keyCode === monacoInstance.KeyCode.Home ||
                e.keyCode === monacoInstance.KeyCode.End
            ) {
                return;
            }

            const ranges = getReadOnlyRanges(editor.getValue(), languageRef.current);
            const isReadOnly = ranges.some(range =>
                position.lineNumber >= range.startLine &&
                position.lineNumber <= range.endLine &&
                position.column >= range.startColumn &&
                position.column <= range.endColumn
            );

            if (isReadOnly) {
                e.stopPropagation();
                e.preventDefault();
            }
        });
    };

    // Update ranges when code changes externally
    useEffect(() => {
        if (editorRef.current && monaco) {
            updateReadOnlyRanges(editorRef.current, code, monaco);
        }
    }, [code, monaco, language]);

    if (!mounted) return null;

    return (
        <>
            <style jsx global>{`
                .read-only-code {
                    background-color: ${currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
                    cursor: not-allowed;
                }
                .read-only-inline {
                    opacity: 0.7;
                }
            `}</style>
            <Editor
                height="100%"
                defaultLanguage={language}
                language={language}
                value={code}
                theme={editorTheme}
                onMount={handleEditorDidMount}
                onChange={(value) => {
                    onChange?.(value || '');
                    if (editorRef.current && monaco) {
                        updateReadOnlyRanges(editorRef.current, value || '', monaco);
                    }
                }}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                }}
            />
        </>
    );
};

export default MonacoWrapper;
