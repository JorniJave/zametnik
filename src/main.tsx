import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import './styles/globals.css';

const root = document.getElementById('root');
if (!root) {
  document.body.innerHTML =
    '<div style="color:#e8eaf0;padding:32px;font-family:Segoe UI,sans-serif">Ошибка: #root не найден</div>';
} else {
  createRoot(root).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>
  );
}
