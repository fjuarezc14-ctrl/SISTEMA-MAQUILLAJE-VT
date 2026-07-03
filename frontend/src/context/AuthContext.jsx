// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Verificar si hay sesión activa al cargar la aplicación
  useEffect(() => {
    const verificarSesion = async () => {
      try {
        const respuesta = await apiClient.get('/auth/me');
        if (respuesta.data && respuesta.data.usuario) {
          setUsuario(respuesta.data.usuario);
        }
      } catch (error) {
        // Ignorar error si no hay sesión iniciada al arrancar
        console.log('Sesión no encontrada o expirada.');
      } finally {
        setCargando(false);
      }
    };
    verificarSesion();
  }, []);

  // Función para iniciar sesión
  const login = async (email, password) => {
    try {
      const respuesta = await apiClient.post('/auth/login', { email, password });
      
      if (respuesta.data && respuesta.data.usuario) {
        setUsuario(respuesta.data.usuario);
        localStorage.setItem('user', JSON.stringify(respuesta.data.usuario));
        toast.success(respuesta.data.mensaje || '¡Inicio de sesión correcto!');
        return { success: true };
      }
    } catch (error) {
      const mensajeError = error.response?.data?.error || 'Error al iniciar sesión. Inténtalo de nuevo.';
      toast.error(mensajeError);
      return { success: false, error: mensajeError };
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
      setUsuario(null);
      localStorage.removeItem('user');
      toast.success('Sesión cerrada con éxito');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Ocurrió un error al cerrar sesión.');
    }
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
