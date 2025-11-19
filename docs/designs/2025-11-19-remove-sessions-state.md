# Remove Sessions State from Store

**Date:** 2025-11-19

## Context

The store currently maintains a `sessions: Record<string, SessionData>` state along with full CRUD operations (addSession, updateSession, deleteSession) and cascading delete logic. However, sessions should be loaded dynamically rather than stored in the global state, while still maintaining the ability to track which session is currently selected.

## Discussion

### Key Questions Explored

**What should happen to session-related operations?**
- Cascading deletes when repos/workspaces are deleted
- Session CRUD actions (addSession, updateSession, deleteSession)
- Workspace relationship tracking (sessionIds array)
- sendMessage logic that creates/references sessions

### Approach Considered

**Approach 1: Clean Sweep (Selected)**
- Remove sessions state and all CRUD actions
- Keep sessionIds in WorkspaceData for tracking
- Remove session validation in selectSession
- Clean up deleteRepo and deleteWorkspace cascading logic
- Simplify sendMessage to remove session lookups

**Trade-offs:**
- ✅ Cleanest, simplest result with minimal code surface area
- ⚠️ Breaking change - selectedSessionId can reference non-existent sessions
- ⚠️ Validation moves to component layer

## Approach

Remove the `sessions` state entirely from the store while keeping `selectedSessionId` for UI selection tracking. The `sessionIds` array remains on WorkspaceData to track which sessions exist for a workspace, but session data itself will be loaded dynamically by components when needed.

This shifts the responsibility:
- **Store**: Tracks which session is selected (just an ID)
- **Components**: Load session data dynamically based on selectedSessionId
- **WorkspaceData**: Maintains sessionIds array for reference

## Architecture

### State Structure Changes

**Removed from StoreState:**
```typescript
sessions: Record<string, SessionData>  // Deleted
```

**Kept in StoreState:**
```typescript
selectedSessionId: string | null  // Unchanged
messages: Message[]               // Unchanged - decoupled from sessions
```

**WorkspaceData:**
- `sessionIds: string[]` - **Kept** for tracking which sessions exist
- Workspace operations continue to manage this array

### Actions Changes

**Actions Removed:**
- `addSession(session: SessionData)` 
- `updateSession(id: string, updates: Partial<SessionData>)`
- `deleteSession(id: string)`

**Actions Modified:**

**`selectSession(id: string | null)`:**
- Remove all validation logic (no checking if session exists in sessions state)
- Simply sets `selectedSessionId: id`
- Components are responsible for validating session IDs

**`sendMessage(params: { message: string })`:**
- Remove session existence checks (`sessions[sessionId]`)
- Keep auto-creation of new session ID if none selected
- Keep workspace lookup for `cwd`
- Remove commented-out session creation code

**`deleteRepo(path: string)`:**
- Remove `newSessions` variable and all session deletion logic
- Keep workspace deletion (workspaces cascade delete with repo)
- When workspaces are deleted, their sessionIds arrays are automatically removed
- Keep UI selection clearing logic

**`deleteWorkspace(id: string)`:**
- Remove `newSessions` variable and all session deletion logic
- Keep workspace deletion and repo relationship cleanup
- The workspace's sessionIds array is removed when workspace is deleted
- Keep UI selection clearing logic

### Key Implementation Notes

1. **Cascading is automatic**: Since sessionIds lives on WorkspaceData and there's no separate sessions state, when you delete a workspace, its sessionIds array goes with it.

2. **No session validation in store**: `selectedSessionId` can reference non-existent sessions - validation becomes component responsibility.

3. **Dynamic message loading**: Components handle loading messages based on `selectedSessionId`.

4. **Type imports**: `SessionData` type import can be removed from store (unless used elsewhere).

### Behavioral Changes

- `selectedSessionId` can now reference non-existent sessions (validation moves to component layer)
- No automatic cleanup of `sessionIds` arrays when individual sessions are removed (becomes application logic responsibility)
- Messages in store are session-agnostic - components manage the relationship
