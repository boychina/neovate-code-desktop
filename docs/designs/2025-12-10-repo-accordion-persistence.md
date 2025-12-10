# Repo Accordion State Persistence

## Overview
Persist the repo sidebar accordion state (which repos are expanded, which session groups show all items) across app refreshes.

## Changes

### store.tsx
Add to `StoreState`:
```ts
openRepoAccordions: string[];
expandedSessionGroups: Record<string, boolean>;
```

Add to `StoreActions`:
```ts
setOpenRepoAccordions: (ids: string[]) => void;
toggleSessionGroupExpanded: (workspaceId: string) => void;
```

Initialize with `[]` and `{}` respectively.

### persistence.ts
Add to `PersistedState` interface:
```ts
openRepoAccordions: string[];
expandedSessionGroups: Record<string, boolean>;
```

Include in `getPersistableState()` and `hydrateStore()`.

### RepoSidebar.tsx
- Remove `useState` for `openRepos` and `expandedSessions`
- Use store selectors: `useStore(state => state.openRepoAccordions)` and `useStore(state => state.expandedSessionGroups)`
- Call `setOpenRepoAccordions` and `toggleSessionGroupExpanded` instead of local setState
- Keep `useEffect` for auto-expanding new repos, but call store action

### accordion.tsx
No changes needed.
