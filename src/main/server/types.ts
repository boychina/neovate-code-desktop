import type { ErrorCode } from './constants';

export interface ServerReadyPayload {
  url: string;
}

export interface ServerErrorPayload {
  code: ErrorCode;
  message: string;
}

export interface ServerInstance {
  url: string;
  close: () => void;
}
