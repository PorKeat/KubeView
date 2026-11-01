"use client";

import { toast } from "sonner";
import { invokeRpc } from "@/lib/ipc";
import { useClusterStore } from "@/stores/clusterStore";
import {
  createResourceTarget,
  getResourceKindInfo,
  resourceTarget,
} from "@/lib/resourceKinds";

export interface BulkDeleteTarget {
  name: string;
  namespace?: string;
}

export interface BulkDeleteResult {
  deleted: number;
  failed: Array<BulkDeleteTarget & { message: string }>;
}

const BULK_DELETE_CONCURRENCY = 4;

export function useResourceActions() {
  const openInspector = useClusterStore((state) => state.openInspector);
  const openResourceEditor = useClusterStore(
    (state) => state.openResourceEditor,
  );
  const openDeleteResource = useClusterStore(
    (state) => state.openDeleteResource,
  );
  const currentContext = useClusterStore((state) => state.currentContext);
  const refreshResourceKind = useClusterStore(
    (state) => state.refreshResourceKind,
  );

  return {
    editResource(
      kind: string,
      name: string,
      namespace?: string,
      status = "",
      data?: Record<string, unknown>,
    ) {
      const target = resourceTarget(kind, name, namespace);
      if (!target) return;
      openInspector({
        kind: target.kind,
        name: target.name,
        namespace: target.namespace,
        status,
        data,
        initialTab: "edit",
      });
    },
    deleteResource(kind: string, name: string, namespace?: string) {
      const target = resourceTarget(kind, name, namespace);
      if (target) openDeleteResource(target);
    },
    createResource(kind: string, namespace?: string) {
      const target = createResourceTarget(kind, namespace);
      if (target) void openResourceEditor(target);
    },
    async deleteResources(
      kind: string,
      targets: BulkDeleteTarget[],
    ): Promise<BulkDeleteResult> {
      const info = getResourceKindInfo(kind);
      const result: BulkDeleteResult = { deleted: 0, failed: [] };
      if (!info || targets.length === 0) return result;

      for (
        let index = 0;
        index < targets.length;
        index += BULK_DELETE_CONCURRENCY
      ) {
        const chunk = targets.slice(index, index + BULK_DELETE_CONCURRENCY);
        const outcomes = await Promise.all(
          chunk.map(async (target) => {
            try {
              await invokeRpc("resources.delete", {
                contextName: currentContext,
                apiVersion: info.apiVersion,
                kind: info.kind,
                resource: info.resource,
                name: target.name,
                namespace: target.namespace || "",
              });
              return null;
            } catch (error) {
              console.error(
                `Bulk delete failed for ${kind} ${target.namespace ?? ""}/${target.name}:`,
                error,
              );
              return {
                ...target,
                message: error instanceof Error ? error.message : String(error),
              };
            }
          }),
        );
        for (const failure of outcomes) {
          if (failure) result.failed.push(failure);
          else result.deleted += 1;
        }
      }

      const summary = `${result.deleted} ${info.kind}${
        result.deleted === 1 ? "" : "s"
      } deleted${result.failed.length > 0 ? ` · ${result.failed.length} failed` : ""}`;
      if (result.failed.length > 0) {
        toast.warning(summary, {
          description: result.failed
            .slice(0, 3)
            .map(
              (failure) =>
                `${failure.namespace ? `${failure.namespace}/` : ""}${failure.name}: ${failure.message}`,
            )
            .join("\n"),
        });
      } else {
        toast.success(summary);
      }
      await refreshResourceKind(info.kind);
      return result;
    },
  };
}
