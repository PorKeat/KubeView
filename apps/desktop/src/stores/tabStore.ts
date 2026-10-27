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
  closeOtherTabs: (tabId: string) => void;
  closeTabsToRight: (tabId: string) => void;
  closeAllTabs: () => void;
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
  closeOtherTabs: (tabId) => {
    const { openTabs, activeTabId, previousTabId } = get();
    const target = openTabs.find((tab) => tab.id === tabId);
    if (!target) return;

    const remaining = openTabs.filter(
      (tab) => tab.id === tabId || !tab.closable,
    );
    if (remaining.length === openTabs.length) return;

    const activeStillOpen = remaining.some((tab) => tab.id === activeTabId);
    set({
      openTabs: remaining,
      activeTabId: activeStillOpen ? activeTabId : tabId,
      previousTabId: activeStillOpen ? previousTabId : activeTabId,
    });
  },
  closeTabsToRight: (tabId) => {
    const { openTabs, activeTabId, previousTabId } = get();
    const index = openTabs.findIndex((tab) => tab.id === tabId);
    if (index < 0) return;

    const remaining = openTabs.filter(
      (tab, tabIndex) => tabIndex <= index || !tab.closable,
    );
    if (remaining.length === openTabs.length) return;

    const activeStillOpen = remaining.some((tab) => tab.id === activeTabId);
    set({
      openTabs: remaining,
      activeTabId: activeStillOpen ? activeTabId : tabId,
      previousTabId: activeStillOpen ? previousTabId : activeTabId,
    });
  },
  closeAllTabs: () => {
    const { openTabs, activeTabId, previousTabId } = get();
    const remaining = openTabs.filter((tab) => !tab.closable);
    if (remaining.length === 0 || remaining.length === openTabs.length) return;

    const activeStillOpen = remaining.some((tab) => tab.id === activeTabId);
    set({
      openTabs: remaining,
      activeTabId: activeStillOpen ? activeTabId : remaining[0].id,
      previousTabId: activeStillOpen ? previousTabId : activeTabId,
    });
  },
  setActiveTab: (tabId) => {
    const { activeTabId } = get();
    if (tabId === activeTabId) return;
    set({ activeTabId: tabId, previousTabId: activeTabId });
  },
}));
