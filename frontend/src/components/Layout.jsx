import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: 'fa-solid fa-chart-pie' },
    { name: 'Punto de Venta (POS)', path: '/pos', icon: 'fa-solid fa-cash-register' },
    { name: 'CRM Clientes', path: '/clientes', icon: 'fa-solid fa-users' },
    { name: 'Inventario / Stock', path: '/inventario', icon: 'fa-solid fa-boxes-stacked' },
    { name: 'Gastos Internos', path: '/gastos', icon: 'fa-solid fa-file-invoice-dollar' },
    { name: 'Agenda de Citas', path: '/citas', icon: 'fa-regular fa-calendar-check' },
    { name: 'Finanzas', path: '/finanzas', icon: 'fa-solid fa-wallet' },
  ];

  const getPageTitle = () => {
    const current = menuItems.find(item => item.path === location.pathname);
    return current ? current.name : 'GlowManager Pro';
  };

  return (
    <div className="flex h-screen overflow-hidden relative bg-pink-50/30 text-gray-800">
      
      {/* OVERLAY PARA MÓVILES */}
      {sidebarOpen && (
        <div 
          onClick={toggleSidebar} 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity md:hidden"
        ></div>
      )}

      {/* BARRA LATERAL */}
      <aside 
        className={`w-64 bg-white border-r border-pink-100 flex flex-col justify-between shadow-sm shrink-0 absolute inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-pink-500 text-white p-2 rounded-xl shadow-md shadow-pink-200">
                <i className="fa-solid fa-wand-magic-sparkles text-xl"></i>
              </div>
              <span className="text-xl font-bold tracking-wide text-gray-900">
                GlowManager <span className="text-pink-500">Pro</span>
              </span>
            </div>
            <button onClick={toggleSidebar} className="md:hidden text-gray-400 hover:text-rose-500">
              <i class="fa-solid fa-xmark text-2xl"></i>
            </button>
          </div>
          
          <nav className="space-y-1.5">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => 
                  `w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-pink-500 text-white shadow-md shadow-pink-200' 
                      : 'text-gray-500 hover:bg-pink-50 hover:text-pink-600'
                  }`
                }
              >
                <i className={`${item.icon} w-5`}></i> {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="p-6 border-t border-pink-50 flex flex-col gap-3">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 font-medium transition-all text-sm cursor-pointer"
          >
            <i className="fa-solid fa-right-from-bracket w-5"></i> Cerrar Sesión
          </button>
          <div className="text-xs text-gray-400 font-medium">
            <p>VALETEC Software S.A.C.</p>
            <p className="text-[10px] mt-0.5 text-pink-400">Sistema de Gestión Comercial</p>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* CABECERA */}
        <header className="bg-white border-b border-pink-100 px-4 md:px-8 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="md:hidden text-gray-500 hover:text-pink-500 focus:outline-none transition-colors">
              <i className="fa-solid fa-bars text-xl"></i>
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{usuario?.nombre || 'Administrador'}</p>
              <p className="text-xs text-gray-400">Rol: {usuario?.rol || 'Administrador'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold border border-pink-200 shrink-0">
              {(usuario?.nombre || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* CONTENEDOR DE LA PÁGINA */}
        <div className="p-4 md:p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
