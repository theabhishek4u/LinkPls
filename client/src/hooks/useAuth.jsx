import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const session = JSON.parse(localStorage.getItem('inautodm_session') || 'null');
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      // --- DUMMY SESSION FOR UI TESTING ---
      if (session.access_token === 'dummy-token-xyz') {
        setUser({ id: 'dummy-123', email: 'test@inautodm.com', role: 'admin', name: 'Commander' });
        setLoading(false);
        return;
      }

      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      localStorage.removeItem('inautodm_session');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email, password) => {
    // --- DUMMY LOGIN FOR UI TESTING (Accepts any email) ---
    // User can login with any email and password for now to test the UI
    if (email && password) {
      const dummyUser = { id: 'dummy-123', email: email, role: 'admin', name: 'Commander' };
      const dummySession = { access_token: 'dummy-token-xyz' };
      localStorage.setItem('inautodm_session', JSON.stringify(dummySession));
      setUser(dummyUser);
      return { user: dummyUser, session: dummySession };
    }

    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('inautodm_session', JSON.stringify(data.session));
    setUser(data.user);
    return data;
  };

  const signup = async (email, password) => {
    const { data } = await api.post('/auth/signup', { email, password });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('inautodm_session');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
