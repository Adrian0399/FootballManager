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
import { bootstrapTheme } from './hooks/useTheme';

// Apply the saved theme before the first paint, otherwise a dark-theme
// user would see a flash of the light background while React mounts.
bootstrapTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);