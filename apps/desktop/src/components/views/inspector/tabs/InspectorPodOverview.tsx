"use client";

import * as React from "react";
import {
  Layers,
  Clock,
  CheckCircle2,
  Cpu,
  Activity,
  Tag,
  Search,
  Grid,
  List,
  Copy,
  FileCode,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LabelPill } from "../components/LabelPill";
import type { PodSummary } from "@kubeview/contracts";
import type { SelectedResource } from "@/stores/clusterStore";

export interface InspectorPodOverviewProps {
  currentResource: SelectedResource;
  podData: PodSummary | undefined;
}

export function InspectorPodOverview({
  currentResource,
  podData,
}: InspectorPodOverviewProps) {
  const [labelFilter, setLabelFilter] = React.useState("");
  const [labelViewMode, setLabelViewMode] = React.useState<"chips" | "table">(
    "chips",
  );
  const [showAnnotations, setShowAnnotations] = React.useState(false);

  // Filtered labels
  const rawLabels = podData?.labels || {};
  const labelEntries = Object.entries(rawLabels);
  const filteredLabels = labelEntries.filter(([k, v]) => {
    if (!labelFilter.trim()) return true;
    const query = labelFilter.toLowerCase();
    return k.toLowerCase().includes(query) || v.toLowerCase().includes(query);
  });

  // Annotations
  const rawAnnotations = podData?.annotations || {};
  const annotationEntries = Object.entries(rawAnnotations);

  // Controlled By parsing
  const controlledByStr = podData?.controlledBy;
  let controllerKind = "";
  let controllerName = "";
  if (controlledByStr) {
    const slash = controlledByStr.indexOf("/");
    if (slash !== -1) {
      controllerKind = controlledByStr.substring(0, slash);
      controllerName = controlledByStr.substring(slash + 1);
    } else {
      controllerName = controlledByStr;
    }
  }

  return (
    <div className="space-y-4 text-xs">
      {/* Meta Key-Value Grid */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#F08A42]" /> Resource Metadata
          </span>
          <span className="text-[10px] font-mono text-[var(--muted)]">
            {podData?.creationTimestamp
              ? new Date(podData.creationTimestamp).toLocaleString()
              : ""}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Node */}
          <div className="group/node">
            <span className="text-[var(--muted)] block text-[10px]">Node</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-mono text-[var(--foreground)] font-medium truncate">
                {podData?.nodeName || "Pending placement"}
              </span>
              {podData?.nodeName && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(podData.nodeName);
                    toast.success(`Node name copied: ${podData.nodeName}`);
                  }}
                  className="opacity-0 group-hover/node:opacity-100 p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity cursor-pointer"
                  title="Copy Node Name"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Pod IP */}
          <div className="group/ip">
            <span className="text-[var(--muted)] block text-[10px]">
              Pod IP
            </span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-mono text-[var(--foreground)] font-medium">
                {podData?.ip || "-"}
              </span>
              {podData?.ip && podData.ip !== "-" && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(podData.ip);
                    toast.success(`Pod IP copied: ${podData.ip}`);
                  }}
                  className="opacity-0 group-hover/ip:opacity-100 p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity cursor-pointer"
                  title="Copy Pod IP"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Restarts */}
          <div>
            <span className="text-[var(--muted)] block text-[10px]">
              Restarts
            </span>
            <div className="mt-0.5">
              {(podData?.restarts ?? 0) > 0 ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  {podData?.restarts} restarts
                </span>
              ) : (
                <span className="font-mono text-[var(--foreground)] font-medium">
                  0
                </span>
              )}
            </div>
          </div>

          {/* Created / Age */}
          <div>
            <span className="text-[var(--muted)] block text-[10px]">
              Created / Age
            </span>
            <div className="mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-[var(--muted)]" />
              <span className="font-mono text-[var(--foreground)] font-medium">
                {podData?.age ? `${podData.age} ago` : "-"}
              </span>
            </div>
          </div>

          {/* QoS Class */}
          {podData?.qosClass && (
            <div>
              <span className="text-[var(--muted)] block text-[10px]">
                QoS Class
              </span>
              <div className="mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-black/5 dark:bg-white/5 text-[var(--foreground)] border border-[var(--border)]">
                  {podData.qosClass}
                </span>
              </div>
            </div>
          )}

          {/* Controlled By Controller */}
          {controlledByStr && (
            <div className="col-span-2 pt-1 border-t border-[var(--border)]">
              <span className="text-[var(--muted)] block text-[10px] mb-1">
                Controlled By
              </span>
              <div className="flex items-center gap-2">
                {controllerKind && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F08A42]/15 text-[#F08A42] border border-[#F08A42]/25 font-mono">
                    {controllerKind}
                  </span>
                )}
                <span
                  className="font-mono text-xs font-medium text-[var(--foreground)] truncate flex-1"
                  title={controlledByStr}
                >
                  {controllerName}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(controlledByStr);
                    toast.success("Controller copied to clipboard");
                  }}
                  className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded transition-colors cursor-pointer"
                  title="Copy Controller"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resource Telemetry Quick Strip */}
        {(podData?.cpu || podData?.memory || podData?.ready) && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)]">
            <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Ready
              </span>
              <span className="font-mono font-semibold text-xs text-[var(--foreground)] mt-0.5 block">
                {podData?.ready || "-"}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                <Cpu className="w-3 h-3 text-[var(--accent)]" /> CPU
              </span>
              <span className="font-mono font-semibold text-xs text-[var(--foreground)] mt-0.5 block">
                {podData?.cpu || "-"}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                <Activity className="w-3 h-3 text-blue-500" /> Memory
              </span>
              <span className="font-mono font-semibold text-xs text-[var(--foreground)] mt-0.5 block">
                {podData?.memory || "-"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Labels Card */}
      {labelEntries.length > 0 && (
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5 text-[#F08A42]" />
              <span>Labels</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                {labelEntries.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {labelEntries.length > 3 && (
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="text"
                    value={labelFilter}
                    onChange={(e) => setLabelFilter(e.target.value)}
                    placeholder="Filter labels..."
                    className="w-28 sm:w-36 h-6 pl-6 pr-2 text-[10px] rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] outline-hidden focus:border-[var(--accent)] transition-colors font-mono"
                  />
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="flex items-center border border-[var(--border)] rounded-lg p-0.5 bg-black/[0.02] dark:bg-white/[0.02]">
                <button
                  onClick={() => setLabelViewMode("chips")}
                  className={cn(
                    "p-1 rounded cursor-pointer transition-colors",
                    labelViewMode === "chips"
                      ? "bg-[var(--surface-active)] text-[#F08A42]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                  title="Chips View"
                >
                  <Grid className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setLabelViewMode("table")}
                  className={cn(
                    "p-1 rounded cursor-pointer transition-colors",
                    labelViewMode === "table"
                      ? "bg-[var(--surface-active)] text-[#F08A42]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                  title="Table View"
                >
                  <List className="w-3 h-3" />
                </button>
              </div>

              {/* Copy All */}
              <button
                onClick={() => {
                  const yamlLabels = Object.entries(rawLabels)
                    .map(([k, v]) => `  ${k}: "${v}"`)
                    .join("\n");
                  navigator.clipboard.writeText(`labels:\n${yamlLabels}`);
                  toast.success("All labels copied to clipboard");
                }}
                className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                title="Copy All Labels"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Chips View */}
          {labelViewMode === "chips" ? (
            <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto pr-1">
              {filteredLabels.length > 0 ? (
                filteredLabels.map(([k, v]) => (
                  <LabelPill key={k} labelKey={k} value={v} />
                ))
              ) : (
                <div className="text-[11px] text-[var(--muted)] py-2">
                  No labels match &ldquo;{labelFilter}&rdquo;
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <div className="border border-[var(--border)] rounded-xl overflow-hidden max-h-64 overflow-y-auto font-mono text-[10px]">
              <table className="w-full text-left">
                <thead className="bg-black/5 dark:bg-white/5 border-b border-[var(--border)] text-[var(--muted)]">
                  <tr>
                    <th className="px-2.5 py-1.5 font-semibold">Key</th>
                    <th className="px-2.5 py-1.5 font-semibold">Value</th>
                    <th className="px-2 py-1.5 text-right w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredLabels.map(([k, v]) => (
                    <tr
                      key={k}
                      className="hover:bg-[var(--surface-hover)] transition-colors group"
                    >
                      <td className="px-2.5 py-1.5 text-[var(--foreground)] font-semibold truncate max-w-[180px]">
                        {k}
                      </td>
                      <td className="px-2.5 py-1.5 text-[var(--muted)] truncate max-w-[200px]">
                        {v}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${k}=${v}`);
                            toast.success(`Copied: ${k}=${v}`);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity"
                          title="Copy Label"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Collapsible Annotations Section */}
      {annotationEntries.length > 0 && (
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2 shadow-2xs">
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-[#F08A42]" />
              <span>Annotations</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                {annotationEntries.length}
              </span>
            </div>
            {showAnnotations ? (
              <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)]" />
            )}
          </button>

          {showAnnotations && (
            <div className="pt-2 space-y-1.5 border-t border-[var(--border)] max-h-56 overflow-y-auto font-mono text-[10px]">
              {annotationEntries.map(([k, v]) => (
                <div
                  key={k}
                  className="p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)] flex items-start justify-between gap-2 group"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-[var(--foreground)] block truncate">
                      {k}
                    </span>
                    <span className="text-[var(--muted)] block truncate text-[9px] mt-0.5">
                      {v}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${k}=${v}`);
                      toast.success(`Copied annotation: ${k}`);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity cursor-pointer shrink-0"
                    title="Copy Annotation"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick CLI Commands */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2 shadow-2xs">
        <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-[#F08A42]" />
          <span>Quick CLI Commands</span>
        </span>
        <div className="space-y-1.5 font-mono text-[11px]">
          {[
            {
              label: "Logs",
              cmd: `kubectl logs -n ${currentResource.namespace} ${currentResource.name} -f`,
            },
            {
              label: "Exec",
              cmd: `kubectl exec -it -n ${currentResource.namespace} ${currentResource.name} -- sh`,
            },
            {
              label: "Describe",
              cmd: `kubectl describe pod -n ${currentResource.namespace} ${currentResource.name}`,
            },
          ].map((c) => (
            <div
              key={c.label}
              className="p-2 px-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-[var(--border)] flex items-center justify-between group"
            >
              <div className="truncate mr-2">
                <span className="text-[#F08A42] font-semibold text-[10px] mr-2 uppercase tracking-wide">
                  {c.label}:
                </span>
                <span className="text-[var(--foreground)]">{c.cmd}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(c.cmd);
                  toast.success(`Copied: ${c.cmd}`);
                }}
                className="p-1 text-[var(--muted)] hover:text-[#F08A42] transition-colors cursor-pointer shrink-0"
                title={`Copy ${c.label} command`}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Status Incident Warning */}
      {currentResource.status !== "Running" &&
        currentResource.status !== "Completed" && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Status: {currentResource.status}</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Pod state is currently not in steady running phase. Open the logs
              or events tab for root-cause diagnosis.
            </p>
          </div>
        )}
    </div>
  );
}
