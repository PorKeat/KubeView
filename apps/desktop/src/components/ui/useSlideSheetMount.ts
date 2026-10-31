"use client";

import * as React from "react";

// Keep this in sync with the `.slide-sheet` transition in globals.css.
const EXIT_DURATION_MS = 300;

/**
 * Local mount state for a slide-over sheet that is conditionally rendered by
 * its parent. The sheet slides out before the caller unmounts it.
 */
export function useSlideSheetMount(onClose: () => void) {
  const [isMounted, setIsMounted] = React.useState(false);
  const closeTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  React.useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  const requestClose = React.useCallback(() => {
    setIsMounted(false);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(onClose, EXIT_DURATION_MS);
  }, [onClose]);

  return { isMounted, requestClose };
}
