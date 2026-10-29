"use client";

import * as React from "react";
import { Camera, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useCatalogStore } from "@/stores/catalogStore";
import { readClusterImage } from "@/lib/clusterImage";
import { clusterTag, clusterTone } from "@/lib/clusterVisuals";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

export function ClusterImageControl({
  contextName,
  variant = "avatar",
  className,
}: {
  contextName: string;
  variant?: "avatar" | "icon";
  className?: string;
}) {
  const image = useCatalogStore((state) => state.images[contextName]);
  const setContextImage = useCatalogStore((state) => state.setContextImage);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const data = await readClusterImage(file);
      setContextImage(contextName, data);
      toast.success(`Updated image for ${contextName}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update that image.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <span className={cn("inline-flex shrink-0", className)}>
      <Tooltip content="Edit cluster image" side="top">
        <button
          type="button"
          data-testid={`cluster-image-${variant}`}
          data-context-name={contextName}
          aria-label={`Edit image for ${contextName}`}
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          className={cn(
            "group/image relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] text-[9px] font-semibold tracking-wide text-white shadow-sm transition-colors hover:border-white/40 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden cursor-pointer",
            variant === "avatar"
              ? "h-7 w-7"
              : "h-7 w-7 bg-[var(--surface)] text-[var(--muted)]",
          )}
          style={
            image || variant === "icon"
              ? undefined
              : { backgroundImage: clusterTone(contextName) }
          }
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : image ? (
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : variant === "avatar" ? (
            <span className="[text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
              {clusterTag(contextName)}
            </span>
          ) : (
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {variant === "avatar" && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover/image:opacity-100 group-focus-visible/image:opacity-100">
              <Pencil className="h-3 w-3" aria-hidden="true" />
            </span>
          )}
        </button>
      </Tooltip>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </span>
  );
}
