import React, { createContext, useContext, useState } from 'react';
import type {
  WorkspaceData,
  SessionData,
  Message,
} from '../client/types/entities';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';

// Define the context type
interface WorkspaceContextType {
  workspace: WorkspaceData;
  activeSession: SessionData | null;
  allSessions: SessionData[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string) => void;
  messages: Message[];
  inputValue: string;
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  setInputValue: (value: string) => void;
}

// Create the context
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

// Custom hook to use the context
export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used within WorkspacePanel');
  }
  return context;
}

// Main component
export const WorkspacePanel = ({
  workspace,
  emptyStateType,
  onSendMessage,
}: {
  workspace: WorkspaceData | null;
  emptyStateType: 'no-repos' | 'no-workspace' | null;
  onSendMessage: (sessionId: string, content: string) => Promise<void>;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    workspace?.sessionIds[0] || null,
  );

  // // Fetch all sessions from the store
  // const allSessions = workspace?.sessionIds
  //   .map(id => useStore(state => state.sessions[id]))
  //   .filter(Boolean) as SessionData[] || [];

  // // Get the active session
  // const activeSession = activeSessionId
  //   ? useStore(state => state.sessions[activeSessionId])
  //   : null;

  const allSessions: SessionData[] = [];
  const activeSession = null as SessionData | null;

  // Update activeSessionId when workspace changes
  React.useEffect(() => {
    if (workspace) {
      // If no active session or active session doesn't belong to this workspace
      if (!activeSessionId || !workspace.sessionIds.includes(activeSessionId)) {
        setActiveSessionId(workspace.sessionIds[0] || null);
      }
    } else {
      setActiveSessionId(null);
    }
  }, [workspace, activeSessionId]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !activeSessionId) return;

    setIsLoading(true);
    try {
      await onSendMessage(activeSessionId, content);
      setInputValue('');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle session switching - reset input
  const handleSetActiveSessionId = (id: string) => {
    setActiveSessionId(id);
    setInputValue('');
  };

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {emptyStateType === 'no-repos' ? <FolderIcon /> : <BranchIcon />}
            </EmptyMedia>
            <EmptyTitle>
              {emptyStateType === 'no-repos'
                ? 'No Repositories Yet'
                : 'No Workspace Selected'}
            </EmptyTitle>
            <EmptyDescription>
              {emptyStateType === 'no-repos'
                ? 'Add a repository to start working with workspaces and branches'
                : 'Select a workspace from the sidebar to start coding'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const contextValue: WorkspaceContextType = {
    workspace,
    activeSession,
    allSessions,
    activeSessionId,
    setActiveSessionId: handleSetActiveSessionId,
    messages: activeSession?.messages || [],
    inputValue,
    isLoading,
    sendMessage,
    setInputValue,
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      <div
        className="flex flex-col h-full"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <WorkspacePanel.Header />
        <WorkspacePanel.SessionTabs />
        <WorkspacePanel.WorkspaceInfo />
        <WorkspacePanel.Messages />
        <WorkspacePanel.ChatInput />
      </div>
    </WorkspaceContext.Provider>
  );
};

// Compound components
WorkspacePanel.Header = function Header() {
  const { workspace } = useWorkspaceContext();

  return (
    <div
      className="p-4"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Workspace: {workspace.branch}
          </h2>
          <p className="text-sm" style={{ color: '#666' }}>
            {workspace.repoPath}
          </p>
        </div>
        <Button variant="default" size="sm">
          Open in Editor
        </Button>
      </div>
    </div>
  );
};

WorkspacePanel.SessionTabs = function SessionTabs() {
  const { allSessions, activeSessionId, setActiveSessionId } =
    useWorkspaceContext();

  if (allSessions.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-4"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <p className="text-sm" style={{ color: '#999' }}>
          No sessions yet
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex overflow-x-auto"
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {allSessions.map((session) => (
        <WorkspacePanel.SessionTab
          key={session.id}
          session={session}
          isActive={session.id === activeSessionId}
          onClick={() => setActiveSessionId(session.id)}
        />
      ))}
    </div>
  );
};

WorkspacePanel.SessionTab = function SessionTab({
  session,
  isActive,
  onClick,
}: {
  session: SessionData;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="px-4 py-2 text-sm cursor-pointer whitespace-nowrap"
      style={
        isActive
          ? { borderBottom: '2px solid #0070f3', color: 'var(--text-primary)' }
          : { color: '#666' }
      }
      onClick={onClick}
    >
      Session {session.id.substring(0, 8)}
    </div>
  );
};

WorkspacePanel.WorkspaceInfo = function WorkspaceInfo() {
  const { workspace } = useWorkspaceContext();

  return (
    <div
      className="p-3 text-sm"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="flex items-center"
        style={{ color: 'var(--text-primary)' }}
      >
        <BranchIcon />
        <span className="ml-2">{workspace.branch}</span>
        <span className="mx-2">•</span>
        <span style={{ color: '#666' }}>
          {workspace.metadata.status === 'active'
            ? 'Active'
            : workspace.metadata.status}
        </span>
        {workspace.gitState.isDirty && (
          <>
            <span className="mx-2">•</span>
            <span style={{ color: '#f59e0b' }}>Uncommitted changes</span>
          </>
        )}
        <span className="ml-auto flex items-center">
          <StatusIcon status={workspace.metadata.status} />
          <span className="ml-1 capitalize">{workspace.metadata.status}</span>
        </span>
      </div>
    </div>
  );
};

WorkspacePanel.Messages = function Messages() {
  const { messages, activeSessionId } = useWorkspaceContext();

  if (!activeSessionId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center" style={{ color: '#999' }}>
          Select a session to view messages
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="text-center mt-8" style={{ color: '#999' }}>
          No messages yet. Start a conversation!
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <WorkspacePanel.Message key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  );
};

WorkspacePanel.Message = function Message({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[80%] rounded-lg p-3"
        style={{
          backgroundColor: isUser ? '#0070f3' : 'var(--bg-surface)',
          color: isUser ? 'white' : 'var(--text-primary)',
        }}
      >
        <div className="flex items-center mb-1">
          <span className="text-xs font-semibold">
            {message.role === 'user'
              ? 'You'
              : message.role === 'assistant'
                ? 'Assistant'
                : 'System'}
          </span>
          <span
            className="text-xs ml-2"
            style={{ color: isUser ? 'rgba(255,255,255,0.7)' : '#666' }}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
};

WorkspacePanel.ChatInput = function ChatInput() {
  const { inputValue, setInputValue, sendMessage, isLoading, activeSessionId } =
    useWorkspaceContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const isDisabled = isLoading;

  return (
    <div
      className="p-4"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <form onSubmit={handleSubmit} className="flex">
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              activeSessionId
                ? 'Type your message...'
                : 'Type your message with a new session...'
            }
            className="w-full rounded-lg px-4 py-2 pr-12 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
            disabled={isDisabled}
          />
          <WorkspacePanel.Toolbar />
        </div>
        <WorkspacePanel.SendButton />
      </form>
    </div>
  );
};

WorkspacePanel.Toolbar = function Toolbar() {
  const { activeSessionId } = useWorkspaceContext();

  if (!activeSessionId) return null;

  return (
    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex">
      <button
        type="button"
        className="p-1 hover:opacity-70"
        style={{ color: '#666' }}
        title="Attach file"
      >
        <AttachIcon />
      </button>
    </div>
  );
};

WorkspacePanel.SendButton = function SendButton() {
  const { inputValue, isLoading } = useWorkspaceContext();

  const canSend = inputValue.trim() && !isLoading;

  return (
    <button
      type="submit"
      disabled={!canSend}
      className="ml-2 px-4 py-2 rounded-lg"
      style={
        canSend
          ? { backgroundColor: '#0070f3', color: 'white' }
          : { backgroundColor: '#e0e0e0', color: '#999', cursor: 'not-allowed' }
      }
    >
      {isLoading ? <SpinnerIcon /> : <SendIcon />}
    </button>
  );
};

// Icons
function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path
        fill="currentColor"
        d="M1.75 2A1.75 1.75 0 000 3.75v8.5C0 13.216.784 14 1.75 14h12.5A1.75 1.75 0 0016 12.25v-6.5A1.75 1.75 0 0014.25 4H7.5L6.293 2.793A1 1 0 005.586 2H1.75zM1.5 3.75a.25.25 0 01.25-.25h3.836a.25.25 0 01.177.073L7.207 5.5h7.043a.25.25 0 01.25.25v6.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25v-8.5z"
      />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path
        fill="currentColor"
        d="M5 3a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 1a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 1a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM5 6h10v1H5V6z"
      />
    </svg>
  );
}

function StatusIcon({ status }: { status: string }) {
  const color =
    status === 'active'
      ? '#10B981'
      : status === 'archived'
        ? '#6B7280'
        : '#F59E0B';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5" fill={color} />
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path
        fill="currentColor"
        d="M6 3v6a3 3 0 1 0 6 0V3a1 1 0 1 0-2 0v6a1 1 0 1 1-2 0V3a3 3 0 1 0-2 0v6a3 3 0 1 0 6 0V3"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path fill="currentColor" d="M1 8l14-6-6 14-4-10L1 8z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="animate-spin">
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="8 8"
      />
    </svg>
  );
}
