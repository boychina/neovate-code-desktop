# Zustand Store for WebSocket Connection

**Date:** 2025-11-17

## Context

The project needs a centralized state management solution for WebSocket connectivity using the existing `WebSocketTransport` and `MessageBus` client infrastructure. The store should be simple and focused, managing only connection state and providing a clean interface for components to interact with the WebSocket server at `localhost:1024`.

The implementation should reference similar patterns from the Takumi project's store and client state management, creating a minimal yet robust solution using Zustand for state management.

## Discussion

### Key Design Questions

**State Tracking Granularity:**
- Decision: Track multiple connection states (`'disconnected' | 'connecting' | 'connected' | 'error'`) rather than a simple boolean
- Rationale: Provides better UI feedback and debugging capabilities

**Connection Initialization:**
- Decision: Manual connection via explicit `connect()` method call
- Rationale: Gives components control over when to establish connection rather than auto-connecting on store creation

**Error Handling Strategy:**
- Decision: Silent error state transitions with automatic retry logic
- Rationale: Leverages WebSocketTransport's built-in reconnection mechanism; store reflects state reactively without throwing errors to callers

**API Design Pattern:**
- Decision: Full action pattern separating state and actions (Approach C)
- Rationale: Most structured approach, consistent with reference implementation, clearer separation of concerns despite being slightly heavier

### Trade-offs Considered

- **Minimal vs. Structured**: Chose structured approach for maintainability and consistency with existing patterns
- **Direct Access vs. Helper Methods**: Chose helper methods (`request`, `onEvent`) to encapsulate transport details and provide cleaner component API
- **Error Throwing vs. State Updates**: Chose state updates to enable reactive UI without requiring extensive error handling in components

## Approach

Implement a Zustand store following the full action pattern with:
- Separate state and actions interfaces
- Manual connection management
- Built-in retry logic via transport configuration
- Helper methods that proxy to MessageBus for clean component API
- Connection to hardcoded WebSocket endpoint `ws://localhost:1024/ws`

The store serves as a thin, type-safe wrapper around the existing WebSocket infrastructure, exposing only necessary methods while handling connection lifecycle automatically.

## Architecture

### State Structure

```typescript
interface StoreState {
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  transport: WebSocketTransport | null;
  messageBus: MessageBus | null;
}
```

### Actions Interface

```typescript
interface StoreActions {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  request: <T, R>(method: string, params: T) => Promise<R>;
  onEvent: <T>(event: string, handler: (data: T) => void) => void;
}
```

### Connect Method Flow

1. Early return if already connected (`transport?.isConnected()`)
2. Set state to `'connecting'`
3. Create `WebSocketTransport` with configuration:
   - URL: `ws://localhost:1024/ws`
   - `reconnectInterval: 1000ms`
   - `maxReconnectInterval: 30000ms`
   - `shouldReconnect: true`
4. Attach state update handlers:
   - `onError()` → set state to `'error'`
   - `onClose()` → set state to `'disconnected'`
5. Create `MessageBus` and link to transport via `setTransport()`
6. Call `transport.connect()` to initiate connection
7. On successful connection: set state to `'connected'`
8. On error: set state to `'error'` but don't throw (transport retries automatically)

### Disconnect Method Flow

1. Call `transport.close()` to cleanly close WebSocket
2. Call `messageBus.cancelPendingRequests()` to reject pending operations
3. Reset state to `'disconnected'`
4. Null out `transport` and `messageBus` references

### Helper Methods

**request:**
- Validates messageBus availability, throws if not connected
- Proxies to `messageBus.request<T, R>(method, params)`
- Returns typed promise for server response

**onEvent:**
- Validates messageBus availability, throws if not connected
- Proxies to `messageBus.onEvent(event, handler)`
- Enables components to subscribe to server-pushed events

### Testing Strategy

**Test File:** `src/renderer/store.test.ts`

**Coverage Areas:**
1. **Initial State**: Verify disconnected state with null transport/messageBus
2. **Connection Flow**: State transitions, instance creation, idempotent reconnects
3. **Helper Methods**: Error throwing when disconnected, proper proxying when connected
4. **Disconnection**: Cleanup of resources, state reset, pending request cancellation

**Testing Approach:**
- Mock `WebSocketTransport` and `MessageBus` classes
- Isolate tests from real network connections
- Verify state transitions and method invocations

### File Structure

- `src/renderer/store.tsx` - Main store implementation
- `src/renderer/store.test.ts` - Unit tests with mocked dependencies

### Usage Pattern

```typescript
import { useStore } from './store';

function Component() {
  const { state, connect, request, onEvent } = useStore();
  
  // Manual connection
  await connect();
  
  // Make requests
  const result = await request('method.name', { params });
  
  // Listen to events
  onEvent('eventName', (data) => { /* handle */ });
}
```
