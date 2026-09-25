import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dns from 'dns'

// Asegura que Node resuelva IPv4 primero en contenedores Docker y redes locales
dns.setDefaultResultOrder('ipv4first')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    host: true, // expone en la red local (necesario para Docker)
    allowedHosts: true,
    proxy: {
      // Redirige /api al contenedor del backend
      '/api': {
        target: 'http://glowmanager_backend:3004',
        changeOrigin: true,
      },
      // Redirige /uploads para ver comprobantes desde cualquier dispositivo
      '/uploads': {
        target: 'http://glowmanager_backend:3004',
        changeOrigin: true,
      },
    },
  },
})

