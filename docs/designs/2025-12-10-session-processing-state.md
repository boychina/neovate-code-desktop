# Session-scoped Processing State & ActivityIndicator

## Overview

Reorganize processing-related state (`status`, `processingStartTime`, `processingToken`, `error`, `retryInfo`) to be scoped by sessionId, and add an ActivityIndicator component to show processing status.

## Current State

```typescript
// store.tsx - flat processing state
status: 'idle' | 'processing';
processingStartTime: number;
processingToken: number;
// Missing: error, retryInfo
```

## Proposed Changes

### 1. Store State Structure

```typescript
// New session-scoped processing state
interface SessionProcessingState {
  status: 'idle' | 'processing' | 'failed';
  processingStartTime: number | null;
  processingToken: number;
  error: string | null;
  retryInfo: {
    currentRetry: number;
    maxRetries: number;
    error: string | null;
  } | null;
}

interface StoreState {
  // Remove flat processing state:
  // - status
  // - processingStartTime  
  // - processingToken

  // Add session-scoped processing state
  sessionProcessing: Record<SessionId, SessionProcessingState>;
}
```

### 2. Store Actions

```typescript
interface StoreActions {
  // New helper to get/set processing state for a session
  getSessionProcessing: (sessionId: string) => SessionProcessingState;
  setSessionProcessing: (sessionId: string, state: Partial<SessionProcessingState>) => void;
  
  // Update sendMessage to use session-scoped state
  sendMessage: (params: { message: string }) => Promise<void>;
}
```

### 3. ActivityIndicator Component

Location: `src/renderer/components/ActivityIndicator.tsx`

```typescript
interface ActivityIndicatorProps {
  sessionId: string | null;
}

function ActivityIndicator({ sessionId }: ActivityIndicatorProps) {
  // Reads from sessionProcessing[sessionId]
  // Shows:
  // - "Processing..." with elapsed time
  // - Token count (↓ X tokens)
  // - Retry info if present
  // - Error message if failed
  // - "Esc to cancel" hint
}
```

**Display Logic:**
- If `status === 'idle'`: return null
- If `status === 'processing'`: show animated "Processing..." + elapsed time + token count + retry info
- If `status === 'failed'`: show error message in red

### 4. WorkspacePanel Integration

```tsx
// In WorkspacePanel, before ChatInput
<ActivityIndicator sessionId={selectedSessionId} />
<ChatInput ... />
```

## Data Flow

1. User sends message → `sendMessage()` called
2. `setSessionProcessing(sessionId, { status: 'processing', processingStartTime: Date.now(), processingToken: 0 })`
3. On `chunk` event → increment `processingToken`
4. On `streamResult` event → update `retryInfo` if error
5. On completion → `setSessionProcessing(sessionId, { status: 'idle', ... })`
6. On failure → `setSessionProcessing(sessionId, { status: 'failed', error: message })`

## Files to Modify

1. `src/renderer/store.tsx` - State restructure
2. `src/renderer/components/ActivityIndicator.tsx` - New component
3. `src/renderer/components/WorkspacePanel.tsx` - Add ActivityIndicator
