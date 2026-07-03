import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const [data, setData] = useState({
    ingresos: 0,
    citasHoy: 0,
    stockCritico: 0,
    capital: 0,
    alertasVencimiento: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await apiClient.get('/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Error al obtener datos del dashboard:', err);
        toast.error('No se pudieron cargar los datos del panel.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const format = (val) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ventas Recaudadas</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{format(data.ingresos)}</h3>
          </div>
          <div className="bg-emerald-50 text-emerald-500 p-3 rounded-xl text-lg">
            <i className="fa-solid fa-money-bill-wave"></i>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Citas para Hoy</p>
            <h3 className="text-2xl font-black text-purple-600 mt-1">{data.citasHoy}</h3>
          </div>
          <div className="bg-purple-50 text-purple-500 p-3 rounded-xl text-lg">
            <i className="fa-regular fa-calendar-check"></i>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stock Crítico</p>
            <h3 className="text-2xl font-black text-rose-500 mt-1">{data.stockCritico} Items</h3>
          </div>
          <div className="bg-rose-50 text-rose-500 p-3 rounded-xl text-lg">
            <i className="fa-solid fa-boxes-stacked"></i>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Capital Inventario</p>
            <h3 className="text-2xl font-black text-pink-600 mt-1">{format(data.capital)}</h3>
          </div>
          <div className="bg-pink-50 text-pink-500 p-3 rounded-xl text-lg">
            <i className="fa-solid fa-vault"></i>
          </div>
        </div>
      </div>

      {/* ALERTAS DE VENCIMIENTO */}
      <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <i className="fa-solid fa-triangle-exclamation text-amber-500 text-lg"></i>
          <h4 className="text-lg font-bold text-gray-900">Alertas de Vencimiento de Cosméticos</h4>
        </div>
        
        {data.alertasVencimiento.length === 0 ? (
          <p className="text-sm text-gray-500 italic py-4">No hay productos vencidos o próximos a vencer en los siguientes 45 días.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.alertasVencimiento.map((alerta) => (
              <div 
                key={alerta.id} 
                className={`p-4 rounded-xl flex items-center gap-4 border ${
                  alerta.tipo === 'VENCIDO' 
                    ? 'bg-rose-50/60 border-rose-100 text-rose-900' 
                    : 'bg-amber-50/60 border-amber-100 text-amber-900'
                }`}
              >
                <div className={`p-2.5 rounded-lg text-sm shrink-0 text-white ${
                  alerta.tipo === 'VENCIDO' ? 'bg-rose-500' : 'bg-amber-500'
                }`}>
                  <i className={alerta.tipo === 'VENCIDO' ? 'fa-solid fa-calendar-xmark' : 'fa-solid fa-hourglass-half'}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{alerta.nombre}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${
                    alerta.tipo === 'VENCIDO' ? 'text-rose-600' : 'text-amber-700'
                  }`}>
                    {alerta.detalle}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider hidden sm:block ${
                  alerta.tipo === 'VENCIDO' ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'
                }`}>
                  {alerta.tipo === 'VENCIDO' ? 'Retirar' : 'Alerta'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
