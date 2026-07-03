import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const Finanzas = () => {
  const [data, setData] = useState({
    ingresos: 0,
    egresos: 0,
    gananciaNeta: 0,
    capital: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        const res = await apiClient.get('/finanzas');
        setData(res.data);
      } catch (err) {
        console.error('Error al obtener datos financieros:', err);
        toast.error('No se pudieron cargar los datos financieros.');
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
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
      <p className="text-sm text-gray-500 font-medium">
        Reporte de rentabilidad, balance y capital del negocio.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">1. Ingresos (Ventas)</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-2">{format(data.ingresos)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">2. Costos y Egresos Totales</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-2">{format(data.egresos)}</h3>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">3. Ganancia Neta Real</p>
          <h3 className="text-3xl font-bold text-emerald-600 mt-2">{format(data.gananciaNeta)}</h3>
        </div>
      </div>

      <div className="bg-gradient-to-r from-pink-500 to-rose-400 p-6 rounded-2xl text-white shadow-md shadow-pink-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 className="text-lg font-bold flex items-center gap-2">
            <i className="fa-solid fa-circle-info"></i> Valor del Capital Inmovilizado en Inventario
          </h4>
          <p className="text-xs text-pink-105 max-w-xl mt-1">
            Simula el valor total de su mercadería a precio de venta. Se reduce automáticamente al vender.
          </p>
        </div>
        <div className="bg-white/10 px-6 py-4 rounded-xl border border-white/20 text-center w-full md:w-auto shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-widest text-pink-100 block">Capital de Stock</span>
          <span className="text-3xl font-black tracking-tight">{format(data.capital)}</span>
        </div>
      </div>
    </div>
  );
};

export default Finanzas;
