import { create } from "zustand";

export interface TabItem {
  id: string;
  title: string;
  icon?: string;
  resourceCategory?: string;
  closable?: boolean;
}

interface TabState {
  openTabs: TabItem[];
  activeTabId: string;
  previousTabId: string;
  openTab: (tab: TabItem) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}

const DEFAULT_TABS: TabItem[] = [
  {
    id: "overview",
    title: "Cluster Overview",
    icon: "LayoutDashboard",
    closable: false,
  },
  { id: "pods", title: "Pods", icon: "Box", closable: true },
];

export const useTabStore = create<TabState>((set, get) => ({
  openTabs: DEFAULT_TABS,
  activeTabId: "overview",
  previousTabId: "overview",
  openTab: (tab) => {
    const { openTabs, activeTabId } = get();
    const exists = openTabs.some((t) => t.id === tab.id);
    if (!exists) {
      set({
        openTabs: [...openTabs, tab],
        activeTabId: tab.id,
        previousTabId: activeTabId,
      });
    } else if (activeTabId !== tab.id) {
      set({ activeTabId: tab.id, previousTabId: activeTabId });
    } else {
      set({ activeTabId: tab.id });
    }
  },
  closeTab: (tabId) => {
    const { openTabs, activeTabId } = get();
    if (openTabs.length <= 1) return; // Keep at least one tab

    const newTabs = openTabs.filter((t) => t.id !== tabId);
    let newActiveId = activeTabId;

    if (activeTabId === tabId) {
      const closedIndex = openTabs.findIndex((t) => t.id === tabId);
      const nextTab = newTabs[Math.max(0, closedIndex - 1)];
      newActiveId = nextTab ? nextTab.id : newTabs[0].id;
    }

    set({ openTabs: newTabs, activeTabId: newActiveId });
  },
  setActiveTab: (tabId) => {
    const { activeTabId } = get();
    if (tabId === activeTabId) return;
    set({ activeTabId: tabId, previousTabId: activeTabId });
  },
}));
