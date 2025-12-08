# Repo Sidebar Sessions Display

## Overview

Show sessions nested under each workspace in the RepoSidebar, with a default limit of 5 most recent sessions and a show more/less toggle.

## Data Flow

- Sessions stored in `store.sessions[workspaceId]` as `SessionData[]`
- Each `SessionData` has `modified` timestamp for sorting
- RepoSidebar accesses both `workspaces` and `sessions` from store

## Component Structure

```
AccordionPanel (existing)
├── "New workspace" button (existing)
├── WorkspaceItem (for each workspace)
│   ├── Workspace row (branch name, changes badge)
│   └── SessionList (nested)
│       ├── Session 1 (sorted by modified, newest first)
│       ├── Session 2
│       ├── ...Session 5
│       └── "Show more" / "Show less" toggle (if > 5 sessions)
```

## Session Item Display

- Icon: Message/chat icon
- Text: `session.summary` truncated to ~20 chars, or "New session"
- Secondary: Relative time from `session.modified` (e.g., "2h ago")
- Selected state: Same highlight style as workspace selection

## Behaviors

1. **Sorting**: Sessions sorted by `modified` descending (most recent first)
2. **Default limit**: Show 5 most recent sessions
3. **Expand/collapse**: Local state `expandedSessions: Record<WorkspaceId, boolean>`
4. **Click behavior**: Clicking session calls both `selectWorkspace(workspaceId)` and `selectSession(sessionId)`

## Show More/Less Toggle

- Text-only button below session list
- "Show X more" when collapsed (X = total - 5)
- "Show less" when expanded
- Styled as subtle link (text-secondary, smaller font)

## Edge Cases

- 0 sessions: Don't show session list
- ≤5 sessions: Show all, no toggle
- Sessions not yet loaded: Show nothing

## Visual Example

```
📁 my-repo                    [3]  ℹ️
  + New workspace
  🌿 feature-branch              [2]
     💬 Fix login bug           2h
     💬 Add tests              1d
     💬 Refactor auth          3d
     Show 2 more
  🌿 main                        [0]
```

## Implementation

1. Add `sessions` from store in RepoSidebar
2. Add local state `expandedSessions: Record<string, boolean>`
3. Create helper function for relative time formatting
4. Render session list under each workspace with show more/less logic
5. Handle click to select both workspace and session
