import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from './api';

export interface User { id: string; email: string; fullName: string; privacyAcceptedAt: string | null; deletionScheduledAt: string | null; createdAt: string }
interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (v: { email: string; password: string; fullName: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>(null as never);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser((await api.get('/auth/session')).user);
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) console.error(e);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const onUnauth = () => setUser(null);
    window.addEventListener('farmix:unauthorized', onUnauth);
    return () => window.removeEventListener('farmix:unauthorized', onUnauth);
  }, [refresh]);

  const value: AuthCtx = {
    user, loading, refresh,
    login: async (email, password) => setUser((await api.post('/auth/login', { email, password })).user),
    register: async (v) => setUser((await api.post('/auth/register', { ...v, acceptPrivacy: true })).user),
    logout: async () => { await api.post('/auth/logout').catch(() => undefined); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
