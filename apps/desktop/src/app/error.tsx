"use client";

import * as React from "react";
import { ErrorState } from "@/components/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-screen w-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-6">
      <ErrorState
        title="Application Exception Encountered"
        message="An unexpected runtime error occurred within the desktop shell. You can attempt recovery below."
        code={error.digest ? `NEXTJS_ERROR_${error.digest.slice(0, 8)}` : "NEXTJS_APP_EXCEPTION"}
        details={error}
        onRetry={reset}
      />
    </div>
  );
}
