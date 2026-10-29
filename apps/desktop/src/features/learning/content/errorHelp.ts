import type { ErrorExplanation } from "../types";

function haystack(input: {
  code?: string;
  title?: string;
  message?: string;
}): string {
  return [input.code, input.title, input.message]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function explainKubernetesError(input: {
  code?: string;
  title?: string;
  message?: string;
}): ErrorExplanation {
  const text = haystack(input);

  if (
    /forbidden|unauthorized|permission denied|rbac|access denied|403/.test(text)
  ) {
    return {
      id: "forbidden",
      title: "The cluster understood you, but said no",
      meaning:
        "KubeView reached the API server. The Kubernetes identity for the selected context is missing the permission needed for this action.",
      commonCauses: [
        "The kubeconfig user is not bound to a Role that grants this verb.",
        "The action is scoped to a different namespace.",
        "The resource is cluster-scoped and needs a ClusterRole binding.",
      ],
      nextSteps: [
        "Check the current identity in Permissions Checker.",
        "Test the same verb and resource there to confirm the denial.",
        "Ask for the smallest Role and binding that grants it.",
      ],
      action: {
        label: "Open Permissions Checker",
        tabId: "permissions",
        tabTitle: "Permissions Checker",
      },
    };
  }

  if (
    /connection refused|econnrefused|unreachable|no such host|dial tcp|network is unreachable|connection reset|connection failed|offline/.test(
      text,
    )
  ) {
    return {
      id: "connection",
      title: "KubeView cannot reach the cluster",
      meaning:
        "The network connection to the Kubernetes API server failed. This is usually an environment or access problem, not a broken workload.",
      commonCauses: [
        "The selected context points at a cluster that is stopped or unreachable.",
        "A VPN, proxy, or firewall is blocking the API endpoint.",
        "The kubeconfig server address or certificate is wrong.",
      ],
      nextSteps: [
        "Confirm the selected context is the cluster you intended.",
        "Check whether the API server is reachable outside KubeView.",
        "Run Connection Diagnostics from the status area.",
      ],
    };
  }

  if (
    /timeout|timed out|deadline exceeded|etimedout|gateway timeout|504/.test(
      text,
    )
  ) {
    return {
      id: "timeout",
      title: "The request took too long",
      meaning:
        "The API server or a dependent service did not respond before the request deadline.",
      commonCauses: [
        "The cluster API is overloaded or temporarily unavailable.",
        "The request covers a very large namespace or resource list.",
        "A proxy or network path is slow or dropping traffic.",
      ],
      nextSteps: [
        "Retry once and note whether the delay is consistent.",
        "Reduce the scope to a single namespace.",
        "Check cluster health and connection latency.",
      ],
    };
  }

  if (/not found|404|does not exist|no matches/.test(text)) {
    return {
      id: "not-found",
      title: "The object or endpoint was not found",
      meaning:
        "The request reached the API server, but the named object or the API route does not exist in the selected scope.",
      commonCauses: [
        "The resource was deleted or renamed.",
        "The active namespace is different from where the object lives.",
        "The API version or resource kind is not installed in this cluster.",
      ],
      nextSteps: [
        "Confirm the namespace and context in the header.",
        "Refresh the list before trying the action again.",
        "For a CRD, check that the custom API is installed.",
      ],
    };
  }

  if (/conflict|409|already exists|resourceversion|precondition/.test(text)) {
    return {
      id: "conflict",
      title: "Someone changed this object first",
      meaning:
        "The cluster rejected the write because the live object changed after KubeView loaded it.",
      commonCauses: [
        "Another user or controller updated the resource.",
        "A second KubeView window applied a change.",
        "The object was recreated with the same name.",
      ],
      nextSteps: [
        "Reload the resource and inspect the latest YAML.",
        "Compare your intended change with the new live state.",
        "Apply only the change you still need.",
      ],
    };
  }

  if (/certificate|x509|tls|tls handshake/.test(text)) {
    return {
      id: "tls",
      title: "The cluster certificate was not trusted",
      meaning:
        "The TLS connection was established incorrectly or the certificate does not match the API server identity.",
      commonCauses: [
        "The kubeconfig certificate authority data is stale.",
        "The API server certificate does not include the configured hostname.",
        "A corporate proxy is intercepting TLS.",
      ],
      nextSteps: [
        "Use a fresh kubeconfig from the cluster administrator.",
        "Check whether the server hostname matches the certificate.",
        "Check for a proxy that replaces TLS certificates.",
      ],
    };
  }

  return {
    id: "generic",
    title: "Something in the request failed",
    meaning:
      "KubeView could not complete the operation. Start with the error code and the scope shown on screen, then narrow down with the evidence below.",
    commonCauses: [
      "The selected context or namespace is not the one you expected.",
      "The cluster API is temporarily unavailable.",
      "The resource is in a state that does not allow this action.",
    ],
    nextSteps: [
      "Retry after refreshing the resource.",
      "Check Events or Connection Diagnostics for a more specific message.",
      "Open the Technical Traceback if the problem repeats.",
    ],
  };
}
