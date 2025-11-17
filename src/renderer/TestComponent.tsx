// @ts-nocheck
import React from 'react';
import { useStore } from './store';

const TestComponent = () => {
  const { repos, workspaces, sessions, selectedRepoPath, addRepo, selectRepo } =
    useStore();

  React.useEffect(() => {
    console.log('Initial store state:', {
      repos: Object.keys(repos),
      workspaces: Object.keys(workspaces),
      sessions: Object.keys(sessions),
      selectedRepoPath,
    });

    // Test adding a repo
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
        syncStatus: 'synced',
      },
    };

    console.log('Adding repo...');
    addRepo(repo);

    console.log('Repo added');
  }, []);

  React.useEffect(() => {
    console.log('Store state updated:', {
      repos: Object.keys(repos),
      workspaces: Object.keys(workspaces),
      sessions: Object.keys(sessions),
      selectedRepoPath,
    });

    if (repos['/test/repo']) {
      console.log('Repo in store:', repos['/test/repo']);
    }
  }, [repos, workspaces, sessions, selectedRepoPath]);

  return <div>Test Component</div>;
};

export default TestComponent;
