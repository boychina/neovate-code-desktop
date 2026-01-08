# RepoSidebar Simplification

## Overview
Simplify the RepoSidebar by removing workspace management UI and showing only the first workspace per repository.

## Changes

### 1. Remove "New Workspace" button
Delete the button (lines 228-249) that allows creating new workspaces.

### 2. Show only first workspace per repo
Change from:
```tsx
{repo.workspaceIds.map((workspaceId) => {
```

To:
```tsx
{repo.workspaceIds.slice(0, 1).map((workspaceId) => {
```

### 3. Remove workspace header row
Delete the workspace header div (lines 260-294) that displays:
- Git branch icon
- Branch name
- Changes count badge

Sessions will render directly under the repo accordion.

### 4. Adjust indentation
Remove `ml-4` from the session list container since we're removing a nesting level.

## Resulting Structure

Before:
```
📁 Repo Name [count] [info]
  └── + New workspace
  └── 🌿 main [changes]
       └── + New session
       └── 💬 Session summary    2h
```

After:
```
📁 Repo Name [count] [info]
  └── + New session
  └── 💬 Session summary         2h
  └── 💬 Another session         1d
```

## Files Modified
- `src/renderer/components/RepoSidebar.tsx`
