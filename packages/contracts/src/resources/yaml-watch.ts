/**
 * Live YAML subscription contracts.
 *
 * The engine watches a single Kubernetes object and pushes its serialized
 * manifest whenever the object changes. The key is deterministic
 * (`context|apiVersion|kind|namespace|name`) so clients can route push events
 * before the subscribe call resolves.
 */
export interface YAMLWatchParams {
  contextName: string;
  apiVersion: string;
  kind: string;
  resource?: string;
  namespace?: string;
  name: string;
}

export interface YAMLWatchResult {
  key?: string;
  event?: string;
  resourceVersion?: string;
  yaml?: string;
}

export type YAMLWatchEventName =
  "SNAPSHOT" | "ADDED" | "MODIFIED" | "DELETED" | "ERROR";

export interface YAMLWatchEvent {
  key: string;
  contextName?: string;
  event: YAMLWatchEventName;
  resourceVersion?: string;
  yaml?: string;
  code?: string;
  message?: string;
}
