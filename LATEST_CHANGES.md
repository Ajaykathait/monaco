# Monaco Editor Migration & Feature Update

## 🚀 Overview
This update focuses on migrating the underlying editor engine to the native `monaco-editor` package, enhancing data integrity with strict read-only lines, and improving user productivity with a custom Find & Replace experience.

## ✨ Key Features

### 1. Native Monaco Migration
- **Dependency Update**: Replaced `@monaco-editor/react` with `monaco-editor` to gain full control over the editor instance and lifecycle.
- **Performance**: Optimized initialization and disposal logic within `MonacoWrapper.tsx`.
- **Flexibility**: Direct access to Monaco APIs allows for more advanced customizations (like decorations and view zones) in the future.

### 2. Intelligent Read-Only Lines
- **Goal**: Protect critical data structures (specifically `id` fields) from accidental modification.
- **Behavior**:
  - Automatically detects lines containing `"id": ...` in JSON, YAML, and XML.
  - Locks the **entire line** to prevent partial edits or syntax corruption.
  - Visual feedback: Read-only lines have a subtle background color and "not-allowed" cursor.
  - **Robustness**: Works seamlessly across format conversions (JSON ↔ YAML ↔ XML).

### 3. Custom Find & Replace Panel
- **UI**: A sleek, VS Code-inspired side panel that slides in from the right.
- **Capabilities**:
  - **Find**: Real-time search with highlighting.
  - **Match Options**: Case Sensitive and Whole Word toggles.
  - **Navigation**: Next/Previous match navigation.
  - **Replace**: Single replace and Replace All functionality.
  - **Safety**: Prevents replacement of text within read-only lines.

## 🛠 Technical Implementation

### Component Architecture
- **`MonacoWrapper.tsx`**:
  - Acts as the core editor controller.
  - Exposes imperative handles (`executeFind`, `executeReplace`, etc.) for external control.
  - Manages decorations for read-only ranges and search matches.
- **`FindReplacePanel.tsx`**:
  - A pure UI component that manages search state (inputs, checkboxes).
  - Communicates with the editor via callbacks.
- **`page.tsx`**:
  - Orchestrates the layout, connecting the Toolbar, Editor, and Side Panel.

### State Management
- **Search State**: The editor maintains the "current match" index and "total matches" count to update the UI.
- **Decorations**: Uses `createDecorationsCollection` for high-performance rendering of highlights and read-only zones.

## 📦 Installation & Verification

### Prerequisites
- Node.js 18+
- npm

### Setup
1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Run Development Server**:
   ```bash
   npm run dev
   ```

### Verification Steps
1. **Open the Editor**: Navigate to `http://localhost:3000`.
2. **Test Read-Only**: Try to delete or change an `id` line. It should be blocked.
3. **Test Find/Replace**:
   - Click the **Search Icon** (🔍) in the toolbar.
   - Search for "question".
   - Use the arrows to navigate matches.
   - Try replacing "question" with "query".
   - Verify that "Replace All" works as expected.

## 📂 Modified Files
- `package.json`
- `monaco/components/Editor/MonacoWrapper.tsx`
- `monaco/components/Editor/FindReplacePanel.tsx` (New)
- `monaco/app/page.tsx`
- `monaco/lib/ast.ts`
