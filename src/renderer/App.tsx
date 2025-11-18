import { useStore } from './store';
import { MainLayout } from './components';
import { useStoreConnection } from './hooks';
import { Spinner } from './components/ui';

function App() {
  // Establish WebSocket connection on mount
  const connectionState = useStoreConnection();

  // Get state and actions from the store
  const {
    repos,
    workspaces,
    selectedRepoPath,
    selectedWorkspaceId,
    selectRepo,
    selectWorkspace,
    sendMessage,
    messages,
  } = useStore();

  // Get the selected workspace
  const selectedWorkspace = selectedWorkspaceId
    ? workspaces[selectedWorkspaceId]
    : null;

  const handleSendMessage = async (sessionId: string, content: string) => {
    await sendMessage({ message: content });
  };

  // Mock function to execute a command
  const handleExecuteCommand = async (command: string) => {
    // In a real implementation, this would send the command via WebSocket
    console.log(`Executing command: ${command}`);
    // For now, we'll just simulate the execution
    return Promise.resolve();
  };

  // Show loading UI while connecting
  if (connectionState !== 'connected') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            Connecting to server...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <MainLayout
        repos={Object.values(repos)}
        selectedRepoPath={selectedRepoPath}
        selectedWorkspaceId={selectedWorkspaceId}
        selectedWorkspace={selectedWorkspace}
        messages={messages}
        onSelectRepo={selectRepo}
        onSelectWorkspace={selectWorkspace}
        onSendMessage={handleSendMessage}
        onExecuteCommand={handleExecuteCommand}
      />
    </div>
  );
}

export default App;
