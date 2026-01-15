# ChatInput Performance Optimization via Debounced Store Updates

**Date:** 2026-01-08

## Context

The ChatInput component experiences noticeable lag when typing. Each keystroke feels delayed, causing a poor user experience. Investigation revealed that the performance issue stems from the tight coupling between input state and Zustand store updates.

## Discussion

### Root Cause Analysis

1. **Store updates on every keystroke**: The `setValue()` function in `useInputState.ts` calls `setSessionInput()` which updates the Zustand store on every character typed. Each store update creates new object references, triggering re-renders.

2. **WorkspacePanel subscribes to too many store slices**: It subscribes to `sessionsMap`, `messagesMap`, `workspaces`, etc. Any store update (including input value changes) triggers re-render checks across the component tree.

3. **Non-memoized callbacks and values in WorkspacePanel**:
   - `contextValue` object recreated on every render
   - `sendMessage` function recreated on every render
   - `handleSelectSession` recreated on every render

4. **ChatInput receives non-stable props**: `onSubmit`, `onCancel` are recreated every render.

5. **useInputHandlers callback churn**: Most handlers have `value` in their dependency arrays, causing recreation on every keystroke.

### Approaches Considered

- **Option A**: Keep input value in Zustand but debounce updates (simpler, maintains current architecture)
- **Option B**: Use local state for input, sync to store on blur/submit (more performant, more changes required)

**Decision**: Option A was selected for its simplicity and minimal architectural changes.

## Approach

Implement a debounced write-back pattern where:
1. Input value updates immediately in a local state buffer for responsive UI
2. Store updates are debounced (150ms) to reduce re-render frequency
3. Callbacks are memoized to prevent unnecessary recreations
4. ChatInput is wrapped with `React.memo()` to prevent re-renders from unchanged props

## Architecture

### File Changes

#### 1. `src/renderer/hooks/useInputState.ts`
- Add `useState` for local input value buffer
- Add `useEffect` with 150ms debounced sync to store
- `setValue` updates local state immediately, debounces store update
- Read from local state for UI, store remains source of truth for persistence

#### 2. `src/renderer/components/WorkspacePanel.tsx`
- Wrap `sendMessage` with `useCallback` (move `getSessionInput` call inside)
- Wrap `handleSelectSession` with `useCallback`
- Extract `onCancel` inline function to a `useCallback`
- Wrap `contextValue` with `useMemo`

#### 3. `src/renderer/components/ChatInput/ChatInput.tsx`
- Wrap the component export with `memo()`
- Add custom comparison function if needed for complex props

#### 4. `src/renderer/hooks/useInputHandlers.ts`
- Use `useRef` to hold latest `value` to avoid callback recreations
- Update ref in effect, read from ref in handlers
- Reduces dependency array churn for `onKeyDown`, `onChange`, `handleSubmit`

### Data Flow

```
User types → Local state updates (immediate) → UI re-renders (fast)
                    ↓
            150ms debounce
                    ↓
            Zustand store update → Persisted state
```

### Configuration

- Debounce timing: 150ms (configurable if needed)

## Follow-up Optimization (2026-01-08)

### Additional Issues Found

1. **`setCursorPosition` was not debounced**: While `setValue` was debounced, cursor position updates were still immediate, causing store updates on every keystroke.

2. **Redundant `setHistoryIndex(null)` calls**: The `onChange` handler called `setHistoryIndex(null)` on every keystroke, even when already null.

### Additional Changes

#### 1. `src/renderer/hooks/useInputState.ts`
- `setCursorPosition` now uses the same 150ms debounce pattern as `setValue`
- Both value and cursor position updates share the same debounce timer, batching updates

#### 2. `src/renderer/hooks/useInputHandlers.ts`
- Guard `setHistoryIndex(null)` with `if (historyIndex !== null)` check
- Added `historyIndex` to dependency array of `onChange` callback
