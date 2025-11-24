import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DisplayConfigProvider } from './contexts/DisplayConfigContext';
import { ChatbotProvider } from './contexts/ChatbotContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <DisplayConfigProvider>
        <ChatbotProvider>
          <App />
        </ChatbotProvider>
      </DisplayConfigProvider>
    </ErrorBoundary>
  </StrictMode>
);
