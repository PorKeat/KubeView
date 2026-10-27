"use client";

import * as React from "react";
import { toast } from "sonner";
import { useClusterStore } from "@/stores/clusterStore";
import type { StatefulSetSummary } from "@kubeview/contracts";

export function useStatefulSetRowActions(
  item: StatefulSetSummary,
  desired: number,
) {
  const openWorkloadAction = useClusterStore(
    (state) => state.openWorkloadAction,
  );
  const [copiedName, setCopiedName] = React.useState(false);
  const [copiedCommand, setCopiedCommand] = React.useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = React.useState(false);
  const [showKubectlSubmenu, setShowKubectlSubmenu] = React.useState(false);
  const [openUpwards, setOpenUpwards] = React.useState(false);
  const actionMenuRef = React.useRef<HTMLDivElement>(null);
  const actionButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!showActionMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node)
      ) {
        setShowActionMenu(false);
        setShowKubectlSubmenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActionMenu]);

  const handleToggleActionMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!showActionMenu && actionButtonRef.current) {
      const rect = actionButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpwards(spaceBelow < 420);
    }
    setShowActionMenu((prev) => !prev);
    setShowKubectlSubmenu(false);
  };

  const handleCopyName = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(item.name);
    setCopiedName(true);
    toast.success(`Copied statefulset name: ${item.name}`);
    setTimeout(() => setCopiedName(false), 1500);
  };

  const actionMeta = {
    serviceName: item.serviceName,
    podManagementPolicy: item.podManagementPolicy,
    updateStrategy: item.updateStrategy,
    partition: item.partition,
    maxUnavailable: item.maxUnavailable,
    pvcRetentionWhenDeleted: item.persistentVolumeClaimRetentionWhenDeleted,
    pvcRetentionWhenScaled: item.persistentVolumeClaimRetentionWhenScaled,
  };

  const closeRowActionMenu = () => {
    setShowActionMenu(false);
    setShowKubectlSubmenu(false);
  };

  const handleScaleWorkload = () => {
    closeRowActionMenu();
    openWorkloadAction({
      kind: "StatefulSet",
      action: "scale",
      name: item.name,
      namespace: item.namespace,
      replicas: desired,
      ...actionMeta,
    });
  };

  const handleRestartWorkload = () => {
    closeRowActionMenu();
    openWorkloadAction({
      kind: "StatefulSet",
      action: "restart",
      name: item.name,
      namespace: item.namespace,
      ...actionMeta,
    });
  };

  const handleDeleteWorkload = () => {
    closeRowActionMenu();
    openWorkloadAction({
      kind: "StatefulSet",
      action: "delete",
      name: item.name,
      namespace: item.namespace,
      ...actionMeta,
    });
  };

  const kubectlCommands = [
    {
      label: "Describe StatefulSet",
      command: `kubectl describe statefulset ${item.name} -n ${item.namespace}`,
    },
    {
      label: "Rollout Status",
      command: `kubectl rollout status statefulset/${item.name} -n ${item.namespace}`,
    },
    {
      label: "Restart Rollout",
      command: `kubectl rollout restart statefulset/${item.name} -n ${item.namespace}`,
    },
    {
      label: "Scale Replicas",
      command: `kubectl scale statefulset/${item.name} --replicas=${desired} -n ${item.namespace}`,
    },
    {
      label: "Delete StatefulSet",
      command: `kubectl delete statefulset/${item.name} -n ${item.namespace}`,
    },
  ];

  const handleCopyKubectl = (command: string, label: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(label);
    toast.success(`Copied: ${command}`);
    setTimeout(() => setCopiedCommand(null), 1200);
  };

  return {
    copiedName,
    copiedCommand,
    showActionMenu,
    setShowActionMenu,
    showKubectlSubmenu,
    setShowKubectlSubmenu,
    openUpwards,
    actionMenuRef,
    actionButtonRef,
    handleToggleActionMenu,
    handleCopyName,
    handleScaleWorkload,
    handleRestartWorkload,
    handleDeleteWorkload,
    kubectlCommands,
    handleCopyKubectl,
  };
}
