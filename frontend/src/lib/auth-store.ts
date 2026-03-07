import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import {
  loginUser,
  registerUser,
  refreshAuthToken,
  fetchCurrentUser,
} from "./api";

interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

interface AuthState {
  // Auth
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number; // ms timestamp
  isAuthenticated: boolean;
  user: User | null;

  // UI
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  getValidToken: () => Promise<string | null>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: 0,
      isAuthenticated: false,
      user: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const tokens = await loginUser(email, password);
          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: Date.now() + tokens.expires_in * 1000,
            isAuthenticated: true,
          });
          // Fetch user profile
          await get().loadUser();
          toast.success("Logged in");
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Login failed";
          toast.error(msg);
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email, password, displayName) => {
        set({ isLoading: true });
        try {
          const tokens = await registerUser(email, password, displayName);
          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: Date.now() + tokens.expires_in * 1000,
            isAuthenticated: true,
          });
          await get().loadUser();
          toast.success("Account created");
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Registration failed";
          toast.error(msg);
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          expiresAt: 0,
          isAuthenticated: false,
          user: null,
        });
        toast.success("Logged out");
      },

      getValidToken: async () => {
        const { accessToken, refreshToken, expiresAt } = get();
        if (!accessToken || !refreshToken) return null;

        // Refresh if expiring within 60s
        if (Date.now() > expiresAt - 60_000) {
          try {
            const data = await refreshAuthToken(refreshToken);
            set({
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiresAt: Date.now() + data.expires_in * 1000,
            });
            return data.access_token;
          } catch {
            toast.error("Session expired — please log in again");
            set({ isAuthenticated: false, accessToken: null, user: null });
            return null;
          }
        }
        return accessToken;
      },

      loadUser: async () => {
        const token = await get().getValidToken();
        if (!token) return;
        try {
          const user = await fetchCurrentUser(token);
          set({ user });
        } catch {
          // Token might be invalid
          set({ isAuthenticated: false, accessToken: null, user: null });
        }
      },
    }),
    {
      name: "raag-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);
