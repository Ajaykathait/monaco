import React, { useState, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, Search, Replace } from 'lucide-react';

interface FindReplacePanelProps {
    isOpen: boolean;
    onClose: () => void;
    onFind: (text: string, matchCase: boolean, wholeWord: boolean) => void;
    onFindNext: () => void;
    onFindPrevious: () => void;
    onReplace: (text: string) => void;
    onReplaceAll: (searchText: string, replaceText: string) => void;
    matchCount: number;
    currentMatch: number;
}

const FindReplacePanel: React.FC<FindReplacePanelProps> = ({
    isOpen,
    onClose,
    onFind,
    onFindNext,
    onFindPrevious,
    onReplace,
    onReplaceAll,
    matchCount,
    currentMatch
}) => {
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [matchCase, setMatchCase] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            console.log('FindReplacePanel: triggering onFind', { findText, matchCase, wholeWord });
            onFind(findText, matchCase, wholeWord);
        }, 300);
        return () => clearTimeout(timer);
    }, [findText, matchCase, wholeWord, onFind]);

    if (!isOpen) return null;

    return (
        <div className="absolute top-0 right-0 h-full w-[350px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="font-semibold text-lg">Find & Replace</h2>
                <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* Find Section */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Find</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            value={findText}
                            onChange={(e) => setFindText(e.target.value)}
                            placeholder="Find"
                            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={matchCase}
                                onChange={(e) => setMatchCase(e.target.checked)}
                                className="rounded border-zinc-300 dark:border-zinc-600"
                            />
                            Match Case
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={wholeWord}
                                onChange={(e) => setWholeWord(e.target.checked)}
                                className="rounded border-zinc-300 dark:border-zinc-600"
                            />
                            Whole Word
                        </label>
                    </div>
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                        <span>{matchCount > 0 ? `${currentMatch} of ${matchCount}` : 'No results'}</span>
                        <div className="flex gap-1">
                            <button
                                onClick={onFindPrevious}
                                disabled={matchCount === 0}
                                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded disabled:opacity-50"
                                title="Previous Match"
                            >
                                <ChevronUp className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onFindNext}
                                disabled={matchCount === 0}
                                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded disabled:opacity-50"
                                title="Next Match"
                            >
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                {/* Replace Section */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Replace</label>
                    <div className="relative">
                        <Replace className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            value={replaceText}
                            onChange={(e) => setReplaceText(e.target.value)}
                            placeholder="Replace"
                            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => onReplace(replaceText)}
                            disabled={matchCount === 0}
                            className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Replace
                        </button>
                        <button
                            onClick={() => onReplaceAll(findText, replaceText)}
                            disabled={matchCount === 0}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Replace All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FindReplacePanel;
