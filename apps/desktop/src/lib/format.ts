/**
 * Shared number formatting for resource requests, limits, and live usage.
 * Values are intentionally compact so they line up in dense tables.
 */

export function formatMillicores(value?: number): string {
  if (value === undefined || value === null) return "—";
  return `${Math.round(value)}m`;
}

export function formatBytesCompact(value?: number): string {
  if (value === undefined || value === null || value < 0) return "—";
  if (value === 0) return "0B";
  const units = ["B", "Ki", "Mi", "Gi", "Ti", "Pi", "Ei"];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toFixed(unit === 0 ? 0 : 1)}${units[unit]}`;
}

/** Percentage of a denominator, rounded and clamped for display. */
export function usagePercent(
  usage?: number,
  denominator?: number,
): number | undefined {
  if (usage === undefined || usage === null) return undefined;
  if (!denominator || denominator <= 0) return undefined;
  return Math.round((usage / denominator) * 100);
}

export function usageToneClass(percent?: number): string {
  if (percent === undefined) return "text-[var(--foreground)]";
  if (percent >= 95) return "text-rose-600 dark:text-rose-400";
  if (percent >= 80) return "text-amber-600 dark:text-amber-400";
  return "text-[var(--foreground)]";
}

export function usageBarClass(percent?: number): string {
  if (percent === undefined) return "bg-[var(--muted)]/40";
  if (percent >= 95) return "bg-rose-500";
  if (percent >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

const NODE_ROLE_ORDER = ["control-plane", "master", "worker"];

/**
 * Kubernetes returns node roles in label-map order, which is not stable.
 * Control-plane first keeps node cards consistent across clusters.
 */
export function sortNodeRoles(roles: string[]): string[] {
  return [...roles].sort((a, b) => {
    const aRank = NODE_ROLE_ORDER.indexOf(a);
    const bRank = NODE_ROLE_ORDER.indexOf(b);
    if (aRank === -1 && bRank === -1) return a.localeCompare(b);
    if (aRank === -1) return 1;
    if (bRank === -1) return -1;
    return aRank - bRank;
  });
}
