import React, { createContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { notificationAPI } from '../api';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // Apply dark mode class to body
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        setIsLoggedIn(true);
      } catch {
        localStorage.clear();
      }
    }
  }, []);

  // Socket connection
  useEffect(() => {
    if (isLoggedIn) {
      const token = localStorage.getItem('jwt');
      const newSocket = io(window.location.origin, {
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
      });

      newSocket.on('NEW_NOTIFICATION', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      setSocket(newSocket);

      // Fetch unread count
      notificationAPI.getUnreadCount()
        .then(data => setUnreadCount(data.count))
        .catch(() => {});

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isLoggedIn]);

  const login = useCallback((token, userData) => {
    localStorage.setItem('jwt', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
    setIsLoggedIn(false);
    setNotifications([]);
    setUnreadCount(0);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [socket]);

  const value = {
    user,
    setUser,
    isLoggedIn,
    login,
    logout,
    socket,
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    darkMode,
    toggleDarkMode
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
