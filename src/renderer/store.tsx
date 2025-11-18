import { create } from 'zustand';
import { WebSocketTransport } from './client/transport/WebSocketTransport';
import { MessageBus } from './client/messaging/MessageBus';
import { randomUUID } from './utils/uuid';
import type {
  RepoData,
  WorkspaceData,
  SessionData,
  Message,
} from './client/types/entities';

interface StoreState {
  // WebSocket connection state
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  transport: WebSocketTransport | null;
  messageBus: MessageBus | null;
  initialized: boolean;

  // Entity data
  repos: Record<string, RepoData>;
  workspaces: Record<string, WorkspaceData>;
  sessions: Record<string, SessionData>;
  messages: Message[];

  // Processing state
  status: 'idle' | 'processing';
  processingStartTime: number;
  processingToken: number;

  // UI state
  selectedRepoPath: string | null;
  selectedWorkspaceId: string | null;
  selectedSessionId: string | null;
}

interface StoreActions {
  // WebSocket actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  request: <T, R>(method: string, params: T) => Promise<R>;
  onEvent: <T>(event: string, handler: (data: T) => void) => void;
  initialize: () => Promise<void>;
  sendMessage: (params: { message: string }) => Promise<void>;

  // Entity CRUD operations
  // Repos
  addRepo: (repo: RepoData) => void;
  updateRepo: (path: string, updates: Partial<RepoData>) => void;
  deleteRepo: (path: string) => void;

  // Workspaces
  addWorkspace: (workspace: WorkspaceData) => void;
  updateWorkspace: (id: string, updates: Partial<WorkspaceData>) => void;
  deleteWorkspace: (id: string) => void;

  // Sessions
  addSession: (session: SessionData) => void;
  updateSession: (id: string, updates: Partial<SessionData>) => void;
  deleteSession: (id: string) => void;
  addMessage: (message: Omit<Message, 'id'>) => void;
  setMessages: (messages: Message[]) => void;

  // UI Selections
  selectRepo: (path: string | null) => void;
  selectWorkspace: (id: string | null) => void;
  selectSession: (id: string | null) => void;
}

type Store = StoreState & StoreActions;

const useStore = create<Store>()((set, get) => ({
  // Initial WebSocket state
  state: 'disconnected',
  transport: null,
  messageBus: null,
  initialized: false,

  // Initial entity data
  repos: {},
  workspaces: {},
  sessions: {},
  messages: [],

  // Initial processing state
  status: 'idle',
  processingStartTime: 0,
  processingToken: 0,

  // Initial UI state
  selectedRepoPath: null,
  selectedWorkspaceId: null,
  selectedSessionId: null,

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

  initialize: async () => {
    const { initialized, onEvent, addMessage } = get();

    // Only initialize once
    if (initialized) {
      console.log('Already initialized, skipping');
      return;
    }

    console.log('Initializing event handlers');

    onEvent('message', (data: any) => {
      console.log('message', data);
      if (data.message) {
        addMessage(data.message);
      }
    });

    onEvent('chunk', (data: any) => {
      console.log('chunk', data);
    });

    onEvent('streamResult', (data: any) => {
      console.log('streamResult', data);
    });

    set({ initialized: true });
  },

  sendMessage: async (params: { message: string }) => {
    const {
      selectedSessionId,
      selectedWorkspaceId,
      sessions,
      workspaces,
      request,
      selectSession,
    } = get();

    let sessionId = selectedSessionId;

    if (!selectedWorkspaceId) {
      throw new Error('No workspace selected to create session');
    }

    if (!sessionId) {
      const newSessionId = randomUUID();

      // const newSession: SessionData = {
      //   id: newSessionId,
      //   workspaceId: selectedWorkspaceId,
      //   messages: [],
      //   context: {
      //     files: [],
      //     codeRefs: [],
      //   },
      //   state: {
      //     pendingOperations: [],
      //     activeTasks: [],
      //   },
      //   metadata: {
      //     createdAt: Date.now(),
      //     updatedAt: Date.now(),
      //     status: 'active',
      //     tags: [],
      //     labels: [],
      //   },
      // };

      // addSession(newSession);
      selectSession(newSessionId);
      sessionId = newSessionId;
    }

    // const session = sessions[sessionId];
    // if (!session) {
    //   throw new Error(`Session ${sessionId} not found`);
    // }

    const workspace = workspaces[selectedWorkspaceId];
    if (!workspace) {
      throw new Error(`Workspace ${selectedWorkspaceId} not found`);
    }

    const cwd = workspace.worktreePath;

    set({
      status: 'processing',
      processingStartTime: Date.now(),
      processingToken: 0,
    });

    try {
      await request('session.send', {
        message: params.message,
        sessionId,
        cwd,
        planMode: false,
      });
    } finally {
      set({
        status: 'idle',
        processingStartTime: 0,
        processingToken: 0,
      });
    }
  },

  // Entity CRUD operations
  // Repos
  addRepo: (repo: RepoData) => {
    set((state) => ({
      repos: {
        ...state.repos,
        [repo.path]: repo,
      },
    }));
  },

  updateRepo: (path: string, updates: Partial<RepoData>) => {
    set((state) => ({
      repos: {
        ...state.repos,
        [path]: {
          ...state.repos[path],
          ...updates,
        },
      },
    }));
  },

  deleteRepo: (path: string) => {
    set((state) => {
      // Get the repo to delete
      const repo = state.repos[path];
      if (!repo) return state;

      // Delete all workspaces for this repo (cascading)
      const newWorkspaces = { ...state.workspaces };
      const newSessions = { ...state.sessions };

      repo.workspaceIds.forEach((workspaceId) => {
        const workspace = state.workspaces[workspaceId];
        if (workspace) {
          // Delete all sessions for this workspace (cascading)
          workspace.sessionIds.forEach((sessionId) => {
            delete newSessions[sessionId];
          });

          delete newWorkspaces[workspaceId];
        }
      });

      // Delete the repo
      const newRepos = { ...state.repos };
      delete newRepos[path];

      // Clear UI selections if needed
      let selectedRepoPath = state.selectedRepoPath;
      let selectedWorkspaceId = state.selectedWorkspaceId;
      let selectedSessionId = state.selectedSessionId;

      if (selectedRepoPath === path) {
        selectedRepoPath = null;
        selectedWorkspaceId = null;
        selectedSessionId = null;
      }

      return {
        repos: newRepos,
        workspaces: newWorkspaces,
        sessions: newSessions,
        selectedRepoPath,
        selectedWorkspaceId,
        selectedSessionId,
      };
    });
  },

  // Workspaces
  addWorkspace: (workspace: WorkspaceData) => {
    set((state) => {
      // Add the workspace
      const newWorkspaces = {
        ...state.workspaces,
        [workspace.id]: workspace,
      };

      // Add the workspace ID to the parent repo
      const repo = state.repos[workspace.repoPath];
      if (repo && !repo.workspaceIds.includes(workspace.id)) {
        const newRepos = {
          ...state.repos,
          [workspace.repoPath]: {
            ...repo,
            workspaceIds: [...repo.workspaceIds, workspace.id],
          },
        };

        return {
          repos: newRepos,
          workspaces: newWorkspaces,
        };
      }

      return {
        workspaces: newWorkspaces,
      };
    });
  },

  updateWorkspace: (id: string, updates: Partial<WorkspaceData>) => {
    set((state) => ({
      workspaces: {
        ...state.workspaces,
        [id]: {
          ...state.workspaces[id],
          ...updates,
        },
      },
    }));
  },

  deleteWorkspace: (id: string) => {
    set((state) => {
      // Get the workspace to delete
      const workspace = state.workspaces[id];
      if (!workspace) return state;

      // Delete all sessions for this workspace (cascading)
      const newSessions = { ...state.sessions };
      workspace.sessionIds.forEach((sessionId) => {
        delete newSessions[sessionId];
      });

      // Remove the workspace ID from the parent repo
      const repo = state.repos[workspace.repoPath];
      if (repo) {
        const newRepos = {
          ...state.repos,
          [workspace.repoPath]: {
            ...repo,
            workspaceIds: repo.workspaceIds.filter((wid) => wid !== id),
          },
        };

        // Delete the workspace
        const newWorkspaces = { ...state.workspaces };
        delete newWorkspaces[id];

        // Clear UI selections if needed
        let selectedWorkspaceId = state.selectedWorkspaceId;
        let selectedSessionId = state.selectedSessionId;

        if (selectedWorkspaceId === id) {
          selectedWorkspaceId = null;
          selectedSessionId = null;
        }

        return {
          repos: newRepos,
          workspaces: newWorkspaces,
          sessions: newSessions,
          selectedWorkspaceId,
          selectedSessionId,
        };
      }

      // If no repo found, just delete the workspace
      const newWorkspaces = { ...state.workspaces };
      delete newWorkspaces[id];

      // Clear UI selections if needed
      let selectedWorkspaceId = state.selectedWorkspaceId;
      let selectedSessionId = state.selectedSessionId;

      if (selectedWorkspaceId === id) {
        selectedWorkspaceId = null;
        selectedSessionId = null;
      }

      return {
        workspaces: newWorkspaces,
        sessions: newSessions,
        selectedWorkspaceId,
        selectedSessionId,
      };
    });
  },

  // Sessions
  addSession: (session: SessionData) => {
    set((state) => {
      // Add the session
      const newSessions = {
        ...state.sessions,
        [session.id]: session,
      };

      // Add the session ID to the parent workspace
      const workspace = state.workspaces[session.workspaceId];
      if (workspace && !workspace.sessionIds.includes(session.id)) {
        const newWorkspaces = {
          ...state.workspaces,
          [session.workspaceId]: {
            ...workspace,
            sessionIds: [...workspace.sessionIds, session.id],
          },
        };

        return {
          workspaces: newWorkspaces,
          sessions: newSessions,
        };
      }

      return {
        sessions: newSessions,
      };
    });
  },

  updateSession: (id: string, updates: Partial<SessionData>) => {
    set((state) => ({
      sessions: {
        ...state.sessions,
        [id]: {
          ...state.sessions[id],
          ...updates,
        },
      },
    }));
  },

  deleteSession: (id: string) => {
    set((state) => {
      // Get the session to delete
      const session = state.sessions[id];
      if (!session) return state;

      // Remove the session ID from the parent workspace
      const workspace = state.workspaces[session.workspaceId];
      if (workspace) {
        const newWorkspaces = {
          ...state.workspaces,
          [session.workspaceId]: {
            ...workspace,
            sessionIds: workspace.sessionIds.filter((sid) => sid !== id),
          },
        };

        // Delete the session
        const newSessions = { ...state.sessions };
        delete newSessions[id];

        // Clear UI selection if needed
        let selectedSessionId = state.selectedSessionId;
        if (selectedSessionId === id) {
          selectedSessionId = null;
        }

        return {
          workspaces: newWorkspaces,
          sessions: newSessions,
          selectedSessionId,
        };
      }

      // If no workspace found, just delete the session
      const newSessions = { ...state.sessions };
      delete newSessions[id];

      // Clear UI selection if needed
      let selectedSessionId = state.selectedSessionId;
      if (selectedSessionId === id) {
        selectedSessionId = null;
      }

      return {
        sessions: newSessions,
        selectedSessionId,
      };
    });
  },

  addMessage: (message: Message) => {
    set((state) => {
      // const session = state.sessions[sessionId];
      // if (!session) return state;

      // const newMessage: Message = {
      //   ...message,
      //   id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      //   timestamp: Date.now(),
      // };

      return {
        messages: [...state.messages, message],
      };
    });
  },

  setMessages: (messages: Message[]) => {
    set({ messages });
  },

  // UI Selections
  selectRepo: (path: string | null) => {
    set((state) => {
      // Validate that the repo exists if path is not null
      if (path !== null && !state.repos[path]) {
        return state;
      }

      return {
        selectedRepoPath: path,
        // Reset child selections when parent changes
        selectedWorkspaceId: null,
        selectedSessionId: null,
      };
    });
  },

  selectWorkspace: (id: string | null) => {
    set((state) => {
      // Validate that the workspace exists and belongs to the selected repo if both are set
      if (id !== null) {
        const workspace = state.workspaces[id];
        if (!workspace) return state;

        if (
          state.selectedRepoPath &&
          workspace.repoPath !== state.selectedRepoPath
        ) {
          return state;
        }
      }

      return {
        selectedWorkspaceId: id,
        // Reset child selection when parent changes
        selectedSessionId: null,
      };
    });
  },

  selectSession: (id: string | null) => {
    set((state) => {
      // // Validate that the session exists and belongs to the selected workspace if both are set
      // if (id !== null) {
      //   const session = state.sessions[id];
      //   if (!session) return state;

      //   if (
      //     state.selectedWorkspaceId &&
      //     session.workspaceId !== state.selectedWorkspaceId
      //   ) {
      //     return state;
      //   }
      // }

      return {
        selectedSessionId: id,
      };
    });
  },
}));

export { useStore, Store, StoreState, StoreActions };
