import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// 标记 HTML 为已加载
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('loaded');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
