import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

// Usar ruta relativa '' para que las imágenes y peticiones pasen por el proxy de Vite
const API_BASE = '';

const Citas = () => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');

  // Modal Crear/Editar
  const [showModal, setShowModal] = useState(false);
  const [selectedCita, setSelectedCita] = useState(null);

  // Modal Voucher
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherCita, setVoucherCita] = useState(null);

  // Modal QR
  const [showQrModal, setShowQrModal] = useState(false);

  // Modal Confirmación de Pago y Finalización de Servicio
  const [showConfirmarPagoModal, setShowConfirmarPagoModal] = useState(false);
  const [citaACompletar, setCitaACompletar] = useState(null);
  const [completandoLoading, setCompletandoLoading] = useState(false);

  // Form states
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [servicio, setServicio] = useState('');
  const [estado, setEstado] = useState('Pendiente');
  const [notas, setNotas] = useState('');

  // Autocomplete states
  const [clientes, setClientes] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // Financial and Insumos states
  const [productos, setProductos] = useState([]);
  const [serviciosCatalogo, setServiciosCatalogo] = useState([]);
  const [personalCatalogo, setPersonalCatalogo] = useState([]);
  const [personalId, setPersonalId] = useState('');
  const [precioServicio, setPrecioServicio] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [insumosSeleccionados, setInsumosSeleccionados] = useState([]);
  const [puntosCanjeados, setPuntosCanjeados] = useState(0);

  const fetchCitas = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/citas');
      setCitas(res.data);
    } catch (err) {
      console.error('Error al obtener citas:', err);
      toast.error('No se pudieron cargar las citas.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const res = await apiClient.get('/clientes');
      setClientes(res.data);
    } catch (err) {
      console.error('Error al obtener clientes:', err);
    }
  };

  const fetchProductos = async () => {
    try {
      const res = await apiClient.get('/productos');
      setProductos(res.data);
    } catch (err) {
      console.error('Error al obtener productos:', err);
    }
  };

  const fetchCatalogoExtra = async () => {
    try {
      const [resS, resP] = await Promise.all([
        apiClient.get('/servicios'),
        apiClient.get('/personal')
      ]);
      setServiciosCatalogo(resS.data);
      setPersonalCatalogo(resP.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchCitas();
    fetchClientes();
    fetchProductos();
    fetchCatalogoExtra();
  }, []);

  const openAddModal = () => {
    setSelectedCita(null);
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    setFecha(`${yyyy}-${mm}-${dd}`);
    
    setHora('10:00');
    setClienteNombre('');
    setServicio('');
    setEstado('Pendiente');
    setNotas('');
    setPrecioServicio('');
    setMetodoPago('Efectivo');
    setInsumosSeleccionados([]);
    setPuntosCanjeados(0);
    setShowModal(true);
  };

  const openEditModal = (cita) => {
    setSelectedCita(cita);
    setFecha(cita.fecha);
    setHora(cita.hora);
    setClienteNombre(cita.clienteNombre);
    setServicio(cita.servicio);
    setEstado(cita.estado === 'Cancelado' ? 'Anulado' : cita.estado);
    setNotas(cita.notas || '');
    setPrecioServicio(cita.precioServicio ? String(cita.precioServicio) : '');
    setMetodoPago(cita.metodoPago || 'Efectivo');
    setInsumosSeleccionados([]);
    setPuntosCanjeados(0);
    setShowModal(true);
  };

  // Abrir ventana de confirmación de pago y finalización
  const abrirModalCompletar = (cita) => {
    setCitaACompletar(cita);
    setPrecioServicio(cita.precioServicio ? String(cita.precioServicio) : '70.00');
    setMetodoPago('Efectivo');
    setInsumosSeleccionados([]);
    setPuntosCanjeados(0);
    setShowConfirmarPagoModal(true);
  };

  const openVoucherModal = (cita) => {
    setVoucherCita(cita);
    setShowVoucherModal(true);
  };

  const handleAprobarCita = async (citaId) => {
    try {
      await apiClient.put(`/citas/${citaId}`, { estado: 'Confirmado' });
      toast.success('¡Cita aprobada y confirmada exitosamente!');
      if (showVoucherModal) setShowVoucherModal(false);
      fetchCitas();
    } catch (err) {
      console.error('Error al aprobar cita:', err);
      toast.error('No se pudo aprobar la cita.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Si se marca como "Completado" y no tiene ingreso previo, abrir ventana de confirmación de pago
    if (estado === 'Completado' && !selectedCita?.ingresoRegistrado) {
      setCitaACompletar({
        id: selectedCita ? selectedCita.id : null,
        fecha,
        hora,
        clienteNombre,
        servicio,
        notas,
        montoAdelanto: selectedCita?.montoAdelanto || 0,
        metodoPagoReserva: selectedCita?.metodoPagoReserva || null,
        isNew: !selectedCita
      });
      setShowModal(false);
      setShowConfirmarPagoModal(true);
      return;
    }

    try {
      const payload = { 
        fecha, 
        hora, 
        clienteNombre, 
        servicio, 
        estado, 
        notas,
        ...(estado === 'Completado' && !selectedCita?.ingresoRegistrado && {
          precioServicio: parseFloat(precioServicio || 0),
          metodoPago,
          insumos: insumosSeleccionados.filter(ins => ins.productoId !== ''),
          puntosCanjeados
        })
      };
      if (selectedCita) {
        await apiClient.put(`/citas/${selectedCita.id}`, payload);
        toast.success('Cita actualizada exitosamente.');
      } else {
        await apiClient.post('/citas', payload);
        toast.success('Cita agendada exitosamente.');
      }
      setShowModal(false);
      fetchCitas();
      fetchClientes();
    } catch (err) {
      console.error('Error al guardar cita:', err);
      toast.error(err.response?.data?.error || 'Error al guardar la cita.');
    }
  };

  // Confirmar pago y finalizar servicio
  const handleConfirmarPagoYCompletar = async (e) => {
    e.preventDefault();
    if (!citaACompletar) return;

    const price = parseFloat(precioServicio || 0);
    if (isNaN(price) || price < 0) {
      toast.error('Ingrese un precio de servicio válido.');
      return;
    }

    setCompletandoLoading(true);
    try {
      const payload = {
        fecha: citaACompletar.fecha,
        hora: citaACompletar.hora,
        clienteNombre: citaACompletar.clienteNombre,
        servicio: citaACompletar.servicio,
        estado: 'Completado',
        notas: citaACompletar.notas,
        precioServicio: price,
        metodoPago,
        insumos: insumosSeleccionados.filter(ins => ins.productoId !== ''),
        puntosCanjeados
      };

      if (citaACompletar.isNew) {
        await apiClient.post('/citas', payload);
      } else {
        await apiClient.put(`/citas/${citaACompletar.id}`, payload);
      }

      toast.success(`¡Pago confirmado y servicio completado exitosamente! Ingreso registrado.`);
      setShowConfirmarPagoModal(false);
      setCitaACompletar(null);
      fetchCitas();
      fetchClientes();
      fetchProductos();
    } catch (err) {
      console.error('Error al confirmar pago de cita:', err);
      toast.error(err.response?.data?.error || 'Error al completar la cita.');
    } finally {
      setCompletandoLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta cita? Si estaba completada, los insumos y ventas se revertirán de forma segura.')) {
      try {
        await apiClient.delete(`/citas/${id}`);
        toast.success('Cita eliminada exitosamente.');
        fetchCitas();
      } catch (err) {
        console.error('Error al eliminar cita:', err);
        toast.error('Error al eliminar la cita.');
      }
    }
  };

  // URL pública de reservas
  const urlReserva = `${window.location.origin}/reservar`;

  const copiarUrlReserva = () => {
    navigator.clipboard.writeText(urlReserva);
    toast.success('¡Enlace de reservas copiado al portapapeles!');
  };

  const descargarQr = async () => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(urlReserva)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'QR_Reservas_GlowManager.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Código QR descargado.');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo descargar el QR directamente.');
    }
  };

  // Filtrado de citas
  const citasFiltradas = citas.filter(c => {
    const cumpleBusqueda = 
      c.clienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.servicio.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.fecha.includes(busqueda);

    if (!cumpleBusqueda) return false;

    if (filtroEstado === 'POR_VALIDAR') return c.estado === 'Por Validar';
    if (filtroEstado === 'CONFIRMADAS') return c.estado === 'Confirmado' || c.estado === 'Pendiente';
    if (filtroEstado === 'COMPLETADAS') return c.estado === 'Completado';
    if (filtroEstado === 'ANULADAS') return c.estado === 'Anulado' || c.estado === 'Cancelado';

    return true;
  });

  const porValidarCount = citas.filter(c => c.estado === 'Por Validar').length;

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900">Agenda de Citas</h2>
          <p className="text-sm text-gray-500 font-medium">
            Gestión de citas presenciales y reservas recibidas mediante código QR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Botón Generador QR */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-purple-200"
          >
            <i className="fa-solid fa-qrcode"></i> Código QR de Reservas
          </button>

          {/* Botón Agendar Manual */}
          <button
            onClick={openAddModal}
            className="flex-1 sm:flex-none bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-pink-200"
          >
            <i className="fa-regular fa-calendar-plus"></i> Agendar Cita
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-3 rounded-2xl border border-pink-100 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Pestañas de Estado con scroll horizontal táctil en móviles */}
        <div className="flex overflow-x-auto pb-1 sm:pb-0 gap-1.5 w-full md:w-auto flex-nowrap sm:flex-wrap shrink-0">
          {[
            { id: 'TODAS', label: 'Todas' },
            { id: 'POR_VALIDAR', label: 'Por Validar', badge: porValidarCount },
            { id: 'CONFIRMADAS', label: 'Confirmadas / Pendientes' },
            { id: 'COMPLETADAS', label: 'Completadas' },
            { id: 'ANULADAS', label: 'Anuladas' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFiltroEstado(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filtroEstado === tab.id
                  ? 'bg-pink-500 text-white shadow-2xs shadow-pink-200'
                  : 'bg-gray-50 text-gray-600 hover:bg-pink-50/50 hover:text-pink-600'
              }`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="relative w-full md:w-64">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, servicio..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 bg-gray-50/40"
          />
        </div>
      </div>

      {/* TABLA DE CITAS */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xs border border-pink-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-pink-50/30 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 pl-6 font-bold">Fecha / Hora</th>
                <th className="p-4 font-bold">Cliente</th>
                <th className="p-4 font-bold">Servicio</th>
                <th className="p-4 font-bold">Adelanto / Voucher</th>
                <th className="p-4 font-bold">Estado</th>
                <th className="p-4 pr-6 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {citasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 text-xs">
                    No se encontraron citas registradas con los filtros actuales.
                  </td>
                </tr>
              ) : (
                citasFiltradas.map((c) => (
                  <tr key={c.id} className="hover:bg-pink-50/20 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-semibold text-gray-900">{c.fecha}</div>
                      <div className="text-xs text-gray-400 font-mono">{c.hora}</div>
                    </td>
                    <td className="p-4 font-bold text-gray-800">
                      {c.clienteNombre}
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">
                        {c.servicio}
                      </span>
                    </td>
                    <td className="p-4">
                      {c.comprobanteUrl ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openVoucherModal(c)}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            title="Ver voucher subido por el cliente"
                          >
                            <i className="fa-solid fa-receipt text-purple-500"></i> Voucher
                          </button>
                          <span className="text-[11px] font-mono font-bold text-purple-800 bg-purple-100/60 px-1.5 py-0.5 rounded">
                            S/ {parseFloat(c.montoAdelanto || 20).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Presencial</span>
                      )}
                    </td>
                    <td className="p-4">
                      {c.estado === 'Por Validar' && (
                        <span className="px-2.5 py-1 text-[10px] rounded-full font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-fit animate-pulse">
                          <i className="fa-solid fa-clock-rotate-left"></i> Por Validar
                        </span>
                      )}
                      {c.estado === 'Confirmado' && (
                        <span className="px-2.5 py-1 text-[10px] rounded-full font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 w-fit">
                          <i className="fa-solid fa-circle-check"></i> Confirmado
                        </span>
                      )}
                      {c.estado === 'Pendiente' && (
                        <span className="px-2.5 py-1 text-[10px] rounded-full font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
                          <i className="fa-regular fa-clock"></i> Pendiente
                        </span>
                      )}
                      {c.estado === 'Completado' && (
                        <span className="px-2.5 py-1 text-[10px] rounded-full font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                          <i className="fa-solid fa-check-double"></i> Completado
                        </span>
                      )}
                      {(c.estado === 'Anulado' || c.estado === 'Cancelado') && (
                        <span className="px-2.5 py-1 text-[10px] rounded-full font-bold uppercase bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit">
                          <i className="fa-solid fa-ban"></i> Anulado
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-center">
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        {/* Botón de Aprobación Rápida si está Por Validar */}
                        {c.estado === 'Por Validar' && (
                          <button
                            onClick={() => handleAprobarCita(c.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                            title="Validar comprobante y confirmar cita"
                          >
                            <i className="fa-solid fa-check"></i> Aprobar
                          </button>
                        )}

                        {/* Botón Confirmar Pago y Completar Servicio si está Confirmado o Pendiente */}
                        {(c.estado === 'Confirmado' || c.estado === 'Pendiente') && (
                          <button
                            onClick={() => abrirModalCompletar(c)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                            title="Confirmar pago y finalizar servicio"
                          >
                            <i className="fa-solid fa-cash-register"></i> Completar
                          </button>
                        )}

                        <button
                          onClick={() => openEditModal(c)}
                          className="text-blue-500 hover:text-blue-700 cursor-pointer p-1"
                          title="Editar"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer p-1"
                          title="Eliminar"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL VER VOUCHER / COMPROBANTE ── */}
      {showVoucherModal && voucherCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full mx-2 sm:mx-auto overflow-hidden shadow-2xl border border-pink-100 max-h-[92vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="p-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-receipt text-lg"></i>
                <h3 className="font-bold text-sm">Comprobante de Reserva</h3>
              </div>
              <button
                onClick={() => setShowVoucherModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-5 space-y-4">
              {/* Datos de la Reserva */}
              <div className="bg-pink-50/50 p-3.5 rounded-2xl border border-pink-100 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Clienta:</span>
                  <span className="font-bold text-gray-900">{voucherCita.clienteNombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Servicio:</span>
                  <span className="font-bold text-pink-600">{voucherCita.servicio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha y Hora:</span>
                  <span className="font-semibold text-gray-700">{voucherCita.fecha} a las {voucherCita.hora}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Abono Realizado:</span>
                  <span className="font-black text-purple-700 font-mono">
                    S/ {parseFloat(voucherCita.montoAdelanto || 20).toFixed(2)} ({voucherCita.metodoPagoReserva || 'Yape/Plin'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Estado Cita:</span>
                  <span className="font-bold uppercase text-amber-700">{voucherCita.estado}</span>
                </div>
              </div>

              {/* Imagen del Comprobante */}
              <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center text-center">
                {voucherCita.comprobanteUrl?.endsWith('.pdf') ? (
                  <div className="p-8 space-y-2">
                    <i className="fa-solid fa-file-pdf text-rose-500 text-5xl"></i>
                    <p className="text-xs text-gray-600 font-semibold">Comprobante en formato PDF</p>
                    <a
                      href={`${API_BASE}${voucherCita.comprobanteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-pink-500 text-white font-bold text-xs px-4 py-2 rounded-xl"
                    >
                      Abrir PDF en pestaña nueva
                    </a>
                  </div>
                ) : (
                  <img
                    src={`${API_BASE}${voucherCita.comprobanteUrl}`}
                    alt="Voucher de pago"
                    className="w-full max-h-80 object-contain"
                  />
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-2">
                <a
                  href={`${API_BASE}${voucherCita.comprobanteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs text-center transition-all flex items-center justify-center gap-1"
                >
                  <i className="fa-solid fa-up-right-from-square"></i> Ver Tamaño Completo
                </a>

                {voucherCita.estado === 'Por Validar' && (
                  <button
                    onClick={() => handleAprobarCita(voucherCita.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-200 cursor-pointer"
                  >
                    <i className="fa-solid fa-circle-check"></i> Aprobar Reserva
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL GENERADOR DE CÓDIGO QR ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-sm w-full mx-2 sm:mx-auto overflow-hidden shadow-2xl border border-purple-100 text-center max-h-[92vh] overflow-y-auto">
            <div className="p-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-qrcode text-lg"></i>
                <h3 className="font-bold text-sm">QR de Reservas Online</h3>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-black text-gray-900 text-base">Escanea para Agendar Cita</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Imprime este código QR en tu mostrador o compártelo en tus historias de Instagram/TikTok.
                </p>
              </div>

              {/* Render del QR */}
              <div className="p-4 bg-white border-2 border-purple-100 rounded-2xl shadow-inner inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(urlReserva)}`}
                  alt="QR Reserva"
                  className="w-48 h-48 mx-auto"
                />
              </div>

              {/* URL */}
              <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-100 text-[11px] font-mono text-purple-700 truncate flex items-center justify-between gap-2">
                <span className="truncate">{urlReserva}</span>
                <button
                  onClick={copiarUrlReserva}
                  className="bg-white border border-purple-200 text-purple-600 px-2 py-0.5 rounded-md font-sans font-bold hover:bg-purple-100 shrink-0 cursor-pointer"
                >
                  Copiar
                </button>
              </div>

              {/* Botón de Descarga */}
              <button
                onClick={descargarQr}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-200 transition-all cursor-pointer"
              >
                <i className="fa-solid fa-download"></i> Descargar QR en Alta Calidad (PNG)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMACIÓN DE PAGO Y FINALIZACIÓN DE SERVICIO ── */}
      {showConfirmarPagoModal && citaACompletar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full mx-2 sm:mx-auto overflow-hidden shadow-2xl border border-emerald-100 max-h-[92vh] overflow-y-auto">
            {/* Cabecera */}
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <i className="fa-solid fa-cash-register text-sm"></i>
                </div>
                <div>
                  <h3 className="font-bold text-sm">Confirmación de Pago y Finalización</h3>
                  <p className="text-[10px] text-emerald-100">Cita #{citaACompletar.id || 'Nueva'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmarPagoModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleConfirmarPagoYCompletar} className="p-4 sm:p-6 space-y-4">
              {/* Tarjeta Resumen de la Cita */}
              <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 text-xs space-y-1.5 font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Cliente:</span>
                  <span className="font-bold text-gray-900">{citaACompletar.clienteNombre}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Servicio:</span>
                  <span className="font-bold text-emerald-700">{citaACompletar.servicio}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Fecha y Turno:</span>
                  <span className="font-semibold text-gray-700">{citaACompletar.fecha} — {citaACompletar.hora}</span>
                </div>
              </div>

              {/* Importes y Adelanto */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Precio Total del Servicio (S/) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={precioServicio}
                      onChange={(e) => setPrecioServicio(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-500 font-bold text-emerald-700 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Método de Pago (Saldo) *
                    </label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-500 bg-white cursor-pointer"
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Yape">Yape</option>
                      <option value="Plin">Plin</option>
                      <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
                      <option value="Transferencia">Transferencia Bancaria</option>
                    </select>
                  </div>
                </div>

                {/* Adelanto previo si existe */}
                {parseFloat(citaACompletar.montoAdelanto || 0) > 0 && (
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                    <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                      <i className="fa-solid fa-receipt text-amber-600"></i> Adelanto Web Registrado:
                    </span>
                    <span className="font-black text-amber-900 font-mono">
                      - S/ {parseFloat(citaACompletar.montoAdelanto).toFixed(2)} ({citaACompletar.metodoPagoReserva || 'Web'})
                    </span>
                  </div>
                )}

                {/* Canje de puntos si el cliente tiene puntos */}
                {(() => {
                  const cli = clientes.find(c => c.nombre.toLowerCase() === citaACompletar.clienteNombre.toLowerCase());
                  if (!cli || cli.puntosFidelidad <= 0) return null;
                  return (
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-purple-900">
                          <i className="fa-solid fa-gift mr-1 text-purple-600"></i> Puntos Disponibles: {cli.puntosFidelidad} pts
                        </span>
                        <span className="text-[10px] text-purple-600">1 pt = S/ 0.50</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-gray-600">Puntos a canjear:</label>
                        <input
                          type="number"
                          min="0"
                          max={cli.puntosFidelidad}
                          value={puntosCanjeados}
                          onChange={(e) => setPuntosCanjeados(Math.min(cli.puntosFidelidad, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-20 px-2 py-1 rounded-lg border border-purple-200 text-xs text-center font-bold bg-white"
                        />
                        {puntosCanjeados > 0 && (
                          <span className="text-xs font-bold text-purple-700">
                            (- S/ {(puntosCanjeados * 0.5).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Resumen Total a Cobrar en Caja */}
                {(() => {
                  const total = parseFloat(precioServicio || 0);
                  const adelanto = parseFloat(citaACompletar.montoAdelanto || 0);
                  const descPuntos = puntosCanjeados * 0.5;
                  const saldoCobrar = Math.max(0, total - adelanto - descPuntos);
                  return (
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 rounded-2xl shadow-sm text-center">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-100 block">
                        Monto Final a Cobrar en Caja
                      </span>
                      <h4 className="text-2xl sm:text-3xl font-black mt-0.5 font-mono">
                        S/ {saldoCobrar.toFixed(2)}
                      </h4>
                      <p className="text-[11px] text-emerald-100 mt-1">
                        Método: <strong>{metodoPago}</strong> {adelanto > 0 && `(descontado adelanto de S/ ${adelanto.toFixed(2)})`}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Insumos Opcionales */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">
                    Insumos Consumidos (Descuenta Stock)
                  </label>
                  <button
                    type="button"
                    onClick={() => setInsumosSeleccionados([...insumosSeleccionados, { productoId: '', cantidad: 1, searchText: '', mostrarSugerenciasProd: false }])}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
                  >
                    + Agregar Insumo
                  </button>
                </div>

                {insumosSeleccionados.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">No se descontarán insumos.</p>
                ) : (
                  <div className="space-y-2">
                    {insumosSeleccionados.map((ins, idx) => {
                      const prodObj = productos.find(p => p.id === parseInt(ins.productoId));
                      const stock = prodObj?.lotes?.reduce((sum, l) => sum + l.stockActual, 0) || 0;
                      return (
                        <div key={idx} className="flex gap-2 items-center">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              placeholder="Buscar producto..."
                              value={ins.searchText || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const newList = [...insumosSeleccionados];
                                newList[idx].searchText = val;
                                newList[idx].mostrarSugerenciasProd = true;
                                const match = productos.find(p => p.nombre.toLowerCase() === val.toLowerCase());
                                newList[idx].productoId = match ? match.id : '';
                                setInsumosSeleccionados(newList);
                              }}
                              onFocus={() => {
                                const newList = [...insumosSeleccionados];
                                newList[idx].mostrarSugerenciasProd = true;
                                setInsumosSeleccionados(newList);
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  const newList = [...insumosSeleccionados];
                                  if (newList[idx]) {
                                    newList[idx].mostrarSugerenciasProd = false;
                                    setInsumosSeleccionados(newList);
                                  }
                                }, 250);
                              }}
                              className="w-full px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-emerald-500"
                            />
                            {ins.mostrarSugerenciasProd && (
                              (() => {
                                const query = (ins.searchText || '').toLowerCase().trim();
                                const filtered = productos.filter(p => {
                                  const pStock = p.lotes?.reduce((sum, l) => sum + l.stockActual, 0) || 0;
                                  if (pStock <= 0) return false;
                                  if (query === '') return true;
                                  return p.nombre.toLowerCase().includes(query) || p.codigo.toLowerCase().includes(query);
                                });

                                if (filtered.length === 0) return null;

                                return (
                                  <ul className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-36 overflow-y-auto divide-y divide-gray-100 font-sans">
                                    {filtered.map(p => {
                                      const pStock = p.lotes?.reduce((sum, l) => sum + l.stockActual, 0) || 0;
                                      return (
                                        <li
                                          key={p.id}
                                          onClick={() => {
                                            const newList = [...insumosSeleccionados];
                                            newList[idx].productoId = p.id;
                                            newList[idx].searchText = p.nombre;
                                            newList[idx].mostrarSugerenciasProd = false;
                                            setInsumosSeleccionados(newList);
                                          }}
                                          className="px-2 py-1.5 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer text-[10px] flex justify-between items-center"
                                        >
                                          <span className="font-semibold text-left">{p.nombre}</span>
                                          <span className="text-gray-400 font-mono text-[9px] shrink-0">Stock: {pStock}</span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                );
                              })()
                            )}
                          </div>
                          <input
                            type="number"
                            required
                            min="1"
                            max={stock || 999}
                            value={ins.cantidad}
                            onChange={(e) => {
                              const newList = [...insumosSeleccionados];
                              newList[idx].cantidad = e.target.value;
                              setInsumosSeleccionados(newList);
                            }}
                            className="w-14 px-2 py-1 rounded-lg border border-gray-200 text-xs text-center font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newList = insumosSeleccionados.filter((_, i) => i !== idx);
                              setInsumosSeleccionados(newList);
                            }}
                            className="text-gray-400 hover:text-rose-500 cursor-pointer p-1"
                          >
                            <i className="fa-solid fa-trash-can text-[10px]"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmarPagoModal(false)}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={completandoLoading}
                  className="w-2/3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {completandoLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Procesando pago...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-circle-check"></i> Confirmar Pago y Finalizar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL AGENDAR / EDITAR CITA ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-xl border border-pink-100 max-h-[92vh] overflow-y-auto mx-2 sm:mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedCita ? 'Editar Cita' : 'Agendar Nueva Cita'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora</label>
                  <input
                    type="time"
                    required
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del Cliente</label>
                <input
                  type="text"
                  required
                  value={clienteNombre}
                  onChange={(e) => {
                    setClienteNombre(e.target.value);
                    setMostrarSugerencias(true);
                  }}
                  onFocus={() => setMostrarSugerencias(true)}
                  onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
                  placeholder="Ej. Camila Rodríguez o DNI"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                />
                {mostrarSugerencias && clienteNombre.trim() && (
                  (() => {
                    const filtered = clientes.filter(c => 
                      c.nombre.toLowerCase().includes(clienteNombre.toLowerCase()) ||
                      c.dni.includes(clienteNombre)
                    ).slice(0, 5);

                    if (filtered.length === 0) return null;

                    return (
                      <ul className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-gray-100">
                        {filtered.map(c => (
                          <li 
                            key={c.id} 
                            onClick={() => {
                              setClienteNombre(c.nombre);
                              setMostrarSugerencias(false);
                            }}
                            className="px-4 py-2 hover:bg-pink-50 hover:text-pink-600 cursor-pointer text-xs flex justify-between items-center"
                          >
                            <span className="font-semibold">{c.nombre}</span>
                            <span className="text-gray-400 font-mono text-[10px]">DNI: {c.dni}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  })()
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Servicio de Boutique *
                </label>
                {serviciosCatalogo.length > 0 && (
                  <select
                    onChange={(e) => {
                      const found = serviciosCatalogo.find(s => s.nombre === e.target.value);
                      if (found) {
                        setServicio(found.nombre);
                        setPrecioServicio(String(found.precio));
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-pink-200 text-xs focus:outline-none focus:border-pink-400 bg-pink-50/30 mb-1.5 cursor-pointer font-bold text-pink-700"
                  >
                    <option value="">-- Seleccionar del Catálogo Oficial --</option>
                    {serviciosCatalogo.map(s => (
                      <option key={s.id} value={s.nombre}>
                        {s.nombre} — S/ {parseFloat(s.precio).toFixed(2)} ({s.categoria})
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  required
                  value={servicio}
                  onChange={(e) => setServicio(e.target.value)}
                  placeholder="Ej. Maquillaje Social, Novia Glam, Cejas..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                />
              </div>

              {personalCatalogo.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Personal Asignado / Colaboradora
                  </label>
                  <select
                    value={personalId}
                    onChange={(e) => setPersonalId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50 cursor-pointer"
                  >
                    <option value="">-- Sin personal específico --</option>
                    {personalCatalogo.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.cargo})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50 cursor-pointer"
                >
                  <option value="Por Validar">Por Validar (Pago Web)</option>
                  <option value="Confirmado">Confirmado</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Completado">Completado</option>
                  <option value="Anulado">Anulado</option>
                </select>
              </div>

              {estado === 'Completado' && (
                <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl space-y-2 mt-2">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-cash-register text-emerald-600"></i> Finalización de Servicio
                  </h4>
                  {selectedCita?.ingresoRegistrado ? (
                    <div className="text-xs text-gray-600 space-y-1 bg-white p-3 rounded-xl border border-gray-100 font-sans">
                      <p>✨ <strong>Ingreso ya registrado:</strong></p>
                      <div>💰 <strong>Mano de Obra:</strong> {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(selectedCita.precioServicio || 0)}</div>
                      <div>💳 <strong>Método de Pago:</strong> {selectedCita.metodoPago || 'Efectivo'}</div>
                      <p className="text-[10px] text-gray-400 italic mt-1 font-sans">Los datos financieros y el descuento de stock de esta cita no se pueden modificar.</p>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700">
                      Al guardar, se abrirá la <strong>ventana de confirmación de pago</strong> para definir el saldo a cobrar, el método de pago y el descuento de insumos.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas (Opcional)</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Detalles adicionales sobre la cita o indicaciones especiales"
                  rows="2"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-pink-200 mt-4 cursor-pointer"
              >
                {estado === 'Completado' && !selectedCita?.ingresoRegistrado ? (
                  <>
                    <i className="fa-solid fa-cash-register mr-2"></i> Continuar a Confirmar Pago
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk mr-2"></i> Guardar Cita
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Citas;
