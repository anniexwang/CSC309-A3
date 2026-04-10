import { createContext, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "auth_session";

function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session.token) return null;
    return session;
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

const AuthContext = createContext({
  token: "",
  role: "",
  accountId: null,
  email: "",
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);

  const value = useMemo(() => {
    const login = (token) => {
      const decoded = decodeJwtPayload(token);
      const next = {
        token,
        role: decoded?.role || "",
        accountId: decoded?.id ?? null,
        email: decoded?.email || "",
      };
      setSession(next);
      saveSession(next);
    };

    const logout = () => {
      setSession(null);
      saveSession(null);
    };

    return {
      token: session?.token || "",
      role: session?.role || "",
      accountId: session?.accountId ?? null,
      email: session?.email || "",
      isAuthenticated: Boolean(session?.token),
      login,
      logout,
    };
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
