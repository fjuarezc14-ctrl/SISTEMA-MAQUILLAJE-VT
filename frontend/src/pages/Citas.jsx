import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const Citas = () => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedCita, setSelectedCita] = useState(null);

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

  useEffect(() => {
    fetchCitas();
    fetchClientes();
    fetchProductos();
  }, []);

  const openAddModal = () => {
    setSelectedCita(null);
    
    // Set default date to today
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
    setEstado(cita.estado);
    setNotas(cita.notas || '');
    setPrecioServicio(cita.precioServicio || '');
    setMetodoPago(cita.metodoPago || 'Efectivo');
    setInsumosSeleccionados([]);
    setPuntosCanjeados(0);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta cita?')) {
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

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-sm text-gray-500 font-medium">
          Gestión de reservas de citas y servicios de maquillaje o belleza programados.
        </p>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-pink-200"
        >
          <i className="fa-regular fa-calendar-plus"></i> Agendar Cita
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-pink-50/50 text-pink-700 text-xs font-bold uppercase tracking-wider border-b border-pink-100">
                <th className="p-4 pl-6">Fecha</th>
                <th className="p-4">Hora</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Servicio</th>
                <th className="p-4">Estado</th>
                <th className="p-4 pr-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {citas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 italic">
                    No hay citas programadas.
                  </td>
                </tr>
              ) : (
                citas.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6 text-xs font-mono font-bold text-gray-500">{c.fecha}</td>
                    <td className="p-4 font-bold text-gray-900">{c.hora}</td>
                    <td className="p-4 font-medium text-gray-900">{c.clienteNombre}</td>
                    <td className="p-4 text-gray-600 text-sm">{c.servicio}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-[10px] rounded font-bold uppercase ${
                        c.estado === 'Completado'
                          ? 'bg-emerald-100 text-emerald-700'
                          : c.estado === 'Cancelado'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-center">
                      <button
                        onClick={() => openEditModal(c)}
                        className="text-blue-500 hover:text-blue-700 cursor-pointer mr-3"
                        title="Editar"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        title="Eliminar"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CITA */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 md:p-6 shadow-xl border border-pink-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedCita ? 'Editar Cita' : 'Agendar Cita'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-rose-500 cursor-pointer transition-colors"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Servicio / Descripción</label>
                <input
                  type="text"
                  required
                  value={servicio}
                  onChange={(e) => setServicio(e.target.value)}
                  placeholder="Ej. Maquillaje de novia"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50 cursor-pointer"
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Completado">Completado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              {estado === 'Completado' && (
                <div className="bg-pink-50/30 border border-pink-100 p-4 rounded-2xl space-y-3 mt-2">
                  <h4 className="text-xs font-bold text-pink-700 uppercase tracking-wider mb-1">
                    <i className="fa-solid fa-cash-register mr-1"></i> Conciliación de Servicio y Caja
                  </h4>
                  
                  {selectedCita?.ingresoRegistrado ? (
                    <div className="text-xs text-gray-600 space-y-1 bg-white p-3 rounded-xl border border-gray-100 font-sans">
                      <p>✨ <strong>Ingreso ya registrado:</strong></p>
                      <div>💰 <strong>Mano de Obra:</strong> {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(selectedCita.precioServicio || 0)}</div>
                      <div>💳 <strong>Método de Pago:</strong> {selectedCita.metodoPago || 'Efectivo'}</div>
                      <p className="text-[10px] text-gray-400 italic mt-1 font-sans">Los datos financieros y el descuento de stock de esta cita no se pueden modificar.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mano de Obra (S/)</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            min="0"
                            value={precioServicio}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPrecioServicio(val);
                              const pServ = parseFloat(val || 0);
                              if (puntosCanjeados * 0.5 > pServ) {
                                setPuntosCanjeados(Math.floor(pServ / 0.5));
                              }
                            }}
                            placeholder="Ej. 150.00"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 bg-white font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Método de Pago</label>
                          <select
                            value={metodoPago}
                            onChange={(e) => setMetodoPago(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 bg-white cursor-pointer font-sans"
                          >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Yape">Yape</option>
                            <option value="Plin">Plin</option>
                            <option value="Transferencia">Transferencia</option>
                          </select>
                        </div>
                      </div>

                      {(() => {
                        const matchedClientObj = clientes.find(c => c.nombre.toLowerCase() === clienteNombre.toLowerCase());
                        const clientPointsAvailable = matchedClientObj ? (matchedClientObj.puntosFidelidad || 0) : 0;
                        if (clientPointsAvailable <= 0) return null;

                        return (
                          <div className="pt-2.5 space-y-2 border-t border-pink-100/50 mt-1 font-sans">
                            <p className="text-[10px] text-purple-700 font-bold flex items-center gap-1.5">
                              <i className="fa-solid fa-star text-purple-500"></i>
                              Puntos Disponibles: <strong className="text-xs font-black">{clientPointsAvailable}</strong>
                              <span className="text-[9px] text-gray-400 font-normal"> (Equivale a S/ {(clientPointsAvailable * 0.5).toFixed(2)} de descuento)</span>
                            </p>
                            <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-pink-100">
                              <label className="text-[10px] font-bold text-gray-500 uppercase flex-1 text-left">Canjear Puntos</label>
                              <input
                                type="number"
                                min="0"
                                max={Math.min(clientPointsAvailable, Math.floor(parseFloat(precioServicio || 0) / 0.5))}
                                value={puntosCanjeados}
                                onChange={(e) => {
                                  const val = Math.min(clientPointsAvailable, Math.max(0, parseInt(e.target.value) || 0));
                                  const pServ = parseFloat(precioServicio || 0);
                                  if (val * 0.5 > pServ) {
                                    setPuntosCanjeados(Math.floor(pServ / 0.5));
                                  } else {
                                    setPuntosCanjeados(val);
                                  }
                                }}
                                className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-xs text-center font-bold focus:outline-none focus:border-pink-400 font-sans"
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {puntosCanjeados > 0 && (
                        <div className="bg-purple-50 border border-purple-100 p-2.5 rounded-xl text-[10px] text-purple-700 font-semibold flex justify-between items-center font-sans">
                          <span>Descuento aplicado: <strong>- S/ {(puntosCanjeados * 0.5).toFixed(2)}</strong></span>
                          <span>Neto a cobrar: <strong className="text-xs text-purple-800">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Math.max(0, parseFloat(precioServicio || 0) - puntosCanjeados * 0.5))}</strong></span>
                        </div>
                      )}

                      {/* Sección de Insumos */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Insumos Consumidos (Inventario)</label>
                          <button
                            type="button"
                            onClick={() => setInsumosSeleccionados([...insumosSeleccionados, { productoId: '', cantidad: 1, searchText: '', mostrarSugerenciasProd: false }])}
                            className="text-[10px] text-pink-600 hover:text-pink-700 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <i className="fa-solid fa-plus text-[8px]"></i> Añadir
                          </button>
                        </div>

                        {insumosSeleccionados.length === 0 ? (
                          <p className="text-[10px] text-gray-400 italic">No se agregaron productos de inventario a esta sesión.</p>
                        ) : (
                          <div className="space-y-2 pr-1">
                            {insumosSeleccionados.map((ins, idx) => {
                              const selProd = productos.find(p => p.id === parseInt(ins.productoId));
                              const stock = selProd ? (selProd.lotes?.reduce((sum, l) => sum + l.stockActual, 0) || 0) : 0;
                              return (
                                <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-gray-100 font-sans">
                                  <div className="relative flex-1">
                                    <input
                                      type="text"
                                      required
                                      placeholder="Haz clic para ver todos o escribe..."
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
                                      className="w-full px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-pink-400 cursor-pointer"
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
                                          <ul className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[99] max-h-36 overflow-y-auto divide-y divide-gray-100 font-sans">
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
                                                  className="px-2 py-1.5 hover:bg-pink-50 hover:text-pink-600 cursor-pointer text-[10px] flex justify-between items-center"
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
                                    className="w-14 px-2 py-1 rounded-lg border border-gray-200 text-xs text-center focus:outline-none focus:border-pink-400 font-mono"
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
                    </>
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
                <i className="fa-solid fa-floppy-disk mr-2"></i> Guardar Cita
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Citas;
