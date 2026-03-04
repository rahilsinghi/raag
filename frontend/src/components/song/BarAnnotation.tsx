"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { BarResult } from "@/lib/types";
import { ChevronDown } from "lucide-react";

interface Props {
  bar: BarResult;
}

const MC_STYLES: Record<string, { border: string; text: string; bg: string; dot: string }> = {
  Encore: {
    border: "border-emerald-500/25",
    text: "text-emerald-400",
    bg: "bg-emerald-500/8",
    dot: "bg-emerald-400",
  },
  Calm: {
    border: "border-amber-500/25",
    text: "text-amber-400",
    bg: "bg-amber-500/8",
    dot: "bg-amber-400",
  },
};

const ANNOTATION_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  punchline: { bg: "bg-violet-500/15", text: "text-violet-300", icon: "P" },
  callback: { bg: "bg-blue-500/15", text: "text-blue-300", icon: "CB" },
  cultural_reference: { bg: "bg-amber-500/15", text: "text-amber-300", icon: "CR" },
  wordplay: { bg: "bg-emerald-500/15", text: "text-emerald-300", icon: "W" },
  flow_switch: { bg: "bg-rose-500/15", text: "text-rose-300", icon: "FS" },
  key_bar: { bg: "bg-orange-500/15", text: "text-orange-300", icon: "K" },
};

export function BarAnnotation({ bar }: Props) {
  const [expanded, setExpanded] = useState(false);
  const mc = MC_STYLES[bar.mc ?? ""];
  const hasDetail = bar.punchline_explanation || bar.reference_target;
  const hasAnnotations = bar.annotations && bar.annotations.length > 0;

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${
        hasAnnotations
          ? `${mc?.border || "border-primary/20"} ${mc?.bg || "bg-primary/5"}`
          : "border-border/40 bg-card/30"
      } ${hasDetail ? "cursor-pointer hover:border-primary/30" : ""}`}
      onClick={() => hasDetail && setExpanded(!expanded)}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2.5">
          {/* MC indicator */}
          {bar.mc && mc && (
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${mc.dot}`} />
              <span className={`text-[10px] font-medium ${mc.text}`}>
                {bar.mc}
              </span>
            </div>
          )}

          {/* Bar text */}
          <p className={`text-sm flex-1 leading-relaxed ${
            hasAnnotations ? "text-foreground" : "text-foreground/70"
          }`}>
            {bar.text}
          </p>

          {/* Expand indicator */}
          {hasDetail && (
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-1 transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          )}
        </div>

        {/* Annotations + metadata */}
        {(hasAnnotations || bar.section) && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {bar.annotations?.map((ann) => {
              const style = ANNOTATION_STYLES[ann];
              return (
                <Badge
                  key={ann}
                  className={`text-[9px] font-medium border-0 px-1.5 py-0 h-4 ${
                    style
                      ? `${style.bg} ${style.text}`
                      : "bg-zinc-500/15 text-zinc-400"
                  }`}
                >
                  {ann.replace(/_/g, " ")}
                </Badge>
              );
            })}
            {bar.rhyme_group && (
              <span className="text-[9px] font-mono text-muted-foreground/40 ml-auto">
                {bar.rhyme_group}
              </span>
            )}
            {bar.section && (
              <span className="text-[10px] text-muted-foreground/50 ml-auto">
                {bar.section} · {bar.song_title}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded explanation */}
      {expanded && hasDetail && (
        <div className="px-3 pb-2.5 pt-0">
          <div className="border-t border-border/30 pt-2 space-y-1.5">
            {bar.punchline_explanation && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-violet-400/70 font-medium">Punchline: </span>
                {bar.punchline_explanation}
              </p>
            )}
            {bar.reference_target && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-amber-400/70 font-medium">References: </span>
                {bar.reference_target}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
