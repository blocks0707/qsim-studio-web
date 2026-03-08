"use client";

import { X, FileText } from "lucide-react";
import { useIDEStore, Tab } from "@/stores/ideStore";

export function TabBar() {
  const { openTabs, activeTabId, setActiveTab, closeTab } = useIDEStore();

  return (
    <div
      className="h-[35px] flex items-end overflow-x-auto flex-shrink-0"
      style={{ background: "var(--bg-titlebar)" }}
    >
      {openTabs.map((tab: Tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className="flex items-center gap-1.5 px-3 h-[35px] cursor-pointer group min-w-0 max-w-[160px]"
            style={{
              background: isActive ? "var(--bg-tab-active)" : "var(--bg-tab-inactive)",
              borderRight: "1px solid var(--border)",
              borderTop: isActive ? "1px solid var(--accent)" : "1px solid transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <FileText size={14} className="text-[#519aba] flex-shrink-0" />
            <span className="text-xs truncate">{tab.title}</span>
            <button
              className="ml-auto flex-shrink-0 rounded hover:bg-white/10 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
