# Chat Input Processing State

## Summary

Change the chat input behavior during message processing: keep the textarea enabled and focusable, but block submission and show a toast warning when the user tries to submit.

## Current Behavior

1. `WorkspacePanel` sets `isLoading=true` when sending a message
2. `disabled={isLoading}` is passed to `ChatInput`
3. The textarea becomes disabled (unfocusable) during processing

## New Behavior

1. Textarea remains enabled and focusable at all times
2. When `isProcessing=true`, submission is blocked
3. User sees a toast warning when attempting to submit while processing

## Implementation

### 1. ChatInput.tsx

- Add new prop `isProcessing?: boolean`
- Remove `disabled` from `<Textarea>` component
- Pass `isProcessing` to `useInputHandlers`

```tsx
interface ChatInputProps {
  // ... existing props
  isProcessing?: boolean;  // NEW
  disabled?: boolean;      // Keep for other disabled states
}

// Pass to hook
const { ... } = useInputHandlers({
  onSubmit,
  onCancel,
  onShowForkModal,
  fetchPaths,
  fetchCommands,
  isProcessing,  // NEW
});

// Textarea - remove disabled prop or keep for non-processing disabled states
<Textarea
  disabled={disabled && !isProcessing}  // Only disable for non-processing reasons
  // ...
/>
```

### 2. useInputHandlers.ts

- Accept `isProcessing` in props
- Block submission when processing, show toast

```tsx
import { toastManager } from '../components/ui/toast';

interface UseInputHandlersProps {
  // ... existing props
  isProcessing?: boolean;
}

// In handleSubmit:
const handleSubmit = useCallback(() => {
  // Block submission during processing
  if (isProcessing) {
    toastManager.add({
      type: 'warning',
      title: 'Please wait',
      description: 'Processing previous message...',
    });
    return;
  }
  
  // ... rest of existing logic
}, [/* ... */, isProcessing]);
```

### 3. WorkspacePanel.tsx

- Change prop from `disabled` to `isProcessing`

```tsx
<ChatInput
  // ...
  isProcessing={isLoading}  // Changed from disabled={isLoading}
/>
```

## Files Changed

1. `src/renderer/components/ChatInput/ChatInput.tsx`
2. `src/renderer/hooks/useInputHandlers.ts`
3. `src/renderer/components/WorkspacePanel.tsx`
