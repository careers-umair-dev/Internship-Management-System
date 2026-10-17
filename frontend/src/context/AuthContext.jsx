import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { tokenStore } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(() => !!tokenStore.get()); // true while validating a saved token

  // Restore session on first load
  useEffect(() => {
    if (!tokenStore.get()) return undefined;
    let active = true;
    authService.me()
      .then((u) => active && setUser(u))
      .catch(() => tokenStore.clear())
      .finally(() => active && setBooting(false));
    return () => { active = false; };
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Any 401 from the API (expired/invalid token) ends the session
  useEffect(() => {
    const onExpired = () => {
      logout();
      toast.warning('Your session has expired. Please sign in again.');
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [logout, toast]);

  const login = useCallback(async (email, password, role) => {
    const { token, user: u } = await authService.login(email, password, role);
    tokenStore.set(token);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (data) => {
    const { token, user: u } = await authService.register(data);
    tokenStore.set(token);
    setUser(u);
    return u;
  }, []);

  const value = useMemo(() => ({
    user,
    booting,
    isAuthenticated: !!user,
    role: user?.role || null,
    login,
    register,
    logout,
    updateUser: (patch) => setUser((prev) => ({ ...prev, ...patch })),
    replaceToken: (token) => tokenStore.set(token),
  }), [user, booting, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
