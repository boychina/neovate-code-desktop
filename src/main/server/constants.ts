export const POLL_INTERVAL_MS = 250;
export const STARTUP_TIMEOUT_MS = 7000;
export const PORT_RANGE_START = 49152;
export const PORT_RANGE_END = 65535;

export const ErrorCodes = {
  SPAWN_FAILED: 'SPAWN_FAILED',
  SERVER_CRASHED: 'SERVER_CRASHED',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  NO_PORT_AVAILABLE: 'NO_PORT_AVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const IPC_CHANNELS = {
  SERVER_READY: 'neovate-server:ready',
  SERVER_ERROR: 'neovate-server:error',
  SERVER_RETRY: 'neovate-server:retry',
} as const;
