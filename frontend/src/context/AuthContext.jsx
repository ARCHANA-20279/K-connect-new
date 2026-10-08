import { createContext, useContext, useEffect, useRef, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const authCheckVersion = useRef(0);
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("kconnect_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [authReady, setAuthReady] = useState(() => {
    const stored = localStorage.getItem("kconnect_user");
    if (!stored) return true;
    try {
      return (JSON.parse(stored).role || "").toLowerCase() !== "member";
    } catch {
      return true;
    }
  });

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
        localStorage.setItem("kconnect_user", JSON.stringify(refreshed));
      })
      .catch((error) => {
        if (!active || version !== authCheckVersion.current || ![401, 403].includes(error.response?.status)) return;
        setUser(null);
        localStorage.removeItem("kconnect_user");
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
    localStorage.setItem("kconnect_user", JSON.stringify(userData));
    sessionStorage.removeItem("kconnect_welcome_user");
    sessionStorage.removeItem("kconnect_welcome_user_v2");
    setAuthReady(true);
  };

  const updateUser = (updates) => {
    const stored = localStorage.getItem("kconnect_user");
    const current = stored ? JSON.parse(stored) : user;
    if (!current) return;
    const refreshed = { ...current, ...updates };
    setUser(refreshed);
    localStorage.setItem("kconnect_user", JSON.stringify(refreshed));
  };

  const logout = () => {
    authCheckVersion.current += 1;
    setUser(null);
    localStorage.removeItem("kconnect_user");
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
