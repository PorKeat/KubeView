"use client";

import { RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { JobStatusFilter } from "../lib/jobStatus";

export interface JobEmptyStateProps {
  jobOwnerFilter: string | null;
  isFiltered: boolean;
  search: string;
  statusFilter: JobStatusFilter;
  currentNamespace: string;
  jobsCount: number;
  onClearFilters: () => void;
  onReload: () => void;
}

export function JobEmptyState({
  jobOwnerFilter,
  isFiltered,
  search,
  statusFilter,
  currentNamespace,
  jobsCount,
  onClearFilters,
  onReload,
}: JobEmptyStateProps) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
      <EmptyState
        variant={isFiltered ? "search" : "empty"}
        title={
          jobOwnerFilter
            ? `No Jobs for CronJob "${jobOwnerFilter}"`
            : isFiltered
              ? `No jobs match filter "${search || statusFilter}"`
              : currentNamespace !== "all"
                ? `No jobs in "${currentNamespace}"`
                : "No Jobs Found"
        }
        description={
          jobOwnerFilter
            ? `The selected CronJob has no retained Job history in ${currentNamespace === "all" ? "the cluster" : `namespace "${currentNamespace}"`}.`
            : isFiltered
              ? "No Job matches the active search or status filter."
              : currentNamespace !== "all"
                ? `Namespace "${currentNamespace}" has no Jobs. ${jobsCount} Jobs are active in other namespaces.`
                : "Jobs run pods to completion. They are created manually or by a CronJob."
        }
        scopeBadge={
          isFiltered
            ? search
              ? `Query: "${search}"`
              : `Status: ${statusFilter}`
            : `Namespace: ${currentNamespace}`
        }
        action={
          isFiltered
            ? {
                label: "Clear Filters",
                icon: <RefreshCw className="w-3.5 h-3.5" />,
                onClick: onClearFilters,
              }
            : {
                label: "Reload Jobs",
                icon: <RefreshCw className="w-3.5 h-3.5" />,
                onClick: onReload,
              }
        }
      />
    </div>
  );
}
