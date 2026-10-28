import { create } from "zustand";
import type { PermissionOperation } from "@kubeview/contracts";

interface PermissionExplainerState {
  pendingOperation: PermissionOperation | null;
  setPendingOperation: (operation: PermissionOperation | null) => void;
}

export const usePermissionExplainerStore = create<PermissionExplainerState>(
  (set) => ({
    pendingOperation: null,
    setPendingOperation: (pendingOperation) => set({ pendingOperation }),
  }),
);
