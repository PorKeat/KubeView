"use client";

import { useClusterStore } from "@/stores/clusterStore";
import { createResourceTarget, resourceTarget } from "@/lib/resourceKinds";

export function useResourceActions() {
  const openInspector = useClusterStore((state) => state.openInspector);
  const openResourceEditor = useClusterStore(
    (state) => state.openResourceEditor,
  );
  const openDeleteResource = useClusterStore(
    (state) => state.openDeleteResource,
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
  };
}
