import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './TargetChecker.css';

const TargetChecker = () => {
  const [target, setTarget] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBurgerMenu, setShowBurgerMenu] = useState(false);
  const [agentData, setAgentData] = useState({
    name: '',
    email: '',
    desc: ''
  });
  const [inputVisible, setInputVisible] = useState(false);
  const [containerVisible, setContainerVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [agentCount, setAgentCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [copied, setCopied] = useState(false);
  const [checkStartTime, setCheckStartTime] = useState(null);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [port, setPort] = useState('');

  const dropdownRef = useRef(null);
  const burgerRef = useRef(null);
  const carouselTrackRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const API_URL = 'https://checkpulse.ru/api';
  const WS_URL = 'wss://checkpulse.ru/ws';

  const initialTargets = ['yandex.ru', 'vk.com', 'ok.com', 'tremolino.ru', 'auto.ru'];

  const [targetsData, setTargetsData] = useState(
    initialTargets.map(name => ({ name, time: '—', status: 'pending' }))
  );

  const taskTypes = [
    { value: 'ping', label: 'PING' },
    { value: 'dns', label: 'DNS' },
    { value: 'http', label: 'HTTP' },
    { value: 'traceroute', label: 'TRACEROUTE' },
    { value: 'tcp', label: 'TCP' },
    { value: 'full', label: 'FULL' }
  ];

  // Функция для подключения к WebSocket
  const connectWebSocket = () => {
    try {
      console.log('🔌 Подключаемся к WebSocket /ws/onlineag...');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(`${WS_URL}/onlineag`);
      
      ws.onopen = () => {
        console.log('✅ WebSocket подключен к /ws/onlineag');
        setAgentsLoading(false);
        
        ws.send(JSON.stringify({ 
          action: 'get_online_count',
          type: 'online_agents'
        }));
      };

      ws.onmessage = (event) => {
        try {
          console.log('📨 Получено WebSocket сообщение:', event.data);
          
          let data;
          try {
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.log('⚠️ Данные не в JSON формате:', event.data);
            const count = parseInt(event.data);
            if (!isNaN(count)) {
              data = count;
            } else if (typeof event.data === 'string') {
              const match = event.data.match(/\d+/);
              if (match) {
                data = parseInt(match[0]);
              } else {
                throw new Error('Невалидные данные WebSocket');
              }
            } else {
              throw new Error('Невалидные данные WebSocket');
            }
          }
          
          let count = 0;
          
          if (typeof data === 'number') {
            count = data;
          } else if (data && typeof data === 'object') {
            if (data.online_count !== undefined) {
              count = data.online_count;
            } else if (data.count !== undefined) {
              count = data.count;
            } else if (data.total !== undefined) {
              count = data.total;
            } else if (data.online !== undefined) {
              count = data.online;
            } else if (data.agents !== undefined) {
              if (Array.isArray(data.agents)) {
                count = data.agents.length;
              } else if (typeof data.agents === 'number') {
                count = data.agents;
              }
            } else if (data.message && typeof data.message === 'number') {
              count = data.message;
            } else {
              const values = Object.values(data).filter(val => typeof val === 'number');
              if (values.length > 0) {
                count = values[0];
              }
            }
          }
          
          console.log(`📊 Обновлено количество онлайн агентов: ${count}`);
          setAgentCount(count);
          
        } catch (error) {
          console.error('❌ Ошибка обработки WebSocket сообщения:', error);
          fetchAgentCountHTTP();
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket ошибка:', error);
        setAgentsLoading(false);
        fetchAgentCountHTTP();
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket соединение закрыто:', event.code, event.reason);
        setAgentsLoading(false);
        
        if (event.code !== 1000) {
          console.log('🔄 Переподключаем WebSocket через 5 секунд...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 5000);
        }
      };

      wsRef.current = ws;
      
    } catch (error) {
      console.error('❌ Ошибка создания WebSocket:', error);
      setAgentsLoading(false);
      fetchAgentCountHTTP();
    }
  };

  // Fallback функция для HTTP запроса количества агентов
  const fetchAgentCountHTTP = async () => {
    try {
      console.log('🔄 Запрашиваем количество агентов через HTTP...');
      const response = await axios.get(`${API_URL}/agents`, {
        timeout: 5000
      });
      
      let count = 0;
      
      if (Array.isArray(response.data)) {
        count = response.data.length;
      } else if (response.data && typeof response.data === 'object') {
        if (response.data.count !== undefined) {
          count = response.data.count;
        } else if (response.data.agents !== undefined) {
          if (Array.isArray(response.data.agents)) {
            count = response.data.agents.length;
          } else if (typeof response.data.agents === 'number') {
            count = response.data.agents;
          }
        } else if (response.data.total !== undefined) {
          count = response.data.total;
        } else {
          count = Object.keys(response.data).length;
        }
      }
      
      console.log(`📊 Установлено количество агентов через HTTP: ${count}`);
      setAgentCount(count);
      
    } catch (error) {
      console.error('❌ Ошибка при получении количества агентов через HTTP:', error);
      console.log('⚠️ Оставляем предыдущее значение счетчика:', agentCount);
    } finally {
      setAgentsLoading(false);
    }
  };

  // Функция для обновления счетчика
  const refreshAgentCount = () => {
    setAgentsLoading(true);
    console.log('🔄 Принудительное обновление счетчика онлайн агентов...');
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        action: 'get_online_count',
        type: 'online_agents',
        refresh: true 
      }));
    } else {
      connectWebSocket();
    }
  };

  // Функция для безопасного закрытия WebSocket
  const closeWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Компонент размонтирован');
      wsRef.current = null;
    }
  };

  // Функция для форматирования данных результата
  const formatResultData = (data) => {
    if (!data) return '';
    
    if (typeof data === 'string') {
      return data;
    }
    
    if (data.output && typeof data.output === 'string') {
      return data.output;
    }
    
    if (data.data && typeof data.data === 'string') {
      return data.data;
    }
    
    return JSON.stringify(data, null, 2);
  };

  // Функция для копирования текста
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // УНИВЕРСАЛЬНАЯ функция для выполнения проверки
  const performCheck = async (targetName, type = 'ping', customPort = null) => {
    try {
      console.log(`🔄 Выполняем проверку ${type} для ${targetName}...`);

      const data = type === 'tcp' 
        ? { 
            target: targetName, 
            type: type,
            port: parseInt(customPort)
          }
        : { 
            target: targetName, 
            type: type 
          };

      console.log('📤 Отправляемые данные:', data);

      // 1. Создаем задачу
      const taskRes = await axios.post(`${API_URL}/checks`, data);
      console.log('✅ Задача создана:', taskRes.data);
      
      const taskId = taskRes.data.id;
      console.log('🆔 ID задачи:', taskId);

      // 2. Ожидаем результат
      const maxAttempts = 15;
      let finalResult;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          console.log(`🔄 Попытка ${attempt + 1}/${maxAttempts} получения результата...`);
          const resultRes = await axios.get(`${API_URL}/checks/${taskId}`);
          finalResult = resultRes.data;
          
          console.log(`📊 Статус на попытке ${attempt + 1}:`, finalResult.status);
          console.log(`📋 Данные на попытке ${attempt + 1}:`, finalResult);

          if (finalResult.status !== 'pending' && finalResult.status !== 'queued') {
            console.log('🎉 Проверка завершена!');
            break;
          }
          
          if (attempt === maxAttempts - 1) {
            console.log('⏰ Превышено время ожидания');
            finalResult = { 
              ...finalResult, 
              status: 'timeout', 
              error: 'Проверка заняла слишком много времени' 
            };
          }
        } catch (error) {
          console.log(`❌ Ошибка при получении результата (попытка ${attempt + 1}):`, error);
        }
      }

      console.log('📊 Финальный результат проверки:', finalResult);
      return finalResult;
      
    } catch (error) {
      console.error(`❌ Ошибка при проверке ${targetName}:`, error);
      console.error('📋 Детали ошибки:', error.response?.data);
      return {
        status: 'error',
        error: error.response?.data?.detail || error.response?.data?.message || error.message,
        http_status: error.response?.status
      };
    }
  };

  // Функция для получения реального пинга для одного домена
  const getPing = async (targetName) => {
    try {
      const result = await performCheck(targetName, 'ping');
      
      let timeStr = '>99 мс';
      let status = 'bad';

      if (result.status === 'ok' || result.status === 'completed' || result.status === 'success') {
        const rawData = result.data;
        let pingTime = null;

        if (result.response_time) {
          pingTime = result.response_time * 1000;
        } else if (rawData) {
          const output = formatResultData(rawData);
          const patterns = [
            /time=([\d.]+)\s*ms/i,
            /time[=:\s]+([\d.]+)\s*ms/i,
            /время[=:\s]+([\d.]+)\s*мс/i,
            /([\d.]+)\s*ms/i
          ];
          
          for (const pattern of patterns) {
            const match = output.match(pattern);
            if (match) {
              pingTime = parseFloat(match[1]);
              break;
            }
          }
        }

        if (pingTime !== null) {
          timeStr = pingTime > 99 ? '>99 мс' : `${pingTime.toFixed(1)} мс`;
          status = pingTime < 100 ? 'ok' : 'bad';
        } else {
          timeStr = '—';
          status = 'ok';
        }
      } else if (result.status === 'fail' || result.status === 'error') {
        status = 'bad';
        timeStr = '—';
      }

      return { name: targetName, time: timeStr, status, rawResult: result };
    } catch (error) {
      console.error(`Ошибка пинга для ${targetName}:`, error);
      return { name: targetName, time: '—', status: 'bad' };
    }
  };

  // Функция для получения пингов для всех доменов
  const fetchPings = async () => {
    try {
      console.log('🔄 Обновляем пинги для верхнего меню...');
      const promises = initialTargets.map(name => getPing(name));
      const newData = await Promise.all(promises);
      setTargetsData(newData);
      console.log('✅ Пинги обновлены:', newData);
    } catch (error) {
      console.error('❌ Ошибка при обновлении пингов:', error);
    }
  };

  // УНИВЕРСАЛЬНАЯ функция для форматирования результатов как у ping
  const formatCheckResult = (result, type) => {
    if (!result) return { time: '—', status: 'pending' };

    let timeStr = '—';
    let status = 'pending';

    if (result.status === 'ok' || result.status === 'completed' || result.status === 'success') {
      status = 'ok';
      
      // Для ping используем специальную логику
      if (type === 'ping') {
        const rawData = result.data;
        let pingTime = null;

        if (result.response_time) {
          pingTime = result.response_time * 1000;
        } else if (rawData) {
          const output = formatResultData(rawData);
          const patterns = [
            /time=([\d.]+)\s*ms/i,
            /time[=:\s]+([\d.]+)\s*ms/i,
            /время[=:\s]+([\d.]+)\s*мс/i,
            /([\d.]+)\s*ms/i
          ];
          
          for (const pattern of patterns) {
            const match = output.match(pattern);
            if (match) {
              pingTime = parseFloat(match[1]);
              break;
            }
          }
        }

        if (pingTime !== null) {
          timeStr = pingTime > 99 ? '>99 мс' : `${pingTime.toFixed(1)} мс`;
          status = pingTime < 100 ? 'ok' : 'bad';
        }
      } else {
        // Для других типов проверок используем время ответа
        const responseTime = result.response_time || result.client_response_time;
        if (responseTime) {
          timeStr = `${(responseTime * 1000).toFixed(1)} мс`;
        } else {
          timeStr = 'OK';
        }
      }
    } else if (result.status === 'fail' || result.status === 'error' || result.status === 'timeout') {
      status = 'bad';
      timeStr = '—';
    }

    return { time: timeStr, status };
  };

  useEffect(() => {
    // Подключаем WebSocket для получения количества онлайн агентов
    setAgentsLoading(true);
    connectWebSocket();
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (burgerRef.current && !burgerRef.current.contains(event.target)) {
        setShowBurgerMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    // Загрузка реальных пингов при монтировании
    fetchPings();

    // Интервал для обновления пингов каждые 60 секунд
    const pingIntervalId = setInterval(fetchPings, 60000);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(pingIntervalId);
      
      // Безопасно закрываем WebSocket при размонтировании компонента
      closeWebSocket();
    };
  }, []);

  useEffect(() => {
    const containerTimer = setTimeout(() => {
      setContainerVisible(true);
    }, 100);
    
    const inputTimer = setTimeout(() => {
      setInputVisible(true);
    }, 300);
    
    return () => {
      clearTimeout(containerTimer);
      clearTimeout(inputTimer);
    };
  }, []);

  useEffect(() => {
    if (carouselTrackRef.current) {
      carouselTrackRef.current.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
  }, [currentSlide]);

  const handleCheck = async (e) => {
    e.preventDefault();
    
    if (!target.trim() || !selectedTaskType) {
      alert('Пожалуйста, введите цель и выберите тип проверки');
      return;
    }

    if (selectedTaskType === 'tcp' && !port.trim()) {
      alert('Пожалуйста, укажите порт для TCP проверки');
      return;
    }

    setLoading(true);
    setResults(null);
    const startTime = Date.now();
    setCheckStartTime(startTime);
    
    try {
      const result = await performCheck(
        target, 
        selectedTaskType, 
        selectedTaskType === 'tcp' ? port : null
      );

      const endTime = Date.now();
      const clientResponseTime = (endTime - startTime) / 1000;
      
      const finalResult = {
        ...result,
        client_response_time: clientResponseTime
      };

      console.log('📊 Финальный результат:', finalResult);
      console.log('⏱️ Время выполнения (клиент):', clientResponseTime, 'сек');
      
      setResults(finalResult);
      
    } catch (error) {
      console.log('❌ Ошибка:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message;
      alert(`Ошибка: ${errorMessage}`);
    } finally {
      setLoading(false);
      setCheckStartTime(null);
    }
  };

  const handleTaskTypeSelect = (type) => {
    setSelectedTaskType(type);
    setShowDropdown(false);
    if (type !== 'tcp') {
      setPort('');
    }
  };

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleBurgerToggle = () => {
    setShowBurgerMenu(!showBurgerMenu);
  };

  const handleAgentInputChange = (e) => {
    const { name, value } = e.target;
    setAgentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAgentSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('📤 Отправляем данные агента:', agentData);
      
      const response = await axios.post(`${API_URL}/agents/register`, agentData);
      console.log('✅ Агент создан:', response.data);
      
      setAgentData({
        name: '',
        email: '',
        desc: ''
      });
      
      // Обновляем счетчик после создания агента
      refreshAgentCount();
      
      alert('Агент успешно создан! API ключ отправлен на почту.');
    } catch (error) {
      console.log('❌ Ошибка создания агента:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message;
      alert(`Ошибка при создании агента: ${errorMessage}`);
    }
  };

  const handleAgentCancel = () => {
    setAgentData({
      name: '',
      email: '',
      desc: ''
    });
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === targetsData.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? targetsData.length - 1 : prev - 1));
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const isAgentFormValid = agentData.name.trim() && 
                          agentData.email.trim() && 
                          agentData.desc.trim();

  const getSelectedTaskLabel = () => {
    const task = taskTypes.find(t => t.value === selectedTaskType);
    return task ? task.label : 'Выберите тип проверки';
  };

  const renderResults = () => {
  if (!results) return null;

  console.log('📊 Полные результаты для отображения:', results);

  // Форматируем результат в стиле ping
  const formattedResult = formatCheckResult(results, selectedTaskType);

  // Функция для отображения JSON данных
  const renderJSONData = () => {
    // Ищем данные в разных возможных ключах
    const jsonData = results.data || results.output || results.result || results;
    
    if (!jsonData) {
      return null;
    }

    let formattedJSON = '';
    
    try {
      // Если данные уже в формате JSON строки, парсим и форматируем
      if (typeof jsonData === 'string') {
        try {
          const parsed = JSON.parse(jsonData);
          formattedJSON = JSON.stringify(parsed, null, 2);
        } catch (e) {
          // Если не JSON, показываем как есть
          formattedJSON = jsonData;
        }
      } else {
        // Если это объект, форматируем как JSON
        formattedJSON = JSON.stringify(jsonData, null, 2);
      }
    } catch (error) {
      console.error('Ошибка форматирования JSON:', error);
      formattedJSON = 'Ошибка при форматировании данных';
    }

    return (
      <div className="result-section">
        <div className="section-header">
          <span className="section-icon">🔧</span>
          JSON данные
        </div>
        <div className="json-data-container">
          <div className="json-header">
            <span className="json-title">Полный ответ от сервера:</span>
            <button 
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={() => handleCopy(formattedJSON)}
            >
              {copied ? '✅ Скопировано!' : '📋 Копировать JSON'}
            </button>
          </div>
          <pre className="json-output">{formattedJSON}</pre>
        </div>
      </div>
    );
  };

  return (
    <div className="results-wrapper">
      <div className="results-container">
        <div className="results-header">
          <div className="results-title">
            <span className="results-icon">📊</span>
            Результаты проверки {selectedTaskType.toUpperCase()}
          </div>
          <div className="results-timestamp">
            {new Date().toLocaleTimeString('ru-RU')}
          </div>
        </div>

        <div className="results-content">
          {/* Статус проверки в стиле ping */}
          <div className="result-section">
            <div className="section-header">
              <span className="section-icon">🎯</span>
              Статус проверки
            </div>
            <div className="ping-result">
              <div className="ping-target">{target}</div>
              <div className="ping-info">
                <span className={`ping-time ${formattedResult.status}`}>
                  {formattedResult.time}
                </span>
                <span className={`ping-status ${formattedResult.status}`}>
                  {formattedResult.status === 'ok' ? 'OK' : 'BAD'}
                </span>
              </div>
            </div>
          </div>

          {/* Ошибка */}
          {results.error && (
            <div className="result-section">
              <div className="section-header">
                <span className="section-icon">🚨</span>
                Ошибка
              </div>
              <div className="error-message">
                {results.error}
              </div>
            </div>
          )}

          {/* Время выполнения */}
          {(results.response_time || results.client_response_time) && (
            <div className="result-section">
              <div className="section-header">
                <span className="section-icon">⏱️</span>
                Время выполнения
              </div>
              <div className="time-info">
                <div className="time-item">
                  <span className="time-label">Общее время:</span>
                  <span className="time-value">
                    {((results.response_time || results.client_response_time) * 1000).toFixed(1)} мс
                  </span>
                </div>
                {results.response_time && (
                  <div className="time-item">
                    <span className="time-label">Время сервера:</span>
                    <span className="time-value">{results.response_time.toFixed(3)} сек</span>
                  </div>
                )}
                {results.client_response_time && (
                  <div className="time-item">
                    <span className="time-label">Время клиента:</span>
                    <span className="time-value">{results.client_response_time.toFixed(3)} сек</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* JSON данные */}
          {renderJSONData()}

          {/* Детальная информация о результате */}
          <div className="result-section">
            <div className="section-header">
              <span className="section-icon">📋</span>
              Детали результата
            </div>
            <div className="result-details">
              <div className="detail-item">
                <span className="detail-label">Статус:</span>
                <span className={`detail-value ${results.status}`}>
                  {results.status}
                </span>
              </div>
              {results.id && (
                <div className="detail-item">
                  <span className="detail-label">ID задачи:</span>
                  <span className="detail-value">{results.id}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Тип проверки:</span>
                <span className="detail-value">{selectedTaskType}</span>
              </div>
              {results.created_at && (
                <div className="detail-item">
                  <span className="detail-label">Создано:</span>
                  <span className="detail-value">{new Date(results.created_at).toLocaleString('ru-RU')}</span>
                </div>
              )}
              {results.updated_at && (
                <div className="detail-item">
                  <span className="detail-label">Обновлено:</span>
                  <span className="detail-value">{new Date(results.updated_at).toLocaleString('ru-RU')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Сводка */}
          <div className="results-summary">
            <div className="summary-item">
              <div className="summary-label">Цель</div>
              <div className="summary-value">{target}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Тип проверки</div>
              <div className="summary-value">{getSelectedTaskLabel()}</div>
            </div>
            {selectedTaskType === 'tcp' && port && (
              <div className="summary-item">
                <div className="summary-label">Порт</div>
                <div className="summary-value">{port}</div>
              </div>
            )}
            <div className="summary-item">
              <div className="summary-label">Статус</div>
              <div className={`summary-value ${formattedResult.status}`}>
                {formattedResult.status === 'ok' ? 'OK' : 'BAD'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
  return (
    <div className="target-checker">
      {/* Бургер-меню */}
      <div className="burger-menu" ref={burgerRef}>
        <button 
          className="burger-toggle"
          onClick={handleBurgerToggle}
        >
          ☰
        </button>
        <div className={`burger-dropdown ${showBurgerMenu ? 'visible' : ''}`}>
          <div className="burger-links">
            <a 
              href="/admin"
              className="burger-link"
              onClick={() => setShowBurgerMenu(false)}
            >
              <span>⚙️</span>
              Админ-панель
            </a>
            <a 
              href="https://t.me/checkpulse_aeza_bot" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="burger-link"
              onClick={() => setShowBurgerMenu(false)}
            >
              <span>📡</span>
              Телеграм бот
            </a>
            <a 
              href="https://docs.your-project.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="burger-link"
              onClick={() => setShowBurgerMenu(false)}
            >
              <span>📚</span>
              Документация
            </a>
            <a 
              href="https://github.com/your-username" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="burger-link"
              onClick={() => setShowBurgerMenu(false)}
            >
              <span>💻</span>
              GitHub
            </a>
            <a 
              href="https://sourcecraft.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="burger-link"
              onClick={() => setShowBurgerMenu(false)}
            >
              <span>🛠️</span>
              SourceCraft
            </a>
          </div>
          <div className="burger-contact">
            Контакты:<br />
            support@your-domain.com<br />
            +7 (XXX) XXX-XX-XX
          </div>
        </div>
      </div>

      {/* Статус-карточки для десктопа */}
      <div className="status-bar">
        {targetsData.map((item, index) => (
          <div key={index} className={`status-card ${item.status}`}>
            <div className="target">{item.name}</div>
            <div className="info-row">
              <span className="ping">{item.time}</span>
              <span className={`status ${item.status}`}>
                {item.status === 'ok' ? 'OK' : 'BAD'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Карусель для мобильных устройств */}
      <div className="status-carousel">
        <div className="status-carousel-track" ref={carouselTrackRef}>
          {targetsData.map((item, index) => (
            <div key={index} className={`status-card ${item.status}`}>
              <div className="target">{item.name}</div>
              <div className="info-row">
                <span className="ping">{item.time}</span>
                <span className={`status ${item.status}`}>
                  {item.status === 'ok' ? 'OK' : 'BAD'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <button className="carousel-button prev" onClick={prevSlide}>
          ‹
        </button>
        <button className="carousel-button next" onClick={nextSlide}>
          ›
        </button>
        <div className="carousel-indicators">
          {targetsData.map((_, index) => (
            <div
              key={index}
              className={`carousel-indicator ${currentSlide === index ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>

      {/* Поле ввода цели */}
      <input
        type="text"
        className={`target-input ${inputVisible ? 'visible' : ''}`}
        placeholder="Введите цель (домен или IP адрес)"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />

      {/* Поле ввода порта (только для TCP) */}
      {selectedTaskType === 'tcp' && (
        <input
          type="number"
          className={`target-input port-input ${inputVisible ? 'visible' : ''}`}
          placeholder="Введите порт (например, 80, 443, 22...)"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          min="1"
          max="65535"
        />
      )}

      {/* Контейнер для кнопки проверки и типа проверки */}
      <div className="check-container">
        {/* Кнопка проверки */}
        <div className="check-button-container">
          <div 
            className={`check-button compact ${loading ? 'loading' : ''}`}
            onClick={handleCheck}
            disabled={loading || !target || !selectedTaskType || (selectedTaskType === 'tcp' && !port)}
          >
            {loading ? '⏳ Проверка...' : 'Проверить'}
          </div>
        </div>

        {/* Тип проверки */}
        <div className="check-type-wrapper" ref={dropdownRef}>
          <div className="check-type-header">Тип проверки</div>
          <div className="task-type-container compact">
            <div 
              className="task-type-toggle compact"
              onClick={handleDropdownToggle}
            >
              {getSelectedTaskLabel()}
            </div>
            <div className={`dropdown-menu ${showDropdown ? 'visible' : ''}`}>
              <button 
                className="dropdown-close"
                onClick={() => setShowDropdown(false)}
                aria-label="Закрыть меню"
              >
                ×
              </button>
              <div className="dropdown-header">
                <div className="dropdown-title">Выберите тип проверки</div>
              </div>
              <div className="task-types-grid">
                {taskTypes.map((type) => (
                  <div
                    key={type.value}
                    className={`task-type ${selectedTaskType === type.value ? 'selected' : ''}`}
                    onClick={() => handleTaskTypeSelect(type.value)}
                  >
                    {type.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Отображение результатов */}
      {renderResults()}

      {/* Компактный контейнер для формы агента */}
      <div className={`agent-check-container ${containerVisible ? 'visible' : ''}`}>
        {/* Форма добавления агента */}
        <div className="agent-form-compact">
          <div className="agent-form-container permanent">
            <div className="agent-form-content">
              <form className="agent-form permanent" onSubmit={handleAgentSubmit}>
                <div className="form-title">Добавить агента</div>
                <div className="form-row">
                  <input
                    type="text"
                    name="name"
                    placeholder="Имя агента"
                    value={agentData.name}
                    onChange={handleAgentInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-row">
                  <input
                    type="email"
                    name="email"
                    placeholder="Ваша почта"
                    value={agentData.email}
                    onChange={handleAgentInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-row">
                  <textarea
                    name="desc"
                    placeholder="Описание"
                    value={agentData.desc}
                    onChange={handleAgentInputChange}
                    className="form-textarea"
                  />
                </div>
                <div className="form-buttons">
                  <button 
                    type="submit" 
                    className={`submit-agent-btn ${isAgentFormValid ? 'active' : ''}`}
                    disabled={!isAgentFormValid}
                  >
                    Создать
                  </button>
                  <button 
                    type="button" 
                    className="cancel-agent-btn"
                    onClick={handleAgentCancel}
                  >
                    Отменить
                  </button>
                </div>
              </form>
            </div>  
          </div>
        </div>
      </div>

      {/* Счетчик онлайн агентов */}
      <div className="agent-counter">
        <div className="counter-label">Онлайн агенты</div>
        <div className={`counter-value ${agentsLoading ? 'loading' : ''}`}>
          {agentsLoading ? '...' : agentCount}
        </div>

      </div>
    </div>
  );
};

export default TargetChecker;