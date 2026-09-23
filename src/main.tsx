import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { store } from './data';
import { aplicarTema, tema } from './services/preferencias';
import './index.css';

// O index.html já pintou o tema antes do React; isto só garante que os dois concordam.
aplicarTema(tema.get());
void store.iniciar();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
