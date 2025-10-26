// src/components/AdminPanel.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import './AdminPanel.css';

const AdminPanel = () => {
  const [agents, setAgents] = useState([]);
  const [showBurgerMenu, setShowBurgerMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { createAuthApi, logout, isAuthenticated } = useAuth();

  const fetchAgents = useCallback(async () => {
    const authApi = createAuthApi();
    
    try {
      setLoading(true);
      setError('');
      console.log('🔄 Запрашиваем список агентов...');
      
      // Пробуем разные эндпоинты
      let response;
      try {
        // Пробуем основной эндпоинт
        response = await authApi.get('/admin');
      } catch (adminError) {
        console.log('❌ /admin не доступен, пробуем /agents...');
        try {
          // Пробуем альтернативный эндпоинт
          response = await authApi.get('/agents');
        } catch (agentsError) {
          console.log('❌ /agents не доступен, пробуем /api/agents...');
          try {
            response = await authApi.get('/api/agents');
          } catch (apiAgentsError) {
            console.log('❌ Все эндпоинты недоступны, используем демо-данные');
            throw new Error('Все эндпоинты недоступны');
          }
        }
      }
      
      console.log('✅ Ответ от сервера:', response.data);
      
      let agentsData = [];
      
      // Обрабатываем разные форматы ответа
      if (Array.isArray(response.data)) {
        agentsData = response.data;
      } else if (response.data.agents && Array.isArray(response.data.agents)) {
        agentsData = response.data.agents;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        agentsData = response.data.data;
      } else if (typeof response.data === 'object') {
        agentsData = Object.values(response.data);
      }
      
      const formattedAgents = agentsData.map((agent, index) => ({
        id: agent.id || agent._id || `agent-${index + 1}`,
        name: agent.name || agent.hostname || `Агент ${index + 1}`,
        email: agent.email || agent.contact || 'email@example.com',
        desc: agent.desc || agent.description || agent.purpose || 'Описание отсутствует',
        status: agent.status || agent.state || 'active',
        lastActive: agent.last_active || agent.lastActive || agent.last_seen || new Date().toISOString(),
        created: agent.created_at || agent.created || agent.registered || new Date().toISOString().split('T')[0],
        ip: agent.ip || agent.address || `192.168.1.${index + 1}`,
        version: agent.version || '1.0.0'
      }));
      
      setAgents(formattedAgents);
      
    } catch (error) {
      console.error('❌ Ошибка при загрузке агентов:', error);
      
      if (error.response?.status === 401) {
        setError('Ошибка авторизации. Требуется повторный вход.');
        logout();
      } else if (error.response?.status === 403) {
        setError('Доступ запрещен. Недостаточно прав.');
      } else {
        setError('Сервер API недоступен. Используются демо-данные для тестирования.');
        loadDemoData();
      }
    } finally {
      setLoading(false);
    }
  }, [createAuthApi, logout]);

  const loadDemoData = () => {
    const demoAgents = [
      
    ];
    setAgents(demoAgents);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAgents();
    }
  }, [isAuthenticated, fetchAgents]);

  const handleDeleteAgent = async (agentId) => {
    if (window.confirm('Вы уверены, что хотите удалить этого агента?')) {
      try {
        const authApi = createAuthApi();
        await authApi.delete(`/admin/agents/${agentId}`);
      } catch (error) {
        console.log('❌ API удаления недоступен, удаляем локально');
      }
      
      // Удаляем из UI в любом случае
      setAgents(agents.filter(agent => agent.id !== agentId));
    }
  };

  const handleLogout = () => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      logout();
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Active': { text: '🟢 Активен', class: 'status-active' },
      'Inactive': { text: '🔴 Неактивен', class: 'status-inactive' },
      'Maintenance': { text: '🟡 Обслуживание', class: 'status-maintenance' },
      'Online': { text: '🟢 Онлайн', class: 'status-active' },
      'Offline': { text: '🔴 Оффлайн', class: 'status-inactive' },
      'Error': { text: '🔴 Ошибка', class: 'status-error' }
    };
    
    return statusMap[status] || { text: '⚪ Неизвестно', class: 'status-unknown' };
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (agent.ip && agent.ip.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loading-container">
          <div className="loading-spinner">⏳</div>
          <div className="loading-text">Загрузка данных агентов...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {/* Бургер-меню */}
      <div className="burger-menu">
        <button 
          className="burger-toggle"
          onClick={() => setShowBurgerMenu(!showBurgerMenu)}
        >
          ☰
        </button>
        <div className={`burger-dropdown ${showBurgerMenu ? 'visible' : ''}`}>
          <div className="burger-links">
            <a 
              href="/" 
              className="burger-link"
              onClick={() => setShowBurgerMenu(false)}
            >
              <span>🏠</span>
              Главная
            </a>
            <button 
              className="burger-link logout-btn"
              onClick={handleLogout}
            >
              <span>🚪</span>
              Выйти
            </button>
          </div>
          <div className="burger-contact">
            CheckPulse Admin<br />
            v1.0.0
          </div>
        </div>
      </div>

      {/* Заголовок и статистика */}
      <div className="admin-header">
        <h1 className="admin-title">🔐 Панель управления CheckPulse</h1>
        {error && (
          <div className="error-message">
            {error}
            <button 
              className="retry-btn"
              onClick={fetchAgents}
              style={{marginLeft: '10px', padding: '5px 10px'}}
            >
              Повторить
            </button>
          </div>
        )}
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-value">{agents.length}</div>
            <div className="stat-label">Всего агентов</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {agents.filter(a => a.status === 'Active' || a.status === 'Online').length}
            </div>
            <div className="stat-label">Активных</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {agents.filter(a => a.status === 'Inactive' || a.status === 'Offline' || a.status === 'error').length}
            </div>
            <div className="stat-label">Проблемных</div>
          </div>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <div className="admin-controls">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Поиск по имени, email, IP или описанию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="control-buttons">
          <button 
            className="logout-btn-header"
            onClick={handleLogout}
            title="Выйти из системы"
          >
            🚪 Выйти
          </button>
        </div>
      </div>

      {/* Список агентов */}
      <div className="agents-list">
        {filteredAgents.length === 0 ? (
          <div className="no-agents">
            <div className="no-agents-icon">🤖</div>
            <div className="no-agents-text">Агенты не найдены</div>
            {searchTerm && (
              <div className="no-agents-hint">
                Попробуйте изменить условия поиска
              </div>
            )}
          </div>
        ) : (
          filteredAgents.map(agent => {
            const statusInfo = getStatusBadge(agent.status);
            return (
              <div key={agent.id} className="agent-card">
                <div className="agent-header">
                  <div className="agent-name">{agent.name}</div>
                  <div className={`status-badge ${statusInfo.class}`}>
                    {statusInfo.text}
                  </div>
                </div>
                
                <div className="agent-info">
                  <div className="info-row">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{agent.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">IP адрес:</span>
                    <span className="info-value">{agent.ip}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Версия:</span>
                    <span className="info-value">{agent.version}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Описание:</span>
                    <span className="info-value">{agent.desc}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Создан:</span>
                    <span className="info-value">{agent.created}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Последняя активность:</span>
                    <span className="info-value">{agent.lastActive}</span>
                  </div>
                </div>

                <div className="agent-actions">
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteAgent(agent.id)}
                    title="Удалить агента"
                  >
                    🗑️ Удалить
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Счетчик агентов */}
      <div className="agent-counter">
        <div className="counter-label">
          Показано: {filteredAgents.length} из {agents.length}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;