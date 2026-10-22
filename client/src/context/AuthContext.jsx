import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [payment, setPayment] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setParticipant(null);
      setPayment(null);
      setTicket(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      setParticipant(data.participant);
      setPayment(data.payment);
      setTicket(data.ticket);
    } catch (err) {
      console.warn('Session expired or invalid:', err.message);
      removeAuthToken();
      setUser(null);
      setParticipant(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    setAuthToken(data.token);
    setUser(data.user);
    setParticipant(data.participant);
    await fetchCurrentUser();
    return data;
  };

  const register = async (formData) => {
    const data = await api.register(formData);
    setAuthToken(data.token);
    setUser(data.user);
    setParticipant(data.participant);
    await fetchCurrentUser();
    return data;
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setParticipant(null);
    setPayment(null);
    setTicket(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        participant,
        payment,
        ticket,
        loading,
        login,
        register,
        logout,
        refreshUser: fetchCurrentUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isStaff: user?.role === 'STAFF' || user?.role === 'ADMIN',
        isParticipant: user?.role === 'PARTICIPANT'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
