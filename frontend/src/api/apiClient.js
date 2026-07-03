import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003/api';

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
      // Si recibimos un 401, limpiamos el localStorage de usuario y forzamos redirección
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
