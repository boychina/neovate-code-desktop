# Store Message Sending and Processing State

**Date:** 2025-11-18

## Context

The application needs to send messages to sessions via WebSocket, track processing state during message requests, and handle incoming message events. Currently, `handleSendMessage` in App.tsx is a mock implementation that directly adds messages to the store without actual server communication.

The goal is to:
1. Add a `sendMessage()` method to the store for sending messages via WebSocket
2. Track processing state (status, start time, token count) during message requests
3. Initialize event handlers for incoming messages and streaming responses
4. Auto-create sessions when none is selected
5. Update App.tsx to use the new store method

## Discussion

### Key Questions and Answers

**Q: Which session should receive the message when `sendMessage()` is called?**
- **A:** Use the currently selected session (`selectedSessionId`). If null, create a new session with a random UUID and auto-select it.

**Q: When should `initialize()` be called?**
- **A:** Once on app mount, after the WebSocket connection is established (similar to current `connect()`).

**Q: What RPC method and parameters should be used?**
- **A:** Call `request('session.sendMessage', { message: string, sessionId: string, cwd: string, planMode: false })`

**Q: Where should the `cwd` parameter come from?**
- **A:** From the selected workspace's `worktreePath` (resolved via session → workspace lookup).

### Explored Approaches

Three approaches were considered:

1. **All-in-Store (CHOSEN):** Both `initialize()` and `sendMessage()` are store actions, event handlers update store directly, processing state lives in store.
   - **Pros:** Centralized, single source of truth, easy to debug
   - **Cons:** Store becomes larger
   - **Complexity:** Low-Medium

2. **Hybrid with Listener Service:** `sendMessage()` in store, event handlers in separate service
   - **Pros:** Separation of concerns
   - **Cons:** More files, indirection

3. **Minimal Store, Rich Hook:** Create `useChatSession` hook for logic
   - **Pros:** Reusable, testable
   - **Cons:** Logic distributed

**Decision:** All-in-Store approach chosen for simplicity and alignment with existing architecture.

## Approach

### State Extensions

Add processing state to track message request lifecycle:

```typescript
status: 'idle' | 'processing'
processingStartTime: number
processingToken: number
```

### New Methods

1. **`initialize()`:** Called once after connection. Registers event handlers:
   - `message` events → call `addMessage()` 
   - `chunk` events → log for now (streaming tokens)
   - `streamResult` events → log for now (stream completion)

2. **`sendMessage({ message: string })`:** 
   - Auto-create/select session if needed
   - Set processing state
   - Resolve CWD from workspace
   - Send request to server
   - Reset processing state (with try/finally for errors)

### UUID Utility

Extract the random UUID generator to `src/renderer/utils/uuid.ts` for reuse across the codebase.

## Architecture

### File Structure

```
src/renderer/
  utils/
    uuid.ts               # NEW: randomUUID() utility
  store.tsx               # MODIFIED: Add state, initialize(), sendMessage()
  App.tsx                 # MODIFIED: Simplify handleSendMessage
  hooks/
    useStoreConnection.ts # MODIFIED: Call initialize() after connect
```

### sendMessage() Flow

```
1. Check selectedSessionId
   ├─ If null → create session with randomUUID() → selectSession()
   └─ If exists → use it

2. Set processing state:
   { status: 'processing', processingStartTime: Date.now(), processingToken: 0 }

3. Resolve CWD:
   selectedSessionId → session.workspaceId → workspace.worktreePath

4. Send request:
   request('session.sendMessage', { 
     message, 
     sessionId, 
     cwd: worktreePath, 
     planMode: false 
   })

5. Reset state (in finally block):
   { status: 'idle', processingStartTime: 0, processingToken: 0 }
```

### initialize() Implementation

```typescript
initialize: async () => {
  const { messageBus } = get();
  
  // Register event handlers
  messageBus.onEvent('message', (data) => {
    // Call addMessage with data.sessionId and message
  });
  
  messageBus.onEvent('chunk', (data) => {
    // TODO: Handle streaming chunks
    console.log('chunk:', data);
  });
  
  messageBus.onEvent('streamResult', (data) => {
    // TODO: Handle stream completion
    console.log('streamResult:', data);
  });
}
```

### Error Handling

- **No workspace found:** Throw descriptive error when resolving CWD
- **Not connected:** Check connection state before sending
- **Request failures:** Always reset processing state in finally block
- **Concurrent sends:** Processing status shows 'processing' until completion

### Integration Points

**App.tsx:**
```typescript
const handleSendMessage = async (sessionId: string, content: string) => {
  await sendMessage({ message: content });
};
```

**useStoreConnection hook:**
```typescript
useEffect(() => {
  const init = async () => {
    await connect();
    await initialize(); // Add this
  };
  init();
}, []);
```

### Auto-Session Creation

When `selectedSessionId` is null:
1. Generate UUID using `randomUUID()`
2. Create new SessionData with required fields (workspaceId from selectedWorkspaceId)
3. Call `addSession(newSession)`
4. Call `selectSession(newSessionId)`
5. Continue with message sending
