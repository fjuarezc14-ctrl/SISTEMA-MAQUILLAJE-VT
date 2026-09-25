import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Captura de errores no controlados para logging
window.addEventListener('error', (event) => {
  console.error('Error capturado en ventana:', event.error || event.message);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
