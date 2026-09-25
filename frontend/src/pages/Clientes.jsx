import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const Clientes = () => {
  const [tabCRM, setTabCRM] = useState('directorio'); // 'directorio' | 'creditos'
  const [clientes, setClientes] = useState([]);
  const [creditos, setCreditos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCreditos, setLoadingCreditos] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('nombre');
  const [filterPuntos, setFilterPuntos] = useState('todos');

  // Modal Cliente
  const [showModal, setShowModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');

  // Modal Historial Puntos
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [clienteSeleccionadoPuntos, setClienteSeleccionadoPuntos] = useState(null);

  // Modal Registrar Abono de Crédito
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [creditoSeleccionado, setCreditoSeleccionado] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPagoAbono, setMetodoPagoAbono] = useState('Efectivo');
  const [notasAbono, setNotasAbono] = useState('');
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/clientes');
      setClientes(res.data);
    } catch (err) {
      console.error('Error al obtener clientes:', err);
      toast.error('No se pudieron cargar los clientes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditos = async () => {
    setLoadingCreditos(true);
    try {
      const res = await apiClient.get('/ventas/creditos');
      setCreditos(res.data);
    } catch (err) {
      console.error('Error al obtener créditos:', err);
      toast.error('No se pudieron cargar los créditos.');
    } finally {
      setLoadingCreditos(false);
    }
  };

  useEffect(() => {
    fetchClientes();
    fetchCreditos();
  }, []);

  const openAddModal = () => {
    setSelectedCliente(null);
    setNombre('');
    setDni('');
    setTelefono('');
    setCorreo('');
    setFechaNacimiento('');
    setShowModal(true);
  };

  const openEditModal = (cliente) => {
    setSelectedCliente(cliente);
    setNombre(cliente.nombre);
    setDni(cliente.dni);
    setTelefono(cliente.telefono || '');
    setCorreo(cliente.correo || '');
    setFechaNacimiento(cliente.fechaNacimiento || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { dni, nombre, telefono, correo, fechaNacimiento };
      if (selectedCliente) {
        await apiClient.put(`/clientes/${selectedCliente.id}`, payload);
        toast.success('Cliente actualizado exitosamente.');
      } else {
        await apiClient.post('/clientes', payload);
        toast.success('Cliente registrado exitosamente.');
      }
      setShowModal(false);
      fetchClientes();
    } catch (err) {
      console.error('Error al guardar cliente:', err);
      toast.error(err.response?.data?.error || 'Error al guardar el cliente.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este cliente?')) {
      try {
        await apiClient.delete(`/clientes/${id}`);
        toast.success('Cliente eliminado exitosamente.');
        fetchClientes();
      } catch (err) {
        console.error('Error al eliminar cliente:', err);
        toast.error('Error al eliminar el cliente.');
      }
    }
  };

  // Manejo de Abono
  const abrirModalAbono = (credito) => {
    setCreditoSeleccionado(credito);
    setMontoAbono(parseFloat(credito.saldoPendiente).toFixed(2));
    setMetodoPagoAbono('Efectivo');
    setNotasAbono('');
    setShowAbonoModal(true);
  };

  const handleRegistrarAbono = async (e) => {
    e.preventDefault();
    if (!creditoSeleccionado) return;

    const montoNum = parseFloat(montoAbono);
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error('Ingrese un monto válido a amortizar.');
      return;
    }

    setGuardandoAbono(true);
    try {
      await apiClient.post(`/ventas/${creditoSeleccionado.id}/abonos`, {
        monto: montoNum,
        metodoPago: metodoPagoAbono,
        notas: notasAbono
      });

      toast.success('¡Abono registrado exitosamente! Deuda actualizada.');
      setShowAbonoModal(false);
      setCreditoSeleccionado(null);
      fetchCreditos();
      fetchClientes();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar abono.');
    } finally {
      setGuardandoAbono(false);
    }
  };

  const esCumpleanosHoy = (fechaStr) => {
    if (!fechaStr) return false;
    const partes = fechaStr.split('-');
    if (partes.length < 3) return false;
    const mes = parseInt(partes[1]);
    const dia = parseInt(partes[2]);
    const hoy = new Date();
    return (hoy.getMonth() + 1) === mes && hoy.getDate() === dia;
  };

  const enviarCRM = (tipo, name, phone, extraMonto) => {
    if (!phone || phone === '' || phone === '-') {
      toast.error('Este cliente no cuenta con número telefónico registrado para el CRM.');
      return;
    }

    let cleanPhone = String(phone).replace(/\D/g, '');
    if (!cleanPhone) {
      toast.error('El número de teléfono no contiene dígitos válidos.');
      return;
    }
    if (!cleanPhone.startsWith('51') || cleanPhone.length !== 11) {
      cleanPhone = `51${cleanPhone}`;
    }

    let mensaje = '';
    if (tipo === 'recordatorio_deuda') {
      mensaje = `Hola *${name}*, te saludamos con mucho cariño desde *GlowManager Pro* ✨ Queríamos coordinar contigo sobre tu saldo pendiente de *S/ ${extraMonto}*. Recuerda que puedes abonar por Yape, Plin o en nuestro estudio. ¡Muchas gracias por tu preferencia! 💕`;
    } else if (tipo === 'gracias') {
      mensaje = `¡Muchísimas gracias por tu compra, *${name}*! 🥰 En *GlowManager Pro* valoramos mucho tu preferencia. Esperamos que disfrutes al máximo tus productos de belleza. ¡Vuelve pronto! 💄`;
    } else if (tipo === 'cumple') {
      mensaje = `¡Feliz Cumpleaños, *${name}*! 🎉🥳 Todo el equipo de *GlowManager Pro* te desea un día espectacular lleno de brillo. Recuerda que tienes un obsequio especial y un descuento exclusivo esperando por ti en el estudio. ¡Pasa a celebrar con nosotros! 🎂🎁`;
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const format = (val) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val || 0);
  };

  const abrirHistorialPuntos = (cliente) => {
    setClienteSeleccionadoPuntos(cliente);
    setShowHistoryModal(true);
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

  // Cálculos de Créditos
  const totalPorCobrar = creditos.reduce((sum, c) => sum + (parseFloat(c.saldoPendiente) || 0), 0);

  const filteredClientes = clientes
    .filter(
      (c) =>
        c.nombre.toLowerCase().includes(search.toLowerCase()) ||
        c.dni.includes(search)
    )
    .filter((c) => {
      if (filterPuntos === 'conPuntos') return c.puntosFidelidad > 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'puntos') return b.puntosFidelidad - a.puntosFidelidad;
      if (sortBy === 'totalComprado') return parseFloat(b.totalComprado) - parseFloat(a.totalComprado);
      return a.nombre.localeCompare(b.nombre);
    });

  const filteredCreditos = creditos.filter(c => 
    c.clienteNombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.cliente?.dni || '').includes(search) ||
    (c.numeroComprobante || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn pb-12">
      {/* CABECERA Y SUB-PESTAÑAS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">CRM de Clientes & Créditos</h2>
          <p className="text-xs text-gray-500 font-medium">
            Fidelización, puntos de recompensa y gestión de cuentas por cobrar al crédito.
          </p>
        </div>

        {/* Pestañas CRM */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-pink-100 shadow-2xs">
          <button
            onClick={() => setTabCRM('directorio')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tabCRM === 'directorio' ? 'bg-pink-500 text-white shadow-2xs' : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <i className="fa-solid fa-users"></i> Directorio ({clientes.length})
          </button>
          <button
            onClick={() => {
              setTabCRM('creditos');
              fetchCreditos();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tabCRM === 'creditos' ? 'bg-purple-600 text-white shadow-2xs' : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            <i className="fa-solid fa-handshake"></i> Créditos & Cuentas por Cobrar ({creditos.length})
          </button>
        </div>
      </div>

      {/* ────────────────── PESTAÑA 1: DIRECTORIO DE CLIENTES ────────────────── */}
      {tabCRM === 'directorio' && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-2xl border border-pink-100/60 shadow-2xs">
            <div className="relative flex-1 w-full md:max-w-xs">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o DNI..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 bg-white"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterPuntos}
                onChange={(e) => setFilterPuntos(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 bg-white cursor-pointer"
              >
                <option value="todos">Todos los Clientes</option>
                <option value="conPuntos">Solo con Puntos</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 bg-white cursor-pointer"
              >
                <option value="nombre">Nombre (A-Z)</option>
                <option value="puntos">Puntos (Mayor a Menor) ⭐</option>
                <option value="totalComprado">Total Comprado 💰</option>
              </select>

              <button
                onClick={openAddModal}
                className="bg-pink-500 hover:bg-pink-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <i className="fa-solid fa-user-plus"></i> Nuevo Cliente
              </button>
            </div>
          </div>

          {/* TABLA CLIENTES */}
          <div className="bg-white rounded-2xl shadow-2xs border border-pink-100 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-pink-50/30 text-gray-400 uppercase tracking-wider">
                  <th className="p-3 pl-4 font-bold">Cliente / DNI</th>
                  <th className="p-3 font-bold">Contacto</th>
                  <th className="p-3 font-bold">Cumpleaños</th>
                  <th className="p-3 font-bold">Total Comprado</th>
                  <th className="p-3 font-bold">Puntos Fidelidad</th>
                  <th className="p-3 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClientes.map((c) => {
                  const esCumpleHoy = esCumpleanosHoy(c.fechaNacimiento);
                  return (
                    <tr key={c.id} className="hover:bg-pink-50/20 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 font-bold flex items-center justify-center text-xs">
                            {c.nombre.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{c.nombre}</p>
                            <p className="text-[10px] text-gray-400 font-mono">DNI: {c.dni}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="font-mono text-gray-700">{c.telefono || '-'}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-xs">{c.correo || '-'}</p>
                      </td>
                      <td className="p-3">
                        {esCumpleHoy ? (
                          <span className="bg-rose-100 text-rose-700 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit animate-bounce">
                            🎂 ¡Cumple Hoy!
                          </span>
                        ) : (
                          <span className="text-gray-500 font-mono">{c.fechaNacimiento || '-'}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-gray-800">{format(c.totalComprado)}</td>
                      <td className="p-3">
                        <button
                          onClick={() => abrirHistorialPuntos(c)}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-lg text-xs cursor-pointer flex items-center gap-1"
                        >
                          ⭐ {c.puntosFidelidad} pts
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {c.telefono && (
                            <button
                              onClick={() => enviarCRM(esCumpleHoy ? 'cumple' : 'gracias', c.nombre, c.telefono)}
                              className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
                              title="Enviar WhatsApp CRM"
                            >
                              <i className="fa-brands fa-whatsapp text-sm"></i>
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(c)}
                            className="text-blue-500 hover:text-blue-700 p-1 cursor-pointer"
                            title="Editar"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            title="Eliminar"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── PESTAÑA 2: CRÉDITOS Y CUENTAS POR COBRAR ────────────────── */}
      {tabCRM === 'creditos' && (
        <div className="space-y-4">
          {/* Tarjetas de Resumen de Créditos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-purple-700 block">Total Cuentas por Cobrar</span>
              <h3 className="text-2xl font-black text-purple-900 font-mono mt-0.5">{format(totalPorCobrar)}</h3>
              <p className="text-[11px] text-purple-600 mt-1">Créditos pendientes en salón</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Ventas al Crédito Activas</span>
              <h3 className="text-2xl font-black text-gray-900 font-mono mt-0.5">{creditos.length} Cuentas</h3>
              <p className="text-[11px] text-gray-400 mt-1">Por liquidar total o parcialmente</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Recuperación de Cobranza</span>
              <h3 className="text-2xl font-black text-emerald-700 font-mono mt-0.5">En Línea</h3>
              <p className="text-[11px] text-emerald-600 mt-1">Registra abonos con comprobante</p>
            </div>
          </div>

          {/* Tabla de Créditos */}
          <div className="bg-white rounded-2xl shadow-2xs border border-purple-100 overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex justify-between items-center">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">
                <i className="fa-solid fa-handshake text-purple-600 mr-1.5"></i> Detalle de Créditos Pendientes
              </h4>
              <input
                type="text"
                placeholder="Filtrar créditos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1 rounded-xl border border-gray-200 text-xs w-56 focus:outline-none focus:border-purple-400"
              />
            </div>

            {filteredCreditos.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs italic">
                <i className="fa-solid fa-circle-check text-2xl text-emerald-400 mb-2 block"></i>
                No hay créditos pendientes por cobrar. ¡Todas las cuentas están al día!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-purple-50/40 text-gray-500 uppercase tracking-wider">
                      <th className="p-3 pl-4 font-bold">Cliente</th>
                      <th className="p-3 font-bold">Comprobante / Fecha</th>
                      <th className="p-3 font-bold">Total Venta</th>
                      <th className="p-3 font-bold">Amortizado</th>
                      <th className="p-3 font-bold">Saldo Pendiente</th>
                      <th className="p-3 font-bold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCreditos.map((cr) => {
                      const total = parseFloat(cr.total);
                      const saldo = parseFloat(cr.saldoPendiente);
                      const amortizado = Math.max(0, total - saldo);
                      const phone = cr.cliente?.telefono;

                      return (
                        <tr key={cr.id} className="hover:bg-purple-50/20">
                          <td className="p-3 pl-4">
                            <p className="font-bold text-gray-900">{cr.clienteNombre}</p>
                            <p className="text-[10px] text-gray-400 font-mono">DNI: {cr.cliente?.dni || 'S/D'}</p>
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[10px] block w-fit">
                              {cr.numeroComprobante || `TK #${cr.id}`}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
                              {new Date(cr.fecha).toLocaleDateString('es-PE')}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-gray-800">{format(total)}</td>
                          <td className="p-3 font-mono font-semibold text-emerald-600">{format(amortizado)}</td>
                          <td className="p-3">
                            <span className="font-mono font-black text-rose-600 text-sm bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                              {format(saldo)}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {phone && (
                                <button
                                  onClick={() => enviarCRM('recordatorio_deuda', cr.clienteNombre, phone, saldo.toFixed(2))}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Enviar recordatorio cordial por WhatsApp"
                                >
                                  <i className="fa-brands fa-whatsapp text-xs"></i> Recordar
                                </button>
                              )}
                              <button
                                onClick={() => abrirModalAbono(cr)}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Registrar pago o abono"
                              >
                                <i className="fa-solid fa-money-bill-transfer"></i> Abonar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL REGISTRAR ABONO A CRÉDITO ── */}
      {showAbonoModal && creditoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-purple-100 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-sm text-gray-900">Registrar Abono a Crédito</h3>
                <p className="text-[10px] text-gray-400">{creditoSeleccionado.numeroComprobante || `Venta #${creditoSeleccionado.id}`}</p>
              </div>
              <button onClick={() => setShowAbonoModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleRegistrarAbono} className="space-y-3 mt-3">
              <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Cliente:</span>
                  <span className="font-bold text-gray-900">{creditoSeleccionado.clienteNombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Deuda Pendiente:</span>
                  <span className="font-black text-rose-600 font-mono text-sm">{format(creditoSeleccionado.saldoPendiente)}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-0.5">Monto del Abono (S/) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={creditoSeleccionado.saldoPendiente}
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold font-mono text-sm text-purple-700 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-0.5">Método de Pago *</label>
                <select
                  value={metodoPagoAbono}
                  onChange={(e) => setMetodoPagoAbono(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200 bg-white cursor-pointer"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Yape">Yape</option>
                  <option value="Plin">Plin</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-0.5">Notas del Abono</label>
                <input
                  type="text"
                  value={notasAbono}
                  onChange={(e) => setNotasAbono(e.target.value)}
                  placeholder="Ej. Pago parcial de servicio y base"
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200 bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAbonoModal(false)}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoAbono}
                  className="w-2/3 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                >
                  {guardandoAbono ? 'Registrando...' : 'Confirmar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL NUEVO / EDITAR CLIENTE ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-xl border border-pink-100 text-xs">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-gray-900">
                {selectedCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-600 uppercase mb-0.5">DNI *</label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="8 dígitos"
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-0.5">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Lucía Quispe"
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-0.5">Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="987654321"
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-0.5">Correo Electrónico</label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="lucia@gmail.com"
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-0.5">Fecha de Cumpleaños</label>
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2.5 rounded-xl shadow-xs"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL HISTORIAL DE PUNTOS ── */}
      {showHistoryModal && clienteSeleccionadoPuntos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-purple-100 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-sm text-gray-900">Historial de Puntos</h3>
                <p className="text-[10px] text-gray-400">{clienteSeleccionadoPuntos.nombre}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="py-3 text-center bg-purple-50 rounded-2xl mt-3">
              <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Saldo de Puntos</span>
              <p className="text-3xl font-black text-purple-700 font-mono mt-0.5">{clienteSeleccionadoPuntos.puntosFidelidad} pts</p>
            </div>

            <div className="mt-3">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;
