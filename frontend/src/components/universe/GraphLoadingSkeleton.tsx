"use client";

export function GraphLoadingSkeleton() {
  return (
    <div className="fixed inset-0 bg-[#050505] flex items-center justify-center z-20">
      <div className="flex flex-col items-center gap-6">
        {/* Pulsing constellation dots */}
        <div className="relative w-32 h-32">
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const r = 40 + (i % 3) * 10;
            const x = 64 + Math.cos(angle) * r;
            const y = 64 + Math.sin(angle) * r;
            return (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-[#d91d1c] animate-pulse"
                style={{
                  left: x,
                  top: y,
                  animationDelay: `${i * 0.15}s`,
                  opacity: 0.3 + (i % 3) * 0.2,
                }}
              />
            );
          })}
          {/* Center dot */}
          <div className="absolute w-3 h-3 rounded-full bg-[#d91d1c] animate-pulse left-[62px] top-[62px]" />
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="font-maut text-sm font-extrabold tracking-wider text-white/60">
            MAPPING UNIVERSE
          </p>
          <p className="text-[10px] text-white/25 tracking-widest uppercase">
            Loading graph data...
          </p>
        </div>
      </div>
    </div>
  );
}
