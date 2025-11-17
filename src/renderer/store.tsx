import { create } from 'zustand';
import { WebSocketTransport } from './client/transport/WebSocketTransport';
import { MessageBus } from './client/messaging/MessageBus';

interface StoreState {
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  transport: WebSocketTransport | null;
  messageBus: MessageBus | null;
}

interface StoreActions {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  request: <T, R>(method: string, params: T) => Promise<R>;
  onEvent: <T>(event: string, handler: (data: T) => void) => void;
}

type Store = StoreState & StoreActions;

const useStore = create<Store>()((set, get) => ({
  state: 'disconnected',
  transport: null,
  messageBus: null,

  connect: async () => {
    const { transport } = get();
    if (transport?.isConnected()) {
      return;
    }

    set({ state: 'connecting' });

    try {
      const newTransport = new WebSocketTransport({
        url: 'ws://localhost:1024/ws',
        reconnectInterval: 1000,
        maxReconnectInterval: 30000,
        shouldReconnect: true,
      });

      newTransport.onError(() => {
        set({ state: 'error' });
      });

      newTransport.onClose(() => {
        set({ state: 'disconnected' });
      });

      const newMessageBus = new MessageBus();
      newMessageBus.setTransport(newTransport);

      // Set the transport and messageBus before connecting
      set({ transport: newTransport, messageBus: newMessageBus });

      // Connect the transport
      await newTransport.connect();

      // Set state to connected after successful connection
      set({ state: 'connected' });
    } catch (error) {
      set({ state: 'error' });
    }
  },

  disconnect: async () => {
    const { transport, messageBus } = get();

    if (transport) {
      await transport.close();
    }

    if (messageBus) {
      messageBus.cancelPendingRequests();
    }

    set({
      state: 'disconnected',
      transport: null,
      messageBus: null,
    });
  },

  request: <T, R>(method: string, params: T): Promise<R> => {
    const { messageBus, state } = get();

    if (state !== 'connected' || !messageBus) {
      throw new Error(
        `Cannot make request when not connected. Current state: ${state}`,
      );
    }

    return messageBus.request<T, R>(method, params);
  },

  onEvent: <T,>(event: string, handler: (data: T) => void) => {
    const { messageBus, state } = get();

    if (state !== 'connected' || !messageBus) {
      throw new Error(
        `Cannot subscribe to events when not connected. Current state: ${state}`,
      );
    }

    messageBus.onEvent<T>(event, handler);
  },
}));

export { useStore, Store, StoreState, StoreActions };
