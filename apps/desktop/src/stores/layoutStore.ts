import { create } from "zustand";

export type FleetCatalogSection =
  "clusters" | "kubeconfigs" | "links" | "health";

interface LayoutState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  commandPaletteOpen: boolean;
  fleetCatalogSection: FleetCatalogSection;
  catalogMode: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setFleetCatalogSection: (section: FleetCatalogSection) => void;
  setCatalogMode: (enabled: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  commandPaletteOpen: false,
  fleetCatalogSection: "clusters",
  catalogMode: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  toggleMobileSidebar: () =>
    set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setFleetCatalogSection: (section) => set({ fleetCatalogSection: section }),
  setCatalogMode: (enabled) => set({ catalogMode: enabled }),
}));
