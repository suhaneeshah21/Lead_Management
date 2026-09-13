import { createContext, useContext, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('crm_user') || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  async function login(credentials) {
    const response = await api.post('/auth/login', credentials);
    const nextUser = response.data.data.user;
    localStorage.setItem('crm_token', response.data.data.token);
    localStorage.setItem('crm_user', JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  }

  function updateUser(nextUser) {
    localStorage.setItem('crm_user', JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
  }

  const value = useMemo(() => ({ user, login, updateUser, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
