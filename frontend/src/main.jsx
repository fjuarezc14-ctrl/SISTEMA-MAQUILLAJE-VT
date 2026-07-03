import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Lanzar errores en pantalla en caso de fallo de renderizado
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 30px; background: #fff5f5; color: #c53030; font-family: system-ui, sans-serif; border-radius: 12px; margin: 20px; border: 1px solid #feb2b2;">
        <h2 style="margin-top: 0;">Error de Ejecución (Runtime Error)</h2>
        <p><strong>Mensaje:</strong> ${event.message}</p>
        <p><strong>Archivo:</strong> ${event.filename}</p>
        <p><strong>Línea:</strong> ${event.lineno}:${event.colno}</p>
        <p style="font-size: 13px; color: #742a2a; margin-top: 15px;">Por favor, toma una captura de pantalla de este mensaje para diagnosticar el problema.</p>
      </div>
    `;
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
