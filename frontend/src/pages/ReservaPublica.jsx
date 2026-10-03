import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';

// Ruta relativa '' para pasar a través del proxy de Vite
const API_BASE = '';
const DRAFT_KEY = 'glow_reserva_draft_v1';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Cargar borrador persistido para que no se pierda al minimizar o cambiar de app
const loadDraft = () => {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

const ReservaPublica = () => {
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Carga inicial del borrador si existe
  const [draft] = useState(() => loadDraft());

  // Stepper: 1: Servicio y Horario, 2: Datos, 3: Pago y Voucher, 4: Éxito
  const [step, setStep] = useState(() => (draft?.step && draft.step < 4 ? draft.step : 1));

  // Selección
  const [servicioSeleccionado, setServicioSeleccionado] = useState(() => draft?.servicioSeleccionado || '');
  const [servicioDetalle, setServicioDetalle] = useState(() => draft?.servicioDetalle || null);

  // Calendario visual
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (draft?.fecha) {
      const [y, m] = draft.fecha.split('-').map(Number);
      if (y && m) return new Date(y, m - 1, 1);
    }
    return new Date();
  });
  const [fecha, setFecha] = useState(() => draft?.fecha || '');
  const [turnos, setTurnos] = useState([]);
  const [horaSeleccionada, setHoraSeleccionada] = useState(() => draft?.horaSeleccionada || '');
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const [diaCerradoMensaje, setDiaCerradoMensaje] = useState('');

  // Datos de cliente
  const [clienteNombre, setClienteNombre] = useState(() => draft?.clienteNombre || '');
  const [clienteDni, setClienteDni] = useState(() => draft?.clienteDni || '');
  const [clienteTelefono, setClienteTelefono] = useState(() => draft?.clienteTelefono || '');
  const [clienteCorreo, setClienteCorreo] = useState(() => draft?.clienteCorreo || '');
  const [notas, setNotas] = useState(() => draft?.notas || '');

  // Pago
  const [metodoPagoReserva, setMetodoPagoReserva] = useState(() => draft?.metodoPagoReserva || 'Yape');
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Éxito
  const [resultadoReserva, setResultadoReserva] = useState(null);

  // Guardar estado automáticamente en localStorage cada vez que cambia
  useEffect(() => {
    if (step < 4) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          step,
          servicioSeleccionado,
          servicioDetalle,
          fecha,
          horaSeleccionada,
          clienteNombre,
          clienteDni,
          clienteTelefono,
          clienteCorreo,
          notas,
          metodoPagoReserva,
        }));
      } catch (err) {
        console.warn('[ReservaPublica] Error al guardar borrador en localStorage:', err.message);
      }
    }
  }, [
    step, servicioSeleccionado, servicioDetalle, fecha, horaSeleccionada,
    clienteNombre, clienteDni, clienteTelefono, clienteCorreo, notas, metodoPagoReserva
  ]);

  // Guardar de inmediato si la ventana se minimiza o pasa a segundo plano (ej. abrir Yape)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && step < 4) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({
            step,
            servicioSeleccionado,
            servicioDetalle,
            fecha,
            horaSeleccionada,
            clienteNombre,
            clienteDni,
            clienteTelefono,
            clienteCorreo,
            notas,
            metodoPagoReserva,
          }));
        } catch (err) {
          console.warn('[ReservaPublica] Error al guardar borrador en visibilidad oculta:', err.message);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [
    step, servicioSeleccionado, servicioDetalle, fecha, horaSeleccionada,
    clienteNombre, clienteDni, clienteTelefono, clienteCorreo, notas, metodoPagoReserva
  ]);

  // Cargar configuración inicial
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/public/configuracion`);
        setConfig(res.data);
        if (res.data.servicios && res.data.servicios.length > 0) {
          if (!servicioSeleccionado) {
            setServicioSeleccionado(res.data.servicios[0].nombre);
            setServicioDetalle(res.data.servicios[0]);
          } else if (!servicioDetalle) {
            const findServ = res.data.servicios.find(s => s.nombre === servicioSeleccionado);
            if (findServ) setServicioDetalle(findServ);
          }
        }
      } catch (err) {
        console.error('Error al cargar configuración:', err);
        toast.error('No se pudo conectar con el sistema de reservas.');
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();

    // Solo definir fecha inicial por defecto si no venía del borrador guardado
    if (!fecha) {
      const hoy = new Date();
      if (hoy.getDay() === 0) {
        hoy.setDate(hoy.getDate() + 1);
      }
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, '0');
      const dd = String(hoy.getDate()).padStart(2, '0');
      setFecha(`${yyyy}-${mm}-${dd}`);
    }
  }, []);

  // Consultar disponibilidad al cambiar fecha
  useEffect(() => {
    if (!fecha) return;

    const fetchDisponibilidad = async () => {
      setLoadingTurnos(true);
      setDiaCerradoMensaje('');
      try {
        const res = await axios.get(`${API_BASE}/api/public/disponibilidad?fecha=${fecha}`);
        if (!res.data.abierto) {
          setDiaCerradoMensaje(res.data.mensaje || 'Estudio cerrado en esta fecha.');
          setTurnos([]);
        } else {
          setTurnos(res.data.turnos || []);
        }
      } catch (err) {
        console.error('Error al consultar turnos:', err);
        toast.error('Error al verificar turnos disponibles.');
      } finally {
        setLoadingTurnos(false);
      }
    };

    fetchDisponibilidad();
  }, [fecha]);

  // Manejo de clic en día del calendario
  const handleSelectFecha = (nuevaFecha) => {
    if (nuevaFecha !== fecha) {
      setHoraSeleccionada(''); // Resetear hora solo si cambia de día
      setFecha(nuevaFecha);
    }
  };

  // Navegación de mes
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectServicio = (serv) => {
    setServicioSeleccionado(serv.nombre);
    setServicioDetalle(serv);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('El archivo no debe pesar más de 10 MB.');
        return;
      }
      setComprobanteFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const copiarTexto = (txt) => {
    navigator.clipboard.writeText(txt);
    toast.success('¡Copiado al portapapeles!');
  };

  const irAPaso2 = () => {
    if (!servicioSeleccionado) {
      toast.error('Selecciona un servicio de maquillaje.');
      return;
    }
    if (!fecha) {
      toast.error('Selecciona el día de tu cita en el calendario.');
      return;
    }
    if (!horaSeleccionada) {
      toast.error('Selecciona un turno de horario disponible.');
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const irAPaso3 = () => {
    if (!clienteNombre.trim()) {
      toast.error('Ingresa tu nombre completo.');
      return;
    }
    if (!clienteDni.trim() || clienteDni.trim().length < 8) {
      toast.error('Ingresa un número de DNI válido (8 dígitos).');
      return;
    }
    if (!clienteTelefono.trim() || clienteTelefono.trim().length < 9) {
      toast.error('Ingresa un número de WhatsApp válido.');
      return;
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmarReserva = async (e) => {
    e.preventDefault();
    if (!comprobanteFile) {
      toast.error('Por favor adjunta la captura o foto del comprobante de tu abono de reserva.');
      return;
    }

    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append('clienteNombre', clienteNombre.trim());
      formData.append('clienteDni', clienteDni.trim());
      formData.append('clienteTelefono', clienteTelefono.trim());
      formData.append('clienteCorreo', clienteCorreo.trim());
      formData.append('servicio', servicioSeleccionado);
      formData.append('fecha', fecha);
      formData.append('hora', horaSeleccionada);
      formData.append('metodoPagoReserva', metodoPagoReserva);
      formData.append('notas', notas.trim());
      formData.append('comprobante', comprobanteFile);

      const res = await axios.post(`${API_BASE}/api/public/reservar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Limpiar borrador al confirmar exitosamente
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (err) {
        console.warn('[ReservaPublica] Error al limpiar borrador post-reserva:', err.message);
      }

      setResultadoReserva(res.data);
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('¡Reserva registrada con éxito!');
    } catch (err) {
      console.error('Error al registrar reserva:', err);
      const msg = err.response?.data?.error || 'Ocurrió un error al procesar tu solicitud.';
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  };

  const formatFechaLarga = (fStr) => {
    if (!fStr) return '';
    const [y, m, d] = fStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const nombreDia = dt.toLocaleDateString('es-PE', { weekday: 'long' });
    return `${nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)}, ${d} de ${MESES[m - 1]} de ${y}`;
  };

  // Cuadrícula del calendario mensual
  const renderCalendarioDias = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const diasEnMes = new Date(year, month + 1, 0).getDate();
    const primerDiaRaw = new Date(year, month, 1).getDay();
    const primerDiaIdx = primerDiaRaw === 0 ? 6 : primerDiaRaw - 1;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const cells = [];

    for (let i = 0; i < primerDiaIdx; i++) {
      cells.push(<div key={`empty-${i}`} className="h-9 sm:h-11"></div>);
    }

    for (let d = 1; d <= diasEnMes; d++) {
      const fechaDia = new Date(year, month, d, 0, 0, 0, 0);
      const esDomingo = fechaDia.getDay() === 0;
      const esPasado = fechaDia < hoy;
      const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = fecha === fechaStr;

      if (esDomingo) {
        cells.push(
          <div
            key={d}
            className="h-9 sm:h-11 rounded-lg sm:rounded-xl bg-gray-50 border border-dashed border-rose-200/70 flex flex-col items-center justify-center cursor-not-allowed opacity-50"
            title="Domingos no hay atención"
          >
            <span className="text-[11px] sm:text-xs font-bold text-rose-400">{d}</span>
            <span className="text-[7px] sm:text-[8px] text-rose-400 font-semibold leading-none">Cerrado</span>
          </div>
        );
      } else if (esPasado) {
        cells.push(
          <div
            key={d}
            className="h-9 sm:h-11 rounded-lg sm:rounded-xl bg-gray-50/40 flex items-center justify-center text-gray-300 text-[11px] sm:text-xs font-medium cursor-not-allowed"
          >
            {d}
          </div>
        );
      } else {
        cells.push(
          <button
            key={d}
            type="button"
            onClick={() => handleSelectFecha(fechaStr)}
            className={`h-9 sm:h-11 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all flex flex-col items-center justify-center relative cursor-pointer touch-manipulation ${
              isSelected
                ? 'bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-sm shadow-pink-200 ring-2 ring-pink-400 scale-105 z-10'
                : 'bg-white border border-gray-200/80 hover:border-pink-300 hover:bg-pink-50/40 text-gray-800'
            }`}
          >
            <span>{d}</span>
            {isSelected && <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white rounded-full mt-0.5"></span>}
          </button>
        );
      }
    }

    return cells;
  };

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-pink-50/40 flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500"></div>
        <p className="text-pink-600 font-medium text-xs sm:text-sm mt-3 animate-pulse">Cargando agenda de GlowManager Pro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/70 via-white to-pink-50/40 text-gray-800 font-sans pb-16 antialiased">
      <Toaster position="top-center" />

      {/* CABECERA RESPONSIVE */}
      <header className="bg-white/95 backdrop-blur-md border-b border-pink-100 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="bg-gradient-to-tr from-pink-500 to-rose-400 text-white p-1.5 sm:p-2 rounded-xl shadow-xs shadow-pink-200 shrink-0">
              <i className="fa-solid fa-wand-magic-sparkles text-base sm:text-lg"></i>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-gray-900 leading-tight">
                GlowManager <span className="text-pink-500 font-black">Pro</span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium tracking-wide uppercase">MakeUp & Beauty Studio</p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs bg-pink-50 text-pink-600 font-bold px-2 sm:px-2.5 py-1 rounded-full border border-pink-100 flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Agenda Online
          </span>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL RESPONSIVE */}
      <main className="max-w-xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4 w-full">

        {/* STEPPER BAR */}
        {step < 4 && (
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-2xs border border-pink-100/80 mb-4 sm:mb-5">
            <div className="flex items-center justify-between relative px-2 sm:px-4">
              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-gray-100 -z-0"></div>
              <div className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-pink-500 transition-all duration-300 -z-0"
                style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}>
              </div>

              <div className="flex flex-col items-center gap-1 z-10">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                    step >= 1 ? 'bg-pink-500 text-white shadow-xs shadow-pink-200' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  1
                </button>
                <span className={`text-[9px] sm:text-[10px] font-bold ${step >= 1 ? 'text-pink-600' : 'text-gray-400'}`}>Turno</span>
              </div>

              <div className="flex flex-col items-center gap-1 z-10">
                <button
                  type="button"
                  onClick={() => {
                    if (horaSeleccionada) setStep(2);
                  }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    step >= 2 ? 'bg-pink-500 text-white shadow-xs shadow-pink-200 cursor-pointer' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  2
                </button>
                <span className={`text-[9px] sm:text-[10px] font-bold ${step >= 2 ? 'text-pink-600' : 'text-gray-400'}`}>Tus Datos</span>
              </div>

              <div className="flex flex-col items-center gap-1 z-10">
                <button
                  type="button"
                  onClick={() => {
                    if (clienteNombre && clienteDni && clienteTelefono) setStep(3);
                  }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    step >= 3 ? 'bg-pink-500 text-white shadow-xs shadow-pink-200 cursor-pointer' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  3
                </button>
                <span className={`text-[9px] sm:text-[10px] font-bold ${step >= 3 ? 'text-pink-600' : 'text-gray-400'}`}>Reserva</span>
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 1: SERVICIO, CALENDARIO INTERACTIVO Y TURNOS ── */}
        {step === 1 && (
          <div className="space-y-4 sm:space-y-5 animate-fadeIn">
            {/* Banner de bienvenida */}
            <div className="bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 text-white p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                  Reserva Fácil
                </span>
                <h2 className="text-lg sm:text-xl font-black mt-2 leading-tight">Elige tu servicio y fecha ideal ✨</h2>
                <p className="text-[11px] sm:text-xs text-pink-100 mt-1 max-w-sm">
                  Consulta turnos en tiempo real y asegura tu lugar en nuestro estudio de belleza.
                </p>
              </div>
              <i className="fa-solid fa-sparkles text-white/10 text-7xl sm:text-8xl absolute -right-3 -bottom-5"></i>
            </div>

            {/* 1. Selector de Servicio */}
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-pink-100 shadow-2xs space-y-3">
              <label className="block text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">
                <i className="fa-solid fa-palette text-pink-500 mr-1.5"></i> 1. Selecciona tu Servicio:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {(config?.servicios || []).map((serv) => (
                  <div
                    key={serv.id}
                    onClick={() => handleSelectServicio(serv)}
                    className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between touch-manipulation ${
                      servicioSeleccionado === serv.nombre
                        ? 'border-pink-500 bg-pink-50/50 shadow-xs ring-1 ring-pink-400'
                        : 'border-gray-200 hover:border-pink-200 hover:bg-gray-50/40'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-gray-900 leading-snug">{serv.nombre}</h4>
                        <span className="text-xs sm:text-sm font-black text-pink-600 shrink-0">S/ {serv.precioAprox.toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-gray-500 mt-1 line-clamp-2">{serv.descripcion}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-gray-400 mt-2 font-medium">
                      <i className="fa-regular fa-clock text-pink-400"></i> {serv.duracion}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Calendario Visual Mensual */}
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-pink-100 shadow-2xs space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <i className="fa-regular fa-calendar-days text-pink-500 mr-1.5"></i> 2. Elige el Día en el Calendario:
                </label>
              </div>

              {/* Controles de Navegación del Mes */}
              <div className="bg-pink-50/50 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-pink-100/70 flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-pink-100 text-gray-700 hover:text-pink-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs touch-manipulation"
                  title="Mes anterior"
                >
                  <i className="fa-solid fa-chevron-left text-xs"></i>
                </button>
                <div className="text-center">
                  <h3 className="font-black text-xs sm:text-sm text-gray-900">
                    {MESES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 font-medium">Toca un día para ver turnos disponibles</p>
                </div>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-pink-100 text-gray-700 hover:text-pink-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs touch-manipulation"
                  title="Mes siguiente"
                >
                  <i className="fa-solid fa-chevron-right text-xs"></i>
                </button>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-wider pb-1">
                {DIAS_SEMANA.map((d, idx) => (
                  <div key={d} className={idx === 6 ? 'text-rose-400 font-black' : ''}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Cuadrícula de días interactiva */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {renderCalendarioDias()}
              </div>

              {/* Leyenda del Calendario */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-2 border-t border-gray-100 text-[9px] sm:text-[10px] text-gray-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-md bg-gradient-to-tr from-pink-500 to-rose-500 inline-block"></span>
                  <span>Seleccionado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-md bg-white border border-gray-300 inline-block"></span>
                  <span>Disponible</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-md bg-rose-50 border border-dashed border-rose-300 inline-block"></span>
                  <span>Domingo (Cerrado)</span>
                </div>
              </div>

              {/* Tarjeta de Día Seleccionado */}
              {fecha && (
                <div className="bg-pink-50/70 p-2.5 sm:p-3 rounded-xl border border-pink-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <i className="fa-regular fa-calendar-check text-pink-600 text-base sm:text-lg shrink-0"></i>
                    <div className="min-w-0">
                      <span className="text-[9px] sm:text-[10px] text-pink-600 font-bold uppercase tracking-wider block">Día Seleccionado</span>
                      <span className="font-black text-gray-900 text-xs sm:text-sm truncate block">{formatFechaLarga(fecha)}</span>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs bg-white text-pink-600 font-bold px-2 sm:px-2.5 py-1 rounded-lg border border-pink-200 shadow-2xs shrink-0">
                    Elegido
                  </span>
                </div>
              )}
            </div>

            {/* 3. Selector de Turnos con Colores Vivos */}
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-pink-100 shadow-2xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <i className="fa-regular fa-clock text-pink-500 mr-1.5"></i> 3. Turnos para {fecha}:
                </label>
                {horaSeleccionada && (
                  <span className="text-[11px] sm:text-xs bg-pink-500 text-white font-black px-2 sm:px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1 shrink-0 animate-pulse">
                    <i className="fa-solid fa-check text-[10px]"></i> {horaSeleccionada}
                  </span>
                )}
              </div>

              {/* Leyenda de Turnos */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] font-bold text-gray-500 bg-gray-50/70 p-2 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-emerald-700">Verde: Libre</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="text-rose-700">Rojo: Ocupado</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                  <span className="text-pink-700">Fucsia: Tu Elección</span>
                </div>
              </div>

              {loadingTurnos ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-200 border-t-pink-500"></div>
                  <span className="text-xs text-gray-400 ml-2 font-medium">Consultando turnos en vivo...</span>
                </div>
              ) : diaCerradoMensaje ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-center text-xs font-semibold">
                  <i className="fa-solid fa-store-slash text-rose-500 text-base mb-1 block"></i>
                  {diaCerradoMensaje}
                </div>
              ) : turnos.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 italic">No hay turnos disponibles para esta fecha.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
                  {turnos.map((t) => {
                    const isSelected = horaSeleccionada === t.hora;
                    const isOcupado = !t.disponible && t.motivo === 'Ocupado';
                    const isPasada = !t.disponible && t.motivo === 'Hora pasada';

                    if (isOcupado) {
                      return (
                        <div
                          key={t.hora}
                          className="py-2.5 sm:py-3 px-1.5 sm:px-2 rounded-xl sm:rounded-2xl border border-rose-200 bg-rose-50/80 text-rose-800 flex flex-col items-center justify-center gap-1 cursor-not-allowed shadow-2xs select-none touch-manipulation"
                          title="Este horario ya fue reservado por otra clienta"
                        >
                          <div className="flex items-center gap-1 font-mono font-bold text-xs sm:text-sm">
                            <i className="fa-solid fa-lock text-[10px] text-rose-500"></i>
                            <span>{t.hora}</span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-1.5 sm:px-2 py-0.5 rounded-full border border-rose-200">
                            🔴 Ocupado
                          </span>
                        </div>
                      );
                    }

                    if (isPasada) {
                      return (
                        <div
                          key={t.hora}
                          className="py-2.5 sm:py-3 px-1.5 sm:px-2 rounded-xl sm:rounded-2xl border border-gray-200 bg-gray-100 text-gray-400 flex flex-col items-center justify-center gap-1 cursor-not-allowed select-none opacity-60 touch-manipulation"
                        >
                          <span className="font-mono text-xs sm:text-sm line-through">{t.hora}</span>
                          <span className="text-[9px] font-medium text-gray-400">Hora pasada</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={t.hora}
                        type="button"
                        onClick={() => setHoraSeleccionada(t.hora)}
                        className={`py-2.5 sm:py-3 px-1.5 sm:px-2 rounded-xl sm:rounded-2xl transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border touch-manipulation ${
                          isSelected
                            ? 'bg-gradient-to-tr from-pink-500 to-rose-500 text-white border-pink-500 shadow-md shadow-pink-200 ring-2 ring-pink-400 scale-102'
                            : 'bg-white border-emerald-200 text-gray-800 hover:border-emerald-400 hover:bg-emerald-50/30 shadow-2xs'
                        }`}
                      >
                        <div className="font-mono font-bold text-xs sm:text-sm flex items-center gap-1">
                          {isSelected && <i className="fa-solid fa-check text-[10px]"></i>}
                          {t.hora}
                        </div>
                        <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        }`}>
                          {isSelected ? '✨ Elegido' : '🟢 Libre'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Botón Siguiente */}
            <button
              onClick={irAPaso2}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm shadow-md shadow-pink-200 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              Continuar con mis datos <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        )}

        {/* ── PASO 2: DATOS DE CONTACTO ── */}
        {step === 2 && (
          <div className="space-y-4 sm:space-y-5 animate-fadeIn">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-pink-100 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 gap-2">
                <h3 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <i className="fa-solid fa-user text-pink-500"></i> Tus Datos de Contacto
                </h3>
                <span className="text-[10px] sm:text-[11px] text-pink-600 bg-pink-50 font-bold px-2 sm:px-2.5 py-1 rounded-lg border border-pink-200 shrink-0">
                  {fecha} — {horaSeleccionada}
                </span>
              </div>

              <div className="space-y-3 text-left">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-gray-600 uppercase mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Ej. Lucía Fernández Silva"
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-base sm:text-sm focus:outline-none focus:border-pink-400 bg-gray-50/40"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-gray-600 uppercase mb-1">DNI *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={8}
                      value={clienteDni}
                      onChange={(e) => setClienteDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="8 dígitos"
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-base sm:text-sm focus:outline-none focus:border-pink-400 bg-gray-50/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-gray-600 uppercase mb-1">WhatsApp / Celular *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      maxLength={9}
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      placeholder="Ej. 987654321"
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-base sm:text-sm focus:outline-none focus:border-pink-400 bg-gray-50/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-gray-600 uppercase mb-1">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    inputMode="email"
                    value={clienteCorreo}
                    onChange={(e) => setClienteCorreo(e.target.value)}
                    placeholder="lucia@ejemplo.com"
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-base sm:text-sm focus:outline-none focus:border-pink-400 bg-gray-50/40"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-gray-600 uppercase mb-1">Notas o Preferencias (Opcional)</label>
                  <textarea
                    rows={2}
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Ej. Piel sensible, prefiero tonos tierra o dorados..."
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-base sm:text-sm focus:outline-none focus:border-pink-400 bg-gray-50/40 resize-none"
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer touch-manipulation"
              >
                <i className="fa-solid fa-arrow-left mr-1"></i> Volver
              </button>
              <button
                type="button"
                onClick={irAPaso3}
                className="w-2/3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm shadow-md shadow-pink-200 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                Pagar Reserva <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 3: PAGO DE RESERVA (S/ 20) Y SUBIDA DE COMPROBANTE ── */}
        {step === 3 && (
          <form onSubmit={handleConfirmarReserva} className="space-y-4 sm:space-y-5 animate-fadeIn">
            {/* Tarjeta de Adelanto */}
            <div className="bg-gradient-to-br from-pink-500 to-rose-400 text-white p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-pink-100">Adelanto Requerido</span>
                  <h3 className="text-2xl sm:text-3xl font-black mt-0.5">S/ 20.00</h3>
                </div>
                <div className="bg-white/20 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl backdrop-blur-xs text-center shrink-0">
                  <span className="text-[9px] sm:text-[10px] block text-pink-100 uppercase font-bold">Servicio</span>
                  <span className="text-xs sm:text-sm font-black">{servicioDetalle?.nombre || servicioSeleccionado}</span>
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] text-pink-100 mt-2">
                * Con este abono garantizas que el turno quede bloqueado para ti. El saldo restante se cancela el día de tu cita.
              </p>
            </div>

            {/* Selector de Método de Pago */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-pink-100 shadow-2xs space-y-3 sm:space-y-4">
              <label className="block text-[11px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider">
                1. Elige tu método de pago para abonar S/ 20:
              </label>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {['Yape', 'Plin', 'Transferencia'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetodoPagoReserva(m)}
                    className={`py-2.5 sm:py-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all border cursor-pointer touch-manipulation ${
                      metodoPagoReserva === m
                        ? 'border-pink-500 bg-pink-50/60 text-pink-700 ring-1 ring-pink-400'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {m === 'Yape' && <i className="fa-solid fa-mobile-screen-button text-purple-600 mr-1"></i>}
                    {m === 'Plin' && <i className="fa-solid fa-bolt text-teal-500 mr-1"></i>}
                    {m === 'Transferencia' && <i className="fa-solid fa-building-columns text-blue-600 mr-1"></i>}
                    <span className="hidden sm:inline">{m}</span>
                    <span className="sm:hidden">{m === 'Transferencia' ? 'Transf.' : m}</span>
                  </button>
                ))}
              </div>

              {/* Información bancaria */}
              <div className="bg-pink-50/40 p-3 sm:p-4 rounded-xl border border-pink-100 text-xs space-y-2">
                {metodoPagoReserva === 'Yape' && (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-gray-500 text-[11px]">Número Yape:</p>
                      <p className="text-sm sm:text-base font-black text-purple-700 font-mono">{config?.metodosPago?.yape?.numero || '987654321'}</p>
                      <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium">Titular: {config?.metodosPago?.yape?.titular}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copiarTexto(config?.metodosPago?.yape?.numero || '987654321')}
                      className="bg-white border border-purple-200 text-purple-600 font-bold px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs hover:bg-purple-50 transition-all cursor-pointer shadow-2xs shrink-0"
                    >
                      <i className="fa-regular fa-copy mr-1"></i> Copiar
                    </button>
                  </div>
                )}

                {metodoPagoReserva === 'Plin' && (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-gray-500 text-[11px]">Número Plin:</p>
                      <p className="text-sm sm:text-base font-black text-teal-700 font-mono">{config?.metodosPago?.plin?.numero || '987654321'}</p>
                      <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium">Titular: {config?.metodosPago?.plin?.titular}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copiarTexto(config?.metodosPago?.plin?.numero || '987654321')}
                      className="bg-white border border-teal-200 text-teal-600 font-bold px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs hover:bg-teal-50 transition-all cursor-pointer shadow-2xs shrink-0"
                    >
                      <i className="fa-regular fa-copy mr-1"></i> Copiar
                    </button>
                  </div>
                )}

                {metodoPagoReserva === 'Transferencia' && (
                  <div className="space-y-1.5">
                    <p className="font-bold text-gray-800 text-[11px] sm:text-xs">Banco: {config?.metodosPago?.transferencia?.banco || 'BCP'}</p>
                    <div className="flex justify-between items-center text-[11px] sm:text-xs gap-1">
                      <span className="text-gray-600 truncate">N° Cuenta: <b>{config?.metodosPago?.transferencia?.cuenta}</b></span>
                      <button
                        type="button"
                        onClick={() => copiarTexto(config?.metodosPago?.transferencia?.cuenta)}
                        className="text-pink-600 font-bold underline cursor-pointer shrink-0"
                      >
                        Copiar
                      </button>
                    </div>
                    <div className="flex justify-between items-center text-[11px] sm:text-xs gap-1">
                      <span className="text-gray-600 truncate">CCI: <b>{config?.metodosPago?.transferencia?.cci}</b></span>
                      <button
                        type="button"
                        onClick={() => copiarTexto(config?.metodosPago?.transferencia?.cci)}
                        className="text-pink-600 font-bold underline cursor-pointer shrink-0"
                      >
                        Copiar
                      </button>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-gray-400">Titular: {config?.metodosPago?.transferencia?.titular}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Subida de Comprobante / Voucher */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-pink-100 shadow-2xs space-y-3">
              <label className="block text-[11px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider">
                <i className="fa-solid fa-receipt text-pink-500 mr-1.5"></i> 2. Adjunta la captura de tu pago:
              </label>

              <div className="border-2 border-dashed border-pink-200 hover:border-pink-400 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center bg-pink-50/20 transition-colors relative cursor-pointer">
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {previewUrl ? (
                  <div className="space-y-2">
                    <img src={previewUrl} alt="Voucher" className="max-h-40 sm:max-h-48 mx-auto rounded-xl shadow-xs border border-pink-200 object-contain" />
                    <p className="text-xs text-emerald-600 font-bold flex items-center justify-center gap-1">
                      <i className="fa-solid fa-circle-check"></i> Comprobante seleccionado
                    </p>
                    <span className="text-[10px] sm:text-[11px] text-gray-400 underline">Toca para cambiar de imagen</span>
                  </div>
                ) : comprobanteFile ? (
                  <div className="space-y-1">
                    <i className="fa-solid fa-file-pdf text-rose-500 text-3xl"></i>
                    <p className="text-xs font-bold text-gray-800 truncate max-w-xs mx-auto">{comprobanteFile.name}</p>
                    <span className="text-[10px] sm:text-[11px] text-gray-400">Toca para cambiar de archivo</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 py-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pink-100 text-pink-500 mx-auto flex items-center justify-center text-lg sm:text-xl shadow-xs">
                      <i className="fa-solid fa-camera"></i>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Toca aquí para subir la captura de tu voucher</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WebP o PDF (Máx. 10 MB)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 sm:gap-3">
              <button
                type="button"
                disabled={enviando}
                onClick={() => setStep(2)}
                className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50 touch-manipulation"
              >
                <i className="fa-solid fa-arrow-left mr-1"></i> Volver
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="w-2/3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm shadow-md shadow-pink-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 touch-manipulation"
              >
                {enviando ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    Confirmar mi Reserva <i className="fa-solid fa-check"></i>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── PASO 4: ÉXITO Y ENLACE DE WHATSAPP ── */}
        {step === 4 && resultadoReserva && (
          <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-pink-100 shadow-sm text-center space-y-5 sm:space-y-6 animate-fadeIn">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center text-2xl sm:text-3xl shadow-xs animate-bounce">
              <i className="fa-solid fa-check"></i>
            </div>

            <div>
              <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                Estado: Por Validar Pago
              </span>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 mt-2.5">¡Solicitud de Reserva Registrada!</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Hemos recibido tu comprobante de abono de S/ 20.00. Nuestro equipo validará el voucher en breve para confirmar tu cita.
              </p>
            </div>

            <div className="bg-pink-50/50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-pink-100 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-pink-100/60 pb-1.5">
                <span className="text-gray-500">Servicio:</span>
                <span className="font-bold text-gray-900">{resultadoReserva.cita.servicio}</span>
              </div>
              <div className="flex justify-between border-b border-pink-100/60 pb-1.5">
                <span className="text-gray-500">Fecha y Turno:</span>
                <span className="font-bold text-pink-600">{resultadoReserva.cita.fecha} a las {resultadoReserva.cita.hora}</span>
              </div>
              <div className="flex justify-between border-b border-pink-100/60 pb-1.5">
                <span className="text-gray-500">Cliente:</span>
                <span className="font-bold text-gray-900">{clienteNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Código de Reserva:</span>
                <span className="font-mono font-bold text-gray-700">#{resultadoReserva.cita.id}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={resultadoReserva.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 sm:py-4 px-3 sm:px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 touch-manipulation"
              >
                <i className="fa-brands fa-whatsapp text-lg"></i>
                Confirmar reserva por WhatsApp
              </a>
              <p className="text-[10px] sm:text-[11px] text-gray-400">
                Toca el botón para avisarnos directamente al WhatsApp del estudio con tu voucher adjunto.
              </p>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(DRAFT_KEY);
                  } catch (err) {
                    console.warn('[ReservaPublica] Error al reiniciar borrador:', err.message);
                  }
                  setStep(1);
                  setComprobanteFile(null);
                  setPreviewUrl(null);
                  setHoraSeleccionada('');
                }}
                className="text-xs text-gray-400 hover:text-pink-600 font-semibold cursor-pointer py-2"
              >
                Hacer otra reserva
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReservaPublica;
