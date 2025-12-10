import { useState, type MouseEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FolderIcon,
  GitBranchIcon,
  PlusSignIcon,
  DeleteIcon,
  SettingsIcon,
  InformationCircleIcon,
  CalendarIcon,
  ClockIcon,
  DatabaseIcon,
  CloudIcon,
  Comment01Icon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@hugeicons/core-free-icons';
import { formatDistanceToNowStrict } from 'date-fns';
import type { RepoData } from '../client/types/entities';
import { useStore } from '../store';

// Helper function to format relative time using date-fns
function formatRelativeTime(timestamp: number): string {
  return formatDistanceToNowStrict(timestamp, { addSuffix: false });
}

const DEFAULT_SESSION_LIMIT = 5;
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from './ui/accordion';
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from './ui/alert-dialog';
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from './ui/empty';
import { Button } from './ui/button';
import { AddRepoMenu } from './AddRepoMenu';
import { toastManager } from './ui/toast';

export const RepoSidebar = ({
  repos,
  selectedWorkspaceId,
  onSelectWorkspace,
}: {
  repos: RepoData[];
  selectedRepoPath: string | null;
  selectedWorkspaceId: string | null;
  onSelectRepo: (path: string | null) => void;
  onSelectWorkspace: (id: string | null) => void;
}) => {
  const openRepos = useStore((state) => state.openRepoAccordions);
  const setOpenRepoAccordions = useStore(
    (state) => state.setOpenRepoAccordions,
  );
  const expandedSessions = useStore((state) => state.expandedSessionGroups);
  const toggleSessionGroupExpanded = useStore(
    (state) => state.toggleSessionGroupExpanded,
  );
  const workspaces = useStore((state) => state.workspaces);
  const sessions = useStore((state) => state.sessions);
  const selectedSessionId = useStore((state) => state.selectedSessionId);
  const deleteRepo = useStore((state) => state.deleteRepo);
  const request = useStore((state) => state.request);
  const addWorkspace = useStore((state) => state.addWorkspace);
  const selectWorkspace = useStore((state) => state.selectWorkspace);
  const selectSession = useStore((state) => state.selectSession);
  const createSession = useStore((state) => state.createSession);
  const sidebarCollapsed = useStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useStore((state) => state.toggleSidebar);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedRepoForDialog, setSelectedRepoForDialog] =
    useState<RepoData | null>(null);

  const handleRepoInfoClick = (repo: RepoData, e: MouseEvent) => {
    e.stopPropagation();
    setAlertDialogOpen(false); // Ensure alert is closed
    setSelectedRepoForDialog(repo);
    setDialogOpen(true);
  };

  const handleDeleteRepo = () => {
    setAlertDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedRepoForDialog) {
      deleteRepo(selectedRepoForDialog.path);
      setAlertDialogOpen(false);
      setDialogOpen(false);
      setSelectedRepoForDialog(null);
    }
  };

  const handleNewWorkspace = async (repoPath: string) => {
    if (!openRepos.includes(repoPath)) {
      setOpenRepoAccordions([...openRepos, repoPath]);
    }

    try {
      // Step 1: Create workspace
      const createResponse = await request('project.workspaces.create', {
        cwd: repoPath,
        skipUpdate: true,
      });

      if (!createResponse.success) {
        toastManager.add({
          title: 'Workspace Creation Failed',
          description: createResponse.error || 'Failed to create workspace',
          type: 'error',
        });
        return;
      }

      // Step 2: Fetch full workspace details
      const workspaceId = createResponse.data?.workspace.name;
      if (!workspaceId) {
        toastManager.add({
          title: 'Workspace Creation Failed',
          description: 'Invalid workspace response from server',
          type: 'error',
        });
        return;
      }

      const fetchResponse = await request('project.workspaces.get', {
        cwd: repoPath,
        workspaceId,
      });

      if (!fetchResponse.success || !fetchResponse.data) {
        toastManager.add({
          title: 'Failed to load workspace',
          description: 'Workspace created but could not load details',
          type: 'warning',
        });
        return;
      }

      // Step 3: Add to store and select
      addWorkspace(fetchResponse.data);
      selectWorkspace(workspaceId);
    } catch (error) {
      toastManager.add({
        title: 'Workspace Creation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
      });
    }
  };

  return (
    <div
      className={`flex flex-col h-full transition-all duration-200 ${sidebarCollapsed ? 'w-12' : 'w-64'}`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      <RepoSidebar.Header
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      {!sidebarCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {repos.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <HugeiconsIcon
                  icon={FolderIcon}
                  size={48}
                  strokeWidth={1.5}
                  style={{ color: 'var(--text-tertiary)' }}
                />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No repositories</EmptyTitle>
                <EmptyDescription>
                  Click the + icon below to add your first repository
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Accordion value={openRepos} onValueChange={setOpenRepoAccordions}>
              {repos.map((repo) => (
                <AccordionItem key={repo.path} value={repo.path}>
                  <AccordionTrigger className="px-3 py-2 hover:bg-opacity-50">
                    <div className="flex items-center gap-2 flex-1">
                      <HugeiconsIcon
                        icon={FolderIcon}
                        size={18}
                        strokeWidth={1.5}
                      />
                      <span className="font-medium text-sm">{repo.name}</span>
                      <span
                        className="ml-auto text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--bg-base)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {repo.workspaceIds.length}
                      </span>
                      <span
                        className="p-1 rounded hover:bg-opacity-70"
                        onClick={(e) => handleRepoInfoClick(repo, e)}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <HugeiconsIcon
                          icon={InformationCircleIcon}
                          size={16}
                          strokeWidth={1.5}
                        />
                      </span>
                    </div>
                  </AccordionTrigger>

                  <AccordionPanel>
                    <div className="ml-4 space-y-1">
                      <button
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded transition-colors w-full text-left"
                        style={{
                          color: 'var(--text-secondary)',
                          backgroundColor: 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            'var(--bg-base-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={() => handleNewWorkspace(repo.path)}
                      >
                        <HugeiconsIcon
                          icon={PlusSignIcon}
                          size={16}
                          strokeWidth={1.5}
                        />
                        <span className="text-sm font-medium">
                          New workspace
                        </span>
                      </button>

                      {repo.workspaceIds.map((workspaceId) => {
                        const workspace = workspaces[workspaceId];
                        if (!workspace) return null;

                        const isWorkspaceSelected =
                          selectedWorkspaceId === workspaceId;
                        const changesCount =
                          workspace.gitState.pendingChanges.length;

                        // Get sessions for this workspace, sorted by modified (newest first)
                        const workspaceSessions = (sessions[workspaceId] || [])
                          .slice()
                          .sort((a, b) => b.modified - a.modified);
                        const expandKey = `${workspaceId}`;
                        const isExpanded = expandedSessions[expandKey] ?? false;
                        const visibleSessions = isExpanded
                          ? workspaceSessions
                          : workspaceSessions.slice(0, DEFAULT_SESSION_LIMIT);
                        const hiddenCount =
                          workspaceSessions.length - DEFAULT_SESSION_LIMIT;

                        return (
                          <div key={workspaceId}>
                            <div
                              className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded transition-colors"
                              style={{
                                backgroundColor: isWorkspaceSelected
                                  ? 'var(--bg-base)'
                                  : 'transparent',
                                color: isWorkspaceSelected
                                  ? 'var(--text-primary)'
                                  : 'var(--text-secondary)',
                              }}
                              onMouseEnter={(e) => {
                                if (!isWorkspaceSelected) {
                                  e.currentTarget.style.backgroundColor =
                                    'var(--bg-base-hover)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isWorkspaceSelected) {
                                  e.currentTarget.style.backgroundColor =
                                    'transparent';
                                }
                              }}
                              onClick={() => onSelectWorkspace(workspaceId)}
                            >
                              <HugeiconsIcon
                                icon={GitBranchIcon}
                                size={16}
                                strokeWidth={1.5}
                              />
                              <span className="flex-1 text-sm">
                                {workspace.branch}
                              </span>
                              {changesCount > 0 && (
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: '#fef3c7',
                                    color: '#92400e',
                                  }}
                                >
                                  {changesCount}
                                </span>
                              )}
                            </div>

                            {/* Session list */}
                            <div className="ml-4">
                              {/* Create session button */}
                              <button
                                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded transition-colors w-full text-left"
                                style={{
                                  color: 'var(--text-tertiary)',
                                  backgroundColor: 'transparent',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    'var(--bg-base-hover)';
                                  e.currentTarget.style.color =
                                    'var(--text-secondary)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    'transparent';
                                  e.currentTarget.style.color =
                                    'var(--text-tertiary)';
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectWorkspace(workspaceId);
                                  createSession();
                                }}
                              >
                                <HugeiconsIcon
                                  icon={PlusSignIcon}
                                  size={14}
                                  strokeWidth={1.5}
                                />
                                <span className="text-xs font-medium">
                                  New session
                                </span>
                              </button>

                              {visibleSessions.map((session) => {
                                const isSessionSelected =
                                  selectedSessionId === session.sessionId;
                                const displaySummary =
                                  session.summary && session.summary.length > 20
                                    ? `${session.summary.slice(0, 20)}…`
                                    : session.summary || 'New session';

                                return (
                                  <div
                                    key={session.sessionId}
                                    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded transition-colors"
                                    style={{
                                      backgroundColor: isSessionSelected
                                        ? 'var(--bg-base)'
                                        : 'transparent',
                                      color: isSessionSelected
                                        ? 'var(--text-primary)'
                                        : 'var(--text-tertiary)',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSessionSelected) {
                                        e.currentTarget.style.backgroundColor =
                                          'var(--bg-base-hover)';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSessionSelected) {
                                        e.currentTarget.style.backgroundColor =
                                          'transparent';
                                      }
                                    }}
                                    onClick={() => {
                                      selectWorkspace(workspaceId);
                                      selectSession(session.sessionId);
                                    }}
                                  >
                                    <HugeiconsIcon
                                      icon={Comment01Icon}
                                      size={14}
                                      strokeWidth={1.5}
                                    />
                                    <span className="flex-1 text-xs truncate">
                                      {displaySummary}
                                    </span>
                                    <span
                                      className="text-xs"
                                      style={{ color: 'var(--text-tertiary)' }}
                                    >
                                      {formatRelativeTime(session.modified)}
                                    </span>
                                  </div>
                                );
                              })}

                              {/* Show more/less toggle */}
                              {hiddenCount > 0 && (
                                <button
                                  className="px-3 py-1 text-xs cursor-pointer transition-colors"
                                  style={{ color: 'var(--text-tertiary)' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color =
                                      'var(--text-secondary)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color =
                                      'var(--text-tertiary)';
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSessionGroupExpanded(expandKey);
                                  }}
                                >
                                  {isExpanded
                                    ? 'Show less'
                                    : `Show ${hiddenCount} more`}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      )}

      <RepoSidebar.Footer collapsed={sidebarCollapsed} />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setAlertDialogOpen(false);
        }}
      >
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Repository Information</DialogTitle>
            <DialogDescription>{selectedRepoForDialog?.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <InfoRow
              icon={FolderIcon}
              label="Path"
              value={selectedRepoForDialog?.path || ''}
            />
            <InfoRow
              icon={GitBranchIcon}
              label="Workspaces"
              value={`${
                selectedRepoForDialog?.workspaceIds.length || 0
              } worktrees`}
            />
            <InfoRow
              icon={CloudIcon}
              label="Remote URL"
              value="https://github.com/user/repo.git"
            />
            <InfoRow icon={ClockIcon} label="Last Commit" value="2 hours ago" />
            <InfoRow
              icon={DatabaseIcon}
              label="Repository Size"
              value="12.5 MB"
            />
            <InfoRow
              icon={CalendarIcon}
              label="Created"
              value={new Date().toLocaleDateString()}
            />
          </div>

          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteRepo}
              className="gap-2"
            >
              <HugeiconsIcon icon={DeleteIcon} size={16} strokeWidth={1.5} />
              Delete Repository
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Repository?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRepoForDialog &&
                `This will permanently delete '${selectedRepoForDialog.name}' and its ${selectedRepoForDialog.workspaceIds.length} workspace(s). This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose>
              <Button variant="outline">Cancel</Button>
            </AlertDialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="gap-2"
            >
              <HugeiconsIcon icon={DeleteIcon} size={16} strokeWidth={1.5} />
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <HugeiconsIcon
        icon={icon}
        size={16}
        strokeWidth={1.5}
        style={{ color: 'var(--text-secondary)', marginTop: '2px' }}
      />
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-medium mb-0.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </div>
        <div
          className="text-sm break-all"
          style={{ color: 'var(--text-primary)' }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

RepoSidebar.Header = function Header({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-4'} py-3`}
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      {!collapsed && (
        <h2 className="text-base font-semibold flex-1">Neovate Code Desktop</h2>
      )}
      <button
        className="p-1 rounded hover:bg-opacity-70 transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <HugeiconsIcon
          icon={collapsed ? ArrowRightIcon : ArrowLeftIcon}
          size={18}
          strokeWidth={1.5}
        />
      </button>
    </div>
  );
};

RepoSidebar.Footer = function Footer({ collapsed }: { collapsed: boolean }) {
  const setShowSettings = useStore((state) => state.setShowSettings);

  return (
    <div
      className={`py-2 flex ${collapsed ? 'flex-col items-center px-2 gap-1' : 'flex-row px-3 gap-2'}`}
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <AddRepoMenu>
        <div
          className="p-2 rounded hover:bg-opacity-70 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          title="Add repository"
        >
          <HugeiconsIcon icon={PlusSignIcon} size={18} strokeWidth={1.5} />
        </div>
      </AddRepoMenu>
      <div
        className="p-2 rounded hover:bg-opacity-70 transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onClick={() => setShowSettings(true)}
        title="Settings"
      >
        <HugeiconsIcon icon={SettingsIcon} size={18} strokeWidth={1.5} />
      </div>
    </div>
  );
};
