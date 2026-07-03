import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');

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

  useEffect(() => {
    fetchClientes();
  }, []);

  const openAddModal = () => {
    setSelectedCliente(null);
    setNombre('');
    setDni('');
    setTelefono('');
    setCorreo('');
    setShowModal(true);
  };

  const openEditModal = (cliente) => {
    setSelectedCliente(cliente);
    setNombre(cliente.nombre);
    setDni(cliente.dni);
    setTelefono(cliente.telefono || '');
    setCorreo(cliente.correo || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { dni, nombre, telefono, correo };
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

  const enviarCRM = (tipo, name, phone) => {
    if (!phone || phone === '' || phone === '-') {
      toast.error('Este cliente no cuenta con número telefónico registrado para el CRM.');
      return;
    }
    let mensaje = '';
    if (tipo === 'cita') {
      mensaje = `Hola *${name}*, te saludamos desde *GlowManager Pro* ✨ Queríamos recordarte que tu hermosa cita programada está próxima. ¡Nos estamos preparando para consentirte! 💕`;
    } else if (tipo === 'gracias') {
      mensaje = `¡Muchísimas gracias por tu compra, *${name}*! 🥰 En *GlowManager Pro* valoramos mucho tu preferencia. Esperamos que disfrutes al máximo tus productos de belleza. ¡Vuelve pronto! 💄`;
    } else if (tipo === 'cumple') {
      mensaje = `¡Feliz Cumpleaños, *${name}*! 🎉🥳 Todo el equipo de *GlowManager Pro* te desea un día espectacular lleno de brillo. Recuerda que tienes un obsequio especial y un descuento exclusivo esperando por ti en el estudio. ¡Pasa a celebrar con nosotros! 🎂🎁`;
    }
    const url = `https://wa.me/51${phone}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const filteredClientes = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.dni.includes(search)
  );

  const format = (val) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val);
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-gray-400"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 bg-white shadow-sm"
          />
        </div>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-pink-200"
        >
          <i className="fa-solid fa-user-plus"></i> Agregar Cliente
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
                <th className="p-4 pl-6">DNI / Doc</th>
                <th className="p-4">Nombre Completo</th>
                <th className="p-4">Contacto</th>
                <th className="p-4 text-center">Fidelización CRM (WhatsApp)</th>
                <th className="p-4 text-center">Total Comprado</th>
                <th className="p-4 pr-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 italic">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                filteredClientes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6 text-xs font-mono font-bold text-gray-500">{c.dni}</td>
                    <td className="p-4 font-bold text-gray-900">{c.nombre}</td>
                    <td className="p-4">
                      <p className="text-xs text-gray-600">
                        <i className="fa-solid fa-phone mr-1"></i> {c.telefono || '-'}
                      </p>
                      <p className="text-xs text-gray-400">
                        <i className="fa-solid fa-envelope mr-1"></i> {c.correo || '-'}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => enviarCRM('cita', c.nombre, c.telefono)}
                          className="bg-purple-50 text-purple-600 px-2 py-1 rounded-lg text-xs font-semibold hover:bg-purple-100 transition-colors cursor-pointer"
                          title="Recordatorio Cita"
                        >
                          <i className="fa-regular fa-calendar-check"></i> Cita
                        </button>
                        <button
                          onClick={() => enviarCRM('gracias', c.nombre, c.telefono)}
                          className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Agradecer Compra"
                        >
                          <i className="fa-solid fa-heart"></i> Gracias
                        </button>
                        <button
                          onClick={() => enviarCRM('cumple', c.nombre, c.telefono)}
                          className="bg-pink-50 text-pink-600 px-2 py-1 rounded-lg text-xs font-semibold hover:bg-pink-100 transition-colors cursor-pointer"
                          title="Cumpleaños"
                        >
                          <i className="fa-solid fa-cake-candles"></i> Cumple
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-emerald-600">{format(c.totalComprado)}</td>
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

      {/* MODAL CLIENTE */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 md:p-6 shadow-xl border border-pink-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedCliente ? 'Editar Cliente' : 'Agregar Cliente'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-rose-500 cursor-pointer transition-colors"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">DNI / Documento</label>
                <input
                  type="text"
                  required
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="Ej. 76543210"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Lucía Fernández"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 987654321"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="ejemplo@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-pink-200 mt-4 cursor-pointer"
              >
                <i className="fa-solid fa-floppy-disk mr-2"></i> Guardar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;
