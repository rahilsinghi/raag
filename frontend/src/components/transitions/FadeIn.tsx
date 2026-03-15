"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  blur?: boolean;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = "up",
  distance = 12,
  blur = false,
}: FadeInProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const directionOffset = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        ...directionOffset[direction],
        ...(blur ? { filter: "blur(4px)" } : {}),
      }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        ...(blur ? { filter: "blur(0px)" } : {}),
      }}
      transition={{
        type: "tween",
        ease: [0.16, 1, 0.3, 1],
        duration,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
