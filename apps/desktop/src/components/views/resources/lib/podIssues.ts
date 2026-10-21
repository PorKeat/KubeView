import type { PodSummary } from "@kubeview/contracts";

export interface PodIssueInfo {
  type: "oom" | "crash" | "image" | "unready" | "config" | "failed";
  badge: string;
  severity: "critical" | "warning";
  title: string;
  detail: string;
  containerName?: string;
  exitCode?: number;
  rootCause: string;
  actionableTip: string;
}

/**
 * Evaluates whether a pod has a real, actionable problem and extracts
 * root-cause diagnostics, exit codes, and developer recommendations.
 * Normal healthy pods with minor historical restarts are NOT flagged.
 */
export function getPodIssue(pod: PodSummary): PodIssueInfo | null {
  const status = pod.status;

  // 1. OOMKilled (Out of Memory - Exit 137)
  const oomContainer = pod.containers?.find(
    (c) =>
      c.stateReason === "OOMKilled" ||
      c.lastTerminatedReason === "OOMKilled" ||
      c.exitCode === 137
  );
  if (status === "OOMKilled" || oomContainer) {
    const cName = oomContainer?.name || pod.containers?.[0]?.name || "primary";
    return {
      type: "oom",
      badge: "Exit 137 • OOMKilled",
      severity: "critical",
      title: "Out Of Memory (OOMKilled)",
      containerName: cName,
      exitCode: 137,
      rootCause: `Container '${cName}' exceeded memory limit and was killed by Linux kernel OOM killer.`,
      actionableTip: `Increase 'resources.limits.memory' in pod spec, or profile heap allocations for memory leaks.`,
      detail: `OOMKilled: '${cName}' exceeded memory quota (Exit Code 137).`,
    };
  }

  // 2. CrashLoopBackOff / App Startup Crash
  const crashContainer = pod.containers?.find(
    (c) =>
      c.stateReason === "CrashLoopBackOff" ||
      c.waitingReason === "CrashLoopBackOff" ||
      (c.lastTerminatedReason === "Error" && c.exitCode && c.exitCode !== 0)
  );
  if (status === "CrashLoopBackOff" || crashContainer) {
    const cName = crashContainer?.name || pod.containers?.[0]?.name || "primary";
    const ec = crashContainer?.exitCode ?? 1;
    const msg =
      crashContainer?.waitingMessage ||
      crashContainer?.lastTerminatedMessage ||
      `Application process in container '${cName}' crashed upon startup (Exit Code ${ec}).`;

    return {
      type: "crash",
      badge: `Exit ${ec} • CrashLoop`,
      severity: "critical",
      title: `CrashLoopBackOff (Exit ${ec})`,
      containerName: cName,
      exitCode: ec,
      rootCause: msg,
      actionableTip: `Check container stdout/stderr logs for unhandled exceptions, panics, or broken db connection.`,
      detail: `CrashLoop: Container '${cName}' repeatedly crashing on start (Exit ${ec}).`,
    };
  }

  // 3. Image pull failure (Missing image tag, authorization, or private registry credentials)
  const imagePullContainer = pod.containers?.find(
    (c) =>
      c.stateReason === "ImagePullBackOff" ||
      c.stateReason === "ErrImagePull" ||
      c.waitingReason === "ImagePullBackOff" ||
      c.waitingReason === "ErrImagePull"
  );
  if (
    status === "ImagePullBackOff" ||
    status === "ErrImagePull" ||
    imagePullContainer
  ) {
    const cName = imagePullContainer?.name || pod.containers?.[0]?.name || "primary";
    const imgName = imagePullContainer?.image || "container image";
    const msg =
      imagePullContainer?.waitingMessage ||
      `Kubernetes kubelet cannot download image '${imgName}'.`;

    return {
      type: "image",
      badge: "ImagePullErr",
      severity: "critical",
      title: "Image Pull Failure",
      containerName: cName,
      rootCause: msg,
      actionableTip: `Verify '${imgName}' exists in registry and required 'imagePullSecrets' are configured.`,
      detail: `ImagePullErr: Cannot fetch image for container '${cName}'.`,
    };
  }

  // 4. Container Configuration / Secret / ConfigMap missing
  const configContainer = pod.containers?.find(
    (c) =>
      c.stateReason === "CreateContainerConfigError" ||
      c.stateReason === "CreateContainerError" ||
      c.waitingReason === "CreateContainerConfigError" ||
      c.waitingReason === "CreateContainerError"
  );
  if (
    [
      "CreateContainerConfigError",
      "CreateContainerError",
      "InvalidImageName",
    ].includes(status) ||
    configContainer
  ) {
    const cName = configContainer?.name || pod.containers?.[0]?.name || "primary";
    const msg =
      configContainer?.waitingMessage ||
      "Failed to initialize container runtime due to missing ConfigMap or Secret keys.";

    return {
      type: "config",
      badge: "ConfigError",
      severity: "critical",
      title: "Container Configuration Error",
      containerName: cName,
      rootCause: msg,
      actionableTip: `Verify referenced ConfigMaps, Secrets, and env/volume mounts exist in namespace '${pod.namespace}'.`,
      detail: `ConfigError: Missing Secret/ConfigMap keys in '${cName}'.`,
    };
  }

  // 5. Generic Runtime Failure states (Error, Failed, ContainerCannotRun)
  if (
    ["Error", "Failed", "ContainerCannotRun"].includes(status) ||
    pod.containers?.some((c) => c.state === "Terminated" && c.exitCode && c.exitCode !== 0) ||
    pod.containers?.some((c) => c.stateReason === "Error")
  ) {
    const failedContainer = pod.containers?.find(
      (c) =>
        (c.state === "Terminated" && c.exitCode && c.exitCode !== 0) ||
        c.stateReason === "Error"
    );
    const ec = failedContainer?.exitCode;
    return {
      type: "failed",
      badge: ec ? `Exit ${ec} • Error` : `Failed (${status})`,
      severity: "critical",
      title: `Pod Execution Failure (${status})`,
      containerName: failedContainer?.name,
      exitCode: ec,
      rootCause:
        failedContainer?.lastTerminatedMessage ||
        `Container '${failedContainer?.name || "app"}' encountered a fatal error during execution with status '${status}'${ec ? ` (Exit Code ${ec})` : ""}.`,
      actionableTip: `Inspect pod events and recent container logs to debug why the container exited unexpectedly.`,
      detail: `Runtime Error: Container failed with status ${status}${ec ? ` (Exit ${ec})` : ""}.`,
    };
  }

  // 6. Container not ready while Running (Readiness / Liveness Probe Failure)
  // CRITICAL: Applies ONLY to workloads in the "Running" phase.
  // Pending, ContainerCreating, or PodInitializing workloads are still starting up and NOT probe failing!
  if (status === "Running") {
    const [readyCount, totalCount] = pod.ready
      ? pod.ready.split("/").map(Number)
      : [1, 1];
    if (totalCount > 0 && readyCount < totalCount) {
      const unreadyContainer = pod.containers?.find((c) => !c.ready);
      const cName = unreadyContainer?.name || pod.containers?.[0]?.name || "application";
      const readyCondition = pod.conditions?.find(
        (c) => c.type === "ContainersReady" || c.type === "Ready"
      );
      const msg =
        readyCondition?.message ||
        `Readiness probe failed on container '${cName}'. Pod is currently running but excluded from serving upstream traffic.`;

      return {
        type: "unready",
        badge: `${readyCount}/${totalCount} Probe Failing`,
        severity: readyCount === 0 ? "critical" : "warning",
        title: `Readiness Probe Failing (${readyCount}/${totalCount})`,
        containerName: cName,
        rootCause: msg,
        actionableTip: `Inspect application health endpoint (/healthz) or increase probe initialDelaySeconds/timeout.`,
        detail: `Readiness Failed: ${readyCount}/${totalCount} ready in '${cName}'. Traffic blocked.`,
      };
    }
  }

  // 7. Pod stuck in Evicted state
  if (status === "Evicted") {
    return {
      type: "failed",
      badge: "Evicted",
      severity: "critical",
      title: "Pod Evicted",
      rootCause: `Kubelet evicted this pod from host '${pod.nodeName}' due to disk pressure or node resource starvation.`,
      actionableTip: `Check disk capacity and node memory on '${pod.nodeName}' or relocate workloads.`,
      detail: `Evicted from node '${pod.nodeName}' due to host resource pressure.`,
    };
  }

  return null;
}

export interface PodPendingInfo {
  title: string;
  containerName?: string;
  rootCause: string;
  actionableTip: string;
  canViewLogs: boolean;
}

/**
 * Extracts initialization, scheduling, and container creating details
 * for workloads in the Pending lifecycle phase.
 */
export function getPodPendingInfo(pod: PodSummary): PodPendingInfo | null {
  if (pod.status === "ContainerCreating") {
    const cName = pod.containers?.[0]?.name;
    return {
      title: "Container Creating",
      containerName: cName,
      rootCause: `Kubelet is setting up the container sandbox, pulling image layers, and attaching volume mounts.`,
      actionableTip: `This typically completes within a few moments. If delayed, check host network connectivity or storage provisioners.`,
      canViewLogs: false,
    };
  }

  if (pod.status === "PodInitializing") {
    const initContainer = pod.containers?.find((c) => c.name.startsWith("init-"));
    const cName = initContainer?.name || pod.containers?.[0]?.name;
    return {
      title: "Pod Initializing",
      containerName: cName,
      rootCause: `Init containers are running prerequisite setup tasks before primary workload containers start.`,
      actionableTip: `Check init container logs if startup is taking longer than expected.`,
      canViewLogs: true,
    };
  }

  if (pod.status === "Pending") {
    const scheduledCondition = pod.conditions?.find((c) => c.type === "PodScheduled");
    const msg =
      scheduledCondition?.message ||
      `Pod is queued in the Kubernetes scheduler and waiting to be placed onto an available cluster node.`;
    return {
      title: "Pending Scheduling",
      rootCause: msg,
      actionableTip: `Verify node resource capacity (CPU/memory requests) and node selector/affinity constraints.`,
      canViewLogs: false,
    };
  }

  return null;
}

/**
 * Evaluates whether a pod should be classified under "Failing".
 * Covers explicit failing statuses, critical active issues, and unready workloads (e.g. 0/1 ready containers).
 */
export function isPodFailing(pod: PodSummary): boolean {
  // Explicit failing statuses
  const failingStatuses = [
    "CrashLoopBackOff",
    "ImagePullBackOff",
    "ErrImagePull",
    "Error",
    "Failed",
    "Evicted",
    "OOMKilled",
    "ContainerCannotRun",
    "CreateContainerConfigError",
    "CreateContainerError",
    "InvalidImageName",
  ];
  if (failingStatuses.includes(pod.status)) return true;

  // Unready in Running state: if 0 of N containers are ready, pod cannot serve traffic and is failing
  const [readyCount, totalCount] = pod.ready
    ? pod.ready.split("/").map(Number)
    : [1, 1];
  if (pod.status === "Running" && totalCount > 0 && readyCount === 0) {
    return true;
  }

  // Check if any container is in an error, waiting, or crashed state
  if (
    pod.containers?.some(
      (c) =>
        (c.stateReason &&
          [
            "CrashLoopBackOff",
            "ImagePullBackOff",
            "ErrImagePull",
            "OOMKilled",
            "CreateContainerConfigError",
            "CreateContainerError",
            "Error",
          ].includes(c.stateReason)) ||
        (c.waitingReason &&
          [
            "CrashLoopBackOff",
            "ImagePullBackOff",
            "ErrImagePull",
            "CreateContainerConfigError",
            "CreateContainerError",
          ].includes(c.waitingReason)) ||
        (c.lastTerminatedReason === "Error" && c.exitCode && c.exitCode !== 0) ||
        (c.lastTerminatedReason === "OOMKilled")
    )
  ) {
    return true;
  }

  // Any pod diagnosed with critical issue severity (excluding normal pending workloads)
  if (
    !["Pending", "ContainerCreating", "PodInitializing"].includes(pod.status)
  ) {
    const issue = getPodIssue(pod);
    if (issue && issue.severity === "critical") {
      return true;
    }
  }

  // Any non-standard status that is neither Running, Completed, Pending, nor Succeeded
  if (
    ![
      "Running",
      "Completed",
      "Pending",
      "Succeeded",
      "ContainerCreating",
      "PodInitializing",
      "Terminating",
    ].includes(pod.status)
  ) {
    return true;
  }

  return false;
}

/**
 * Evaluates whether a pod is genuinely healthy and "Running".
 * Excludes pods with 0 ready containers or critical failures.
 */
export function isPodRunning(pod: PodSummary): boolean {
  if (pod.status !== "Running") return false;

  // If 0 containers ready (e.g. 0/1 Unready), it is failing, NOT healthy Running
  const [readyCount, totalCount] = pod.ready
    ? pod.ready.split("/").map(Number)
    : [1, 1];
  if (totalCount > 0 && readyCount === 0) {
    return false;
  }

  if (isPodFailing(pod)) return false;

  return true;
}

/**
 * Evaluates whether a pod is in a pending/starting phase.
 * Excludes pods with active failures (e.g. ImagePullBackOff or config errors),
 * routing broken starting pods to Failing instead.
 */
export function isPodPending(pod: PodSummary): boolean {
  if (isPodFailing(pod)) return false;

  return (
    pod.status === "Pending" ||
    pod.status === "ContainerCreating" ||
    pod.status === "PodInitializing"
  );
}
