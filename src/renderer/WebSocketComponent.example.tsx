// Example usage of the store in a React component
import { useStore } from './store';

function WebSocketComponent() {
  const { state, connect, disconnect, request, onEvent } = useStore();

  // Connect to WebSocket
  const handleConnect = async () => {
    try {
      await connect();
      console.log('Connected to WebSocket');
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  // Disconnect from WebSocket
  const handleDisconnect = async () => {
    try {
      await disconnect();
      console.log('Disconnected from WebSocket');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  // Make a request to the server
  const handleRequest = async () => {
    try {
      const response = await request<{ cwd: string }, { paths: string[] }>(
        'utils.getPaths',
        { cwd: '/tmp' },
      );
      console.log('Response:', response);
    } catch (error) {
      console.error('Request failed:', error);
    }
  };

  // Subscribe to events from the server
  const handleSubscribe = () => {
    try {
      onEvent<{ data: string }>('notification', (data) => {
        console.log('Received notification:', data);
      });
      console.log('Subscribed to notifications');
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  };

  return (
    <div>
      <h2>WebSocket Connection Status: {state}</h2>
      <button
        className="bg-blue-500 text-white p-2 rounded-md"
        onClick={handleConnect}
        disabled={state === 'connected'}
      >
        Connect
      </button>
      <button
        className="bg-red-500 text-white p-2 rounded-md"
        onClick={handleDisconnect}
        disabled={state !== 'connected'}
      >
        Disconnect
      </button>
      <button
        className="bg-green-500 text-white p-2 rounded-md"
        onClick={handleRequest}
        disabled={state !== 'connected'}
      >
        Send Request
      </button>
      <button
        className="bg-yellow-500 text-white p-2 rounded-md"
        onClick={handleSubscribe}
        disabled={state !== 'connected'}
      >
        Subscribe to Events
      </button>
    </div>
  );
}

export default WebSocketComponent;
