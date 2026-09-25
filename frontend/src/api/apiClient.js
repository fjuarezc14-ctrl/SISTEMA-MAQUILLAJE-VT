import axios from 'axios';

// Usa ruta relativa '/api' para que pase a través del proxy de Vite
// Esto garantiza acceso tanto desde localhost como desde cualquier IP/celular en red local
const API_URL = typeof window !== 'undefined' ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:3004/api');

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores globalmente (ej. redireccionar a login si expira el token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user');
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const url = error.config?.url || '';
      const isAuthCheck = url.includes('/auth/me');
      const isPublicPage = pathname === '/login' || pathname.startsWith('/reservar');

      if (!isAuthCheck && !isPublicPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
