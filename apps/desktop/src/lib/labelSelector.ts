export function matchesLabelSelector(
  labels: Record<string, string> | undefined,
  selector: string,
): boolean {
  if (!labels) return false;
  const terms = selector
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length === 0) return true;

  return terms.every((term) => {
    const [rawKey, rawValue] = term.split("=");
    const key = rawKey?.trim();
    if (!key) return false;
    const actual = labels[key];
    if (actual === undefined) return false;
    return rawValue === undefined || actual.trim() === rawValue.trim();
  });
}

export function formatLabelSelector(
  selector: Record<string, string> | undefined,
): string {
  if (!selector) return "";
  return Object.entries(selector)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");
}
