"use client";

import * as React from "react";
import { useClusterStore } from "@/stores/clusterStore";
import { useLayoutStore } from "@/stores/layoutStore";

export function useInspectorEscapeClose(
  isInspectorOpen: boolean,
  closeInspector: () => void,
) {
  // Close on Escape key, but only when no modal or palette above the drawer
  // owns the keystroke. Child overlays should dismiss independently.
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !isInspectorOpen) return;

      const clusterState = useClusterStore.getState();
      const childOverlayOpen = Boolean(
        clusterState.workloadAction ||
        clusterState.bulkWorkloadAction ||
        clusterState.logsModalPod ||
        clusterState.execModalPod ||
        clusterState.deleteConfirmPod ||
        clusterState.restartConfirmPod ||
        clusterState.bulkDeleteConfirmPods?.length ||
        clusterState.bulkRestartConfirmPods?.length ||
        clusterState.isEndpointModalOpen ||
        clusterState.isKubeconfigModalOpen ||
        useLayoutStore.getState().commandPaletteOpen,
      );

      if (!childOverlayOpen) {
        closeInspector();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isInspectorOpen, closeInspector]);
}
