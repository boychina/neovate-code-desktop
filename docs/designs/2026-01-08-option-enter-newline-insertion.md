# Option+Enter Newline Insertion

**Date:** 2026-01-08

## Context

Users expect Option+Enter to insert a newline in the ChatInput textarea, similar to how Shift+Enter works. However, Option+Enter was not functioning correctly—pressing it would not insert a newline.

## Discussion

### Initial Problem

The existing code in `useInputHandlers.ts` handled Enter key modifiers by returning early without calling `preventDefault()`:

```typescript
if (e.key === 'Enter') {
  if (e.metaKey || e.shiftKey || e.altKey) {
    return;  // Relies on default browser behavior
  }
  e.preventDefault();
  handleSubmit();
}
```

This approach works for Shift+Enter because browsers have built-in behavior to insert a newline. However, on macOS, Option+Enter does not have this default behavior—it simply does nothing.

### Cursor Positioning Issue

After implementing explicit newline insertion, a second issue emerged: the cursor would jump to the end of the text instead of staying at the insertion point.

For example, with cursor at `abc^def`:
- Expected after Option+Enter: `abc\n^def`
- Actual result: `abc\ndef^`

This occurred because `setSelectionRange()` was called synchronously, but React re-renders the textarea asynchronously with the new value, resetting the cursor position.

## Approach

1. **Explicit newline insertion**: For Option+Enter, manually insert `\n` at the cursor position rather than relying on browser defaults.

2. **Deferred cursor positioning**: Use `requestAnimationFrame()` to set the cursor position after React has completed its re-render cycle.

## Architecture

### Implementation in `useInputHandlers.ts`

The Enter key handler was modified to explicitly handle Option+Enter:

```typescript
if (e.key === 'Enter') {
  if (e.altKey) {
    e.preventDefault();
    const before = currentValue.slice(0, currentCursorPosition);
    const after = currentValue.slice(currentCursorPosition);
    const newPos = currentCursorPosition + 1;
    inputState.setValue(`${before}\n${after}`);
    inputState.setCursorPosition(newPos);
    requestAnimationFrame(() => {
      textarea.setSelectionRange(newPos, newPos);
    });
    return;
  }
  if (e.metaKey || e.shiftKey) {
    return;  // Shift+Enter still relies on default behavior
  }
  e.preventDefault();
  handleSubmit();
  return;
}
```

### Key Technical Details

- **No changes to `textarea.tsx`**: The fix is purely in keyboard handler logic
- **`requestAnimationFrame` timing**: Ensures DOM is updated before setting selection
- **State synchronization**: Both `inputState.setCursorPosition()` and `textarea.setSelectionRange()` are called to keep React state and DOM in sync
