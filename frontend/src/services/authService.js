import api from './api';
import { setToken, setRefreshToken, setUser, clearAuth, getRefreshToken } from '../utils/tokenHelper';

export const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  setToken(data.token);
  setRefreshToken(data.refreshToken);
  setUser({ fullName: data.fullName, email: data.email, role: data.role });
  return data;
};

export const register = async (fullName, email, password) => {
  const { data } = await api.post('/auth/register', { fullName, email, password });
  setToken(data.token);
  setRefreshToken(data.refreshToken);
  setUser({ fullName: data.fullName, email: data.email, role: data.role });
  return data;
};

export const logout = async () => {
  try {
    const refreshToken = getRefreshToken();
    await api.post('/auth/logout', { refreshToken });
  } finally {
    clearAuth();
  }
};

export const getProfile = async () => {
  const { data } = await api.get('/auth/profile');
  return data;
};

export const updateProfile = async (fullName) => {
  const { data } = await api.put('/auth/profile', { fullName });
  setUser({ fullName: data.fullName, email: data.email, role: data.role });
  return data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
  return data;
};
