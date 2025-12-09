# Open App Button Component

**Date:** 2025-12-09

## Context

The WorkspacePanel header contains an "Open in Editor" button that currently shows an alert with "Not implemented". The goal is to replace this with a functional dropdown menu that detects available apps on the user's system and allows opening the current workspace in the selected app.

The feature leverages existing backend APIs:
- `utils.detectApps` - Returns list of installed apps
- `utils.open` - Opens a specified app with the workspace path

## Discussion

### App Name Display
**Question:** How should app names be displayed in the dropdown?
**Decision:** Use user-friendly names (e.g., "VS Code" instead of "vscode", "VS Code Insiders" instead of "vscode-insiders")

### App Filtering
**Question:** Which apps should be shown?
**Decision:** Show all available apps, including:
- Editors: Cursor, VS Code, VS Code Insiders, Zed, Windsurf
- Terminals: iTerm, Warp, Terminal
- Other: Finder, Sourcetree, Antigravity

### Fetch Timing
**Question:** When should app detection occur?
**Options explored:**
1. **On button click (chosen)** - Fresh detection each time with slight delay
2. **On component mount** - Instant dropdown but may show stale data

**Decision:** Fetch on click to ensure fresh detection and avoid stale data if user installs apps during session.

## Approach

Extract a new `OpenAppButton` component that:
1. Renders a "Open" button with dropdown trigger
2. Detects available apps when dropdown opens
3. Displays loading state during detection
4. Shows user-friendly app names in the dropdown
5. Opens workspace in selected app when clicked

## Architecture

### File Structure
```
src/renderer/components/
├── OpenAppButton.tsx (new component)
└── WorkspacePanel.tsx (import and use OpenAppButton)
```

### Component Interface
```ts
interface OpenAppButtonProps {
  cwd: string;
  request: StoreState['request'];
}
```

### State
- `apps: App[]` - Available apps (empty until clicked)
- `isLoading: boolean` - Loading state during detection

### App Name Mapping
```ts
const APP_NAMES: Record<App, string> = {
  cursor: 'Cursor',
  vscode: 'VS Code',
  'vscode-insiders': 'VS Code Insiders',
  zed: 'Zed',
  windsurf: 'Windsurf',
  iterm: 'iTerm',
  warp: 'Warp',
  terminal: 'Terminal',
  antigravity: 'Antigravity',
  finder: 'Finder',
  sourcetree: 'Sourcetree',
};
```

### User Flow
1. User clicks "Open" button → dropdown opens
2. Component calls `request('utils.detectApps', { cwd })`
3. Loading spinner shown during fetch
4. Apps list populates dropdown with friendly names
5. User clicks app → `request('utils.open', { cwd, app })`
6. Dropdown closes

### Usage in WorkspacePanel.Header
```tsx
<OpenAppButton cwd={workspace.worktreePath} request={request} />
```
