import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, getUser, clearAuth, isTokenExpired } from '../utils/tokenHelper';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncAuthFromStorage = () => {
    const token = getToken();
    const stored = getUser();
    if (token && !isTokenExpired(token) && stored) {
      setUser(stored);
      return;
    }
    clearAuth();
    setUser(null);
  };

  useEffect(() => {
    syncAuthFromStorage();

    const onPageShow = () => syncAuthFromStorage();
    const onPopState = () => syncAuthFromStorage();
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('popstate', onPopState);

    setLoading(false);

    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const loginUser = (userData) => setUser(userData);

  const logoutUser = () => {
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
