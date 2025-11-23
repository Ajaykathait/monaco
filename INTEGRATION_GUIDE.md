# Monaco Editor Integration Guide

This guide will help you integrate the Monaco editor with validation, read-only IDs, and auto-fix functionality into your existing Next.js project.

## Prerequisites

- Next.js 14+ project
- Node.js and npm installed

## Step 1: Install Dependencies

```bash
npm install @monaco-editor/react
npm install next-themes
npm install lucide-react
npm install ajv
npm install js-yaml
npm install fast-xml-parser
npm install json-to-ast
```

## Step 2: Install Dev Dependencies

```bash
npm install --save-dev @types/js-yaml
```

## Step 3: Create Directory Structure

Create the following directories in your project:

```
your-project/
├── app/
│   └── page.tsx
├── components/
│   ├── Editor/
│   │   ├── MonacoWrapper.tsx
│   │   └── ErrorPanel.tsx
│   └── ui/
│       └── Tooltip.tsx
├── lib/
│   ├── ast.ts
│   ├── converter.ts
│   ├── validator.ts
│   └── fixer.ts
└── schema.json
```

## Step 4: Create Schema File

Create `schema.json` in your project root:

```json
{
    "type": "object",
    "properties": {
        "surveyTitle": {
            "type": "string"
        },
        "description": {
            "type": "string"
        },
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer"
                    },
                    "question": {
                        "type": "string"
                    },
                    "type": {
                        "type": "string",
                        "enum": [
                            "multiple-choice",
                            "text",
                            "rating"
                        ]
                    },
                    "required": {
                        "type": "boolean"
                    },
                    "options": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    }
                },
                "required": [
                    "id",
                    "question",
                    "type",
                    "required"
                ],
                "additionalProperties": false
            }
        }
    },
    "required": [
        "surveyTitle",
        "description",
        "questions"
    ],
    "additionalProperties": false
}
```

## Step 5: Create Library Files

### 5.1 Create `lib/ast.ts`

Copy the entire contents from the provided `lib/ast.ts` file. This file handles:
- Finding ID occurrences in JSON, YAML, and XML
- Calculating read-only ranges
- Identifying fixable duplicate IDs

### 5.2 Create `lib/converter.ts`

Copy the entire contents from the provided `lib/converter.ts` file. This file handles:
- Parsing JSON, YAML, and XML
- Converting between formats
- Format detection

### 5.3 Create `lib/validator.ts`

Copy the entire contents from the provided `lib/validator.ts` file. This file handles:
- Schema validation using Ajv
- Duplicate ID validation

### 5.4 Create `lib/fixer.ts`

Copy the entire contents from the provided `lib/fixer.ts` file. This file handles:
- Fixing duplicate IDs in the data structure

## Step 6: Create UI Components

### 6.1 Create `components/ui/Tooltip.tsx`

Copy the entire contents from the provided `components/ui/Tooltip.tsx` file.

### 6.2 Create `components/Editor/ErrorPanel.tsx`

Copy the entire contents from the provided `components/Editor/ErrorPanel.tsx` file.

### 6.3 Create `components/Editor/MonacoWrapper.tsx`

Copy the entire contents from the provided `components/Editor/MonacoWrapper.tsx` file. This is the core Monaco editor wrapper with:
- Read-only range decorations
- Keyboard blocking for read-only fields
- Theme support

## Step 7: Update Your Main Page

Replace or update your `app/page.tsx` with the provided version that includes:
- Monaco editor integration
- Format switching (JSON/YAML/XML)
- Import/Export/Copy buttons
- Automatic duplicate ID fixing
- Validation and error display

## Step 8: Configure Theme Provider (Optional but Recommended)

If you don't already have a theme provider, add it to your `app/layout.tsx`:

```tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

## Step 9: Update Tailwind Configuration

Ensure your `tailwind.config.js` includes dark mode support:

```javascript
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## Step 10: Update TypeScript Configuration (if needed)

Ensure your `tsconfig.json` has the following compiler options:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## Step 11: Run Your Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see your Monaco editor in action.

## Features Overview

### ✅ Multi-Format Support
- JSON, YAML, and XML editing with syntax highlighting
- Seamless conversion between formats

### ✅ Schema Validation
- Real-time validation against JSON schema
- Error panel showing validation issues

### ✅ Read-Only ID Fields
- All `id` fields are protected from manual editing
- Visual decorations show read-only regions

### ✅ Automatic Duplicate ID Fix
- Automatically detects and fixes duplicate IDs
- Preserves comments and formatting

### ✅ Import/Export/Copy
- Import files (auto-detects format)
- Export to file with correct extension
- Copy to clipboard

### ✅ Dark Mode
- Full dark mode support
- Automatic theme switching

## Customization

### Modify Schema
Edit `schema.json` to match your data structure.

### Change Validation Rules
Update `lib/validator.ts` to add custom validation logic.

### Customize Styling
Modify the Tailwind classes in the component files.

### Add More Formats
Extend `lib/converter.ts` and `lib/ast.ts` to support additional formats.

## Troubleshooting

### Monaco Editor Not Loading
- Ensure `dynamic` import with `ssr: false` is used
- Check browser console for errors

### Read-Only Not Working
- Verify `getReadOnlyRanges` is being called
- Check that `languageRef` is updated correctly

### Validation Errors Not Showing
- Ensure schema is correctly imported
- Check `validateSchema` and `validateDuplicates` are called

### Auto-Fix Not Triggering
- Verify `useEffect` dependencies include `code` and `format`
- Check `getFixableDuplicateRanges` is working correctly

## File Checklist

Before running, ensure you have created:

- [ ] `schema.json`
- [ ] `lib/ast.ts`
- [ ] `lib/converter.ts`
- [ ] `lib/validator.ts`
- [ ] `lib/fixer.ts`
- [ ] `components/ui/Tooltip.tsx`
- [ ] `components/Editor/MonacoWrapper.tsx`
- [ ] `components/Editor/ErrorPanel.tsx`
- [ ] `app/page.tsx`

## Next Steps

1. Test with your own data
2. Customize the schema for your use case
3. Add additional validation rules if needed
4. Style the UI to match your brand

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify all dependencies are installed
3. Ensure all files are created in the correct locations
4. Review the provided code for any customization conflicts

## Summary

This integration provides a production-ready Monaco editor with:
- Multi-format support (JSON/YAML/XML)
- Schema validation
- Protected ID fields
- Automatic error correction
- Import/Export functionality
- Dark mode support

All features work together seamlessly to create a robust editing experience.
