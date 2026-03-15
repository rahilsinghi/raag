"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface Props {
  albumArt: string | null;
  songTitle: string;
  albumTitle: string;
  energy?: number | null;
}

export function HeroBackground({ albumArt, songTitle, albumTitle, energy }: Props) {
  const energyIntensity = energy ? Math.min(energy * 0.12, 0.12) : 0.04;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Blurred album art background */}
      {albumArt && (
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={albumArt}
            alt={albumTitle}
            fill
            className="object-cover"
            style={{ filter: "blur(80px) saturate(150%)" }}
            priority
          />
          {/* Darken overlay */}
          <div className="absolute inset-0 bg-[#050505]/85" />
        </motion.div>
      )}

      {/* Energy-based red ambient glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
        style={{
          background: `radial-gradient(ellipse at center, rgba(217, 29, 28, ${energyIntensity}) 0%, transparent 70%)`,
        }}
      />

      {/* Bottom fade to solid black */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent" />
    </div>
  );
}
