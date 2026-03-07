"use client";

import { useState } from "react";
import type { BarResult, BarDescription } from "@/lib/types";
import { getRhymeColor } from "@/lib/rhyme-constants";
import { MC_STYLES, ANNOTATION_STYLES } from "@/lib/constants";
import { ChevronDown, Sparkles, Loader2 } from "lucide-react";

interface Props {
  bar: BarResult;
  isActive: boolean;
  onDescribe: (barId: string) => Promise<BarDescription | null>;
  description: BarDescription | null;
}

export function DeepDiveBar({ bar, isActive, onDescribe, description }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const mc = bar.mc ? MC_STYLES[bar.mc] : null;
  const hasAnnotations = bar.annotations.length > 0;
  const hasDetail = hasAnnotations || bar.punchline_explanation || description;

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!description) {
      setLoading(true);
      await onDescribe(bar.id);
      setLoading(false);
    }
  };

  return (
    <div
      className={`group relative transition-all duration-300 rounded-lg ${
        isActive
          ? "bg-white/[0.06] shadow-[0_0_20px_rgba(217,29,28,0.08)]"
          : expanded
            ? "bg-white/[0.03]"
            : "hover:bg-white/[0.02]"
      }`}
    >
      {/* MC color left border */}
      <div
        className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-full transition-opacity ${
          isActive ? "opacity-100" : mc ? "opacity-30 group-hover:opacity-60" : "opacity-0"
        }`}
        style={{
          backgroundColor: mc
            ? bar.mc === "Encore" ? "#34d399" : "#fbbf24"
            : "#d91d1c33",
        }}
      />

      <div className="pl-5 pr-3 py-2">
        {/* Bar text + controls row */}
        <div className="flex items-start gap-2">
          <button
            onClick={handleExpand}
            className="text-left flex-1 min-w-0"
          >
            <p
              className={`text-[14px] leading-relaxed transition-colors ${
                isActive ? "text-white font-medium" : "text-white/70"
              }`}
            >
              {renderRhymeText(bar.text, bar.rhyme_words || [], isActive)}
            </p>
          </button>

          {/* Describe button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExpand();
            }}
            className={`shrink-0 mt-1 p-1.5 rounded-lg transition-all ${
              description
                ? "text-[#d91d1c]/60"
                : loading
                  ? "text-white/20"
                  : "text-white/10 hover:text-[#d91d1c]/50 hover:bg-white/[0.04]"
            }`}
            title="Describe this bar"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
          </button>

          {hasDetail && (
            <ChevronDown
              className={`w-3.5 h-3.5 text-white/15 shrink-0 mt-1.5 transition-transform duration-300 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          )}
        </div>

        {/* Annotation badges */}
        {hasAnnotations && (
          <div className="flex flex-wrap gap-1.5 mt-1.5 ml-0">
            {bar.annotations.map((ann) => {
              const style = ANNOTATION_STYLES[ann];
              return style ? (
                <span
                  key={ann}
                  className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${style.bg} ${style.text}`}
                >
                  {ann.replace(/_/g, " ")}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Expanded detail panel */}
        {expanded && (
          <div className="mt-3 ml-0 pl-3 border-l-2 border-white/[0.06] space-y-2.5 animate-fade-in-up">
            {loading && !description ? (
              <p className="text-[12px] text-white/30 animate-pulse">Analyzing this bar...</p>
            ) : description ? (
              <>
                {description.translation && (
                  <p className="text-[13px] text-white/50 italic leading-relaxed">
                    &ldquo;{description.translation}&rdquo;
                  </p>
                )}
                <p className="text-[13px] text-white/65 leading-relaxed">
                  {description.meaning}
                </p>
                {description.wordplay && (
                  <p className="text-[12px] text-white/50 leading-relaxed">
                    <span className="text-emerald-400/80 font-semibold">Wordplay: </span>
                    {description.wordplay}
                  </p>
                )}
                {description.cultural_references.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {description.cultural_references.map((ref, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/80 border border-amber-500/15"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                )}
                {description.flow_notes && (
                  <p className="text-[12px] text-white/45 leading-relaxed">
                    <span className="text-rose-400/80 font-semibold">Flow: </span>
                    {description.flow_notes}
                  </p>
                )}
                {description.song_context && (
                  <p className="text-[12px] text-white/45 leading-relaxed">
                    <span className="text-blue-400/80 font-semibold">Context: </span>
                    {description.song_context}
                  </p>
                )}
                <p className="text-[11px] text-white/30 italic border-t border-white/[0.04] pt-2 mt-2">
                  {description.tldr}
                </p>
              </>
            ) : bar.punchline_explanation ? (
              <p className="text-[13px] text-white/55 leading-relaxed">
                <span className="text-[#d91d1c]/70 font-semibold">Punchline: </span>
                {bar.punchline_explanation}
              </p>
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

    if (rw.start_char > lastEnd) {
      parts.push(<span key={`t${i}`}>{text.slice(lastEnd, rw.start_char)}</span>);
    }

    parts.push(
      <span
        key={`r${i}`}
        className="font-semibold rounded-[3px] px-[3px] py-[1px] mx-[1px] inline-block leading-tight"
        style={{
          color: "#fff",
          backgroundColor: isActive ? `${color}60` : `${color}35`,
          boxShadow: isActive ? `0 0 8px ${color}30` : "none",
        }}
        title={`Rhyme group ${rw.group}`}
      >
        {text.slice(rw.start_char, rw.end_char)}
      </span>
    );

    lastEnd = rw.end_char;
  }

  if (lastEnd < text.length) {
    parts.push(<span key="end">{text.slice(lastEnd)}</span>);
  }

  return <>{parts}</>;
}
