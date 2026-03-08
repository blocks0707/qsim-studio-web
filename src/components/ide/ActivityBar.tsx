"use client";

import { Files, Atom, ClipboardList, Monitor, Settings } from "lucide-react";
import { useIDEStore, SidebarSection } from "@/stores/ideStore";

const items: { id: SidebarSection; icon: typeof Files; label: string }[] = [
  { id: "files", icon: Files, label: "Explorer" },
  { id: "algorithms", icon: Atom, label: "Algorithms" },
  { id: "jobs", icon: ClipboardList, label: "Jobs" },
  { id: "nodes", icon: Monitor, label: "Nodes" },
];

const bottomItems: { id: SidebarSection; icon: typeof Settings; label: string }[] = [
  { id: "settings", icon: Settings, label: "Settings" },
];

export function ActivityBar() {
  const { activeSidebarSection, sidebarOpen, toggleSidebar } = useIDEStore();

  const renderItem = (item: (typeof items)[0]) => {
    const Icon = item.icon;
    const isActive = sidebarOpen && activeSidebarSection === item.id;

    return (
      <button
        key={item.id}
        onClick={() => toggleSidebar(item.id)}
        className="relative w-12 h-12 flex items-center justify-center group"
        title={item.label}
      >
        {isActive && (
          <div
            className="absolute left-0 top-1 bottom-1 w-[2px]"
            style={{ background: "var(--icon-active)" }}
          />
        )}
        <Icon
          size={24}
          style={{
            color: isActive ? "var(--icon-active)" : "var(--icon-inactive)",
          }}
          className="group-hover:!text-white transition-colors"
        />
      </button>
    );
  };

  return (
    <div
      className="w-12 flex flex-col justify-between flex-shrink-0"
      style={{
        background: "var(--bg-activitybar)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div className="flex flex-col">{items.map(renderItem)}</div>
      <div className="flex flex-col">{bottomItems.map(renderItem)}</div>
    </div>
  );
}
