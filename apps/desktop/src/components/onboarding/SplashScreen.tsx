"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";

const FADE_DURATION = 400;
const VISIBLE_DURATION = 1200;

export function SplashScreen() {
  const splashDismissed = useClusterStore((state) => state.splashDismissed);
  const setSplashDismissed = useClusterStore(
    (state) => state.setSplashDismissed,
  );
  const [isFadingOut, setIsFadingOut] = React.useState(false);
  const dismissingRef = React.useRef(false);
  const fadeTimerRef = React.useRef<number | null>(null);

  const handleComplete = React.useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    setIsFadingOut(true);
    fadeTimerRef.current = window.setTimeout(() => {
      setSplashDismissed(true);
    }, FADE_DURATION);
  }, [setSplashDismissed]);

  React.useEffect(() => {
    try {
      if (localStorage.getItem("kubeview_skip_boot_splash") === "true") {
        setSplashDismissed(true);
        return;
      }
    } catch {
      // A private window or blocked storage should not prevent the app from
      // finishing its boot sequence.
    }

    const timer = window.setTimeout(handleComplete, VISIBLE_DURATION);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleComplete();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleComplete, setSplashDismissed]);

  if (splashDismissed) return null;

  return (
    <div
      data-splash-screen="true"
      data-testid="splash-screen"
      role="status"
      aria-live="polite"
      aria-label="Loading KubeView"
      onClick={handleComplete}
      className={cn(
        "splash-screen fixed inset-0 z-[100] flex cursor-pointer select-none flex-col items-center justify-center overflow-hidden bg-[var(--background)]",
        isFadingOut
          ? "pointer-events-none scale-[1.012] opacity-0 blur-[3px]"
          : "scale-100 opacity-100 blur-0",
      )}
    >
      <div className="splash-grid pointer-events-none absolute inset-0 opacity-80" />
      <div className="splash-aurora pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2">
        <div className="splash-orbit absolute inset-0 rounded-full border border-[var(--accent)]/10" />
        <div className="splash-orbit-reverse absolute inset-[64px] rounded-full border border-dashed border-[var(--accent)]/15" />
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[min(520px,72vw)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--accent)]/35 to-transparent" />

      <div className="splash-content relative z-10 flex flex-col items-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute -inset-4 rounded-[28px] bg-[var(--accent)]/15 blur-2xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--accent)]/25 bg-[var(--surface)]/85 shadow-[0_18px_50px_-18px_rgba(240,138,66,0.65)] backdrop-blur-xl">
            <Image
              src="/logo-mark.png"
              alt="KubeView"
              width={46}
              height={46}
              priority
              className="h-11 w-11 object-contain"
            />
          </div>
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_14px_var(--accent)] animate-pulse" />
        </div>

        <div className="mt-6 flex items-baseline text-[22px] font-semibold tracking-[-0.03em]">
          <span className="text-[var(--foreground)]">Kube</span>
          <span className="bg-gradient-to-r from-[#F08A42] to-[#FFB077] bg-clip-text text-transparent">
            View
          </span>
        </div>
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          Local-first Kubernetes workspace
        </p>

        <div className="mt-8 h-[3px] w-56 overflow-hidden rounded-full bg-[var(--border)]">
          <div className="splash-progress h-full w-full rounded-full bg-gradient-to-r from-[#F08A42] via-[#FF9E59] to-[#FFD0A8]" />
        </div>
        <div className="mt-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
          Preparing your workspace
        </div>
      </div>

      <div className="absolute bottom-7 z-10 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]/60">
        <span className="h-px w-6 bg-[var(--border)]" />
        KubeView Engine
        <span className="h-px w-6 bg-[var(--border)]" />
      </div>
    </div>
  );
}
