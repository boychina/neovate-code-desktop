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

    expect(useStore.getState().repos[repo.path]).toEqual(repo);
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

    expect(useStore.getState().workspaces[workspace.id]).toEqual(workspace);
    expect(useStore.getState().repos[repo.path].workspaceIds).toContain(
      workspace.id,
    );
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

    // Delete the repo (should cascade)
    store.deleteRepo('/test/repo');

    expect(useStore.getState().repos['/test/repo']).toBeUndefined();
    expect(useStore.getState().workspaces['workspace-1']).toBeUndefined();
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

    expect(useStore.getState().selectedRepoPath).toBe('/test/repo');

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

    expect(useStore.getState().selectedWorkspaceId).toBe('workspace-1');
  });
});
