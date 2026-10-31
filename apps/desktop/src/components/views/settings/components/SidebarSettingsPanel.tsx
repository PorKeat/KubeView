"use client";

import * as React from "react";
import { GripVertical, Hash, PanelLeft, RotateCcw } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
import {
  buildNavigationGroups,
  EMPTY_SIDEBAR_COUNTS,
  orderNavigationGroups,
  orderNavigationItems,
  type NavGroup,
} from "@/components/layout/sidebar/navConfig";
import {
  SettingsHeading,
  SettingsSectionCard,
  SettingsToggleRow,
} from "./SettingsSectionCard";

type DragState =
  { kind: "group"; id: string } | { kind: "item"; group: string; id: string };

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CompactToggle({
  checked,
  onChange,
  label,
  testId,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
        checked
          ? "border-[var(--accent)] bg-[var(--accent)]"
          : "border-[var(--border)] bg-black/10 dark:bg-white/10",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
        aria-hidden="true"
      />
    </button>
  );
}

function DragHandle({
  label,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  label: string;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <button
      type="button"
      draggable
      aria-label={label}
      title={`${label}. Drag, or use Arrow Up/Down.`}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", label);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          onMove(-1);
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          onMove(1);
        }
      }}
      className="flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
    >
      <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

function dropTargetMatches(
  dropTarget: DragState | null,
  candidate: DragState,
): boolean {
  if (!dropTarget || dropTarget.kind !== candidate.kind) return false;
  if (candidate.kind === "group" && dropTarget.kind === "group") {
    return dropTarget.id === candidate.id;
  }
  if (candidate.kind === "item" && dropTarget.kind === "item") {
    return (
      dropTarget.group === candidate.group && dropTarget.id === candidate.id
    );
  }
  return false;
}

export function SidebarSettingsPanel() {
  const showSidebarBadges = useSettingsStore((s) => s.showSidebarBadges);
  const hiddenSidebarItems = useSettingsStore((s) => s.hiddenSidebarItems);
  const hiddenSidebarGroups = useSettingsStore((s) => s.hiddenSidebarGroups);
  const sidebarItemOrder = useSettingsStore((s) => s.sidebarItemOrder);
  const sidebarGroupOrder = useSettingsStore((s) => s.sidebarGroupOrder);
  const updatePreferences = useSettingsStore((s) => s.updatePreferences);

  const structure = React.useMemo(
    () => buildNavigationGroups(EMPTY_SIDEBAR_COUNTS),
    [],
  );
  const orderedGroups = React.useMemo(
    () =>
      orderNavigationGroups(structure, sidebarGroupOrder).map(
        (group: NavGroup) => ({
          ...group,
          items: orderNavigationItems(
            group.items,
            sidebarItemOrder[group.category] ?? [],
          ),
        }),
      ),
    [structure, sidebarGroupOrder, sidebarItemOrder],
  );

  const [drag, setDrag] = React.useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = React.useState<DragState | null>(null);

  const hiddenItems = React.useMemo(
    () => new Set(hiddenSidebarItems),
    [hiddenSidebarItems],
  );
  const hiddenGroups = React.useMemo(
    () => new Set(hiddenSidebarGroups),
    [hiddenSidebarGroups],
  );

  const toggleItem = (id: string) => {
    updatePreferences({
      hiddenSidebarItems: hiddenItems.has(id)
        ? hiddenSidebarItems.filter((item) => item !== id)
        : [...hiddenSidebarItems, id],
    });
  };

  const toggleGroup = (category: string) => {
    updatePreferences({
      hiddenSidebarGroups: hiddenGroups.has(category)
        ? hiddenSidebarGroups.filter((item) => item !== category)
        : [...hiddenSidebarGroups, category],
    });
  };

  const saveGroupOrder = (order: string[]) => {
    updatePreferences({ sidebarGroupOrder: order });
  };

  const saveItemOrder = (group: string, order: string[]) => {
    updatePreferences({
      sidebarItemOrder: { ...sidebarItemOrder, [group]: order },
    });
  };

  const reorderGroups = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const order = orderedGroups.map((group) => group.category);
    const from = order.indexOf(draggedId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    order.splice(to, 0, draggedId);
    saveGroupOrder(order);
  };

  const reorderItems = (
    groupCategory: string,
    draggedId: string,
    targetId: string,
  ) => {
    if (draggedId === targetId) return;
    const group = orderedGroups.find((item) => item.category === groupCategory);
    if (!group) return;
    const order = group.items.map((item) => item.id);
    const from = order.indexOf(draggedId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    order.splice(to, 0, draggedId);
    saveItemOrder(groupCategory, order);
  };

  const moveGroup = (category: string, direction: -1 | 1) => {
    const order = orderedGroups.map((group) => group.category);
    const index = order.indexOf(category);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    saveGroupOrder(order);
  };

  const moveItem = (
    groupCategory: string,
    itemId: string,
    direction: -1 | 1,
  ) => {
    const group = orderedGroups.find((item) => item.category === groupCategory);
    if (!group) return;
    const order = group.items.map((item) => item.id);
    const index = order.indexOf(itemId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    saveItemOrder(groupCategory, order);
  };

  const resetLayout = () => {
    updatePreferences({
      showSidebarBadges: true,
      hiddenSidebarItems: [],
      hiddenSidebarGroups: [],
      sidebarItemOrder: {},
      sidebarGroupOrder: [],
    });
  };

  const hasCustomization =
    !showSidebarBadges ||
    hiddenSidebarItems.length > 0 ||
    hiddenSidebarGroups.length > 0 ||
    Object.keys(sidebarItemOrder).length > 0 ||
    sidebarGroupOrder.length > 0;

  const clearDrag = () => {
    setDrag(null);
    setDropTarget(null);
  };

  return (
    <SettingsSectionCard
      id="settings-sidebar"
      icon={PanelLeft}
      title="Sidebar"
      description="Control count badges, hide sections, and drag items into the order you want."
    >
      <SettingsToggleRow
        icon={Hash}
        title="Show count badges"
        description="Display live resource counts next to sidebar items."
        checked={showSidebarBadges}
        onToggle={() =>
          updatePreferences({ showSidebarBadges: !showSidebarBadges })
        }
        testId="settings-sidebar-badges"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <SettingsHeading
          label="Layout & visibility"
          description="Drag a grip to reorder. Use the switch to hide a section or item. Arrow Up/Down also reorder a focused grip."
        />
        {hasCustomization && (
          <button
            type="button"
            onClick={resetLayout}
            data-testid="settings-sidebar-reset"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset sidebar
          </button>
        )}
      </div>

      <div className="space-y-4">
        {orderedGroups.map((group) => {
          const groupHidden = hiddenGroups.has(group.category);
          const groupDropActive = dropTargetMatches(dropTarget, {
            kind: "group",
            id: group.category,
          });

          return (
            <div
              key={group.category}
              className={cn("transition-colors", groupHidden && "opacity-60")}
            >
              <div
                data-testid={`settings-sidebar-group-${slug(group.category)}`}
                onDragOver={(event) => {
                  if (drag?.kind === "group" && drag.id !== group.category) {
                    event.preventDefault();
                    setDropTarget({ kind: "group", id: group.category });
                  }
                }}
                onDragLeave={() => {
                  setDropTarget((current) =>
                    current?.kind === "group" && current.id === group.category
                      ? null
                      : current,
                  );
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (drag?.kind === "group") {
                    reorderGroups(drag.id, group.category);
                  }
                  clearDrag();
                }}
                className={cn(
                  "flex items-center gap-1.5 border-b border-[var(--border)] py-2 transition-colors",
                  groupDropActive && "bg-[var(--accent)]/[0.04]",
                )}
              >
                <DragHandle
                  label={`Reorder ${group.category} section`}
                  onDragStart={() =>
                    setDrag({ kind: "group", id: group.category })
                  }
                  onDragEnd={clearDrag}
                  onMove={(direction) => moveGroup(group.category, direction)}
                />
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[var(--foreground)]">
                  {group.category}
                </span>
                {groupHidden && (
                  <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide text-[var(--muted)]">
                    Hidden
                  </span>
                )}
                <CompactToggle
                  checked={!groupHidden}
                  onChange={() => toggleGroup(group.category)}
                  label={`Show ${group.category} section`}
                  testId={`settings-sidebar-group-toggle-${slug(group.category)}`}
                />
              </div>

              <div className="divide-y divide-[var(--border)]/60">
                {group.items.map((item) => {
                  const itemHidden = hiddenItems.has(item.id);
                  const itemDropActive = dropTargetMatches(dropTarget, {
                    kind: "item",
                    group: group.category,
                    id: item.id,
                  });
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      data-testid={`settings-sidebar-item-${item.id}`}
                      onDragOver={(event) => {
                        if (
                          drag?.kind === "item" &&
                          drag.group === group.category &&
                          drag.id !== item.id
                        ) {
                          event.preventDefault();
                          setDropTarget({
                            kind: "item",
                            group: group.category,
                            id: item.id,
                          });
                        }
                      }}
                      onDragLeave={() => {
                        setDropTarget((current) =>
                          current?.kind === "item" &&
                          current.group === group.category &&
                          current.id === item.id
                            ? null
                            : current,
                        );
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (drag?.kind === "item") {
                          reorderItems(group.category, drag.id, item.id);
                        }
                        clearDrag();
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 transition-colors",
                        itemDropActive && "bg-[var(--accent)]/[0.06]",
                        itemHidden && "opacity-60",
                      )}
                    >
                      <DragHandle
                        label={`Reorder ${item.title}`}
                        onDragStart={() =>
                          setDrag({
                            kind: "item",
                            group: group.category,
                            id: item.id,
                          })
                        }
                        onDragEnd={clearDrag}
                        onMove={(direction) =>
                          moveItem(group.category, item.id, direction)
                        }
                      />
                      <Icon
                        className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--foreground)]">
                        {item.title}
                      </span>
                      {item.desktopHidden && (
                        <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide text-[var(--muted)]">
                          Mobile
                        </span>
                      )}
                      <CompactToggle
                        checked={!itemHidden}
                        onChange={() => toggleItem(item.id)}
                        label={`Show ${item.title}`}
                        testId={`settings-sidebar-item-toggle-${item.id}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="border-l-2 border-[var(--border)] pl-3 text-[10px] leading-relaxed text-[var(--muted)]">
        Hidden items stay in this list so you can restore them later. These
        preferences only change the sidebar; tabs, search, and the command
        palette still reach every page.
      </p>
    </SettingsSectionCard>
  );
}
