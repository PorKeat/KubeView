"use client";

import * as React from "react";
import type { PodDiagnosisResult } from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";

export interface UsePodDiagnosisParams {
  contextName?: string;
  namespace: string;
  podName: string;
  enabled?: boolean;
}

export function usePodDiagnosis({
  contextName,
  namespace,
  podName,
  enabled = true,
}: UsePodDiagnosisParams) {
  const [result, setResult] = React.useState<PodDiagnosisResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const sequence = React.useRef(0);

  const run = React.useCallback(async () => {
    if (!enabled || !namespace || !podName) return null;
    const current = ++sequence.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await invokeRpc<PodDiagnosisResult>("pods.diagnose", {
        contextName,
        namespace,
        podName,
      });
      if (current === sequence.current) {
        setResult(
          response
            ? {
                ...response,
                conditions: response.conditions ?? [],
                containers: response.containers ?? [],
                events: response.events ?? [],
                evidence: response.evidence ?? [],
                suggestedCommands: response.suggestedCommands ?? [],
                suggestedFixes: response.suggestedFixes ?? [],
              }
            : null,
        );
      }
      return response;
    } catch (err) {
      if (current === sequence.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
      return null;
    } finally {
      if (current === sequence.current) {
        setIsLoading(false);
      }
    }
  }, [contextName, enabled, namespace, podName]);

  React.useEffect(() => {
    setResult(null);
    setError(null);
    void run();
    return () => {
      sequence.current += 1;
    };
  }, [run]);

  return {
    result,
    isLoading,
    error,
    refresh: run,
  };
}
