import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const normalizeToken = (value) => {
    if (!value || value === "null" || value === "undefined") return null;
    if (typeof value === "string" && !value.includes(".")) return null;
    return value;
  };

  const [token, setToken] = useState(() => normalizeToken(localStorage.getItem("token")));
  const [admin, setAdmin] = useState(() => {
    const raw = localStorage.getItem("admin");
    return raw ? JSON.parse(raw) : null;
  });

  const login = ({ token: accessToken, admin: currentAdmin }) => {
    const safeToken = normalizeToken(accessToken);
    setToken(safeToken);
    setAdmin(currentAdmin);
    if (safeToken) {
      localStorage.setItem("token", safeToken);
    } else {
      localStorage.removeItem("token");
    }
    localStorage.setItem("admin", JSON.stringify(currentAdmin));
  };

  const logout = () => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    localStorage.removeItem("eduvylix_student_id");
  };

  const value = useMemo(
    () => ({ token, admin, isAuthenticated: Boolean(token), login, logout }),
    [token, admin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
