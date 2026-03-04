"use client";

import { useState } from "react";
import type { BarResult, BarDescription } from "@/lib/types";
import { getRhymeColor } from "@/lib/rhyme-constants";
import { ANNOTATION_STYLES, MC_STYLES } from "@/lib/constants";
import { ChevronDown, ChevronUp } from "lucide-react";

interface RhymeBarProps {
  bar: BarResult;
  isActive: boolean;
  onDescribe?: (barId: string) => Promise<BarDescription | null>;
}

export function RhymeBar({ bar, isActive, onDescribe }: RhymeBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState<BarDescription | null>(null);
  const [loading, setLoading] = useState(false);

  const mc = bar.mc ? MC_STYLES[bar.mc] : null;
  const hasAnnotations = bar.annotations.length > 0;

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!description && onDescribe) {
      setLoading(true);
      const desc = await onDescribe(bar.id);
      setDescription(desc);
      setLoading(false);
    }
  };

  return (
    <div
      className={`group relative transition-all duration-300 ${
        isActive
          ? "bg-white/[0.06] scale-[1.01]"
          : "hover:bg-white/[0.02]"
      }`}
    >
      {/* MC color indicator */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-full transition-opacity ${
          isActive ? "opacity-100" : "opacity-40"
        }`}
        style={{ backgroundColor: mc ? (bar.mc === "Encore" ? "#34d399" : "#fbbf24") : "#d91d1c33" }}
      />

      <div className="pl-4 pr-2 py-1.5">
        {/* Bar text with rhyme coloring */}
        <button
          onClick={handleExpand}
          className="text-left w-full flex items-start gap-2"
        >
          <p
            className={`text-[13px] leading-relaxed flex-1 transition-colors ${
              isActive ? "text-white" : "text-white/70"
            }`}
          >
            {renderRhymeText(bar.text, bar.rhyme_words || [], isActive)}
          </p>

          {(hasAnnotations || bar.punchline_explanation) && (
            <span className="shrink-0 mt-0.5 text-white/20">
              {expanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </span>
          )}
        </button>

        {/* Annotation badges */}
        {hasAnnotations && (
          <div className="flex flex-wrap gap-1 mt-1">
            {bar.annotations.map((ann) => {
              const style = ANNOTATION_STYLES[ann];
              return style ? (
                <span
                  key={ann}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider ${style.bg} ${style.text}`}
                >
                  {ann.replace("_", " ")}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Expanded description */}
        {expanded && (
          <div className="mt-2 pl-2 border-l border-white/[0.06] space-y-1.5">
            {loading ? (
              <p className="text-[11px] text-white/30 animate-pulse">Analyzing...</p>
            ) : description ? (
              <>
                {description.translation && (
                  <p className="text-[11px] text-white/50 italic">
                    {description.translation}
                  </p>
                )}
                <p className="text-[11px] text-white/60">{description.meaning}</p>
                {description.wordplay && (
                  <p className="text-[10px] text-emerald-400/70">
                    Wordplay: {description.wordplay}
                  </p>
                )}
                {description.cultural_references.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {description.cultural_references.map((ref, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded text-[8px] bg-amber-500/10 text-amber-400/80"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : bar.punchline_explanation ? (
              <p className="text-[11px] text-white/50">{bar.punchline_explanation}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/** Render bar text with color-coded rhyme word highlights */
function renderRhymeText(
  text: string,
  rhymeWords: { word: string; start_char: number; end_char: number; group: string }[],
  isActive: boolean
) {
  if (!rhymeWords.length) return text;

  const sorted = [...rhymeWords].sort((a, b) => a.start_char - b.start_char);
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < sorted.length; i++) {
    const rw = sorted[i];
    const color = getRhymeColor(rw.group);

    // Non-rhyming text before this word
    if (rw.start_char > lastEnd) {
      parts.push(
        <span key={`t${i}`}>{text.slice(lastEnd, rw.start_char)}</span>
      );
    }

    // Highlighted rhyme word — colored background box like the reference image
    parts.push(
      <span
        key={`r${i}`}
        className="font-semibold rounded-[3px] px-[3px] py-[1px] mx-[1px] inline-block leading-tight"
        style={{
          color: isActive ? "#fff" : "#fff",
          backgroundColor: isActive ? `${color}60` : `${color}35`,
          boxShadow: isActive ? `0 0 6px ${color}30` : "none",
        }}
        title={`Rhyme group ${rw.group}`}
      >
        {text.slice(rw.start_char, rw.end_char)}
      </span>
    );

    lastEnd = rw.end_char;
  }

  // Remaining text
  if (lastEnd < text.length) {
    parts.push(<span key="end">{text.slice(lastEnd)}</span>);
  }

  return <>{parts}</>;
}
