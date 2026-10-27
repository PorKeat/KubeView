"use client";

import * as React from "react";

export function useInspectorSlideTransition(isInspectorOpen: boolean) {
  // Smooth slide transition state
  const [isRendered, setIsRendered] = React.useState(isInspectorOpen);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    if (isInspectorOpen) {
      setIsRendered(true);
      const timer = setTimeout(() => {
        setIsMounted(true);
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setIsMounted(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isInspectorOpen]);

  return { isRendered, isMounted };
}
