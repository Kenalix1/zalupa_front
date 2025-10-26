// src/components/Login.js
import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = 'https://checkpulse.ru/api';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Отправляем запрос на авторизацию...');
      
      // Используем правильный эндпоинт /api/login
      const response = await axios.post(`${API_URL}/login`, credentials);
      
      console.log('✅ Ответ от сервера:', response.data);
      
      // Обрабатываем разные форматы ответа
      let token = null;
      
      if (response.data.access_token) {
        token = response.data.access_token;
      } else if (response.data.token) {
        token = response.data.token;
      } else if (response.data.jwt) {
        token = response.data.jwt;
      } else {
        // Если токен в корне ответа
        token = response.data;
      }
      
      if (token && typeof token === 'string') {
        // Сохраняем токен в localStorage
        localStorage.setItem('jwt_token', token);
        localStorage.setItem('token_type', 'Bearer');
        
        console.log('✅ Успешная авторизация, токен сохранен');
        onLogin(token);
      } else {
        throw new Error('Токен не получен или неверный формат');
      }
      
    } catch (error) {
      console.error('❌ Ошибка авторизации:', error);
      
      if (error.response?.status === 404) {
        setError('Эндпоинт авторизации не найден. Проверьте настройки сервера.');
      } else if (error.response?.status === 401) {
        setError('Неверное имя пользователя или пароль');
      } else if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Ошибка подключения к серверу');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">🔐 Админ-панель CheckPulse</h1>
          <p className="login-subtitle">Войдите в систему управления</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">Имя пользователя</label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-input"
              value={credentials.username}
              onChange={handleChange}
              placeholder="admin"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Пароль</label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              value={credentials.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            className={`login-btn ${loading ? 'loading' : ''}`}
            disabled={loading || !credentials.username || !credentials.password}
          >
            {loading ? '⏳ Вход...' : '🚪 Войти в систему'}
          </button>
        </form>

        <div className="login-footer">
          <p><strong>Тестовые данные:</strong></p>
          <p>Логин: admin | Пароль: admin123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;