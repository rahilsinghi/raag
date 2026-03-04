"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { BarResult, BarDescription } from "@/lib/types";
import { MC_STYLES, ANNOTATION_STYLES } from "@/lib/constants";
import { describeBar } from "@/lib/api";
import { ChevronDown, Sparkles, Loader2 } from "lucide-react";

interface Props {
  bar: BarResult;
  cascadeIndex?: number;
}

export function BarAnnotation({ bar, cascadeIndex = 0 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState<BarDescription | null>(null);
  const [loadingDesc, setLoadingDesc] = useState(false);
  const mc = MC_STYLES[bar.mc ?? ""];
  const hasDetail = bar.punchline_explanation || bar.reference_target;
  const hasAnnotations = bar.annotations && bar.annotations.length > 0;

  const handleDescribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (description || loadingDesc) return;
    setLoadingDesc(true);
    setExpanded(true);
    try {
      const data = await describeBar(bar.id);
      setDescription(data);
    } catch (err) {
      console.error("Failed to describe bar:", err);
    } finally {
      setLoadingDesc(false);
    }
  };

  return (
    <div
      className={`rounded-lg border transition-all duration-300 animate-cascade-in ${
        hasAnnotations
          ? `${mc?.border || "border-[#d91d1c]/15"} ${mc?.bg || "bg-[#d91d1c]/[0.03]"}`
          : "border-white/[0.04] bg-white/[0.01]"
      } ${hasDetail || hasAnnotations ? "cursor-pointer hover:border-white/[0.12]" : ""}`}
      style={{ animationDelay: `${cascadeIndex * 0.06}s` }}
      onClick={() => (hasDetail || description) && setExpanded(!expanded)}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2.5">
          {/* MC indicator */}
          {bar.mc && mc && (
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${mc.dot}`} />
              <span className={`text-[10px] font-semibold ${mc.text}`}>
                {bar.mc}
              </span>
            </div>
          )}

          {/* Bar text */}
          <p
            className={`text-sm flex-1 leading-relaxed ${
              hasAnnotations ? "text-white/90" : "text-white/50"
            }`}
          >
            {bar.text}
          </p>

          {/* Describe button */}
          <button
            onClick={handleDescribe}
            className={`shrink-0 mt-0.5 p-1 rounded transition-colors ${
              description
                ? "text-[#d91d1c]/60"
                : loadingDesc
                  ? "text-white/20"
                  : "text-white/15 hover:text-[#d91d1c]/50"
            }`}
            title="Describe this bar"
          >
            {loadingDesc ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Expand indicator */}
          {(hasDetail || description) && (
            <ChevronDown
              className={`w-3.5 h-3.5 text-white/20 shrink-0 mt-1 transition-transform duration-300 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          )}
        </div>

        {/* Annotations */}
        {(hasAnnotations || bar.section) && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {bar.annotations?.map((ann) => {
              const style = ANNOTATION_STYLES[ann];
              return (
                <Badge
                  key={ann}
                  className={`text-[9px] font-semibold border-0 px-1.5 py-0 h-4 ${
                    style
                      ? `${style.bg} ${style.text}`
                      : "bg-white/[0.05] text-white/40"
                  }`}
                >
                  {ann.replace(/_/g, " ")}
                </Badge>
              );
            })}
            {bar.rhyme_group && (
              <span className="text-[9px] font-mono text-white/15 ml-auto">
                {bar.rhyme_group}
              </span>
            )}
            {bar.section && (
              <span className="text-[10px] text-white/25 ml-auto">
                {bar.section} · {bar.song_title}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (hasDetail || description) && (
        <div className="px-3 pb-2.5 pt-0 animate-fade-in-up">
          <div className="border-t border-white/[0.04] pt-2 space-y-1.5">
            {/* Existing annotation details */}
            {bar.punchline_explanation && !description && (
              <p className="text-xs text-white/45 leading-relaxed">
                <span className="text-[#d91d1c]/70 font-semibold">
                  Punchline:{" "}
                </span>
                {bar.punchline_explanation}
              </p>
            )}
            {bar.reference_target && !description && (
              <p className="text-xs text-white/45 leading-relaxed">
                <span className="text-amber-400/70 font-semibold">
                  References:{" "}
                </span>
                {bar.reference_target}
              </p>
            )}

            {/* Claude description */}
            {description && (
              <div className="space-y-2">
                {description.translation && (
                  <p className="text-xs text-white/50 italic leading-relaxed">
                    &ldquo;{description.translation}&rdquo;
                  </p>
                )}
                <p className="text-xs text-white/60 leading-relaxed">
                  {description.meaning}
                </p>
                {description.wordplay && (
                  <p className="text-xs text-white/45 leading-relaxed">
                    <span className="text-emerald-400/70 font-semibold">
                      Wordplay:{" "}
                    </span>
                    {description.wordplay}
                  </p>
                )}
                {description.cultural_references &&
                  description.cultural_references.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {description.cultural_references.map((ref, i) => (
                        <span
                          key={i}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/15"
                        >
                          {ref}
                        </span>
                      ))}
                    </div>
                  )}
                {description.flow_notes && (
                  <p className="text-xs text-white/40 leading-relaxed">
                    <span className="text-rose-400/70 font-semibold">
                      Flow:{" "}
                    </span>
                    {description.flow_notes}
                  </p>
                )}
                {description.song_context && (
                  <p className="text-xs text-white/40 leading-relaxed">
                    <span className="text-blue-400/70 font-semibold">
                      Context:{" "}
                    </span>
                    {description.song_context}
                  </p>
                )}
                <p className="text-[10px] text-white/30 italic border-t border-white/[0.03] pt-1.5 mt-1.5">
                  {description.tldr}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
