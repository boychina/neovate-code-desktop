# Store File and Slash Command List Caching

**Date:** 2025-12-05

## Context

The ChatInput component needs access to file paths and slash commands for suggestion dropdowns (triggered by `@` and `/`). Currently, the component accepts `fetchPaths` and `fetchCommands` props with default empty implementations. The goal is to add store methods that fetch and cache these lists, then wire them through WorkspacePanel to ChatInput.

## Discussion

**Fetch Timing Options:**
- On workspace select: Fetch once when workspace is selected
- On ChatInput mount: Fetch when component mounts
- On demand (lazy): Fetch only when user triggers suggestions

**Decision:** On demand (lazy) fetching was chosen to match existing patterns and avoid unnecessary API calls.

**Caching Strategy Options:**
- Cache in store: Store files/commands by workspaceId, avoid refetching if already loaded
- No caching: Fetch fresh each time, just wrap the request API

**Decision:** Cache in store to improve UX by avoiding repeated fetches for the same workspace.

**Implementation Approach Options:**
- Simple Key-Value Cache: Direct state per workspace, minimal changes
- Request-Level Memoization: Generic memoization layer with TTL
- Selector-Based with Loading State: Granular control but heavier

**Decision:** Simple key-value cache - follows existing patterns, minimal complexity.

## Approach

Add workspace-keyed caches to the store for files and slash commands. Store methods check cache first and fetch from API only if data isn't cached. WorkspacePanel creates callback wrappers that capture the current workspace context and passes them to ChatInput.

## Architecture

### Store State Additions

```typescript
// State
filesByWorkspace: Record<WorkspaceId, string[]>;
slashCommandsByWorkspace: Record<WorkspaceId, any[]>;

// Actions
fetchFileList: (workspaceId: string) => Promise<string[]>;
fetchSlashCommandList: (workspaceId: string) => Promise<any[]>;
```

### Store Method Implementation

```typescript
fetchFileList: async (workspaceId: string) => {
  const { filesByWorkspace, workspaces, request } = get();
  
  // Return cached if exists
  if (filesByWorkspace[workspaceId]) {
    return filesByWorkspace[workspaceId];
  }
  
  const workspace = workspaces[workspaceId];
  if (!workspace) return [];
  
  const response = await request('utils.files.list', { cwd: workspace.worktreePath });
  if (response.success) {
    const files = response.data.files;
    set((state) => ({
      filesByWorkspace: { ...state.filesByWorkspace, [workspaceId]: files }
    }));
    return files;
  }
  return [];
};

fetchSlashCommandList: async (workspaceId: string) => {
  const { slashCommandsByWorkspace, workspaces, request } = get();
  
  if (slashCommandsByWorkspace[workspaceId]) {
    return slashCommandsByWorkspace[workspaceId];
  }
  
  const workspace = workspaces[workspaceId];
  if (!workspace) return [];
  
  const response = await request('slashCommand.list', { cwd: workspace.worktreePath });
  if (response.success) {
    const commands = response.data.slashCommands;
    set((state) => ({
      slashCommandsByWorkspace: { ...state.slashCommandsByWorkspace, [workspaceId]: commands }
    }));
    return commands;
  }
  return [];
};
```

### WorkspacePanel Integration

```tsx
// Get store methods
const fetchFileList = useStore((state) => state.fetchFileList);
const fetchSlashCommandList = useStore((state) => state.fetchSlashCommandList);

// Create wrapper functions that provide context
const fetchPaths = useCallback(async () => {
  if (!selectedWorkspaceId) return [];
  return fetchFileList(selectedWorkspaceId);
}, [selectedWorkspaceId, fetchFileList]);

const fetchCommands = useCallback(async () => {
  if (!selectedWorkspaceId) return [];
  return fetchSlashCommandList(selectedWorkspaceId);
}, [selectedWorkspaceId, fetchSlashCommandList]);

// Pass to ChatInput
<ChatInput
  fetchPaths={fetchPaths}
  fetchCommands={fetchCommands}
  // ...other props
/>
```

### Files to Modify

1. `src/renderer/store.tsx` - Add state and methods
2. `src/renderer/components/WorkspacePanel.tsx` - Wire up props to ChatInput
