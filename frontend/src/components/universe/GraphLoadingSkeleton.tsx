"use client";

import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

export function GraphLoadingSkeleton() {
  return (
    <div className="fixed inset-0 bg-[#050505] flex items-center justify-center z-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease }}
        className="flex flex-col items-center gap-6"
      >
        {/* Orbiting constellation */}
        <div className="relative w-32 h-32">
          {/* Orbiting dots */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const r = 40 + (i % 3) * 10;
            const x = 64 + Math.cos(angle) * r;
            const y = 64 + Math.sin(angle) * r;
            return (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-[#d91d1c]"
                style={{ left: x, top: y }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            );
          })}

          {/* Connecting lines (subtle) */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 128 128">
            {[0, 2, 4, 6].map((i) => {
              const a1 = (i / 8) * Math.PI * 2;
              const a2 = ((i + 3) / 8) * Math.PI * 2;
              const r1 = 40 + (i % 3) * 10;
              const r2 = 40 + ((i + 3) % 3) * 10;
              return (
                <motion.line
                  key={i}
                  x1={64 + Math.cos(a1) * r1}
                  y1={64 + Math.sin(a1) * r1}
                  x2={64 + Math.cos(a2) * r2}
                  y2={64 + Math.sin(a2) * r2}
                  stroke="#d91d1c"
                  strokeWidth={0.5}
                  animate={{ opacity: [0.05, 0.15, 0.05] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                />
              );
            })}
          </svg>

          {/* Center pulse */}
          <motion.div
            className="absolute w-3 h-3 rounded-full bg-[#d91d1c] left-[62px] top-[62px]"
            animate={{
              scale: [1, 1.4, 1],
              boxShadow: [
                "0 0 0px rgba(217,29,28,0.3)",
                "0 0 20px rgba(217,29,28,0.5)",
                "0 0 0px rgba(217,29,28,0.3)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease }}
          className="flex flex-col items-center gap-1"
        >
          <p className="font-maut text-sm font-extrabold tracking-wider text-white/60">
            MAPPING UNIVERSE
          </p>
          <div className="flex items-center gap-2 mt-1">
            {/* Mini waveform */}
            <div className="flex items-end gap-[2px] h-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-[2px] rounded-full bg-[#d91d1c]/50"
                  animate={{ height: [3, 10, 3] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            <p className="text-[10px] text-white/25 tracking-widest uppercase">
              Loading graph data
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
