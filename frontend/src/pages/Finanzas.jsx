import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const Finanzas = () => {
  const [data, setData] = useState({
    ingresos: 0,
    egresos: 0,
    gananciaNeta: 0,
    capital: 0,
    movimientos: []
  });
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

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

  const formatFecha = (str) => {
    const d = new Date(str);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day}/${month}/${year} ${time}`;
  };

  const filteredMovimientos = (data.movimientos || []).filter((m) => {
    if (filtroTipo !== 'Todos' && m.tipo !== filtroTipo) return false;
    if (filtroBusqueda.trim() !== '') {
      const q = filtroBusqueda.toLowerCase();
      const matchConcepto = m.concepto.toLowerCase().includes(q);
      const matchDetalle = (m.detalle || '').toLowerCase().includes(q);
      const matchMetodo = (m.metodoPago || '').toLowerCase().includes(q);
      return matchConcepto || matchDetalle || matchMetodo;
    }
    return true;
  });

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

      {/* LIBRO MAYOR / HISTORIAL DE MOVIMIENTOS */}
      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              <i className="fa-solid fa-file-invoice-dollar mr-1.5 text-pink-500"></i> Historial de Movimientos de Caja y Costos
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Auditoría cronológica de ingresos por ventas/servicios y egresos por costos/gastos.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de Tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 bg-white cursor-pointer"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Ingreso">Ingresos</option>
              <option value="Egreso">Egresos</option>
            </select>
            
            {/* Buscador de Texto */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por concepto o cliente..."
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 bg-white w-48 md:w-56"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-400 text-[10px]"></i>
              {filtroBusqueda && (
                <button
                  onClick={() => setFiltroBusqueda('')}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredMovimientos.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 italic">
              {data.movimientos.length === 0 
                ? "No se registran movimientos en el sistema aún."
                : "No se encontraron movimientos que coincidan con los filtros aplicados."}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase font-bold text-gray-500">
                  <th className="px-6 py-3 font-semibold">Fecha</th>
                  <th className="px-6 py-3 font-semibold">Tipo</th>
                  <th className="px-6 py-3 font-semibold">Concepto</th>
                  <th className="px-6 py-3 font-semibold">Detalle</th>
                  <th className="px-6 py-3 font-semibold text-right">Monto</th>
                  <th className="px-6 py-3 font-semibold text-center">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredMovimientos.map((mov) => {
                  const esIngreso = mov.tipo === 'Ingreso';
                  return (
                    <tr key={mov.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-6 py-3.5 text-gray-400 font-mono text-[11px] whitespace-nowrap">
                        {formatFecha(mov.fecha)}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          esIngreso 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${esIngreso ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {mov.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-bold text-gray-700 whitespace-nowrap">
                        {mov.concepto}
                      </td>
                      <td className="px-6 py-3.5 text-gray-500 max-w-xs truncate">
                        {mov.detalle}
                      </td>
                      <td className={`px-6 py-3.5 text-right font-bold font-mono text-[13px] whitespace-nowrap ${
                        esIngreso ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {esIngreso ? '+' : '-'} {format(mov.monto)}
                      </td>
                      <td className="px-6 py-3.5 text-center text-gray-400 font-semibold font-sans whitespace-nowrap">
                        {mov.metodoPago}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Finanzas;
