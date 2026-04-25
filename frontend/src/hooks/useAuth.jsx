import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [admin, setAdmin] = useState(() => {
    const raw = localStorage.getItem("admin");
    return raw ? JSON.parse(raw) : null;
  });

  const login = ({ token: accessToken, admin: currentAdmin }) => {
    setToken(accessToken);
    setAdmin(currentAdmin);
    localStorage.setItem("token", accessToken);
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
