import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';

// Dynamic API base URL configuration
const getApiBaseUrl = () => {
  // Check if we're in development (localhost)
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3002';
  }
  // Production environment
  return 'https://flyawayballooning-system.com';
};

// Configure axios defaults to prevent 431 errors
axios.defaults.timeout = 30000;
axios.defaults.maxContentLength = 50 * 1024 * 1024; // 50MB
axios.defaults.maxBodyLength = 50 * 1024 * 1024; // 50MB

// Add axios interceptor to dynamically set baseURL for each request
axios.interceptors.request.use(function (config) {
  // Set baseURL dynamically for each request
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    config.baseURL = 'http://localhost:3002';
  } else {
    config.baseURL = 'https://flyawayballooning-system.com';
  }
  console.log('Request URL:', config.baseURL + config.url);
  return config;
}, function (error) {
  return Promise.reject(error);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
// Test deployment - Tue Aug  5 17:37:32 +03 2025
