import type { PodSummary } from "@kubeview/contracts";

export function synthesizePodYaml(pod: PodSummary): string {
  const lines: string[] = [
    "apiVersion: v1",
    "kind: Pod",
    "metadata:",
    `  name: ${pod.name}`,
    `  namespace: ${pod.namespace || "default"}`,
  ];

  if (pod.creationTimestamp) {
    lines.push(`  creationTimestamp: "${pod.creationTimestamp}"`);
  }

  if (pod.labels && Object.keys(pod.labels).length > 0) {
    lines.push("  labels:");
    for (const [k, v] of Object.entries(pod.labels)) {
      lines.push(`    ${k}: "${v}"`);
    }
  }

  if (pod.annotations && Object.keys(pod.annotations).length > 0) {
    lines.push("  annotations:");
    for (const [k, v] of Object.entries(pod.annotations)) {
      lines.push(`    ${k}: "${v.replace(/"/g, '\\"')}"`);
    }
  }

  lines.push("spec:");
  if (pod.nodeName) {
    lines.push(`  nodeName: ${pod.nodeName}`);
  }

  if (pod.containers && pod.containers.length > 0) {
    lines.push("  containers:");
    for (const c of pod.containers) {
      lines.push(`  - name: ${c.name}`);
      lines.push(`    image: ${c.image}`);
      if (c.ports && c.ports.length > 0) {
        lines.push("    ports:");
        for (const p of c.ports) {
          lines.push(`    - containerPort: ${p.containerPort}`);
          if (p.name) lines.push(`      name: ${p.name}`);
          if (p.protocol) lines.push(`      protocol: ${p.protocol}`);
        }
      }
      if (c.resources) {
        lines.push("    resources:");
        if (c.resources.requests) {
          lines.push("      requests:");
          if (c.resources.requests.cpu)
            lines.push(`        cpu: ${c.resources.requests.cpu}`);
          if (c.resources.requests.memory)
            lines.push(`        memory: ${c.resources.requests.memory}`);
        }
        if (c.resources.limits) {
          lines.push("      limits:");
          if (c.resources.limits.cpu)
            lines.push(`        cpu: ${c.resources.limits.cpu}`);
          if (c.resources.limits.memory)
            lines.push(`        memory: ${c.resources.limits.memory}`);
        }
      }
    }
  }

  lines.push("status:");
  lines.push(`  phase: ${pod.status}`);
  if (pod.ip) {
    lines.push(`  podIP: ${pod.ip}`);
  }
  if (pod.qosClass) {
    lines.push(`  qosClass: ${pod.qosClass}`);
  }

  return lines.join("\n");
}
