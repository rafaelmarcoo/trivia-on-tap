"use client";

import { Suspense } from "react";
import MultiPlayerGame from "./component/MultiPlayerGame";

export default function MultiPlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
          <div className="animate-pulse text-[var(--color-fourth)] text-xl">
            Loading...
          </div>
        </div>
      }
    >
      <MultiPlayerGame />
    </Suspense>
  );
}
