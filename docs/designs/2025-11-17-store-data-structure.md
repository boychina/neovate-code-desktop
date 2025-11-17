# Store Data Structure for Chat, Workspaces, and Repos

**Date:** 2025-11-17

## Context

The application needs a comprehensive data structure to manage chat conversations, workspace information, and repository data. The current store already handles WebSocket connection state and messaging infrastructure. This design extends it to support:

- Chat conversations with full message history
- Workspace management based on git worktree
- Repository tracking with multiple workspaces
- UI state for current selections (repo, workspace, chat session)

The relationship model is: 1 repo (unique path) = n workspaces (git worktrees with separate branches) = n sessions per workspace.

## Discussion

### Entity Relationships
After exploring the domain, the following relationships were established:
- One repository can have multiple workspaces
- Workspaces are based on git worktree with separate branches
- Each workspace can have multiple chat sessions
- Sessions need to track messages, context (files/code references), state (pending operations, active tasks), and metadata (timestamps, status, tags)

### Data Requirements
Each entity needs comprehensive tracking:
- **Repos**: Path, name, workspace references, metadata (last accessed, settings), git remote info (origin URL, default branch, sync status)
- **Workspaces**: ID, repo reference, branch, worktree path, session references, git state (current commit, dirty status, pending changes), metadata (creation time, description, status), and context (active files, settings, preferences)
- **Sessions**: ID, workspace reference, messages, context (files, code refs), state (pending operations, active tasks), and metadata (timestamps, status, tags, labels)

### Architectural Approaches Explored

Three approaches were considered:

1. **Normalized Relational Structure** (Selected): Separate slices for each entity type with ID-based references, flat lookup maps for O(1) access, clear separation of data vs UI state.

2. **Nested Hierarchical Structure**: Children nested inside parents, natural grouping but harder to update deep nested items.

3. **Hybrid with Materialized Views**: Normalized storage with computed selectors and cached views, best performance but more complex.

The normalized approach was chosen for its simplicity, clear separation of concerns, and ease of updates.

## Approach

The store uses a **normalized relational structure** with four primary slices:

### Entity Slices
- `repos`: Map of `repoPath → RepoData`
- `workspaces`: Map of `workspaceId → WorkspaceData`
- `sessions`: Map of `sessionId → SessionData`

### UI Slice
- Tracks current selections: `selectedRepoPath`, `selectedWorkspaceId`, `selectedSessionId`
- All selections can be null (no selection)

### Key Principles
- **String IDs as keys**: Repos use path (naturally unique), workspaces/sessions use UUIDs
- **Flat lookup maps**: O(1) entity access by ID
- **Unidirectional references**: Parent stores child IDs in arrays (e.g., `repo.workspaceIds`)
- **Separation of concerns**: Data entities, UI state, and WebSocket state are independent
- **Immutable updates**: Zustand patterns with immer for nested mutations

## Architecture

### Data Structures

```typescript
interface RepoData {
  path: string;
  name: string;
  workspaceIds: string[];
  metadata: {
    lastAccessed: number;
    settings?: Record<string, any>;
  };
  gitRemote: {
    originUrl: string | null;
    defaultBranch: string | null;
    syncStatus: 'synced' | 'ahead' | 'behind' | 'diverged' | 'unknown';
  };
}

interface WorkspaceData {
  id: string;
  repoPath: string;
  branch: string;
  worktreePath: string;
  sessionIds: string[];
  gitState: {
    currentCommit: string;
    isDirty: boolean;
    pendingChanges: string[];
  };
  metadata: {
    createdAt: number;
    description: string;
    status: 'active' | 'archived' | 'stale';
  };
  context: {
    activeFiles: string[];
    settings?: Record<string, any>;
    preferences?: Record<string, any>;
  };
}

interface SessionData {
  id: string;
  workspaceId: string;
  messages: Message[];
  context: {
    files: string[];
    codeRefs: Array<{ file: string; line?: number }>;
  };
  state: {
    pendingOperations: string[];
    activeTasks: string[];
  };
  metadata: {
    createdAt: number;
    updatedAt: number;
    status: 'active' | 'completed' | 'archived';
    tags: string[];
    labels: string[];
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
```

### Store Actions

**Entity CRUD Operations:**
```typescript
// Repos
addRepo(repo: RepoData): void
updateRepo(path: string, updates: Partial<RepoData>): void
deleteRepo(path: string): void  // cascades to workspaces & sessions

// Workspaces
addWorkspace(workspace: WorkspaceData): void  // auto-adds ID to parent repo
updateWorkspace(id: string, updates: Partial<WorkspaceData>): void
deleteWorkspace(id: string): void  // cascades to sessions

// Sessions
addSession(session: SessionData): void  // auto-adds ID to parent workspace
updateSession(id: string, updates: Partial<SessionData>): void
deleteSession(id: string): void
addMessage(sessionId: string, message: Omit<Message, 'id'>): void

// UI Selections
selectRepo(path: string | null): void
selectWorkspace(id: string | null): void
selectSession(id: string | null): void
```

### Data Flow Patterns

1. **Adding child entities**: Action stores entity → pushes ID to parent's reference array
2. **Cascade deletion**: Delete parent → get all child IDs → delete each child recursively → delete parent
3. **Selection validation**: Validate entity exists and belongs to selected parent before updating UI state
4. **Computed queries**: Selectors like `getWorkspacesForRepo(path)`, `getSessionsForWorkspace(id)` filter entities

### Error Handling

**Validation:**
- Repo: Path exists and is unique
- Workspace: Parent repo exists, worktree path is unique
- Session: Parent workspace exists
- Message: Parent session exists, valid role
- Selections: Entity exists before selecting

**Cascade Deletion:**
```
deleteRepo(path):
  → Get workspace IDs from repo.workspaceIds
  → For each: deleteWorkspace(id)
  → Delete repo
  → If selected: clear UI state

deleteWorkspace(id):
  → Get session IDs from workspace.sessionIds
  → For each: deleteSession(id)
  → Remove ID from parent repo.workspaceIds
  → Delete workspace
  → If selected: clear workspace/session UI state
```

**Boundary Conditions:**
- All entity maps can be empty
- All UI selections can be null
- Orphaned data prevented through cascade deletes
- Stale selections validated on load and auto-cleared

### Integration Points

- **WebSocket slice**: Message bus handlers can trigger entity updates (e.g., file changes → update `workspace.gitState.isDirty`)
- **Persistence**: Full store state can be serialized/restored with validation on load
- **Navigation flow**: Repo selection → filter workspaces → workspace selection → filter sessions → session selection
