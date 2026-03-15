"use client";

import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/transitions/PageTransition";
import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <PageTransition className="h-full">{children}</PageTransition>
    </AnimatePresence>
  );
}
