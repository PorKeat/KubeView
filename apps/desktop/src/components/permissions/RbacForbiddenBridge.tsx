"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  inferPermissionOperation,
  openPermissionExplanation,
  type ForbiddenRpcDetail,
} from "@/lib/permissionExplainer";

export function RbacForbiddenBridge() {
  React.useEffect(() => {
    const onForbidden = (event: Event) => {
      const detail = (event as CustomEvent<ForbiddenRpcDetail>).detail;
      if (!detail || detail.code !== "K8S_FORBIDDEN") return;
      const operation = inferPermissionOperation(detail.method, detail.params);
      if (!operation) return;

      toast.error("Permission denied", {
        description: "KubeView can explain which RBAC rule is missing.",
        duration: 12000,
        action: {
          label: "Why denied?",
          onClick: () => openPermissionExplanation(operation),
        },
      });
    };

    window.addEventListener("kubeview:forbidden", onForbidden);
    return () => window.removeEventListener("kubeview:forbidden", onForbidden);
  }, []);

  return null;
}
