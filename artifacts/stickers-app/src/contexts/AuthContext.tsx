import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserProfile, UserProfileDemoStatus, setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "sticker_token";
const USER_KEY = "sticker_user";

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  login: (user: UserProfile, token: string) => void;
  logout: () => void;
  demoStatus: UserProfileDemoStatus | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Configure token getter for all API calls
  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));
  }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const stored = localStorage.getItem(USER_KEY);
    if (token && stored) {
      try {
        const user = JSON.parse(stored) as UserProfile;
        setCurrentUser(user);
        setIsAuthenticated(true);

        // Refresh user data from server in background
        fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.ok ? r.json() : null)
          .then((fresh: UserProfile | null) => {
            if (fresh) {
              setCurrentUser(fresh);
              localStorage.setItem(USER_KEY, JSON.stringify(fresh));
            }
          })
          .catch(() => {});
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
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
