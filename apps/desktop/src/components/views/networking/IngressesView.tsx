"use client";

import * as React from "react";
import { useClusterStore } from "@/stores/clusterStore";
import { IngressModeTabs } from "./IngressModeTabs";
import { IngressTable } from "./IngressTable";
import { GatewayTable } from "./GatewayTable";
import type { IngressMode } from "./ingressHelpers";

export function IngressesView() {
  const {
    totalIngressesCount,
    totalGatewayResourcesCount,
    loadIngresses,
    loadGatewayResources,
    currentContext,
    currentNamespace,
  } = useClusterStore();

  const [mode, setMode] = React.useState<IngressMode>("ingresses");
  const [ingressFilter, setIngressFilter] = React.useState("all");
  const [gatewayFilter, setGatewayFilter] = React.useState("all");

  React.useEffect(() => {
    if (!currentContext) return;
    loadIngresses(currentNamespace);
    loadGatewayResources(currentNamespace);
  }, [currentContext, currentNamespace, loadIngresses, loadGatewayResources]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <IngressModeTabs
        mode={mode}
        onModeChange={setMode}
        totalIngressesCount={totalIngressesCount}
        totalGatewayResourcesCount={totalGatewayResourcesCount}
      />

      {mode === "ingresses" ? (
        <IngressTable filter={ingressFilter} setFilter={setIngressFilter} />
      ) : (
        <GatewayTable filter={gatewayFilter} setFilter={setGatewayFilter} />
      )}
    </div>
  );
}
