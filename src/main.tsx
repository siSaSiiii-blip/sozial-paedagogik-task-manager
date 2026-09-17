import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Login from './Login.tsx';
import { hasConfig } from './lib/storage';
import './index.css';

function Root() {
  const [angemeldet, setAngemeldet] = useState(hasConfig());

  if (!angemeldet) {
    return <Login onSuccess={() => setAngemeldet(true)} />;
  }
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
