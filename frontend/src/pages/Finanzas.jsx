import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const Finanzas = () => {
  const [tabActiva, setTabActiva] = useState('balance'); // 'balance' | 'servicios' | 'reporteDia' | 'personal'

  // Estados de Balance General
  const [balanceData, setBalanceData] = useState({
    ingresos: 0,
    egresos: 0,
    gananciaNeta: 0,
    capital: 0,
    movimientos: []
  });
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  // Estados de Catálogo de Servicios
  const [servicios, setServicios] = useState([]);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [showServicioModal, setShowServicioModal] = useState(false);
  const [servicioEditando, setServicioEditando] = useState(null);
  const [formServicio, setFormServicio] = useState({
    nombre: '',
    categoria: 'Maquillaje',
    precio: '',
    duracion: '45 min',
    descripcion: ''
  });

  // Estados de Reporte del Día
  const [fechaReporte, setFechaReporte] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [reporteDia, setReporteDia] = useState(null);
  const [loadingReporte, setLoadingReporte] = useState(false);

  // Estados de Personal / Colaboradoras
  const [personalList, setPersonalList] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [personalEditando, setPersonalEditando] = useState(null);
  const [formPersonal, setFormPersonal] = useState({
    nombre: '',
    cargo: 'Maquilladora',
    telefono: ''
  });

  const format = (val) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val || 0);
  };

  const formatFecha = (str) => {
    if (!str) return '-';
    const d = new Date(str);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day}/${month}/${year} ${time}`;
  };

  // 1. Cargar Balance General
  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      const res = await apiClient.get('/finanzas');
      setBalanceData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar los datos financieros.');
    } finally {
      setLoadingBalance(false);
    }
  };

  // 2. Cargar Servicios
  const fetchServicios = async () => {
    setLoadingServicios(true);
    try {
      const res = await apiClient.get('/servicios');
      setServicios(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar catálogo de servicios.');
    } finally {
      setLoadingServicios(false);
    }
  };

  // 3. Cargar Reporte del Día
  const fetchReporteDia = async (fechaParam) => {
    setLoadingReporte(true);
    try {
      const f = fechaParam || fechaReporte;
      const res = await apiClient.get(`/ventas/reporte-del-dia?fecha=${f}`);
      setReporteDia(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar reporte diario.');
    } finally {
      setLoadingReporte(false);
    }
  };

  // 4. Cargar Personal
  const fetchPersonal = async () => {
    setLoadingPersonal(true);
    try {
      const res = await apiClient.get('/personal');
      setPersonalList(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar personal.');
    } finally {
      setLoadingPersonal(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    if (tabActiva === 'servicios') fetchServicios();
    if (tabActiva === 'reporteDia') fetchReporteDia(fechaReporte);
    if (tabActiva === 'personal') fetchPersonal();
  }, [tabActiva]);

  // Manejadores de Servicios
  const abrirModalCrearServicio = () => {
    setServicioEditando(null);
    setFormServicio({ nombre: '', categoria: 'Maquillaje', precio: '', duracion: '45 min', descripcion: '' });
    setShowServicioModal(true);
  };

  const abrirModalEditarServicio = (s) => {
    setServicioEditando(s);
    setFormServicio({
      nombre: s.nombre,
      categoria: s.categoria || 'Maquillaje',
      precio: String(s.precio),
      duracion: s.duracion || '45 min',
      descripcion: s.descripcion || ''
    });
    setShowServicioModal(true);
  };

  const handleGuardarServicio = async (e) => {
    e.preventDefault();
    try {
      if (servicioEditando) {
        await apiClient.put(`/servicios/${servicioEditando.id}`, formServicio);
        toast.success('Servicio actualizado exitosamente.');
      } else {
        await apiClient.post('/servicios', formServicio);
        toast.success('Servicio añadido al catálogo.');
      }
      setShowServicioModal(false);
      fetchServicios();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar servicio.');
    }
  };

  const handleEliminarServicio = async (id) => {
    if (window.confirm('¿Desea desactivar este servicio del catálogo?')) {
      try {
        await apiClient.delete(`/servicios/${id}`);
        toast.success('Servicio retirado del catálogo.');
        fetchServicios();
      } catch (err) {
        toast.error('Error al retirar servicio.');
      }
    }
  };

  // Manejadores de Personal
  const abrirModalCrearPersonal = () => {
    setPersonalEditando(null);
    setFormPersonal({ nombre: '', cargo: 'Maquilladora', telefono: '' });
    setShowPersonalModal(true);
  };

  const abrirModalEditarPersonal = (p) => {
    setPersonalEditando(p);
    setFormPersonal({ nombre: p.nombre, cargo: p.cargo, telefono: p.telefono || '' });
    setShowPersonalModal(true);
  };

  const handleGuardarPersonal = async (e) => {
    e.preventDefault();
    try {
      if (personalEditando) {
        await apiClient.put(`/personal/${personalEditando.id}`, formPersonal);
        toast.success('Personal actualizado correctamente.');
      } else {
        await apiClient.post('/personal', formPersonal);
        toast.success('Colaboradora registrada con éxito.');
      }
      setShowPersonalModal(false);
      fetchPersonal();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar personal.');
    }
  };

  const handleEliminarPersonal = async (id) => {
    if (window.confirm('¿Dar de baja a esta colaboradora?')) {
      try {
        await apiClient.delete(`/personal/${id}`);
        toast.success('Personal dado de baja.');
        fetchPersonal();
      } catch (err) {
        toast.error('Error al eliminar personal.');
      }
    }
  };

  const filteredMovimientos = (balanceData.movimientos || []).filter((m) => {
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

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* CABECERA Y SUB-PESTAÑAS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900">Módulo de Finanzas & Gestión</h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Control de rentabilidad, catálogo de servicios, reportes de actividad diaria y personal.
          </p>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-pink-100 shadow-2xs overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setTabActiva('balance')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              tabActiva === 'balance' ? 'bg-pink-500 text-white shadow-2xs shadow-pink-200' : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <i className="fa-solid fa-chart-line"></i> Balance General
          </button>
          <button
            onClick={() => setTabActiva('servicios')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              tabActiva === 'servicios' ? 'bg-pink-500 text-white shadow-2xs shadow-pink-200' : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i> Catálogo Servicios
          </button>
          <button
            onClick={() => setTabActiva('reporteDia')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              tabActiva === 'reporteDia' ? 'bg-pink-500 text-white shadow-2xs shadow-pink-200' : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <i className="fa-solid fa-calendar-day"></i> Ventas del Día
          </button>
          <button
            onClick={() => setTabActiva('personal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              tabActiva === 'personal' ? 'bg-pink-500 text-white shadow-2xs shadow-pink-200' : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <i className="fa-solid fa-user-tie"></i> Personal
          </button>
        </div>
      </div>

      {/* ────────────────── PESTAÑA 1: BALANCE GENERAL ────────────────── */}
      {tabActiva === 'balance' && (
        <div className="space-y-6">
          {loadingBalance ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-2xs">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">1. Ingresos Totales</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{format(balanceData.ingresos)}</h3>
                  <p className="text-[11px] text-gray-400 mt-1">Facturación acumulada en el sistema</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-2xs">
                  <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">2. Costos y Egresos</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{format(balanceData.egresos)}</h3>
                  <p className="text-[11px] text-gray-400 mt-1">Costo de mercadería + gastos operativos</p>
                </div>
                <div className="bg-emerald-50/80 p-5 rounded-2xl border border-emerald-100 shadow-2xs">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">3. Ganancia Neta Real</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{format(balanceData.gananciaNeta)}</h3>
                  <p className="text-[11px] text-emerald-600 mt-1">Rentabilidad neta del negocio</p>
                </div>
              </div>

              {/* Capital Inmovilizado */}
              <div className="bg-gradient-to-r from-pink-500 to-rose-400 p-5 rounded-2xl text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="text-base font-bold flex items-center gap-2">
                    <i className="fa-solid fa-vault"></i> Valor del Capital Inmovilizado en Inventario
                  </h4>
                  <p className="text-xs text-pink-100 max-w-xl mt-1">
                    Valor total de la mercadería disponible en almacén calculado a precio de venta comercial.
                  </p>
                </div>
                <div className="bg-white/10 px-5 py-3 rounded-xl border border-white/20 text-center w-full md:w-auto shrink-0">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-pink-100 block">Capital de Stock</span>
                  <span className="text-2xl font-black">{format(balanceData.capital)}</span>
                </div>
              </div>

              {/* Libro Mayor */}
              <div className="bg-white rounded-2xl shadow-2xs border border-pink-100 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <i className="fa-solid fa-book text-pink-500"></i> Auditoría Financiera (Libro Mayor)
                  </h4>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Filtrar movimientos..."
                      value={filtroBusqueda}
                      onChange={(e) => setFiltroBusqueda(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs w-full sm:w-56 focus:outline-none focus:border-pink-400"
                    />
                    <select
                      value={filtroTipo}
                      onChange={(e) => setFiltroTipo(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 cursor-pointer"
                    >
                      <option value="Todos">Todos</option>
                      <option value="Ingreso">Ingresos</option>
                      <option value="Egreso">Egresos</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider bg-gray-50/50">
                        <th className="p-3 font-bold">Fecha / Hora</th>
                        <th className="p-3 font-bold">Tipo</th>
                        <th className="p-3 font-bold">Concepto</th>
                        <th className="p-3 font-bold">Detalle</th>
                        <th className="p-3 font-bold text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredMovimientos.slice(0, 30).map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50/40">
                          <td className="p-3 font-mono text-gray-500 whitespace-nowrap">{formatFecha(m.fecha)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              m.tipo === 'Ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {m.tipo}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-gray-800">{m.concepto}</td>
                          <td className="p-3 text-gray-500 max-w-xs truncate">{m.detalle}</td>
                          <td className={`p-3 text-right font-mono font-bold ${
                            m.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {m.tipo === 'Ingreso' ? '+' : '-'} {format(m.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ────────────────── PESTAÑA 2: CATÁLOGO DE SERVICIOS ────────────────── */}
      {tabActiva === 'servicios' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Catálogo Oficial de Servicios de Boutique</h3>
              <p className="text-xs text-gray-400">
                Precios y categorías predefinidas para filtrar y cobrar sin necesidad de tipeo manual.
              </p>
            </div>
            <button
              onClick={abrirModalCrearServicio}
              className="bg-pink-500 hover:bg-pink-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs shadow-pink-200 cursor-pointer"
            >
              <i className="fa-solid fa-plus"></i> Nuevo Servicio
            </button>
          </div>

          {loadingServicios ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-200 border-t-pink-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {servicios.map((s) => (
                <div key={s.id} className="bg-white p-4 rounded-2xl border border-pink-100/80 shadow-2xs hover:border-pink-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 border border-pink-100">
                        {s.categoria}
                      </span>
                      <span className="font-black text-pink-600 text-base font-mono">{format(s.precio)}</span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 mt-2">{s.nombre}</h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.descripcion || 'Sin descripción detallada.'}</p>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 text-xs">
                    <span className="text-gray-400 font-medium">
                      <i className="fa-regular fa-clock mr-1 text-pink-400"></i> {s.duracion}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirModalEditarServicio(s)}
                        className="text-blue-500 hover:text-blue-700 p-1 cursor-pointer"
                        title="Editar servicio"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => handleEliminarServicio(s.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        title="Desactivar"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────── PESTAÑA 3: REPORTES DE VENTA DEL DÍA ────────────────── */}
      {tabActiva === 'reporteDia' && (
        <div className="space-y-4">
          {/* Barra de Filtro de Fecha */}
          <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Flujo de Caja y Ventas del Día</h3>
              <p className="text-xs text-gray-400">Conoce tus ingresos y egresos exactos acorde a la actividad realizada.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">Fecha:</label>
              <input
                type="date"
                value={fechaReporte}
                onChange={(e) => {
                  setFechaReporte(e.target.value);
                  fetchReporteDia(e.target.value);
                }}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 font-bold text-gray-700 bg-gray-50/50"
              />
              <button
                onClick={() => fetchReporteDia(fechaReporte)}
                className="bg-pink-50 text-pink-600 hover:bg-pink-100 p-2 rounded-xl text-xs cursor-pointer"
                title="Actualizar reporte"
              >
                <i className="fa-solid fa-rotate"></i>
              </button>
            </div>
          </div>

          {loadingReporte ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-200 border-t-pink-500"></div>
            </div>
          ) : reporteDia ? (
            <>
              {/* Tarjetas de Métricas del Día */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Facturación Total</span>
                  <span className="text-xl font-black text-gray-900 font-mono mt-0.5 block">{format(reporteDia.resumen?.totalFacturado)}</span>
                </div>
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Servicios del Día</span>
                  <span className="text-xl font-black text-emerald-600 font-mono mt-0.5 block">{format(reporteDia.resumen?.ingresosServicios)}</span>
                </div>
                <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">Productos / Cosméticos</span>
                  <span className="text-xl font-black text-purple-600 font-mono mt-0.5 block">{format(reporteDia.resumen?.ingresosProductos)}</span>
                </div>
                <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Egresos / Gastos</span>
                  <span className="text-xl font-black text-rose-600 font-mono mt-0.5 block">{format(reporteDia.resumen?.totalEgresosReales)}</span>
                </div>
              </div>

              {/* Balance Neto del Día */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-100 block">Resultado Operativo del Día</span>
                  <h4 className="text-2xl sm:text-3xl font-black font-mono mt-0.5">{format(reporteDia.resumen?.balanceNeto)}</h4>
                  <p className="text-xs text-emerald-100 mt-1">
                    Efectivo en caja: {format(reporteDia.resumen?.ventasEfectivo)} | Pagos digitales (Yape/Plin/Tarjeta): {format(reporteDia.resumen?.ventasDigital)}
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-xs text-xs text-center w-full sm:w-auto">
                  <span className="text-emerald-100 block font-medium">Abonos recibidos:</span>
                  <span className="font-bold text-white text-sm">{format(reporteDia.resumen?.totalAbonos)}</span>
                </div>
              </div>

              {/* Detalle de Ventas Registradas en el Día */}
              <div className="bg-white rounded-2xl shadow-2xs border border-pink-100 p-4 sm:p-5 space-y-3">
                <h4 className="font-bold text-gray-900 text-xs sm:text-sm uppercase tracking-wider">
                  <i className="fa-solid fa-receipt text-pink-500 mr-1.5"></i> Detalle de Ventas y Comprobantes ({reporteDia.ventas?.length || 0})
                </h4>

                {reporteDia.ventas?.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4 text-center">No hubo ventas registradas en esta fecha.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 bg-gray-50/50">
                          <th className="p-2.5 font-bold">Hora</th>
                          <th className="p-2.5 font-bold">Comprobante</th>
                          <th className="p-2.5 font-bold">Cliente</th>
                          <th className="p-2.5 font-bold">Actividad / Ítems</th>
                          <th className="p-2.5 font-bold">Método</th>
                          <th className="p-2.5 font-bold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reporteDia.ventas?.map((v) => (
                          <tr key={v.id} className="hover:bg-gray-50/40">
                            <td className="p-2.5 font-mono text-gray-500">{v.hora}</td>
                            <td className="p-2.5">
                              <span className="font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[11px]">
                                {v.numeroComprobante || `${v.tipoComprobante} #${v.id}`}
                              </span>
                            </td>
                            <td className="p-2.5 font-bold text-gray-800">{v.cliente}</td>
                            <td className="p-2.5 text-gray-600 max-w-xs truncate">{v.items}</td>
                            <td className="p-2.5 font-medium text-gray-500">{v.metodoPago}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-600">{format(v.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ────────────────── PESTAÑA 4: PERSONAL / COLABORADORAS ────────────────── */}
      {tabActiva === 'personal' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Equipo de Trabajo y Colaboradoras</h3>
              <p className="text-xs text-gray-400">Designa y administra a las estilistas y maquilladoras del estudio.</p>
            </div>
            <button
              onClick={abrirModalCrearPersonal}
              className="bg-pink-500 hover:bg-pink-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs shadow-pink-200 cursor-pointer"
            >
              <i className="fa-solid fa-user-plus"></i> Nueva Colaboradora
            </button>
          </div>

          {loadingPersonal ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-200 border-t-pink-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {personalList.map((p) => (
                <div key={p.id} className="bg-white p-4 rounded-2xl border border-pink-100/80 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 font-bold flex items-center justify-center text-sm shrink-0">
                      {p.nombre.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate">{p.nombre}</h4>
                      <p className="text-[11px] font-semibold text-pink-600">{p.cargo}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{p.telefono || 'Sin teléfono'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => abrirModalEditarPersonal(p)}
                      className="text-blue-500 hover:text-blue-700 p-1 cursor-pointer"
                      title="Editar"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      onClick={() => handleEliminarPersonal(p.id)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      title="Dar de baja"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL CREAR / EDITAR SERVICIO ── */}
      {showServicioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-pink-100 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-gray-900">
                {servicioEditando ? 'Editar Servicio' : 'Nuevo Servicio de Boutique'}
              </h3>
              <button onClick={() => setShowServicioModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleGuardarServicio} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Nombre del Servicio *</label>
                <input
                  type="text"
                  required
                  value={formServicio.nombre}
                  onChange={(e) => setFormServicio({ ...formServicio, nombre: e.target.value })}
                  placeholder="Ej. Maquillaje Social Blindado"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-pink-400 bg-gray-50/40 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Categoría</label>
                  <select
                    value={formServicio.categoria}
                    onChange={(e) => setFormServicio({ ...formServicio, categoria: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-pink-400 bg-gray-50/40 cursor-pointer"
                  >
                    <option value="Maquillaje">Maquillaje</option>
                    <option value="Peinado">Peinado</option>
                    <option value="Cejas">Cejas</option>
                    <option value="Pestañas">Pestañas</option>
                    <option value="Uñas">Uñas</option>
                    <option value="Packs">Packs & Promos</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-1">Precio (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={formServicio.precio}
                    onChange={(e) => setFormServicio({ ...formServicio, precio: e.target.value })}
                    placeholder="70.00"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-pink-400 bg-gray-50/40 font-bold text-pink-600 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Duración Estimada</label>
                <input
                  type="text"
                  value={formServicio.duracion}
                  onChange={(e) => setFormServicio({ ...formServicio, duracion: e.target.value })}
                  placeholder="Ej. 45 min, 1 hora y media"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-pink-400 bg-gray-50/40"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Descripción</label>
                <textarea
                  rows="2"
                  value={formServicio.descripcion}
                  onChange={(e) => setFormServicio({ ...formServicio, descripcion: e.target.value })}
                  placeholder="Detalles sobre lo que incluye la sesión..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-pink-400 bg-gray-50/40 resize-none"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowServicioModal(false)}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2.5 rounded-xl shadow-xs shadow-pink-200 cursor-pointer"
                >
                  Guardar Servicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CREAR / EDITAR PERSONAL ── */}
      {showPersonalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-pink-100 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-gray-900">
                {personalEditando ? 'Editar Colaboradora' : 'Nueva Colaboradora'}
              </h3>
              <button onClick={() => setShowPersonalModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleGuardarPersonal} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formPersonal.nombre}
                  onChange={(e) => setFormPersonal({ ...formPersonal, nombre: e.target.value })}
                  placeholder="Ej. Lucía Quispe"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-pink-400 bg-gray-50/40 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Cargo / Especialidad *</label>
                <input
                  type="text"
                  required
                  value={formPersonal.cargo}
                  onChange={(e) => setFormPersonal({ ...formPersonal, cargo: e.target.value })}
                  placeholder="Ej. Maquilladora Principal, Estilista"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-pink-400 bg-gray-50/40 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  value={formPersonal.telefono}
                  onChange={(e) => setFormPersonal({ ...formPersonal, telefono: e.target.value })}
                  placeholder="Ej. 987654321"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-pink-400 bg-gray-50/40"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPersonalModal(false)}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2.5 rounded-xl shadow-xs shadow-pink-200 cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finanzas;
