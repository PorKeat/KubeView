"use client";

import type {
  YAMLWatchEvent,
  YAMLWatchParams,
  YAMLWatchResult,
} from "@kubeview/contracts";
import { invokeRpc, listenNotification } from "@/lib/ipc";

/**
 * Live YAML subscription manager.
 *
 * A single object watch is shared by every consumer of the same key. Events
 * are routed by the deterministic subscription key, manifests are cached so
 * reopening a resource is instant, and stale resourceVersions are dropped.
 */

type Listener = (event: YAMLWatchEvent) => void;

interface WatchEntry {
  key: string;
  params: YAMLWatchParams;
  refs: number;
  lastRV?: string;
  yaml?: string;
  unavailable: boolean;
  listeners: Set<Listener>;
  readyResolvers: Array<(available: boolean) => void>;
}

const entries = new Map<string, WatchEntry>();
const yamlCache = new Map<string, string>();
const MAX_CACHED_MANIFESTS = 64;

let listenerPromise: Promise<() => void> | null = null;

export interface YamlSubscription {
  key: string;
  /** Resolves true when the engine supports live watching. */
  ready: Promise<boolean>;
  unsubscribe: () => void;
}

export function getWatchKey(params: YAMLWatchParams): string {
  return [
    params.contextName,
    params.apiVersion,
    params.kind,
    params.namespace ?? "",
    params.name,
  ].join("|");
}

export function getCachedYaml(key: string): string | undefined {
  return yamlCache.get(key);
}

export function rememberYaml(key: string, yaml: string): void {
  if (!key || !yaml) return;
  yamlCache.delete(key);
  yamlCache.set(key, yaml);
  while (yamlCache.size > MAX_CACHED_MANIFESTS) {
    const oldest = yamlCache.keys().next().value;
    if (oldest === undefined) break;
    yamlCache.delete(oldest);
  }
}

export function clearYamlWatchCache(): void {
  yamlCache.clear();
}

function numericResourceVersion(value?: string): bigint | null {
  return value && /^\d+$/.test(value) ? BigInt(value) : null;
}

function isStale(next?: string, last?: string): boolean {
  if (!next || !last) return false;
  if (next === last) return true;
  const nextVersion = numericResourceVersion(next);
  const lastVersion = numericResourceVersion(last);
  if (nextVersion !== null && lastVersion !== null) {
    return nextVersion <= lastVersion;
  }
  return false;
}

function deliver(entry: WatchEntry, event: YAMLWatchEvent): void {
  if (!event || event.key !== entry.key) return;

  if (event.event === "ERROR") {
    for (const listener of entry.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn("[yamlWatch] Listener error:", err);
      }
    }
    return;
  }

  if (isStale(event.resourceVersion, entry.lastRV)) return;
  if (event.resourceVersion) entry.lastRV = event.resourceVersion;

  if (event.event === "DELETED") {
    entry.yaml = undefined;
    yamlCache.delete(entry.key);
  } else if (event.yaml !== undefined) {
    entry.yaml = event.yaml;
    rememberYaml(entry.key, event.yaml);
  }

  for (const listener of entry.listeners) {
    try {
      listener(event);
    } catch (err) {
      console.warn("[yamlWatch] Listener error:", err);
    }
  }
}

function handleEvent(event: YAMLWatchEvent): void {
  if (!event || typeof event.key !== "string" || !event.key) return;
  const entry = entries.get(event.key);
  if (!entry) return;
  deliver(entry, event);
}

function ensureListener(): Promise<() => void> {
  if (!listenerPromise) {
    listenerPromise = (async () => {
      const offChanged = await listenNotification<YAMLWatchEvent>(
        "yaml.changed",
        handleEvent,
      );
      const offError = await listenNotification<YAMLWatchEvent>(
        "yaml.error",
        handleEvent,
      );
      return () => {
        offChanged();
        offError();
        listenerPromise = null;
      };
    })();
  }
  return listenerPromise;
}

function resolveReady(entry: WatchEntry, available: boolean): void {
  const resolvers = entry.readyResolvers.splice(0);
  for (const resolve of resolvers) resolve(available);
}

export function subscribeYaml(
  params: YAMLWatchParams,
  listener: Listener,
): YamlSubscription {
  const key = getWatchKey(params);
  let entry = entries.get(key);

  let resolveReadyPromise: (available: boolean) => void = () => {};
  const ready = new Promise<boolean>((resolve) => {
    resolveReadyPromise = resolve;
  });

  if (!entry) {
    entry = {
      key,
      params,
      refs: 0,
      unavailable: false,
      listeners: new Set(),
      readyResolvers: [],
    };
    entries.set(key, entry);

    void ensureListener()
      .then(() => invokeRpc<YAMLWatchResult>("resources.watch", params))
      .then((result) => {
        const current = entries.get(key);
        if (!current) return;
        if (result && result.yaml) {
          deliver(current, {
            key,
            event: "SNAPSHOT",
            resourceVersion: result.resourceVersion,
            yaml: result.yaml,
          });
          resolveReady(current, true);
        } else {
          // Engine or mock does not support live watches; callers fall back
          // to the one-shot getters.
          current.unavailable = true;
          resolveReady(current, false);
        }
      })
      .catch((err) => {
        console.warn(`[yamlWatch] Live watch unavailable for ${key}:`, err);
        const current = entries.get(key);
        if (!current) return;
        current.unavailable = true;
        resolveReady(current, false);
      });
  }

  entry.refs += 1;
  entry.listeners.add(listener);
  entry.readyResolvers.push(resolveReadyPromise);

  if (entry.yaml !== undefined) {
    resolveReadyPromise(true);
  } else if (entry.unavailable) {
    resolveReadyPromise(false);
  }

  let active = true;
  const unsubscribe = () => {
    if (!active) return;
    active = false;
    const current = entries.get(key);
    if (!current) return;
    current.listeners.delete(listener);
    current.refs -= 1;
    if (current.refs <= 0) {
      entries.delete(key);
      void invokeRpc("resources.unwatch", { key }).catch(() => {
        // Best effort: the engine drops watches on context switches anyway.
      });
    }
  };

  return { key, ready, unsubscribe };
}
