"use client";

import * as React from "react";
import type {
  PermissionDecision,
  PermissionEffectiveResult,
  PermissionOperation,
  PermissionSubject,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import { useClusterStore } from "@/stores/clusterStore";

export function usePermissionChecker() {
  const currentContext = useClusterStore((state) => state.currentContext);
  const currentNamespace = useClusterStore((state) => state.currentNamespace);

  const fallbackSubject = React.useMemo<PermissionSubject>(
    () => ({
      kind: "ServiceAccount",
      name: "default",
      namespace: currentNamespace === "all" ? "default" : currentNamespace,
    }),
    [currentNamespace],
  );

  const [identity, setIdentity] = React.useState<PermissionSubject | null>(
    null,
  );
  const [subject, setSubjectState] =
    React.useState<PermissionSubject>(fallbackSubject);
  const [effective, setEffective] =
    React.useState<PermissionEffectiveResult | null>(null);
  const [decision, setDecision] = React.useState<PermissionDecision | null>(
    null,
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [isIdentityLoading, setIsIdentityLoading] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [identityError, setIdentityError] = React.useState<string | null>(null);
  const [checkError, setCheckError] = React.useState<string | null>(null);

  const loadSubject = React.useCallback(
    async (target: PermissionSubject) => {
      if (!currentContext) {
        setLoadError("No Kubernetes context is selected.");
        return null;
      }
      setIsLoading(true);
      setLoadError(null);
      setDecision(null);
      try {
        const result = await invokeRpc<PermissionEffectiveResult>(
          "access.effective",
          {
            contextName: currentContext,
            subject: target,
          },
        );
        setEffective(result);
        return result;
      } catch (error) {
        setEffective(null);
        setLoadError(error instanceof Error ? error.message : String(error));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [currentContext],
  );

  const loadCurrentIdentity = React.useCallback(async () => {
    if (!currentContext) {
      setIdentityError("No Kubernetes context is selected.");
      return null;
    }

    setIsIdentityLoading(true);
    setIdentityError(null);
    try {
      const current = await invokeRpc<PermissionSubject>(
        "access.currentIdentity",
        { contextName: currentContext },
      );
      const next: PermissionSubject = {
        ...current,
        kind: "User",
        groups: current.groups ?? [],
      };
      setIdentity(next);
      setSubjectState(next);
      setEffective(null);
      setDecision(null);
      setCheckError(null);
      setLoadError(null);
      await loadSubject(next);
      return next;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setIdentityError(message);
      setIdentity(null);
      setSubjectState(fallbackSubject);
      await loadSubject(fallbackSubject);
      return null;
    } finally {
      setIsIdentityLoading(false);
    }
  }, [currentContext, fallbackSubject, loadSubject]);

  React.useEffect(() => {
    setSubjectState(fallbackSubject);
    setEffective(null);
    setDecision(null);
    setLoadError(null);
    setCheckError(null);
    setIdentity(null);
    setIdentityError(null);
    if (currentContext) void loadCurrentIdentity();
  }, [currentContext, fallbackSubject, loadCurrentIdentity]);

  const updateSubject = (next: PermissionSubject) => {
    setSubjectState(next);
    setEffective(null);
    setDecision(null);
    setCheckError(null);
    setLoadError(null);
  };

  const check = React.useCallback(
    async (operation: PermissionOperation) => {
      if (!currentContext) {
        setCheckError("No Kubernetes context is selected.");
        return null;
      }
      setIsChecking(true);
      setCheckError(null);
      try {
        const result = await invokeRpc<PermissionDecision>("access.explain", {
          contextName: currentContext,
          subject,
          operation,
        });
        setDecision(result);
        return result;
      } catch (error) {
        setDecision(null);
        setCheckError(error instanceof Error ? error.message : String(error));
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [currentContext, subject],
  );

  const isCurrentIdentity =
    !!identity &&
    subject.kind === "User" &&
    subject.name === identity.name &&
    JSON.stringify(subject.groups ?? []) ===
      JSON.stringify(identity.groups ?? []);

  return {
    subject,
    identity,
    effective,
    decision,
    isLoading,
    isIdentityLoading,
    isChecking,
    loadError,
    identityError,
    checkError,
    isCurrentIdentity,
    updateSubject,
    load: () => loadSubject(subject),
    loadCurrentIdentity,
    check,
  };
}
