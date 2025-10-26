// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import TargetChecker from './components/TargetChecker';
import './App.css';

function App() {
  const { isAuthenticated, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">⏳</div>
        <div>Загрузка...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Главная страница */}
          <Route path="/" element={<TargetChecker />} />
          
          {/* Админ-панель */}
          <Route 
            path="/admin" 
            element={
              isAuthenticated ? (
                <AdminPanel />
              ) : (
                <Login onLogin={login} />
              )
            } 
          />
          
          {/* Резервный роут */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;