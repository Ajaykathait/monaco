import React, { useState } from 'react';
import { ValidationError } from '@/lib/validator';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface ErrorPanelProps {
    errors: ValidationError[];
    onErrorClick: (error: ValidationError) => void;
    isExpanded: boolean;
    onToggle: () => void;
    height?: number;
}

const ErrorPanel: React.FC<ErrorPanelProps> = ({ errors, onErrorClick, isExpanded, onToggle, height }) => {
    // if (errors.length === 0) return null; // Removed to make persistent

    const hasErrors = errors.length > 0;

    return (
        <div
            className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shadow-lg flex flex-col"
            style={{ height: isExpanded ? height : 'auto' }}
        >
            <div
                className="flex items-center justify-between px-4 py-2 cursor-pointer bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    {hasErrors ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-green-500" />
                    )}
                    <span className={`font-medium text-sm ${hasErrors ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {hasErrors ? `${errors.length} Errors` : 'No Errors'}
                    </span>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </div>

            {isExpanded && (
                <div className="flex-1 overflow-y-auto p-2">
                    {hasErrors ? (
                        errors.map((error, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded cursor-pointer text-sm border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                                onClick={() => onErrorClick(error)}
                            >
                                {error.path && (
                                    <span className="font-mono text-xs bg-zinc-200 dark:bg-zinc-700 px-1 rounded text-zinc-600 dark:text-zinc-300">
                                        {error.path}
                                    </span>
                                )}
                                <span className="text-red-600 dark:text-red-400">{error.message}</span>
                            </div>
                        ))
                    ) : (
                        <div className="p-2 text-center text-zinc-500 text-sm">
                            No validation errors.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ErrorPanel;
