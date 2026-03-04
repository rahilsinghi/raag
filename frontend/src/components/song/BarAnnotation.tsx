"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { BarResult } from "@/lib/types";
import { ChevronDown } from "lucide-react";

interface Props {
  bar: BarResult;
}

const MC_STYLES: Record<
  string,
  { border: string; text: string; bg: string; dot: string }
> = {
  Encore: {
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    bg: "bg-emerald-500/[0.06]",
    dot: "bg-emerald-400",
  },
  Calm: {
    border: "border-amber-500/20",
    text: "text-amber-400",
    bg: "bg-amber-500/[0.06]",
    dot: "bg-amber-400",
  },
};

const ANNOTATION_STYLES: Record<
  string,
  { bg: string; text: string }
> = {
  punchline: { bg: "bg-[#d91d1c]/10", text: "text-[#d91d1c]/90" },
  callback: { bg: "bg-blue-500/10", text: "text-blue-400/90" },
  cultural_reference: { bg: "bg-amber-500/10", text: "text-amber-400/90" },
  wordplay: { bg: "bg-emerald-500/10", text: "text-emerald-400/90" },
  flow_switch: { bg: "bg-rose-500/10", text: "text-rose-400/90" },
  key_bar: { bg: "bg-orange-500/10", text: "text-orange-400/90" },
};

export function BarAnnotation({ bar }: Props) {
  const [expanded, setExpanded] = useState(false);
  const mc = MC_STYLES[bar.mc ?? ""];
  const hasDetail = bar.punchline_explanation || bar.reference_target;
  const hasAnnotations = bar.annotations && bar.annotations.length > 0;

  return (
    <div
      className={`rounded-lg border transition-all duration-300 ${
        hasAnnotations
          ? `${mc?.border || "border-[#d91d1c]/15"} ${mc?.bg || "bg-[#d91d1c]/[0.03]"}`
          : "border-white/[0.04] bg-white/[0.01]"
      } ${hasDetail ? "cursor-pointer hover:border-white/[0.12]" : ""}`}
      onClick={() => hasDetail && setExpanded(!expanded)}
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

          {/* Expand indicator */}
          {hasDetail && (
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

      {/* Expanded explanation */}
      {expanded && hasDetail && (
        <div className="px-3 pb-2.5 pt-0 animate-fade-in-up">
          <div className="border-t border-white/[0.04] pt-2 space-y-1.5">
            {bar.punchline_explanation && (
              <p className="text-xs text-white/45 leading-relaxed">
                <span className="text-[#d91d1c]/70 font-semibold">
                  Punchline:{" "}
                </span>
                {bar.punchline_explanation}
              </p>
            )}
            {bar.reference_target && (
              <p className="text-xs text-white/45 leading-relaxed">
                <span className="text-amber-400/70 font-semibold">
                  References:{" "}
                </span>
                {bar.reference_target}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
