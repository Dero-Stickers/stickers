import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserProfile, UserProfileDemoStatus, setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "sticker_token";
const USER_KEY = "sticker_user";

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: UserProfile, token: string) => void;
  logout: () => void;
  demoStatus: UserProfileDemoStatus | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Synchronously hydrate from localStorage so Protected routes don't
// flash to /login on deep-link / hard refresh.
function readInitialAuth(): { user: UserProfile | null; authenticated: boolean } {
  if (typeof window === "undefined") return { user: null, authenticated: false };
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const stored = localStorage.getItem(USER_KEY);
    if (!token || !stored) return { user: null, authenticated: false };
    const user = JSON.parse(stored) as UserProfile;
    return { user, authenticated: true };
  } catch {
    return { user: null, authenticated: false };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = readInitialAuth();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(initial.user);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initial.authenticated);
  const [isLoading, setIsLoading] = useState<boolean>(initial.authenticated);

  // Configure token getter for all API calls
  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));
  }, []);

  // Refresh user data from server in background after initial mount.
  // Scoped via AbortController so a stale response from a previous token
  // (e.g. after user switch) cannot overwrite newer auth state.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !isAuthenticated) {
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async r => {
        // Only clear session on explicit auth failures.
        // For 5xx / network errors, keep the existing session.
        if (r.status === 401 || r.status === 403) {
          // Make sure we are still on the same token before clearing
          if (localStorage.getItem(TOKEN_KEY) === token) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setCurrentUser(null);
            setIsAuthenticated(false);
          }
          return;
        }
        if (!r.ok) return; // transient error — keep session
        const fresh = (await r.json()) as UserProfile;
        // Guard: only apply if the active token is still the same one
        // we asked /me with. Prevents stale responses from overwriting
        // a newer login.
        if (fresh && localStorage.getItem(TOKEN_KEY) === token) {
          setCurrentUser(fresh);
          localStorage.setItem(USER_KEY, JSON.stringify(fresh));
        }
      })
      .catch(() => {
        // network error or aborted — keep current session
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (user: UserProfile, token: string) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        login,
        logout,
        demoStatus: currentUser?.demoStatus ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
