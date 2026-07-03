import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setErrorLocal('');

    const resultado = await login(email, password);
    setCargando(false);

    if (resultado.success) {
      navigate('/');
    } else {
      setErrorLocal(resultado.error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-pink-100 via-pink-50/30 to-rose-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-8 shadow-xl border border-pink-100/50">
        
        {/* Encabezado con logo o icono */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500 text-white shadow-md shadow-pink-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21bc-.115.795-.935 1.298-1.688.948L4.318 20.35a1.125 1.125 0 01-.527-.852l-.462-3.18a1.875 1.875 0 011.082-2.022l1.688-.844a1.875 1.875 0 012.38 1.083l.267.801m1.072-3.273l.267-.801a1.875 1.875 0 012.38-1.083l1.688.844a1.875 1.875 0 011.082 2.022l-.462 3.18a1.125 1.125 0 01-.527.852L16.5 21.948c-.753.35-1.573-.153-1.688-.948l-.813-5.044m1.072-3.273L15 13.5m-3-4.5c.08.337.025.702-.158 1.002L10.5 12h3l-.342-1.498a1.125 1.125 0 00-.158-1.002L12 9.002m0 0l-.342-1.498a1.125 1.125 0 00-.158-1.002L12 6.502" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900">
            GlowManager <span className="text-pink-500">Pro</span>
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Gestión y Ventas de Cosméticos
          </p>
        </div>

        {/* Alerta de Error */}
        {errorLocal && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-100">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{errorLocal}</h3>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Correo Electrónico
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 bg-gray-50/50"
                placeholder="admin@glowmanager.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 bg-gray-50/50"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={cargando}
              className="group relative flex w-full justify-center rounded-xl bg-pink-500 py-3.5 px-4 text-sm font-bold text-white hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-100"
            >
              {cargando ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
