import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './DomainChecker.css';

const DomainChecker = () => {
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

  const dropdownRef = useRef(null);
  const burgerRef = useRef(null);
  const carouselTrackRef = useRef(null);

  const API_URL = 'https://checkpulse.ru/api';

  const domainsData = [
    { name: 'yandex.ru', time: '0.09 мс', status: 'ok' },
    { name: 'vk.com', time: '0.1 мс', status: 'ok' },
    { name: 'ok.com', time: '10 мс', status: 'bad' },
    { name: 'tremolino.ru', time: '0.019 мс', status: 'ok' },
    { name: 'auto.ru', time: '>99 мс', status: 'bad' }
  ];

  const taskTypes = [
    { value: 'ping', label: 'PING' },
    { value: 'dns', label: 'DNS' },
    { value: 'http', label: 'HTTP' },
    { value: 'traceroute', label: 'TRACEROUTE' },
    { value: 'tcp', label: 'TCP' },
    { value: 'full', label: 'FULL' }
  ];

  // Функция для получения количества агентов
  const fetchAgentCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/agents`);
      setAgentCount(response.data.length || response.data.count || 0);
    } catch (error) {
      console.error('Ошибка при получении количества агентов:', error);
      setAgentCount(5);
    }
  };

  useEffect(() => {
    fetchAgentCount();
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (burgerRef.current && !burgerRef.current.contains(event.target)) {
        setShowBurgerMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
      alert('Пожалуйста, введите домен и выберите тип проверки');
      return;
    }

    setLoading(true);
    setResults(null);
    
    try {
      console.log('📤 Отправляем запрос на проверку:', { target, type: selectedTaskType });

      const data = { 
        target: target, 
        type: selectedTaskType 
      };

      // 1. Создаем задачу
      const taskRes = await axios.post(`${API_URL}/checks`, data);
      console.log('✅ Задача создана:', taskRes.data);
      
      const taskId = taskRes.data.id;

      // 2. Ожидаем результат
      let finalResult;
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const resultRes = await axios.get(`${API_URL}/checks/${taskId}`);
          finalResult = resultRes.data;
          
          console.log(`🔄 Попытка ${attempt + 1}:`, finalResult.status);

          if (finalResult.status !== 'pending' && finalResult.status !== 'queued') {
            console.log('🎉 Проверка завершена!');
            break;
          }
          
          if (attempt === 29) {
            console.log('⏰ Превышено время ожидания');
            finalResult = { ...finalResult, status: 'timeout', error: 'Проверка заняла слишком много времени' };
          }
        } catch (error) {
          console.log(`❌ Ошибка при получении результата: ${error}`);
          break;
        }
      }

      console.log('📊 Финальный результат:', finalResult);
      setResults(finalResult);
      
    } catch (error) {
      console.log('❌ Ошибка:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message;
      alert(`Ошибка: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskTypeSelect = (type) => {
    setSelectedTaskType(type);
    setShowDropdown(false);
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
      
      // Обновляем счетчик агентов через API
      await fetchAgentCount();
      
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
    setCurrentSlide((prev) => (prev === domainsData.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? domainsData.length - 1 : prev - 1));
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

  // Функция для красивого отображения результатов
  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="results-container">
        <h3>📊 Результаты проверки</h3>
        <div className="results-content">
          <div className="result-status">
            <strong>Статус:</strong> {results.status}
          </div>
          {results.response_time && (
            <div className="response-time">
              <strong>Время ответа:</strong> {results.response_time.toFixed(3)} сек
            </div>
          )}
          {results.error && (
            <div className="error-message">
              <strong>Ошибка:</strong> {results.error}
            </div>
          )}
          {results.data && (
            <div className="result-data">
              <strong>Данные:</strong>
              <pre>{JSON.stringify(results.data, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="domain-checker">
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
              href="https://t.me/your_bot" 
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
              href="https://sourscraft.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="burger-link"
              onClick={() => setShowBurgerMenu(false)}
            >
              <span>🛠️</span>
              SoursCraft
            </a>
            <a 
              href="/admin" 
              className="burger-link"
              onClick={() => setShowBurgerMenu(false)}
            >
              <span>⚙️</span>
              Админ-панель
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
        {domainsData.map((item, index) => (
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
          {domainsData.map((item, index) => (
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
          {domainsData.map((_, index) => (
            <div
              key={index}
              className={`carousel-indicator ${currentSlide === index ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>

      {/* Поле ввода домена */}
      <input
        type="text"
        className={`target-input ${inputVisible ? 'visible' : ''}`}
        placeholder="Введите домен или IP адрес"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />

      {/* Контейнер для кнопки проверки и типа проверки */}
      <div className="check-container">
        {/* Кнопка проверки */}
        <div className="check-button-container">
          <div 
            className={`check-button compact ${loading ? 'loading' : ''}`}
            onClick={handleCheck}
            disabled={loading || !target || !selectedTaskType}
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

      {/* Счетчик агентов */}
      <div className="agent-counter">
        <div className="counter-label">Агенты</div>
        <div className="counter-value">{agentCount}</div>
      </div>
    </div>
  );
};

export default DomainChecker;