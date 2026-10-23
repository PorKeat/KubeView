"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Check, ChevronRight, Clock, Code2, Copy, MoreHorizontal, Box, Pause, Play, Trash2, Zap, Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import type { CronJobSummary } from "@kubeview/contracts";
import { StatusBeacon, Tooltip } from "@/components/ui";
import { getCronJobBeaconVariant, getCronJobStatusPulse } from "../lib/cronJobStatus";

export interface CronJobTableRowProps {
  item: CronJobSummary;
  onViewJobs: (cronJob: CronJobSummary) => void;
  onRowClick?: (cronJob: CronJobSummary) => void;
}

export function CronJobTableRow({ item, onViewJobs, onRowClick }: CronJobTableRowProps) {
  const openWorkloadAction = useClusterStore((state) => state.openWorkloadAction);
  const [copiedCommand, setCopiedCommand] = React.useState<string | null>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showActionMenu, setShowActionMenu] = React.useState(false);
  const [showKubectlSubmenu, setShowKubectlSubmenu] = React.useState(false);
  const [openUpwards, setOpenUpwards] = React.useState(false);
  const actionMenuRef = React.useRef<HTMLDivElement>(null);
  const actionButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!showActionMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
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
      setOpenUpwards(window.innerHeight - rect.bottom < 360);
    }
    setShowActionMenu((prev) => !prev);
    setShowKubectlSubmenu(false);
  };

  const closeMenu = () => { setShowActionMenu(false); setShowKubectlSubmenu(false); };
  const actionMeta = { schedule: item.schedule, suspend: item.suspend, concurrencyPolicy: item.concurrencyPolicy };
  const handleTrigger = () => { closeMenu(); openWorkloadAction({ kind: "CronJob", action: "trigger", name: item.name, namespace: item.namespace, ...actionMeta }); };
  const handleSuspend = () => { closeMenu(); openWorkloadAction({ kind: "CronJob", action: "suspend", name: item.name, namespace: item.namespace, ...actionMeta }); };
  const handleResume = () => { closeMenu(); openWorkloadAction({ kind: "CronJob", action: "resume", name: item.name, namespace: item.namespace, ...actionMeta }); };
  const handleDelete = () => { closeMenu(); openWorkloadAction({ kind: "CronJob", action: "delete", name: item.name, namespace: item.namespace, ...actionMeta }); };

  const kubectlCommands = [
    { label: "Describe CronJob", command: `kubectl describe cronjob ${item.name} -n ${item.namespace}` },
    { label: "List Jobs", command: `kubectl get jobs -n ${item.namespace}` },
    { label: "Trigger Job", command: `kubectl create job --from=cronjob/${item.name} ${item.name}-manual -n ${item.namespace}` },
    { label: item.suspend ? "Resume Schedule" : "Suspend Schedule", command: `kubectl patch cronjob/${item.name} --type merge -p '{"spec":{"suspend":${!item.suspend}}}' -n ${item.namespace}` },
    { label: "Delete CronJob", command: `kubectl delete cronjob/${item.name} -n ${item.namespace}` },
  ];
  const handleCopyKubectl = (command: string, label: string) => { navigator.clipboard.writeText(command); setCopiedCommand(label); toast.success(`Copied: ${command}`); setTimeout(() => setCopiedCommand(null), 1200); };

  const labels = item.labels ?? {};
  const images = item.images ?? [];

  return (
    <React.Fragment>
      <tr onClick={() => (onRowClick ? onRowClick(item) : setIsExpanded((prev) => !prev))} className={cn("hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group h-9 text-xs", isExpanded && "bg-[var(--surface-hover)]/70")}>
        <td className="py-1 px-3 font-medium font-mono text-[var(--foreground)] truncate"><div className="flex items-center gap-1 min-w-0"><Tooltip content={isExpanded ? "Collapse details" : "Expand details"}><button type="button" onClick={(event) => { event.stopPropagation(); setIsExpanded((prev) => !prev); }} className="p-0.5 -ml-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0" aria-label={isExpanded ? "Collapse details" : "Expand details"}><ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-200", isExpanded && "rotate-90 text-[var(--accent)]")} /></button></Tooltip><span className="truncate" title={item.name}>{item.name}</span></div></td>
        <td className="py-1 px-3 font-mono text-[var(--muted)] truncate">{item.namespace}</td>
        <td className="py-1 px-3 truncate"><StatusBeacon variant={getCronJobBeaconVariant(item)} label={item.status} size="xs" pulse={getCronJobStatusPulse(item)} /></td>
        <td className="py-1 px-3 font-mono text-[var(--foreground)] text-[11px] truncate"><span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)]" title={item.schedule}>{item.schedule}</span></td>
        <td className="py-1 px-3 truncate"><span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border", item.suspend ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20")}><Pause className={cn("w-2.5 h-2.5", !item.suspend && "hidden")} />{item.suspend ? "Yes" : "No"}</span></td>
        <td className="py-1 px-3 font-mono text-[var(--muted)] text-[11px] truncate"><span className={cn("tabular-nums", item.activeJobs > 0 && "text-emerald-600 dark:text-emerald-400")} title={`${item.activeJobs} active jobs`}>{item.activeJobs}</span></td>
        <td className="py-1 px-3 font-mono text-[var(--muted)] text-[11px] truncate" title={item.lastScheduleTime || "Never scheduled"}>{item.lastScheduleTime ? new Date(item.lastScheduleTime).toLocaleString() : "-"}</td>
        <td className="py-1 px-3 font-mono text-[var(--muted)] truncate">{item.age}</td>
        <td className="py-1 px-2 text-right" onClick={(event) => event.stopPropagation()}>
          <div className="relative inline-flex items-center justify-end" ref={actionMenuRef}>
            <Tooltip content="Actions menu" disabled={showActionMenu} side="left"><button ref={actionButtonRef} type="button" onClick={handleToggleActionMenu} className={cn("p-1 rounded-md transition-colors cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)]", showActionMenu ? "bg-[var(--surface-active)] text-[var(--foreground)] opacity-100" : "hover:bg-black/10 dark:hover:bg-white/10 opacity-60 group-hover:opacity-100")} aria-label={`Actions for ${item.name}`}><MoreHorizontal className="w-4 h-4" /></button></Tooltip>
            <AnimatePresence>
              {showActionMenu && (
                <motion.div initial={{ opacity: 0, scale: 0.95, y: openUpwards ? 4 : -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: openUpwards ? 4 : -4 }} transition={{ type: "spring", stiffness: 450, damping: 30, mass: 0.8 }} onClick={(event) => event.stopPropagation()} className={cn("absolute z-50 w-72 p-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl backdrop-blur-md text-left", openUpwards ? "bottom-full mb-1.5 right-0 origin-bottom-right" : "top-full mt-1.5 right-0 origin-top-right")}>
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--border)]/60 mb-1"><span className="text-[11px] font-semibold text-[var(--foreground)] truncate max-w-[150px]">{item.name}</span><span className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[90px]">{item.namespace}</span></div>
                  <div className="space-y-0.5"><button type="button" onClick={() => { setShowActionMenu(false); onViewJobs(item); }} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors cursor-pointer group/act"><Box className="w-3.5 h-3.5 text-[var(--muted)] group-hover/act:text-[var(--foreground)]" /><span>View Jobs</span></button></div>
                  <div className="my-1 border-t border-[var(--border)]/60" />
                  <div className="space-y-0.5">
                    <RowAction icon={Zap} title="Trigger Now" detail="Create a one-off Job from this template" onClick={handleTrigger} />
                    <RowAction icon={item.suspend ? Play : Pause} title={item.suspend ? "Resume Schedule" : "Suspend Schedule"} detail={item.suspend ? "Resume future scheduled runs" : "Stop creating new Jobs; running Jobs continue"} onClick={item.suspend ? handleResume : handleSuspend} />
                    <RowAction icon={Trash2} title="Delete CronJob" detail="Delete this schedule and its owned Jobs" onClick={handleDelete} danger />
                  </div>
                  <div className="my-1 border-t border-[var(--border)]/60" />
                  <div className="space-y-0.5"><button type="button" onClick={() => setShowKubectlSubmenu((value) => !value)} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors cursor-pointer group/act"><div className="flex items-center gap-2.5"><Code2 className="w-3.5 h-3.5 text-[var(--muted)] group-hover/act:text-[var(--foreground)]" /><span>Quick kubectl CLI</span></div><ChevronRight className={cn("w-3.5 h-3.5 text-[var(--muted)] transition-transform duration-150", showKubectlSubmenu && "rotate-90 text-[var(--accent)]")} /></button>{showKubectlSubmenu && <div className="pl-2 pr-1 py-1 space-y-1 bg-black/[0.02] dark:bg-white/[0.02] rounded-lg">{kubectlCommands.map((command) => { const copied = copiedCommand === command.label; return <button key={command.label} type="button" onClick={() => handleCopyKubectl(command.command, command.label)} className="w-full text-left p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors cursor-pointer group/kcmd flex items-center justify-between gap-2"><div className="min-w-0"><div className="text-[11px] font-medium text-[var(--foreground)]">{command.label}</div><div className="text-[10px] font-mono text-[var(--muted)] truncate max-w-[190px]">{command.command}</div></div><div className="p-1 shrink-0 text-[var(--muted)] group-hover/kcmd:text-[var(--foreground)]">{copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-60 group-hover/kcmd:opacity-100" />}</div></button>; })}</div>}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-[var(--surface-active)]/15 dark:bg-white/[0.012] border-b border-[var(--border)]">
          <td className="py-3 px-4 pl-10 pr-6" colSpan={9} onClick={(event) => event.stopPropagation()}>
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--border)]/60 text-xs"><div className="flex flex-wrap items-center gap-2.5"><Calendar className="w-3.5 h-3.5 text-[var(--accent)]" /><span className="font-semibold text-[var(--foreground)]">CronJob Details</span><span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">{item.schedule}</span><span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono border", item.suspend ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20")}>{item.suspend ? "Suspended" : "Scheduling"}</span></div><div className="flex items-center gap-2"><button type="button" onClick={() => onViewJobs(item)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors cursor-pointer"><Box className="w-3.5 h-3.5 text-[var(--muted)]" /><span>View Jobs</span></button><button type="button" onClick={handleTrigger} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors cursor-pointer"><Zap className="w-3.5 h-3.5" /><span>Trigger Now</span></button></div></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2"><ReplicaTile label="Active Jobs" value={item.activeJobs} tone={item.activeJobs > 0 ? "healthy" : "muted"} /><ReplicaTile label="Successful History" value={item.successfulJobHistoryLimit} /><ReplicaTile label="Failed History" value={item.failedJobHistoryLimit} /><ReplicaTile label="Parallelism" value={item.parallelism ?? 1} /></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02] p-2.5">
                <MetaItem label="Schedule" value={item.schedule} /><MetaItem label="Time Zone" value={item.timeZone || "controller default"} /><MetaItem label="Concurrency Policy" value={item.concurrencyPolicy} /><MetaItem label="Starting Deadline" value={item.startingDeadlineSeconds > 0 ? `${item.startingDeadlineSeconds}s` : "-"} /><MetaItem label="Last Schedule" value={item.lastScheduleTime ? new Date(item.lastScheduleTime).toLocaleString() : "-"} /><MetaItem label="Last Success" value={item.lastSuccessfulTime ? new Date(item.lastSuccessfulTime).toLocaleString() : "-"} /><MetaItem label="Job Completions" value={item.completions !== undefined ? String(item.completions) : "not set"} /><MetaItem label="Job Parallelism" value={item.parallelism !== undefined ? String(item.parallelism) : "not set"} /><MetaItem label="Job Backoff Limit" value={item.backoffLimit !== undefined ? String(item.backoffLimit) : "not set"} /><MetaItem label="Job Active Deadline" value={item.activeDeadlineSeconds !== undefined ? `${item.activeDeadlineSeconds}s` : "not set"} /><MetaItem label="Job TTL" value={item.ttlSecondsAfterFinished !== undefined ? `${item.ttlSecondsAfterFinished}s` : "not set"} /><MetaItem label="Suspended" value={item.suspend ? "Yes" : "No"} />
              </div>
              {item.suspend && <div className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">This CronJob is suspended. No new Jobs are created; already running Jobs continue.</div>}
              <div className="grid gap-4 md:grid-cols-2 pt-1"><div><div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1 flex items-center gap-1"><Box className="w-3 h-3 opacity-60" /> Images</div>{images.length === 0 ? <div className="text-[11px] text-[var(--muted)] italic">No container images.</div> : <div className="space-y-1">{images.map((image) => <div key={image} className="text-[11px] font-mono text-[var(--foreground)] bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]/70 rounded-md px-2 py-1 truncate" title={image}>{image}</div>)}</div>}</div><div>{Object.keys(labels).length > 0 && <><div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1">Labels</div><div className="flex flex-wrap items-center gap-1.5">{Object.entries(labels).slice(0, 8).map(([key, value]) => <span key={key} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"><span>{key}</span><span className="opacity-40">=</span><span className="text-[var(--foreground)] font-medium truncate max-w-[120px]">{value}</span></span>)}</div></>}</div></div>
            </motion.div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

function ReplicaTile({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "healthy" | "warning" | "critical" | "muted" }) { return <div className="rounded-lg border border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02] px-2.5 py-1.5"><div className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold">{label}</div><div className={cn("text-sm font-mono font-semibold tabular-nums mt-0.5", tone === "healthy" && "text-emerald-600 dark:text-emerald-400", tone === "warning" && "text-amber-500", tone === "critical" && "text-rose-500", tone === "muted" && "text-[var(--muted)]", tone === "default" && "text-[var(--foreground)]")}>{value}</div></div>; }
function MetaItem({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><span className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold block">{label}</span><span className="font-mono text-[10px] text-[var(--foreground)] truncate block mt-0.5" title={value}>{value}</span></div>; }
function RowAction({ icon: Icon, title, detail, onClick, danger = false }: { icon: React.ElementType; title: string; detail: string; onClick: () => void; danger?: boolean }) { return <button type="button" onClick={onClick} className={cn("w-full flex items-start gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer group/act", danger ? "hover:bg-rose-500/10" : "hover:bg-black/5 dark:hover:bg-white/[0.06]")}><Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", danger ? "text-rose-500" : "text-[var(--muted)] group-hover/act:text-[var(--foreground)]")} /><span className="min-w-0"><span className={cn("block text-[11px] font-medium", danger ? "text-rose-600 dark:text-rose-400" : "text-[var(--foreground)]")}>{title}</span><span className="block text-[10px] leading-relaxed text-[var(--muted)]">{detail}</span></span></button>; }
