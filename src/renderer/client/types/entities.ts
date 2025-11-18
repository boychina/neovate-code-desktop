export interface Message {
  uuid: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface RepoData {
  path: string;
  name: string;
  workspaceIds: string[];
  metadata: {
    lastAccessed: number;
    settings?: Record<string, any>;
  };
  gitRemote: {
    originUrl: string | null;
    defaultBranch: string | null;
    syncStatus: 'synced' | 'ahead' | 'behind' | 'diverged' | 'unknown';
  };
}

export interface WorkspaceData {
  id: string;
  repoPath: string;
  branch: string;
  worktreePath: string;
  sessionIds: string[];
  gitState: {
    currentCommit: string;
    isDirty: boolean;
    pendingChanges: string[];
  };
  metadata: {
    createdAt: number;
    description: string;
    status: 'active' | 'archived' | 'stale';
  };
  context: {
    activeFiles: string[];
    settings?: Record<string, any>;
    preferences?: Record<string, any>;
  };
}

export interface SessionData {
  id: string;
  workspaceId: string;
  messages: Message[];
  context: {
    files: string[];
    codeRefs: Array<{ file: string; line?: number }>;
  };
  state: {
    pendingOperations: string[];
    activeTasks: string[];
  };
  metadata: {
    createdAt: number;
    updatedAt: number;
    status: 'active' | 'completed' | 'archived';
    tags: string[];
    labels: string[];
  };
}
