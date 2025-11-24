'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { Moon, Sun, Upload, Download, Copy, Check, Search } from 'lucide-react';
import ErrorPanel from '@/components/Editor/ErrorPanel';
import FindReplacePanel from '@/components/Editor/FindReplacePanel';
import Tooltip from '@/components/ui/Tooltip';
import { parseContent, convertContent, Format, detectFormat } from '@/lib/converter';
import { ValidationError, validateSchema, validateDuplicates } from '@/lib/validator';
import { getFixableDuplicateRanges } from '@/lib/ast';
import schema from '@/schema.json';
import type { MonacoEditorHandle } from '@/components/Editor/MonacoWrapper';

const MonacoWrapper = dynamic(() => import('@/components/Editor/MonacoWrapper'), { ssr: false });

export default function Home() {
  const [code, setCode] = useState(JSON.stringify({
    "surveyTitle": "User Experience Feedback Survey",
    "description": "Please answer the following questions to help us improve our website.",
    "questions": [
      {
        "id": 1,
        "question": "How satisfied are you with the website's loading speed?",
        "type": "multiple-choice",
        "required": true,
        "options": [
          "Very satisfied",
          "Satisfied",
          "Neutral",
          "Dissatisfied",
          "Very dissatisfied"
        ]
      },
      {
        "id": 2,
        "question": "How easy was it to navigate through the website?",
        "type": "multiple-choice",
        "required": true,
        "options": [
          "Very easy",
          "Somewhat easy",
          "Neutral",
          "Somewhat difficult",
          "Very difficult"
        ]
      },
      {
        "id": 3,
        "question": "Which feature do you find most useful?",
        "type": "multiple-choice",
        "required": false,
        "options": [
          "Search functionality",
          "Product filters",
          "User reviews",
          "Wishlist",
          "Other"
        ]
      },
      {
        "id": 4,
        "question": "How likely are you to recommend our website to others?",
        "type": "multiple-choice",
        "required": true,
        "options": [
          "Definitely will",
          "Probably will",
          "Might or might not",
          "Probably won’t",
          "Definitely won’t"
        ]
      },
      {
        "id": 5,
        "question": "What type of content would you like to see more of?",
        "type": "multiple-choice",
        "required": false,
        "options": [
          "Tutorials",
          "Product reviews",
          "Industry news",
          "Case studies",
          "Customer stories"
        ]
      }
    ]
  }, null, 2));
  const [format, setFormat] = useState<Format>('json');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [panelHeight, setPanelHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);

  const [isFindPanelOpen, setIsFindPanelOpen] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  const editorRef = useRef<MonacoEditorHandle>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFormatChange = (newFormat: string) => {
    const targetFormat = newFormat as Format;
    const { data } = parseContent(code, format);
    if (data) {
      const newCode = convertContent(data, targetFormat);
      if (newCode) {
        setCode(newCode);
        setFormat(targetFormat);
      }
    }
  };

  const validate = useCallback((value: string) => {
    const { data, error } = parseContent(value, format);

    let newErrors: ValidationError[] = [];

    if (error) {
      newErrors.push({ path: '', message: error });
    } else if (data) {
      const schemaErrors = validateSchema(data, schema);
      const duplicateErrors = validateDuplicates(data);
      newErrors = [...newErrors, ...schemaErrors, ...duplicateErrors];
    }

    setErrors(newErrors);
  }, [format]);

  useEffect(() => {
    const timer = setTimeout(() => validate(code), 500);
    return () => clearTimeout(timer);
  }, [code, validate]);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newHeight = window.innerHeight - mouseMoveEvent.clientY;
      if (newHeight > 50 && newHeight < window.innerHeight - 100) {
        setPanelHeight(newHeight);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          setCode(content);
          const detected = detectFormat(content);
          setFormat(detected);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExport = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Auto-fix duplicates
  useEffect(() => {
    if (!code) return;

    // We need to check for duplicates and fix them automatically
    const fixes = getFixableDuplicateRanges(code, format);

    if (fixes.length > 0) {
      // Apply fixes from bottom to top to preserve indices
      const sortedFixes = [...fixes].sort((a, b) => {
        if (a.range.startLine !== b.range.startLine) {
          return b.range.startLine - a.range.startLine;
        }
        return b.range.startColumn - a.range.startColumn;
      });

      const lines = code.split('\n');
      let modified = false;

      sortedFixes.forEach(fix => {
        const lineIndex = fix.range.startLine - 1;
        const line = lines[lineIndex];

        // We need to replace the value part. 
        // The range covers the value.
        // startColumn is 1-based.

        const before = line.substring(0, fix.range.startColumn - 1);
        const after = line.substring(fix.range.endColumn - 1);

        lines[lineIndex] = `${before}${fix.newValue}${after}`;
        modified = true;
      });

      if (modified) {
        setCode(lines.join('\n'));
      }
    }
  }, [code, format]);

  if (!mounted) return null;

  return (
    <main className="flex flex-col h-screen bg-white dark:bg-black text-black dark:text-white overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shrink-0">
        <h1 className="font-semibold">Monaco Editor</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-2">
            <Tooltip content="Import File">
              <label className="p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <input type="file" className="hidden" onChange={handleImport} accept=".json,.yaml,.yml,.xml" />
              </label>
            </Tooltip>
            <Tooltip content="Export File">
              <button onClick={handleExport} className="p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Copy to Clipboard">
              <button onClick={handleCopy} className="p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </Tooltip>
            <Tooltip content="Find & Replace">
              <button
                onClick={() => setIsFindPanelOpen(true)}
                className={`p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors ${isFindPanelOpen ? 'bg-zinc-200 dark:bg-zinc-800' : ''}`}
              >
                <Search className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
          <select
            value={format}
            onChange={(e) => handleFormatChange(e.target.value)}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="xml">XML</option>
          </select>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-hidden relative">
          <MonacoWrapper
            ref={editorRef}
            code={code}
            onChange={setCode}
            language={format}
            onMatchCountChange={(count, current) => {
              setMatchCount(count);
              setCurrentMatch(current);
            }}
          />

          <FindReplacePanel
            isOpen={isFindPanelOpen}
            onClose={() => {
              setIsFindPanelOpen(false);
              editorRef.current?.cancelFind();
            }}
            onFind={(text, matchCase, wholeWord) => {
              console.log('Page: onFind called', { editorRef: editorRef.current });
              if (editorRef.current) {
                editorRef.current.executeFind(text, matchCase, wholeWord);
              } else {
                console.error('Page: editorRef.current is null');
              }
            }}
            onFindNext={() => editorRef.current?.findNext()}
            onFindPrevious={() => editorRef.current?.findPrevious()}
            onReplace={(text) => editorRef.current?.executeReplace(text)}
            onReplaceAll={(searchText, replaceText) => editorRef.current?.executeReplaceAll(searchText, replaceText)}
            matchCount={matchCount}
            currentMatch={currentMatch}
          />
        </div>

        {/* Resize Handle */}
        <div
          className="h-1 bg-zinc-200 dark:bg-zinc-800 cursor-row-resize hover:bg-blue-500 transition-colors shrink-0"
          onMouseDown={startResizing}
        />

        <ErrorPanel
          errors={errors}
          onErrorClick={(e) => console.log(e)}
          isExpanded={isPanelExpanded}
          onToggle={() => setIsPanelExpanded(!isPanelExpanded)}
          height={panelHeight}
        />
      </div>
    </main>
  );
}
