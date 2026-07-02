import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    host: true, // expone en la red local (necesario para Docker)
    proxy: {
      // En desarrollo, redirige /api al backend sin CORS
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
})

