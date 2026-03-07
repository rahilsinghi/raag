"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

export function UserMenu() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!user) return null;

  const initials = (user.display_name || user.email)
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-7 h-7 rounded-full bg-[#d91d1c]/20 border border-[#d91d1c]/30 flex items-center justify-center text-[10px] font-bold text-[#d91d1c] hover:bg-[#d91d1c]/30 transition-colors"
        title={user.email}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 glass-card rounded-xl border border-white/[0.08] py-1 z-50 animate-[scale-in_0.15s_ease-out]">
          <div className="px-3 py-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <UserIcon className="w-3.5 h-3.5 text-white/40" />
              <div className="min-w-0">
                {user.display_name && (
                  <p className="text-xs font-medium text-white truncate">
                    {user.display_name}
                  </p>
                )}
                <p className="text-[10px] text-white/40 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors flex items-center gap-2"
          >
            <LogOut className="w-3 h-3" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
