/**
 * Utilities to detect and handle internal cluster hostnames (e.g. lb.kubesphere.local, *.internal, *.svc)
 * that cannot be resolved on local desktop machines without /etc/hosts or changing to the node IP.
 */

export function isInternalEndpoint(serverUrl: string): boolean {
  if (!serverUrl) return false;
  try {
    const url = serverUrl.includes("://") ? new URL(serverUrl) : new URL(`https://${serverUrl}`);
    const host = url.hostname.toLowerCase();
    return (
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".svc") ||
      host.endsWith(".cluster.local") ||
      host.includes("kubesphere.local") ||
      host.includes("kubernetes.default")
    );
  } catch {
    const lower = serverUrl.toLowerCase();
    return (
      lower.includes(".local") ||
      lower.includes(".internal") ||
      lower.includes(".svc") ||
      lower.includes("kubesphere.local")
    );
  }
}

/**
 * Replaces the hostname in serverUrl with newHostOrIp, preserving scheme and port.
 * e.g. ("https://lb.kubesphere.local:6443", "10.1.16.11") -> "https://10.1.16.11:6443"
 */
export function replaceEndpointHost(serverUrl: string, newHostOrIp: string): string {
  const trimmed = newHostOrIp.trim();
  if (!trimmed) return serverUrl;

  // Extract fallback port and protocol from serverUrl (defaults to 6443 and https:)
  let fallbackPort = "6443";
  let fallbackProtocol = "https:";
  try {
    const origUrl = serverUrl.includes("://") ? new URL(serverUrl) : new URL(`https://${serverUrl}`);
    if (origUrl.port) fallbackPort = origUrl.port;
    if (origUrl.protocol) fallbackProtocol = origUrl.protocol;
  } catch {}

  // If user typed a full URL like "https://10.1.16.11:6443" or "https://10.1.15.11"
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const u = new URL(trimmed);
      const port = u.port || fallbackPort;
      return `${u.protocol}//${u.hostname}:${port}`;
    } catch {
      return trimmed;
    }
  }

  // If user typed "10.1.16.11:6443"
  if (trimmed.includes(":")) {
    return `${fallbackProtocol}//${trimmed}`;
  }

  // If user typed just an IP or hostname like "10.1.16.11"
  return `${fallbackProtocol}//${trimmed}:${fallbackPort}`;
}
