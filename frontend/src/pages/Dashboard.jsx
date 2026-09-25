import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    ingresos: 0,
    citasHoy: 0,
    proximasCitas: [],
    citasMes: [],
    stockCritico: 0,
    capital: 0,
    alertasQuiebreStock: [],
    alertasVencimiento: [],
    productosTop: []
  });
  const [loading, setLoading] = useState(true);

  // Calendario del Dashboard
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const format = (val) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val || 0);
  };

  // Navegación de mes en el calendario
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Render de días del calendario en Dashboard
  const renderCalendarioDias = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const diasEnMes = new Date(year, month + 1, 0).getDate();
    const primerDiaRaw = new Date(year, month, 1).getDay();
    const primerDiaIdx = primerDiaRaw === 0 ? 6 : primerDiaRaw - 1;

    const cells = [];
    for (let i = 0; i < primerDiaIdx; i++) {
      cells.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    for (let d = 1; d <= diasEnMes; d++) {
      const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const citasDelDia = (data.citasMes || []).filter(c => c.fechaStr === fechaStr);
      const cantCitas = citasDelDia.length;
      const isSelected = diaSeleccionado === fechaStr;

      cells.push(
        <button
          key={d}
          type="button"
          onClick={() => setDiaSeleccionado(fechaStr)}
          className={`h-8 sm:h-9 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center relative cursor-pointer ${
            isSelected
              ? 'bg-pink-500 text-white shadow-xs shadow-pink-200 ring-2 ring-pink-300'
              : cantCitas > 0
                ? 'bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-100'
          }`}
        >
          <span>{d}</span>
          {cantCitas > 0 && (
            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-pink-500'}`}></span>
          )}
        </button>
      );
    }

    return cells;
  };

  const citasDelDiaSeleccionado = (data.citasMes || []).filter(c => c.fechaStr === diaSeleccionado);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* TARJETAS DE MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-2xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ventas Recaudadas</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{format(data.ingresos)}</h3>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-lg">
            <i className="fa-solid fa-money-bill-wave"></i>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-2xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Citas para Hoy</p>
            <h3 className="text-2xl font-black text-purple-600 mt-1">{data.citasHoy} Agendadas</h3>
          </div>
          <div className="bg-purple-50 text-purple-600 p-3 rounded-xl text-lg">
            <i className="fa-regular fa-calendar-check"></i>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-2xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Stock en Quiebre / Crítico</p>
            <h3 className="text-2xl font-black text-rose-500 mt-1">{data.alertasQuiebreStock?.length || 0} Items</h3>
          </div>
          <div className="bg-rose-50 text-rose-500 p-3 rounded-xl text-lg">
            <i className="fa-solid fa-boxes-stacked"></i>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-2xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Capital en Almacén</p>
            <h3 className="text-2xl font-black text-pink-600 mt-1">{format(data.capital)}</h3>
          </div>
          <div className="bg-pink-50 text-pink-600 p-3 rounded-xl text-lg">
            <i className="fa-solid fa-vault"></i>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: NOTIFICACIONES DE CITAS DE HOY Y CALENDARIO INTERACTIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* AVISOS / NOTIFICACIONES DE CITAS DE HOY (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-pink-100 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Avisos: Citas Programadas Hoy
              </h4>
              <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2.5 py-0.5 rounded-full">
                {data.proximasCitas?.length || 0} Hoy
              </span>
            </div>

            {(!data.proximasCitas || data.proximasCitas.length === 0) ? (
              <div className="bg-pink-50/40 p-6 rounded-2xl text-center text-gray-400 text-xs italic">
                <i className="fa-regular fa-calendar text-2xl mb-1 text-pink-300 block"></i>
                No hay citas agendadas para el día de hoy.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {data.proximasCitas.map((c) => (
                  <div key={c.id} className="p-3 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-pink-50/30 transition-all flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="bg-purple-100 text-purple-700 font-mono font-bold px-2 py-1 rounded-xl text-xs shrink-0">
                        {c.hora}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{c.cliente}</p>
                        <p className="text-[11px] text-pink-600 font-medium truncate">{c.servicio}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      c.estado === 'Confirmado' ? 'bg-blue-100 text-blue-700' :
                      c.estado === 'Por Validar' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {c.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/citas')}
            className="w-full bg-pink-50 hover:bg-pink-100 text-pink-600 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Ver toda la Agenda de Citas <i className="fa-solid fa-arrow-right text-[10px]"></i>
          </button>
        </div>

        {/* CALENDARIO VISUAL DE CITAS (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-pink-100 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <i className="fa-regular fa-calendar-days text-pink-500"></i> Calendario Visual de Citas Agendadas
            </h4>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-pink-50 text-gray-700 flex items-center justify-center text-xs cursor-pointer">
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span className="font-bold text-xs text-gray-800 min-w-28 text-center">
                {MESES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <button onClick={nextMonth} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-pink-50 text-gray-700 flex items-center justify-center text-xs cursor-pointer">
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>

          {/* Días semana */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-gray-400 uppercase">
            {DIAS_SEMANA.map((d, i) => (
              <span key={d} className={i === 6 ? 'text-rose-400' : ''}>{d}</span>
            ))}
          </div>

          {/* Celdas */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendarioDias()}
          </div>

          {/* Detalle del Día Tocado */}
          <div className="bg-pink-50/40 p-3 rounded-2xl border border-pink-100 text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-gray-800">Citas para el {diaSeleccionado}:</span>
              <span className="text-[11px] font-black text-pink-600 font-mono">{citasDelDiaSeleccionado.length} Citas</span>
            </div>
            {citasDelDiaSeleccionado.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">No hay citas registradas en este día.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {citasDelDiaSeleccionado.map(c => (
                  <span key={c.id} className="bg-white border border-pink-200 px-2 py-1 rounded-lg text-[11px] text-gray-700 shadow-2xs font-sans">
                    <strong className="text-pink-600 font-mono">{c.hora}</strong>: {c.cliente} ({c.servicio})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: PRODUCTOS TOP DE VENTAS Y QUIEBRE DE STOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* RANKING PRODUCTOS TOP DE VENTAS */}
        <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <i className="fa-solid fa-fire text-amber-500"></i> Productos TOP Más Vendidos
            </h4>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase">
              Ranking Oficial
            </span>
          </div>

          {(!data.productosTop || data.productosTop.length === 0) ? (
            <p className="text-xs text-gray-400 italic py-6 text-center">Aún no hay suficientes ventas registradas para el ranking.</p>
          ) : (
            <div className="space-y-2.5">
              {data.productosTop.map((p, idx) => (
                <div key={p.productoId} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 bg-gray-50/40 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}°`}
                    </span>
                    <div>
                      <p className="font-bold text-gray-900">{p.nombre}</p>
                      <p className="text-[11px] text-gray-400">{p.unidadesVendidas} unidades despachadas</p>
                    </div>
                  </div>
                  <span className="font-black text-emerald-600 font-mono text-sm">
                    {format(p.totalRecaudado)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ALERTA DE QUIEBRE DE STOCK */}
        <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-rose-500"></i> Alerta de Quiebre de Stock
            </h4>
            <button
              onClick={() => navigate('/inventario')}
              className="text-xs text-pink-600 hover:text-pink-700 font-bold cursor-pointer"
            >
              Ir a Inventario
            </button>
          </div>

          {(!data.alertasQuiebreStock || data.alertasQuiebreStock.length === 0) ? (
            <div className="bg-emerald-50/50 p-6 rounded-2xl text-center text-emerald-700 text-xs">
              <i className="fa-solid fa-circle-check text-2xl mb-1 text-emerald-500 block"></i>
              Todos los productos cuentan con niveles de stock óptimos.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {data.alertasQuiebreStock.map((prod) => (
                <div key={prod.id} className="p-3 rounded-2xl border border-rose-100 bg-rose-50/50 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-gray-400">{prod.codigo}</span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                        prod.estado === 'AGOTADO' ? 'bg-rose-600 text-white' : 'bg-rose-200 text-rose-800'
                      }`}>
                        {prod.estado === 'AGOTADO' ? '🔴 AGOTADO' : '⚠️ STOCK CRÍTICO'}
                      </span>
                    </div>
                    <p className="font-bold text-gray-900 mt-0.5">{prod.nombre}</p>
                    <p className="text-[10px] text-gray-500">Categoría: {prod.categoria}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-rose-700 font-mono block">
                      {prod.stockTotal} unid.
                    </span>
                    <button
                      onClick={() => navigate('/inventario')}
                      className="text-[10px] bg-white border border-rose-200 text-rose-600 font-bold px-2 py-0.5 rounded-lg shadow-2xs hover:bg-rose-50 cursor-pointer mt-1"
                    >
                      Reponer Lote
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 3: ALERTAS DE VENCIMIENTO */}
      <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <i className="fa-solid fa-hourglass-half text-amber-500 text-base"></i>
          <h4 className="text-sm font-bold text-gray-900">Control de Fechas de Vencimiento de Cosméticos</h4>
        </div>

        {data.alertasVencimiento.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">No hay cosméticos vencidos o por vencer en los próximos 45 días.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.alertasVencimiento.map((alerta) => (
              <div
                key={alerta.id}
                className={`p-3 rounded-2xl flex items-center gap-3 border text-xs ${
                  alerta.tipo === 'VENCIDO'
                    ? 'bg-rose-50/60 border-rose-100 text-rose-900'
                    : 'bg-amber-50/60 border-amber-100 text-amber-900'
                }`}
              >
                <div className={`p-2 rounded-xl text-xs text-white shrink-0 ${
                  alerta.tipo === 'VENCIDO' ? 'bg-rose-500' : 'bg-amber-500'
                }`}>
                  <i className={alerta.tipo === 'VENCIDO' ? 'fa-solid fa-calendar-xmark' : 'fa-solid fa-clock'}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs truncate">{alerta.nombre}</p>
                  <p className={`text-[11px] font-semibold ${
                    alerta.tipo === 'VENCIDO' ? 'text-rose-600' : 'text-amber-700'
                  }`}>
                    {alerta.detalle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
