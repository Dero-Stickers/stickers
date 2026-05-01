import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserProfile, UserProfileDemoStatus } from "@workspace/api-client-react";
import { mockCurrentUser } from "../mock/users";

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  login: (user: UserProfile) => void;
  logout: () => void;
  demoStatus: UserProfileDemoStatus | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const stored = localStorage.getItem("sticker_user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const login = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem("sticker_user", JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("sticker_user");
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
