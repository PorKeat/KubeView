/**
 * Streaming Events, Watch Deltas, and PTY Types
 */

export interface StreamStartResult {
  streamId: string;
}

export type StreamEventType = "data" | "error" | "closed";

export interface StreamEvent<T = unknown> {
  streamId: string;
  sequence: number;
  type: StreamEventType;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export type WatchDeltaType = "ADDED" | "MODIFIED" | "DELETED";

export interface WatchDelta<T = unknown> {
  type: WatchDeltaType;
  object: T;
}

export interface LogChunk {
  lines: string[];
  pod: string;
  container: string;
  timestamp?: string;
}

export interface ExecOutput {
  data: string;
}

export interface ExecResizeParams {
  streamId: string;
  cols: number;
  rows: number;
}
