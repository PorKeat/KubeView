"use client";

import * as React from "react";
import Link from "next/link";
import { NotFoundState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="h-screen w-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
      <NotFoundState
        title="Page Not Found (404)"
        message="The requested route does not exist in KubeView."
        resourceKind="Route"
      />
    </div>
  );
}
