"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface AnimatedStatProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  /** If provided, animates a number count-up to this value */
  numericValue?: number;
  /** Suffix appended after the animated number (e.g., " BPM", "%") */
  suffix?: string;
  delay?: number;
}

export function AnimatedStat({
  icon: Icon,
  label,
  value,
  numericValue,
  suffix = "",
  delay = 0,
}: AnimatedStatProps) {
  const prefersReducedMotion = useReducedMotion();
  const [displayNum, setDisplayNum] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const shouldAnimate = numericValue != null && !prefersReducedMotion;

  useEffect(() => {
    if (!shouldAnimate || numericValue == null) return;

    const duration = 800; // ms
    const startDelay = delay * 1000;

    const timeout = setTimeout(() => {
      startRef.current = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startRef.current;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayNum(Math.round(eased * numericValue));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [shouldAnimate, numericValue, delay]);

  return (
    <motion.div
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 hover:bg-white/[0.04] hover:border-white/[0.06] transition-all duration-300"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-white/20" />
        <span className="text-[9px] uppercase tracking-wider text-white/20 font-semibold">
          {label}
        </span>
      </div>
      <span className="text-sm font-bold text-white/70 tabular-nums">
        {shouldAnimate ? `${displayNum}${suffix}` : value}
      </span>
    </motion.div>
  );
}
