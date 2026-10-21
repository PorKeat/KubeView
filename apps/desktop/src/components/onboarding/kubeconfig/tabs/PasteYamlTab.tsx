"use client";

import * as React from "react";
import { Check } from "lucide-react";

export interface PasteYamlTabProps {
  rawYaml: string;
  setRawYaml: (val: string) => void;
  clusterName: string;
  setClusterName: (val: string) => void;
  detectedPasteContexts: string[];
}

export function PasteYamlTab({
  rawYaml,
  setRawYaml,
  clusterName,
  setClusterName,
  detectedPasteContexts,
}: PasteYamlTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[var(--foreground)]">
          Paste raw Kubeconfig YAML:
        </label>
        {detectedPasteContexts.length > 0 && (
          <span className="text-[11px] font-mono text-emerald-500 flex items-center gap-1 font-medium">
            <Check className="w-3 h-3" />
            {detectedPasteContexts.length} cluster context(s) recognized
          </span>
        )}
      </div>

      <div className="relative">
        <textarea
          rows={10}
          value={rawYaml}
          onChange={(e) => setRawYaml(e.target.value)}
          placeholder={`apiVersion: v1\nclusters:\n- cluster:\n    server: https://127.0.0.1:6443\n    certificate-authority-data: ...\n  name: my-cluster\ncontexts:\n- context:\n    cluster: my-cluster\n    user: admin\n  name: my-context\ncurrent-context: my-context\nusers:\n- name: admin\n  user:\n    client-certificate-data: ...`}
          className="w-full p-3 font-mono text-xs bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)]/50 outline-hidden focus:border-[#F08A42] leading-relaxed resize-none selection:bg-[#F08A42]/20"
        />
      </div>

      <div>
        <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
          Cluster Alias (Optional)
        </label>
        <input
          type="text"
          value={clusterName}
          onChange={(e) => setClusterName(e.target.value)}
          placeholder="e.g. production-gke or aws-dev"
          className="w-full px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] outline-hidden focus:border-[#F08A42]"
        />
      </div>
    </div>
  );
}
