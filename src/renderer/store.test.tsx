import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';

describe('Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    const store = useStore.getState();
    // Clear all data
    Object.keys(store.repos).forEach((path) => {
      store.deleteRepo(path);
    });
  });

  it('should add and retrieve a repo', () => {
    const store = useStore.getState();

    const repo = {
      path: '/test/repo',
      name: 'Test Repo',
      workspaceIds: [],
      metadata: {
        lastAccessed: Date.now(),
      },
      gitRemote: {
        originUrl: 'https://github.com/test/repo',
        defaultBranch: 'main',
        syncStatus: 'synced' as const,
      },
    };

    store.addRepo(repo);

    expect(store.repos[repo.path]).toEqual(repo);
  });

  it('should add and retrieve a workspace', () => {
    const store = useStore.getState();

    // First add a repo
    const repo = {
      path: '/test/repo',
      name: 'Test Repo',
      workspaceIds: [],
      metadata: {
        lastAccessed: Date.now(),
      },
      gitRemote: {
        originUrl: 'https://github.com/test/repo',
        defaultBranch: 'main',
        syncStatus: 'synced' as const,
      },
    };

    store.addRepo(repo);

    // Then add a workspace
    const workspace = {
      id: 'workspace-1',
      repoPath: '/test/repo',
      branch: 'main',
      worktreePath: '/test/repo',
      sessionIds: [],
      gitState: {
        currentCommit: 'abc123',
        isDirty: false,
        pendingChanges: [],
      },
      metadata: {
        createdAt: Date.now(),
        description: 'Test workspace',
        status: 'active' as const,
      },
      context: {
        activeFiles: [],
      },
    };

    store.addWorkspace(workspace);

    expect(store.workspaces[workspace.id]).toEqual(workspace);
    expect(store.repos[repo.path].workspaceIds).toContain(workspace.id);
  });

  it('should add and retrieve a session', () => {
    const store = useStore.getState();

    // Add a repo
    const repo = {
      path: '/test/repo',
      name: 'Test Repo',
      workspaceIds: [],
      metadata: {
        lastAccessed: Date.now(),
      },
      gitRemote: {
        originUrl: 'https://github.com/test/repo',
        defaultBranch: 'main',
        syncStatus: 'synced' as const,
      },
    };

    store.addRepo(repo);

    // Add a workspace
    const workspace = {
      id: 'workspace-1',
      repoPath: '/test/repo',
      branch: 'main',
      worktreePath: '/test/repo',
      sessionIds: [],
      gitState: {
        currentCommit: 'abc123',
        isDirty: false,
        pendingChanges: [],
      },
      metadata: {
        createdAt: Date.now(),
        description: 'Test workspace',
        status: 'active' as const,
      },
      context: {
        activeFiles: [],
      },
    };

    store.addWorkspace(workspace);

    // Add a session
    const session = {
      id: 'session-1',
      workspaceId: 'workspace-1',
      messages: [],
      context: {
        files: [],
        codeRefs: [],
      },
      state: {
        pendingOperations: [],
        activeTasks: [],
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'active' as const,
        tags: [],
        labels: [],
      },
    };

    store.addSession(session);

    expect(store.sessions[session.id]).toEqual(session);
    expect(store.workspaces[workspace.id].sessionIds).toContain(session.id);
  });

  it('should cascade delete repos', () => {
    const store = useStore.getState();

    // Add a repo
    const repo = {
      path: '/test/repo',
      name: 'Test Repo',
      workspaceIds: [],
      metadata: {
        lastAccessed: Date.now(),
      },
      gitRemote: {
        originUrl: 'https://github.com/test/repo',
        defaultBranch: 'main',
        syncStatus: 'synced' as const,
      },
    };

    store.addRepo(repo);

    // Add a workspace
    const workspace = {
      id: 'workspace-1',
      repoPath: '/test/repo',
      branch: 'main',
      worktreePath: '/test/repo',
      sessionIds: [],
      gitState: {
        currentCommit: 'abc123',
        isDirty: false,
        pendingChanges: [],
      },
      metadata: {
        createdAt: Date.now(),
        description: 'Test workspace',
        status: 'active' as const,
      },
      context: {
        activeFiles: [],
      },
    };

    store.addWorkspace(workspace);

    // Add a session
    const session = {
      id: 'session-1',
      workspaceId: 'workspace-1',
      messages: [],
      context: {
        files: [],
        codeRefs: [],
      },
      state: {
        pendingOperations: [],
        activeTasks: [],
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'active' as const,
        tags: [],
        labels: [],
      },
    };

    store.addSession(session);

    // Delete the repo (should cascade)
    store.deleteRepo('/test/repo');

    expect(store.repos['/test/repo']).toBeUndefined();
    expect(store.workspaces['workspace-1']).toBeUndefined();
    expect(store.sessions['session-1']).toBeUndefined();
  });

  it('should handle UI selections', () => {
    const store = useStore.getState();

    // Add a repo
    const repo = {
      path: '/test/repo',
      name: 'Test Repo',
      workspaceIds: [],
      metadata: {
        lastAccessed: Date.now(),
      },
      gitRemote: {
        originUrl: 'https://github.com/test/repo',
        defaultBranch: 'main',
        syncStatus: 'synced' as const,
      },
    };

    store.addRepo(repo);
    store.selectRepo('/test/repo');

    expect(store.selectedRepoPath).toBe('/test/repo');

    // Add a workspace
    const workspace = {
      id: 'workspace-1',
      repoPath: '/test/repo',
      branch: 'main',
      worktreePath: '/test/repo',
      sessionIds: [],
      gitState: {
        currentCommit: 'abc123',
        isDirty: false,
        pendingChanges: [],
      },
      metadata: {
        createdAt: Date.now(),
        description: 'Test workspace',
        status: 'active' as const,
      },
      context: {
        activeFiles: [],
      },
    };

    store.addWorkspace(workspace);
    store.selectWorkspace('workspace-1');

    expect(store.selectedWorkspaceId).toBe('workspace-1');
  });
});
