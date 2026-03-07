"use client";

import { useEffect, useRef, useMemo } from "react";
import type { SongDetail, BarResult, BarDescription } from "@/lib/types";
import { MC_STYLES } from "@/lib/constants";
import { getRhymeColor } from "@/lib/rhyme-constants";
import { DeepDiveBar } from "./DeepDiveBar";

interface Props {
  song: SongDetail;
  activeBarIndex: number;
  onDescribe: (barId: string) => Promise<BarDescription | null>;
  describeCache: Record<string, BarDescription>;
  mode: "static" | "synced";
}

interface Section {
  name: string;
  mc: string | null;
  bars: BarResult[];
}

export function AnnotatedLyrics({ song, activeBarIndex, onDescribe, describeCache, mode }: Props) {
  const activeBarRef = useRef<HTMLDivElement>(null);

  // Group bars by section
  const sections = useMemo(() => {
    const result: Section[] = [];
    let current: Section | null = null;

    for (const bar of song.bars) {
      const sec = bar.section || "Unknown";
      if (!current || current.name !== sec) {
        current = { name: sec, mc: bar.mc, bars: [] };
        result.push(current);
      }
      current.bars.push(bar);
    }
    return result;
  }, [song.bars]);

  // Collect rhyme groups for the legend
  const rhymeGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const bar of song.bars) {
      for (const rw of bar.rhyme_words || []) {
        groups.add(rw.group);
      }
    }
    return Array.from(groups).sort();
  }, [song.bars]);

  // Auto-scroll to active bar in synced mode
  useEffect(() => {
    if (mode === "synced" && activeBarIndex >= 0 && activeBarRef.current) {
      activeBarRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [mode, activeBarIndex]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6">
      {/* Rhyme legend */}
      {rhymeGroups.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-white/[0.04]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/20 mr-2 self-center">
            Rhyme Groups
          </span>
          {rhymeGroups.slice(0, 14).map((g) => (
            <span
              key={g}
              className="flex items-center gap-1 text-[10px] font-semibold"
              style={{ color: getRhymeColor(g) }}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: getRhymeColor(g) + "35" }}
              />
              {g}
            </span>
          ))}
          {rhymeGroups.length > 14 && (
            <span className="text-[10px] text-white/20 self-center">
              +{rhymeGroups.length - 14}
            </span>
          )}
        </div>
      )}

      {/* Sections */}
      {sections.map((section, sIdx) => {
        const mc = MC_STYLES[section.mc ?? ""];

        return (
          <div key={`${section.name}-${sIdx}`} className="mb-8">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-3">
              {section.mc && mc && (
                <div className={`w-2 h-2 rounded-full ${mc.dot}`} />
              )}
              <span
                className={`text-[11px] font-bold uppercase tracking-[0.15em] ${
                  mc?.text || "text-white/30"
                }`}
              >
                {section.name}
              </span>
              {section.mc && mc && (
                <span className={`text-[10px] font-semibold ${mc.text} opacity-60`}>
                  {section.mc}
                </span>
              )}
              <div className="flex-1 h-px bg-white/[0.04]" />
            </div>

            {/* Bars with rhyme margin */}
            <div className="space-y-0">
              {section.bars.map((bar) => {
                const isActive = bar.bar_index === activeBarIndex;
                return (
                  <div
                    key={bar.id}
                    ref={isActive ? activeBarRef : undefined}
                  >
                    <DeepDiveBar
                      bar={bar}
                      isActive={isActive}
                      onDescribe={onDescribe}
                      description={describeCache[bar.id] || null}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Bottom spacer */}
      <div className="h-20" />
    </div>
  );
}
