import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
// Design system v1.0 — tokens, base styles, illustrations.
// All scoped under .kaibil-app (or :root for tokens) so they don't
// leak into existing pages until we migrate.
import './styles/tokens.css';
import './styles/base.css';
import './styles/illustrations.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);