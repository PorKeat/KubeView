"use client";

import * as React from "react";
import { Search, Filter, RefreshCw, MoreVertical, Terminal, FileText, Trash2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ResourceListViewProps {
  resourceType: string;
}

interface MockResourceItem {
  name: string;
  namespace: string;
  status: "Running" | "Pending" | "CrashLoopBackOff" | "Completed" | "Active";
  ready: string;
  restarts: number;
  age: string;
  cpu: string;
  memory: string;
}

const MOCK_PODS: MockResourceItem[] = [
  { name: "coredns-7c65d6cfc9-j9kmq", namespace: "kube-system", status: "Running", ready: "1/1", restarts: 0, age: "12d", cpu: "4m", memory: "18Mi" },
  { name: "coredns-7c65d6cfc9-w82fl", namespace: "kube-system", status: "Running", ready: "1/1", restarts: 0, age: "12d", cpu: "5m", memory: "19Mi" },
  { name: "etcd-kind-control-plane", namespace: "kube-system", status: "Running", ready: "1/1", restarts: 0, age: "12d", cpu: "18m", memory: "64Mi" },
  { name: "kube-apiserver-kind-control-plane", namespace: "kube-system", status: "Running", ready: "1/1", restarts: 0, age: "12d", cpu: "45m", memory: "182Mi" },
  { name: "api-gateway-7f8d-x9q", namespace: "production", status: "CrashLoopBackOff", ready: "0/1", restarts: 8, age: "4h", cpu: "1m", memory: "42Mi" },
  { name: "auth-service-589679bc4-plk7d", namespace: "production", status: "Running", ready: "1/1", restarts: 0, age: "3d", cpu: "12m", memory: "86Mi" },
  { name: "database-postgres-0", namespace: "production", status: "Running", ready: "1/1", restarts: 1, age: "14d", cpu: "32m", memory: "340Mi" },
  { name: "redis-cache-master-0", namespace: "production", status: "Running", ready: "1/1", restarts: 0, age: "7d", cpu: "8m", memory: "54Mi" },
  { name: "analytics-worker-2", namespace: "default", status: "Pending", ready: "0/1", restarts: 0, age: "15m", cpu: "-", memory: "-" },
  { name: "frontend-web-6d9b4b574-z2vqx", namespace: "default", status: "Running", ready: "1/1", restarts: 0, age: "1d", cpu: "9m", memory: "62Mi" },
  { name: "cron-cleanup-2894120-4mkl9", namespace: "default", status: "Completed", ready: "0/1", restarts: 0, age: "55m", cpu: "-", memory: "-" },
];

export function ResourceListView({ resourceType }: ResourceListViewProps) {
  const [search, setSearch] = React.useState("");

  const filteredItems = MOCK_PODS.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.namespace.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: MockResourceItem["status"]) => {
    switch (status) {
      case "Running":
      case "Active":
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--status-healthy)]/15 text-[var(--status-healthy)]">Running</span>;
      case "Pending":
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--status-warning)]/15 text-[var(--status-warning)]">Pending</span>;
      case "CrashLoopBackOff":
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--status-critical)]/15 text-[var(--status-critical)]">CrashLoopBackOff</span>;
      case "Completed":
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--status-muted)]/15 text-[var(--status-muted)]">Completed</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* Table Toolbar */}
      <div className="h-10 border-b border-[var(--border)] px-3 flex items-center justify-between shrink-0 bg-[var(--surface)]">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Filter ${resourceType}...`}
              className="w-full pl-8 pr-3 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <span>{filteredItems.length} items</span>
          <div className="h-3 w-[1px] bg-[var(--border)]" />
          <button
            onClick={() => toast.info(`Refreshed ${resourceType} list`)}
            className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* High-Density Compact Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider z-10">
            <tr>
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Namespace</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Ready</th>
              <th className="py-2 px-3">Restarts</th>
              <th className="py-2 px-3">CPU</th>
              <th className="py-2 px-3">Memory</th>
              <th className="py-2 px-3">Age</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filteredItems.map((item) => (
              <tr
                key={`${item.namespace}/${item.name}`}
                className="h-8 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group"
                onClick={() => toast.info(`Viewing details for ${item.name}`)}
              >
                <td className="py-1 px-3 font-medium text-[var(--foreground)] truncate max-w-xs">{item.name}</td>
                <td className="py-1 px-3 font-mono text-[var(--muted)]">{item.namespace}</td>
                <td className="py-1 px-3">{getStatusBadge(item.status)}</td>
                <td className="py-1 px-3 font-mono text-[var(--muted)]">{item.ready}</td>
                <td className="py-1 px-3 font-mono text-[var(--muted)]">
                  <span className={cn(item.restarts > 0 && "text-[var(--status-warning)] font-semibold")}>
                    {item.restarts}
                  </span>
                </td>
                <td className="py-1 px-3 font-mono text-[var(--muted)]">{item.cpu}</td>
                <td className="py-1 px-3 font-mono text-[var(--muted)]">{item.memory}</td>
                <td className="py-1 px-3 font-mono text-[var(--muted)]">{item.age}</td>
                <td className="py-1 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toast.success(`Streaming logs from ${item.name}`)}
                      className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)]"
                      title="Logs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toast.success(`Opening terminal exec into ${item.name}`)}
                      className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)]"
                      title="Exec Terminal"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
