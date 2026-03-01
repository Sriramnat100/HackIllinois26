import { createContext, useContext, useState, useEffect } from "react";

const AUTH_KEY = "cat_inspect_user";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) setUser(stored);
    setReady(true);
  }, []);

  const login = (username) => {
    const name = (username || "").trim() || "User";
    setUser(name);
    localStorage.setItem(AUTH_KEY, name);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    ready,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
