// src/hooks/useAuth.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Функция для проверки валидности токена
  const validateToken = useCallback(async (authToken) => {
    try {
      // Проверяем токен через защищенный эндпоинт /api/admin
      const response = await axios.get('https://checkpulse.ru/api/agents', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      // Если запрос прошел успешно, токен валиден
      return true;
    } catch (error) {
      console.error('❌ Токен невалиден:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('jwt_token');
      
      if (savedToken) {
        // Проверяем валидность токена
        const isValid = await validateToken(savedToken);
        
        if (isValid) {
          setToken(savedToken);
          setIsAuthenticated(true);
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          console.log('✅ Токен восстановлен и валиден');
        } else {
          // Токен невалиден, очищаем
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('token_type');
          console.log('❌ Токен невалиден, требуется повторный вход');
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, [validateToken]);

  const login = (newToken) => {
    localStorage.setItem('jwt_token', newToken);
    localStorage.setItem('token_type', 'Bearer');
    setToken(newToken);
    setIsAuthenticated(true);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    console.log('✅ Пользователь авторизован');
  };

  const logout = useCallback(() => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('token_type');
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    console.log('✅ Пользователь вышел из системы');
  }, []);

  // Функция для создания авторизованного axios экземпляра
  const createAuthApi = useCallback(() => {
    const authApi = axios.create({
      baseURL: 'https://checkpulse.ru/api',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Добавляем интерцептор для автоматической подстановки токена
    authApi.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('jwt_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Интерцептор для обработки ошибок авторизации
    authApi.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.log('❌ Ошибка 401, разлогиниваем пользователя');
          logout();
          window.location.href = '/admin';
        }
        return Promise.reject(error);
      }
    );

    return authApi;
  }, [logout]);

  return {
    isAuthenticated,
    token,
    loading,
    user,
    login,
    logout,
    createAuthApi
  };
};