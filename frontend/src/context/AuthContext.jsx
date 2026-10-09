import { createContext, useContext, useEffect, useRef, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

const readStoredUser = () => {
  let stored = sessionStorage.getItem("kconnect_user");
  if (!stored) {
    // One-time migration for existing logins. Remove the shared token so other
    // tabs cannot accidentally make requests with this tab's account.
    stored = localStorage.getItem("kconnect_user");
    if (stored) {
      sessionStorage.setItem("kconnect_user", stored);
      localStorage.removeItem("kconnect_user");
    }
  }
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    sessionStorage.removeItem("kconnect_user");
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const authCheckVersion = useRef(0);
  const [user, setUser] = useState(readStoredUser);
  const [authReady, setAuthReady] = useState(() => {
    const stored = sessionStorage.getItem("kconnect_user");
    if (!stored) return true;
    try {
      return (JSON.parse(stored).role || "").toLowerCase() !== "member";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handleLegacySessionRemoval = (event) => {
      if (event.key === "kconnect_user" && event.newValue === null && !sessionStorage.getItem("kconnect_user")) {
        setUser(null);
        setAuthReady(true);
      }
    };
    window.addEventListener("storage", handleLegacySessionRemoval);
    return () => window.removeEventListener("storage", handleLegacySessionRemoval);
  }, []);

  useEffect(() => {
    if ((user?.role || "").toLowerCase() !== "member") {
      setAuthReady(true);
      return;
    }

    let active = true;
    const version = authCheckVersion.current;
    api.get("/auth/profile")
      .then(({ data }) => {
        if (!active || version !== authCheckVersion.current) return;
        const refreshed = { ...user, name: data.name, memberId: data.memberId || user.memberId, nhgName: data.nhgName || user.nhgName, nhgId: data.nhgId || user.nhgId, qrCode: data.qrCode || user.qrCode };
        setUser(refreshed);
        sessionStorage.setItem("kconnect_user", JSON.stringify(refreshed));
      })
      .catch((error) => {
        if (!active || version !== authCheckVersion.current || ![401, 403].includes(error.response?.status)) return;
        setUser(null);
        sessionStorage.removeItem("kconnect_user");
        sessionStorage.removeItem("kconnect_welcome_user");
        sessionStorage.removeItem("kconnect_welcome_user_v2");
      })
      .finally(() => {
        if (active && version === authCheckVersion.current) setAuthReady(true);
      });

    return () => { active = false; };
  }, []);

  const login = (userData) => {
    authCheckVersion.current += 1;
    setUser(userData);
    sessionStorage.setItem("kconnect_user", JSON.stringify(userData));
    localStorage.removeItem("kconnect_user");
    sessionStorage.removeItem("kconnect_welcome_user");
    sessionStorage.removeItem("kconnect_welcome_user_v2");
    setAuthReady(true);
  };

  const updateUser = (updates) => {
    const stored = sessionStorage.getItem("kconnect_user");
    const current = stored ? JSON.parse(stored) : user;
    if (!current) return;
    const refreshed = { ...current, ...updates };
    setUser(refreshed);
    sessionStorage.setItem("kconnect_user", JSON.stringify(refreshed));
  };

  const logout = () => {
    authCheckVersion.current += 1;
    setUser(null);
    sessionStorage.removeItem("kconnect_user");
    sessionStorage.removeItem("kconnect_welcome_user");
    sessionStorage.removeItem("kconnect_welcome_user_v2");
  };

  return (
    <AuthContext.Provider value={{ user, login, updateUser, logout, authReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
