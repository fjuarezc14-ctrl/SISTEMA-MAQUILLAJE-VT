import React from 'react';
import { useAuth } from '../context/AuthContext';

const DashboardPlaceholder = () => {
  const { usuario, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-pink-50/30 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg border border-pink-100">
        <h1 className="text-2xl font-bold text-gray-900">¡Bienvenido a GlowManager Pro!</h1>
        <p className="mt-2 text-gray-600">Sesión iniciada con éxito.</p>
        
        <div className="mt-6 rounded-xl bg-pink-50 p-4 text-left border border-pink-100">
          <p className="text-xs font-bold text-gray-500 uppercase">Usuario</p>
          <p className="font-semibold text-gray-900">{usuario?.nombre}</p>
          
          <p className="mt-2 text-xs font-bold text-gray-500 uppercase">Correo</p>
          <p className="font-semibold text-gray-900">{usuario?.email}</p>
          
          <p className="mt-2 text-xs font-bold text-gray-500 uppercase">Rol</p>
          <span className="mt-1 inline-block rounded-full bg-pink-200 px-3 py-0.5 text-xs font-bold text-pink-800 uppercase">
            {usuario?.rol}
          </span>
        </div>

        <button
          onClick={logout}
          className="mt-6 w-full rounded-xl bg-rose-500 py-3 text-sm font-bold text-white hover:bg-rose-600 transition-colors shadow-md shadow-rose-100"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default DashboardPlaceholder;
