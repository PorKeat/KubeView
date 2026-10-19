"use client";

import * as React from "react";
import Image from "next/image";
import { useClusterStore } from "@/stores/clusterStore";
import { cn } from "@/lib/utils";

export function SplashScreen() {
  const {
    splashDismissed,
    setSplashDismissed,
    availableContexts,
    openKubeconfigModal,
  } = useClusterStore();

  const [isFadingOut, setIsFadingOut] = React.useState(false);

  React.useEffect(() => {
    try {
      if (localStorage.getItem("kubeview_splash_seen") === "true") {
        setSplashDismissed(true);
        return;
      }
    } catch {}

    // Quick, clean auto-dismissal after 1.1s
    const timer = setTimeout(() => {
      handleComplete();
    }, 1100);

    return () => clearTimeout(timer);
  }, []);

  const handleComplete = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setSplashDismissed(true);

      // On first launch when clean slate, open Kubeconfig modal
      try {
        const hasOpened = localStorage.getItem("kubeview_splash_seen");
        if (!hasOpened && availableContexts.length === 0) {
          localStorage.setItem("kubeview_splash_seen", "true");
          openKubeconfigModal("browse");
        } else {
          localStorage.setItem("kubeview_splash_seen", "true");
        }
      } catch (e) {
        if (availableContexts.length === 0) {
          openKubeconfigModal("browse");
        }
      }
    }, 350);
  };

  if (splashDismissed) {
    return null;
  }

  return (
    <div
      onClick={handleComplete}
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center select-none bg-[var(--background)] cursor-pointer transition-opacity duration-350 ease-out",
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* Subtle, soft ambient glow behind brand */}
      <div className="absolute w-72 h-72 bg-[#F08A42]/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Floating Center Brand Identity */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Logo Mark */}
        <div className="relative w-14 h-14 flex items-center justify-center drop-shadow-[0_4px_20px_rgba(240,138,66,0.3)]">
          <Image
            src="/logo-mark.png"
            alt="KubeView"
            width={52}
            height={52}
            priority
            className="select-none object-contain transition-transform duration-500 ease-out scale-100"
          />
        </div>

        {/* Wordmark */}
        <div className="font-bold tracking-tight text-xl select-none">
          <span className="text-[var(--foreground)]">Kube</span>
          <span className="bg-gradient-to-r from-[#F08A42] to-[#FF9E59] bg-clip-text text-transparent">
            View
          </span>
        </div>

        {/* Minimalist Micro Progress Bar */}
        <div className="w-20 h-[2px] bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-gradient-to-r from-[#F08A42] to-[#FF9E59] rounded-full animate-pulse w-full" />
        </div>
      </div>
    </div>
  );
}
