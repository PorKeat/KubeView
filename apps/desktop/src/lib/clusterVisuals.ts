const CLUSTER_TONES = [
  "linear-gradient(145deg, #3f877f, #1e4b46)",
  "linear-gradient(145deg, #7f9145, #495628)",
  "linear-gradient(145deg, #905174, #51283e)",
  "linear-gradient(145deg, #426f98, #253f59)",
  "linear-gradient(145deg, #8a6b43, #4e3a23)",
  "linear-gradient(145deg, #526b73, #2d3e45)",
  "linear-gradient(145deg, #8f5d43, #4f3024)",
  "linear-gradient(145deg, #5b5f98, #32345c)",
] as const;

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function clusterTone(name: string) {
  return CLUSTER_TONES[hashString(name) % CLUSTER_TONES.length];
}

export function clusterTag(name: string) {
  const cleaned = name
    .replace(/^kubernetes-admin@/i, "")
    .replace(/^admin@/i, "")
    .replace(/^cluster\//i, "");
  const parts = cleaned.split(/[^a-zA-Z0-9]+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return (
    cleaned.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2) || "K8"
  ).toUpperCase();
}
