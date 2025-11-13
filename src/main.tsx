import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DisplayConfigProvider } from './contexts/DisplayConfigContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <DisplayConfigProvider>
        <App />
      </DisplayConfigProvider>
    </ErrorBoundary>
  </StrictMode>
);
