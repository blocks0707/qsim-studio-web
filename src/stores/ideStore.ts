import { create } from "zustand";

export type SidebarSection = "files" | "algorithms" | "jobs" | "nodes" | "settings";

export interface Tab {
  id: string;
  title: string;
  language: string;
}

interface IDEState {
  activeSidebarSection: SidebarSection | null;
  sidebarOpen: boolean;
  openTabs: Tab[];
  activeTabId: string | null;

  toggleSidebar: (section: SidebarSection) => void;
  openTab: (tab: Tab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}

const defaultTabs: Tab[] = [
  { id: "bell-state", title: "bell_state.py", language: "Python" },
  { id: "grover", title: "grover.py", language: "Python" },
  { id: "qft", title: "qft.py", language: "Python" },
];

export const useIDEStore = create<IDEState>((set) => ({
  activeSidebarSection: "files",
  sidebarOpen: true,
  openTabs: defaultTabs,
  activeTabId: "bell-state",

  toggleSidebar: (section) =>
    set((state) => {
      if (state.activeSidebarSection === section && state.sidebarOpen) {
        return { sidebarOpen: false };
      }
      return { activeSidebarSection: section, sidebarOpen: true };
    }),

  openTab: (tab) =>
    set((state) => {
      const exists = state.openTabs.find((t) => t.id === tab.id);
      if (exists) return { activeTabId: tab.id };
      return { openTabs: [...state.openTabs, tab], activeTabId: tab.id };
    }),

  closeTab: (tabId) =>
    set((state) => {
      const tabs = state.openTabs.filter((t) => t.id !== tabId);
      const activeTabId =
        state.activeTabId === tabId
          ? tabs.length > 0
            ? tabs[tabs.length - 1].id
            : null
          : state.activeTabId;
      return { openTabs: tabs, activeTabId };
    }),

  setActiveTab: (tabId) => set({ activeTabId: tabId }),
}));
