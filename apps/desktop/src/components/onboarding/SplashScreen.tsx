"use client";

import * as React from "react";
import Image from "next/image";
import { Terminal, Shield, Cpu, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { cn } from "@/lib/utils";

const BOOT_STEPS = [
  { label: "Spawning client-go daemon runtime", delay: 200 },
  { label: "Validating JSON-RPC 2.0 stdio pipes", delay: 600 },
  { label: "Discovering local ~/.kube cluster profiles", delay: 1100 },
  { label: "Workspace initialized & ready", delay: 1550 },
];

export function SplashScreen() {
  const {
    splashDismissed,
    setSplashDismissed,
    availableContexts,
    openKubeconfigModal,
  } = useClusterStore();

  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(15);
  const [isFadingOut, setIsFadingOut] = React.useState(false);

  React.useEffect(() => {
    // Progress timers
    const timer1 = setTimeout(() => {
      setCurrentStepIndex(1);
      setProgress(45);
    }, 450);

    const timer2 = setTimeout(() => {
      setCurrentStepIndex(2);
      setProgress(78);
    }, 1000);

    const timer3 = setTimeout(() => {
      setCurrentStepIndex(3);
      setProgress(100);
    }, 1500);

    const finishTimer = setTimeout(() => {
      handleComplete();
    }, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(finishTimer);
    };
  }, []);

  const handleComplete = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setSplashDismissed(true);

      // Check if this is the first open or if no contexts are configured
      try {
        const hasOpened = localStorage.getItem("kubeview_splash_seen");
        if (!hasOpened || availableContexts.length === 0) {
          localStorage.setItem("kubeview_splash_seen", "true");
          // Open the kubeconfig modal to guide the user immediately
          openKubeconfigModal("browse");
        }
      } catch (e) {
        // Fallback if localStorage is inaccessible
        if (availableContexts.length === 0) {
          openKubeconfigModal("browse");
        }
      }
    }, 400);
  };

  if (splashDismissed) {
    return null;
  }

  return (
    <div
      onClick={handleComplete}
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center select-none bg-[var(--background)] transition-opacity duration-400 cursor-pointer overflow-hidden",
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* Background glow effects */}
      <div className="absolute w-[600px] h-[600px] bg-[#F08A42]/12 rounded-full blur-[130px] pointer-events-none -top-20" />
      <div className="absolute w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-[110px] pointer-events-none -bottom-20" />

      {/* Cyber Grid Pattern Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#F08A42_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.06] dark:opacity-[0.12] pointer-events-none" />

      {/* Center Branding Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex flex-col items-center max-w-sm w-full mx-6 p-8 rounded-3xl glass-panel border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
      >
        {/* Animated Brand Logo Icon with Concentric Pulse Ring */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-2xl bg-[#F08A42]/30 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#F08A42]/20 via-[#FF9E59]/10 to-transparent border border-[#F08A42]/40 flex items-center justify-center shadow-lg shadow-[#F08A42]/15">
            <Image
              src="/logo-mark.png"
              alt="KubeView"
              width={54}
              height={54}
              priority
              className="drop-shadow-[0_4px_16px_rgba(240,138,66,0.4)] animate-[bounce_4s_infinite]"
            />
          </div>
          {/* Outer ring */}
          <div className="absolute -inset-2.5 rounded-3xl border border-[#F08A42]/20 pointer-events-none animate-spin [animation-duration:15s]" />
        </div>

        {/* Title & Tagline */}
        <div className="text-center mb-6 space-y-1">
          <div className="flex items-center justify-center gap-1.5 font-bold tracking-tight text-2xl">
            <span className="text-[var(--foreground)]">Kube</span>
            <span className="bg-gradient-to-r from-[#F08A42] to-[#FF9E59] bg-clip-text text-transparent">View</span>
          </div>
          <p className="text-[11px] text-[var(--muted)] font-medium tracking-wide uppercase">
            Kubernetes Operations Desktop
          </p>
        </div>

        {/* Dynamic Boot Step Loader */}
        <div className="w-full space-y-3 mb-6">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--muted)]">
            <span className="flex items-center gap-1.5 text-[var(--foreground)]">
              <Zap className="w-3.5 h-3.5 text-[#F08A42] animate-pulse" />
              <span className="truncate max-w-[210px]">{BOOT_STEPS[currentStepIndex].label}</span>
            </span>
            <span className="text-[#F08A42] font-semibold">{progress}%</span>
          </div>

          {/* Progress Bar with Glow */}
          <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden p-[1px]">
            <div
              className="h-full bg-gradient-to-r from-[#F08A42] to-[#FF9E59] rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(240,138,66,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Skip button / Footer hint */}
        <button
          onClick={handleComplete}
          className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1 transition-colors group cursor-pointer"
        >
          <span>Click anywhere to start</span>
          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Bottom Version Details */}
      <div className="absolute bottom-6 flex items-center gap-3 text-[10px] font-mono text-[var(--muted)]">
        <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)]">
          ENGINE: Go v1.34 Client
        </span>
        <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)]">
          TAURI 2.2 IPC
        </span>
      </div>
    </div>
  );
}
