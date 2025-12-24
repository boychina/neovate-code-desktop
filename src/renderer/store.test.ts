import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from './store';

describe('useStore', () => {
  beforeEach(() => {
    // Reset the store to initial state
    useStore.setState({
      state: 'disconnected',
      transport: null,
      messageBus: null,
    });
  });

  it('should have initial disconnected state', () => {
    const store = useStore.getState();

    expect(store.state).toBe('disconnected');
    expect(store.transport).toBeNull();
    expect(store.messageBus).toBeNull();
  });

  it('should throw error when making request while not connected', async () => {
    const { request } = useStore.getState();

    await expect(request('method' as any, {} as any)).rejects.toThrow(
      'Cannot make request when not connected. Current state: disconnected',
    );
  });

  it('should throw error when subscribing to events while not connected', () => {
    const { onEvent } = useStore.getState();

    expect(() => onEvent('event', () => {})).toThrow(
      'Cannot subscribe to events when not connected. Current state: disconnected',
    );
  });

  it('should update state when connected/disconnected', () => {
    // Initially disconnected
    expect(useStore.getState().state).toBe('disconnected');

    // Simulate connected state
    useStore.setState({
      state: 'connected',
      transport: {} as any,
      messageBus: {} as any,
    });

    expect(useStore.getState().state).toBe('connected');

    // Disconnect
    useStore.setState({
      state: 'disconnected',
      transport: null,
      messageBus: null,
    });

    expect(useStore.getState().state).toBe('disconnected');
  });
});
