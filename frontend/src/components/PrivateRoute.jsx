import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = () => {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-pink-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500"></div>
          <p className="text-sm font-medium text-pink-600">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  return usuario ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
