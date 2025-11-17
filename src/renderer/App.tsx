import React, { useState, useEffect } from 'react';
import WebSocketComponent from './WebSocketComponent.example';
import TestComponent from './TestComponent';

declare global {
  interface Window {
    electron?: {
      platform: string;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
      requestListDirectory: () => void;
      onConfirmRequest: (callback: (data: { path: string }) => void) => void;
      sendConfirmResponse: (confirmed: boolean) => void;
      onDirectoryResult: (
        callback: (data: {
          success: boolean;
          files?: string[];
          message?: string;
        }) => void,
      ) => void;
      removeConfirmRequestListener: () => void;
      removeDirectoryResultListener: () => void;
    };
  }
}

function App() {
  const electron = window.electron;
  const [files, setFiles] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!window.electron) return;

    // Set up event listeners
    const onConfirmRequest = (data: { path: string }) => {
      const confirmed = window.confirm(
        `Are you sure you want to list the directory?\n\nPath: ${data.path}`,
      );
      window.electron?.sendConfirmResponse(confirmed);
    };

    const onDirectoryResult = (data: {
      success: boolean;
      files?: string[];
      message?: string;
    }) => {
      if (data.success) {
        setFiles(data.files || []);
        // Clear any previous message when listing is successful
        if (message) {
          setMessage('');
        }
      } else {
        setFiles([]);
        setMessage(data.message || 'An error occurred');
      }
    };

    window.electron.onConfirmRequest(onConfirmRequest);
    window.electron.onDirectoryResult(onDirectoryResult);

    // Return cleanup function
    return () => {
      window.electron?.removeConfirmRequestListener();
      window.electron?.removeDirectoryResultListener();
    };
  }, []);

  const handleListDirectory = () => {
    if (window.electron?.requestListDirectory) {
      window.electron.requestListDirectory();
    }
  };

  return (
    <div className="p-12 font-sans max-w-3xl mx-auto">
      <h1 className="text-4xl mb-4">Hello World</h1>
      <p className="text-xl text-gray-600 mb-8">
        Welcome to neovate-code-desktop
      </p>

      {electron && (
        <div className="bg-gray-100 p-6 rounded-lg font-mono">
          <h2 className="mt-0 text-xl">System Info:</h2>
          <p>
            <strong>Platform:</strong> {electron.platform}
          </p>
          <p>
            <strong>Node:</strong> {electron.versions.node}
          </p>
          <p>
            <strong>Chrome:</strong> {electron.versions.chrome}
          </p>
          <p>
            <strong>Electron:</strong> {electron.versions.electron}
          </p>
        </div>
      )}

      <div className="mt-8">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleListDirectory}
        >
          List Project Directory
        </button>
      </div>

      {message && (
        <div
          className={`mt-4 p-4 rounded ${message.includes('cancelled') ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}
        >
          {message}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-bold">Directory Contents:</h3>
          <ul className="mt-2 border border-gray-300 rounded p-4 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <li
                key={index}
                className="py-1 border-b border-gray-200 last:border-b-0"
              >
                {file}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-bold mb-2">WebSocket Connection</h2>
        <WebSocketComponent />
      </div>

      <div className="mt-8 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-bold mb-2">Store Test</h2>
        <TestComponent />
      </div>
    </div>
  );
}

export default App;
