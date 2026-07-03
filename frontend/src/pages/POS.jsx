import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const POS = () => {
  const [productos, setProductos] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Checkout form states
  const [clienteDni, setClienteDni] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteCorreo, setClienteCorreo] = useState('');
  const [clienteFechaNacimiento, setClienteFechaNacimiento] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [statusBolsa, setStatusBolsa] = useState(false);
  const [bolsaStock, setBolsaStock] = useState(0);
  const [dniMessage, setDniMessage] = useState('');
  const [clienteExiste, setClienteExiste] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Sales History states
  const [history, setHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState('');

  const fetchProductosYStats = async () => {
    try {
      const res = await apiClient.get('/productos');
      setProductos(res.data);
      
      const bolsa = res.data.find(p => p.codigo === 'BOLS-001');
      if (bolsa) {
        setBolsaStock(bolsa.stock);
      }
    } catch (err) {
      console.error('Error al obtener productos:', err);
      toast.error('No se pudieron cargar los productos.');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchProductosYStats();
      setLoading(false);
    };
    init();
  }, []);

  const addToCart = (prod) => {
    const existing = cart.find(item => item.id === prod.id);
    if (existing) {
      if (existing.qty < prod.stock) {
        setCart(cart.map(item => item.id === prod.id ? { ...item, qty: item.qty + 1 } : item));
      } else {
        toast.error('No hay suficiente stock disponible.');
      }
    } else {
      if (prod.stock > 0) {
        setCart([...cart, { id: prod.id, nombre: prod.nombre, precio: prod.precio, qty: 1 }]);
      } else {
        toast.error('Producto sin stock.');
      }
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const openCheckout = () => {
    if (cart.length === 0) {
      toast.error('El ticket está vacío.');
      return;
    }
    setClienteDni('');
    setClienteNombre('');
    setClienteTelefono('');
    setClienteCorreo('');
    setClienteFechaNacimiento('');
    setMetodoPago('Efectivo');
    setStatusBolsa(false);
    setDniMessage('');
    setClienteExiste(false);
    setSearchPerformed(false);
    setShowCheckoutModal(true);
  };

  const handleBuscarClienteDNI = async () => {
    if (!clienteDni.trim()) {
      setDniMessage('Ingrese un DNI');
      setSearchPerformed(false);
      return;
    }
    try {
      const res = await apiClient.get('/clientes');
      const found = res.data.find(c => c.dni === clienteDni);
      if (found) {
        setClienteNombre(found.nombre);
        setClienteTelefono(found.telefono || '');
        setClienteCorreo(found.correo || '');
        setClienteFechaNacimiento(found.fechaNacimiento || '');
        setClienteExiste(true);
        setSearchPerformed(true);
        setDniMessage('¡Cliente encontrado!');
      } else {
        setClienteNombre('');
        setClienteTelefono('');
        setClienteCorreo('');
        setClienteFechaNacimiento('');
        setClienteExiste(false);
        setSearchPerformed(true);
        setDniMessage('Cliente nuevo. Llene los datos para registrarlo.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al buscar cliente.');
    }
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (clienteDni.trim() && !searchPerformed) {
      toast.error('Por favor, busque el DNI con la lupa antes de confirmar el cobro.');
      return;
    }
    if (clienteDni.trim() && !clienteExiste && !clienteNombre.trim()) {
      toast.error('Por favor, ingrese el nombre del nuevo cliente para registrarlo.');
      return;
    }
    try {
      const res = await apiClient.post('/ventas', {
        items: cart,
        clienteDni,
        clienteNombre,
        clienteTelefono,
        clienteCorreo,
        clienteFechaNacimiento,
        metodoPago,
        statusBolsa
      });
      toast.success(res.data.mensaje);
      setCart([]);
      setShowCheckoutModal(false);
      fetchProductosYStats();
    } catch (err) {
      console.error('Error al realizar checkout:', err);
      toast.error(err.response?.data?.error || 'Error al procesar la venta.');
    }
  };

  const openHistory = async () => {
    try {
      const res = await apiClient.get('/ventas/historial');
      setHistory(res.data);
      setHistorySearch('');
      setShowHistoryModal(true);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el historial de ventas.');
    }
  };

  const filteredProducts = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistory = history.filter(
    (v) =>
      v.clienteNombre.toLowerCase().includes(historySearch.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.precio * item.qty, 0);

  const format = (val) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val);
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString('es-PE')} ${d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* CATALOGO */}
        <div className="lg:col-span-2 flex flex-col h-[55vh] md:h-[500px]">
          <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-gray-400"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto por nombre o código..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 bg-white shadow-sm"
              />
            </div>
            <button
              onClick={openHistory}
              className="w-full sm:w-auto bg-white border border-pink-200 text-pink-600 font-bold px-4 py-2.5 rounded-xl hover:bg-pink-50 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <i className="fa-solid fa-clock-rotate-left"></i> Historial
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4 flex-1 content-start">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center text-gray-400 py-8">
                  No se encontraron productos.
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.stock <= 0}
                    className={`bg-white p-4 rounded-xl border border-pink-100 shadow-sm hover:border-pink-400 text-left transition-all flex justify-between items-center group cursor-pointer ${
                      p.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="pr-2">
                      <p className="font-bold text-sm text-gray-900 leading-tight">{p.nombre}</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Cód: {p.codigo} • Stock: {p.stock}
                      </p>
                    </div>
                    <span className="font-bold text-emerald-600 text-sm bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0">
                      {format(p.precio)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* TICKET / CARRITO */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-pink-100 shadow-sm flex flex-col justify-between h-[55vh] md:h-[500px]">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-pink-50 pb-3 mb-4 shrink-0">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-receipt text-pink-500"></i> Ticket Actual
              </h4>
              <button
                onClick={clearCart}
                className="text-xs text-gray-400 hover:text-rose-500 transition-all font-medium cursor-pointer"
              >
                Vaciar
              </button>
            </div>
            
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 text-sm">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 mt-8">El ticket está vacío</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium text-sm truncate text-gray-900">{item.nombre}</p>
                      <p className="text-xs text-gray-400">
                        {item.qty} x {format(item.precio)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-gray-900 text-sm">{format(item.precio * item.qty)}</span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-rose-500 transition-colors cursor-pointer p-1"
                        title="Quitar item"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-pink-50 pt-4 space-y-4 shrink-0 mt-4">
            <div className="flex justify-between items-center text-lg font-bold text-gray-900">
              <span>Total a Cobrar:</span>
              <span className="text-xl text-emerald-600">{format(cartTotal)}</span>
            </div>
            <button
              onClick={openCheckout}
              disabled={cart.length === 0}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-cash-register"></i> Proceder al Pago
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CHECKOUT */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 md:p-6 shadow-xl border border-pink-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-pink-50 pb-4 mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-cash-register text-emerald-500"></i> Procesar Pago
              </h3>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-gray-400 hover:text-rose-500 cursor-pointer transition-colors"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="bg-emerald-50 rounded-xl p-4 mb-3 text-center border border-emerald-100">
              <p className="text-sm text-emerald-700 font-bold uppercase tracking-wider">Monto a Cobrar</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{format(cartTotal)}</p>
            </div>

            <div className="bg-pink-50/50 p-3 rounded-xl border border-pink-100 flex items-center justify-between mb-4">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={statusBolsa}
                  onChange={(e) => setStatusBolsa(e.target.checked)}
                  className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">
                  ¿Lleva bolsa de regalo? (Gratis)
                </span>
              </label>
              <span className="text-xs font-mono font-bold text-gray-400 bg-white px-2 py-0.5 rounded border border-pink-100">
                Stock: {bolsaStock}
              </span>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">
                  1. Datos del Cliente
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">DNI / Documento</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={clienteDni}
                        onChange={(e) => setClienteDni(e.target.value)}
                        placeholder="Ej. 76543210"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleBuscarClienteDNI}
                        className="bg-pink-100 hover:bg-pink-200 text-pink-600 px-4 rounded-xl transition-colors cursor-pointer"
                        title="Buscar Cliente"
                      >
                        <i className="fa-solid fa-magnifying-glass"></i>
                      </button>
                    </div>
                    {dniMessage && (
                      <p className={`text-[10px] mt-1 ml-1 ${
                        dniMessage.includes('encontrado') ? 'text-emerald-500 font-bold' : 'text-amber-500'
                      }`}>
                        {dniMessage}
                      </p>
                    )}
                  </div>
                  {searchPerformed ? (
                    !clienteExiste ? (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                          <input
                            type="text"
                            required
                            value={clienteNombre}
                            onChange={(e) => setClienteNombre(e.target.value)}
                            placeholder="Ej. María López"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 bg-white"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label>
                            <input
                              type="text"
                              value={clienteTelefono}
                              onChange={(e) => setClienteTelefono(e.target.value)}
                              placeholder="Opcional"
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo</label>
                            <input
                              type="email"
                              value={clienteCorreo}
                              onChange={(e) => setClienteCorreo(e.target.value)}
                              placeholder="Opcional"
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 bg-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha de Nacimiento (Cumpleaños)</label>
                          <input
                            type="date"
                            value={clienteFechaNacimiento}
                            onChange={(e) => setClienteFechaNacimiento(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 bg-white"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="bg-pink-50/50 border border-pink-100 p-4 rounded-2xl space-y-2 mt-2">
                        <p className="text-sm text-pink-700 font-bold flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-check text-pink-500"></i>
                          Cliente Registrado
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 pt-1">
                          <div><strong>Nombre:</strong> {clienteNombre}</div>
                          <div><strong>Teléfono:</strong> {clienteTelefono || '-'}</div>
                          <div><strong>Correo:</strong> {clienteCorreo || '-'}</div>
                          <div><strong>Cumpleaños:</strong> {clienteFechaNacimiento || '-'}</div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl text-xs text-gray-500 mt-2">
                      <p className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-info text-pink-500"></i>
                        Venta Rápida (Cliente Anónimo)
                      </p>
                      Deje el DNI en blanco para proceder con una venta rápida. Si desea registrar o acumular puntos para un cliente, ingrese su DNI arriba y presione la lupa.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-2">
                <h4 className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">
                  2. Método de Pago
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {['Efectivo', 'Yape', 'Plin', 'Transferencia'].map((m) => {
                    const icons = {
                      Efectivo: 'fa-solid fa-money-bill-wave',
                      Yape: 'fa-solid fa-mobile-screen-button',
                      Plin: 'fa-solid fa-qrcode',
                      Transferencia: 'fa-solid fa-building-columns'
                    };
                    const activeColorClass = {
                      Efectivo: 'peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700',
                      Yape: 'peer-checked:border-[#742384] peer-checked:bg-[#742384]/10 peer-checked:text-[#742384]',
                      Plin: 'peer-checked:border-[#00E0ED] peer-checked:bg-[#00E0ED]/10 peer-checked:text-[#00B0BA]',
                      Transferencia: 'peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700'
                    };

                    return (
                      <label key={m} className="cursor-pointer">
                        <input
                          type="radio"
                          name="metodo-pago"
                          value={m}
                          checked={metodoPago === m}
                          onChange={() => setMetodoPago(m)}
                          className="peer sr-only"
                        />
                        <div className={`rounded-xl border border-gray-200 px-4 py-3 text-center transition-all ${activeColorClass[m]}`}>
                          <i className={`${icons[m]} mb-1 text-lg block`}></i>
                          <span className="text-xs font-bold uppercase tracking-wider">{m}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-emerald-200 mt-6 cursor-pointer text-lg"
              >
                Confirmar Cobro
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-4 md:p-6 shadow-xl border border-pink-100 h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-5 shrink-0 border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-pink-500"></i> Historial de Ventas
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-rose-500 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <div className="mb-4 shrink-0">
              <div className="relative max-w-xs">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Filtrar por cliente..."
                  className="w-full pl-8 pr-4 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 bg-white shadow-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto w-full">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100 sticky top-0">
                    <th className="p-4 pl-6">Fecha</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Método</th>
                    <th className="p-4 text-center">Puntos</th>
                    <th className="p-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-400 italic">
                        No se registraron ventas en el historial.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-gray-500">{formatDate(v.fecha)}</td>
                        <td className="p-4 font-bold text-gray-900">{v.clienteNombre}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded bg-gray-100 text-xs font-bold text-gray-700">
                            {v.metodoPago}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-purple-600">{v.puntos || 0} pts</td>
                        <td className="p-4 text-right font-bold text-emerald-600">{format(v.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
