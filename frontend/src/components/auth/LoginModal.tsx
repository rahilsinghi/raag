"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  const { login, register, isLoading } = useAuthStore();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      try {
        if (mode === "login") {
          await login(email, password);
        } else {
          await register(email, password, displayName || undefined);
        }
        onClose();
        setEmail("");
        setPassword("");
        setDisplayName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    },
    [mode, email, password, displayName, login, register, onClose]
  );

  const toggleMode = useCallback(() => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError("");
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.35, ease }}
            className="relative z-10 w-full max-w-sm mx-4 glass-card rounded-2xl p-6 border border-white/[0.08]"
          >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="font-maut text-lg font-extrabold tracking-wider text-white mb-1">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h2>
        <p className="text-xs text-white/40 mb-6">
          {mode === "login"
            ? "Sign in to save your conversations"
            : "Join to save chats and build playlists"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none"
              autoComplete="name"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="glass-input w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none"
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="glass-input w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-[#d91d1c] hover:bg-[#ef2e2d] text-white text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-center text-xs text-white/30 mt-4">
          {mode === "login" ? "No account? " : "Already have one? "}
          <button
            onClick={toggleMode}
            className="text-[#d91d1c] hover:text-[#ef2e2d] transition-colors"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
