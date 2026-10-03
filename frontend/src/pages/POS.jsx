import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const POS = () => {
  const [catalogoTab, setCatalogoTab] = useState('PRODUCTOS'); // 'PRODUCTOS' | 'SERVICIOS' | 'PACKS'
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [packs, setPacks] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');

  // Modals
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showComprobanteModal, setShowComprobanteModal] = useState(false);
  const [comprobanteEmitido, setComprobanteEmitido] = useState(null);

  // Control de Caja Modal
  const [showCajaModal, setShowCajaModal] = useState(false);
  const [cajaEstado, setCajaEstado] = useState(null);
  const [montoAperturaInput, setMontoAperturaInput] = useState('');
  const [montoCierreInput, setMontoCierreInput] = useState('');
  const [notasCaja, setNotasCaja] = useState('');
  const [resumenCierreFinal, setResumenCierreFinal] = useState(null);

  // Checkout form states
  const [tipoVenta, setTipoVenta] = useState('CONTADO'); // 'CONTADO' | 'CREDITO'
  const [tipoComprobante, setTipoComprobante] = useState('TICKET'); // 'TICKET' | 'BOLETA' | 'FACTURA'
  const [clienteDni, setClienteDni] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteCorreo, setClienteCorreo] = useState('');
  const [clienteFechaNacimiento, setClienteFechaNacimiento] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [metodoPagoDigital, setMetodoPagoDigital] = useState('Yape');
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [montoDigital, setMontoDigital] = useState('');

  const [statusBolsa, setStatusBolsa] = useState(false);
  const [dniMessage, setDniMessage] = useState('');
  const [clienteExiste, setClienteExiste] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [clientePuntos, setClientePuntos] = useState(0);
  const [puntosCanjeados, setPuntosCanjeados] = useState(0);

  // Sales History states
  const [history, setHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState('');

  const fetchProductosYStats = async () => {
    try {
      const res = await apiClient.get('/productos');
      const prodsFiltro = res.data.filter(p => p.codigo !== 'SERV-GENERICO' && p.codigo !== 'BOLS-001');
      setProductos(prodsFiltro);
    } catch (err) {
      console.error('Error al obtener productos:', err);
    }
  };

  const fetchServicios = async () => {
    try {
      const res = await apiClient.get('/servicios');
      setServicios(res.data);
    } catch (err) {
      console.error('Error al obtener servicios:', err);
    }
  };

  const fetchPacks = async () => {
    try {
      const res = await apiClient.get('/packs');
      setPacks(res.data);
    } catch (err) {
      console.error('Error al obtener packs:', err);
    }
  };

  const fetchCajaEstado = async () => {
    try {
      const res = await apiClient.get('/caja/estado');
      setCajaEstado(res.data);
    } catch (err) {
      console.error('Error al consultar caja:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchProductosYStats();
      await fetchServicios();
      await fetchPacks();
      await fetchCajaEstado();
    };
    init();
  }, []);

  const addToCartProducto = (prod) => {
    const existing = cart.find(item => item.id === prod.id && item.tipo !== 'SERVICIO');
    if (existing) {
      if (existing.qty < prod.stock) {
        setCart(cart.map(item => (item.id === prod.id && item.tipo !== 'SERVICIO') ? { ...item, qty: item.qty + 1 } : item));
      } else {
        toast.error('No hay suficiente stock disponible.');
      }
    } else {
      if (prod.stock > 0) {
        setCart([...cart, { id: prod.id, nombre: prod.nombre, precio: prod.precio, qty: 1, tipo: 'PRODUCTO' }]);
      } else {
        toast.error('Producto sin stock disponible.');
      }
    }
  };

  const addToCartServicio = (serv) => {
    const servCartId = `SERV-${serv.id}`;
    const existing = cart.find(item => item.cartId === servCartId);
    if (existing) {
      setCart(cart.map(item => item.cartId === servCartId ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { 
        id: serv.id, 
        cartId: servCartId, 
        nombre: `Servicio: ${serv.nombre}`, 
        precio: parseFloat(serv.precio), 
        qty: 1, 
        tipo: 'SERVICIO' 
      }]);
    }
    toast.success(`Servicio "${serv.nombre}" añadido.`);
  };

  const addToCartPack = (pack) => {
    const packCartId = `PACK-${pack.id}`;
    const existing = cart.find(item => item.cartId === packCartId);
    if (existing) {
      setCart(cart.map(item => item.cartId === packCartId ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { 
        id: pack.id, 
        cartId: packCartId, 
        nombre: `Pack: ${pack.nombre}`, 
        precio: parseFloat(pack.precioPromo), 
        qty: 1, 
        tipo: 'SERVICIO' 
      }]);
    }
    toast.success(`Pack "${pack.nombre}" añadido.`);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotalCart = cart.reduce((sum, item) => sum + (item.precio * item.qty), 0);
  const descuentoPuntosVal = puntosCanjeados * 0.5;
  const totalCart = Math.max(0, subtotalCart - descuentoPuntosVal);

  const openCheckout = () => {
    if (cart.length === 0) {
      toast.error('El ticket está vacío.');
      return;
    }
    setTipoVenta('CONTADO');
    setTipoComprobante('TICKET');
    setClienteDni('');
    setClienteNombre('');
    setClienteTelefono('');
    setClienteCorreo('');
    setClienteFechaNacimiento('');
    setMetodoPago('Efectivo');
    setMetodoPagoDigital('Yape');
    setMontoEfectivo('');
    setMontoDigital('');
    setStatusBolsa(false);
    setDniMessage('');
    setClienteExiste(false);
    setSearchPerformed(false);
    setClientePuntos(0);
    setPuntosCanjeados(0);
    setShowCheckoutModal(true);
  };

  const handleBuscarClienteDNI = async () => {
    const dniBuscado = clienteDni.trim();
    if (!dniBuscado) {
      setDniMessage('Ingrese un DNI');
      setSearchPerformed(false);
      return;
    }
    try {
      const res = await apiClient.get(`/clientes/buscar/${dniBuscado}`);
      const found = res.data;
      if (found) {
        setClienteNombre(found.nombre);
        setClienteTelefono(found.telefono || '');
        setClienteCorreo(found.correo || '');
        setClienteFechaNacimiento(found.fechaNacimiento || '');
        setClienteExiste(true);
        setClientePuntos(found.puntosFidelidad || 0);
        setPuntosCanjeados(0);
        setSearchPerformed(true);
        setDniMessage('¡Cliente encontrado!');
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setClienteNombre('');
        setClienteTelefono('');
        setClienteCorreo('');
        setClienteFechaNacimiento('');
        setClienteExiste(false);
        setClientePuntos(0);
        setPuntosCanjeados(0);
        setSearchPerformed(true);
        setDniMessage('Cliente nuevo. Llene los datos para registrarlo.');
      } else {
        console.error(err);
        toast.error('Error al buscar cliente.');
      }
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

    if (tipoVenta === 'CREDITO' && !clienteDni.trim()) {
      toast.error('Las ventas al crédito requieren asociar obligatoriamente un cliente con DNI.');
      return;
    }

    // Validar pago mixto
    if (metodoPago === 'Pago Mixto' && tipoVenta === 'CONTADO') {
      const ef = parseFloat(montoEfectivo || 0);
      const dig = parseFloat(montoDigital || 0);
      const suma = ef + dig;
      if (Math.abs(suma - totalCart) > 0.05) {
        toast.error(`La suma del pago mixto (S/ ${suma.toFixed(2)}) debe coincidir con el total a pagar (S/ ${totalCart.toFixed(2)}).`);
        return;
      }
    }

    try {
      const res = await apiClient.post('/ventas', {
        items: cart,
        clienteDni,
        clienteNombre,
        clienteTelefono,
        clienteCorreo,
        clienteFechaNacimiento,
        metodoPago: tipoVenta === 'CREDITO' ? 'Crédito' : metodoPago,
        statusBolsa,
        puntosCanjeados,
        tipoVenta,
        tipoComprobante,
        montoEfectivo: parseFloat(montoEfectivo || 0),
        montoDigital: parseFloat(montoDigital || 0),
        metodoPagoDigital
      });

      const ventaGuardada = res.data.venta;
      toast.success(res.data.mensaje || 'Venta procesada exitosamente.');
      
      // Abrir modal de comprobante emitido
      setComprobanteEmitido(ventaGuardada);
      setShowComprobanteModal(true);

      setCart([]);
      setShowCheckoutModal(false);
      fetchProductosYStats();
      fetchCajaEstado();
    } catch (err) {
      console.error('Error al realizar checkout:', err);
      toast.error(err.response?.data?.error || 'Error al procesar la venta.');
    }
  };

  // Apertura y Cierre de Caja
  const handleAbrirCaja = async (e) => {
    e.preventDefault();
    const monto = parseFloat(montoAperturaInput);
    if (isNaN(monto) || monto < 0) {
      toast.error('Ingrese un monto inicial válido.');
      return;
    }
    try {
      await apiClient.post('/caja/abrir', { montoApertura: monto, notas: notasCaja });
      toast.success('¡Caja abierta exitosamente!');
      setMontoAperturaInput('');
      setNotasCaja('');
      fetchCajaEstado();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al abrir caja.');
    }
  };

  const handleCerrarCaja = async (e) => {
    e.preventDefault();
    const montoFisico = parseFloat(montoCierreInput);
    if (isNaN(montoFisico) || montoFisico < 0) {
      toast.error('Ingrese el dinero físico contado en caja.');
      return;
    }
    try {
      const res = await apiClient.post('/caja/cerrar', { montoCierre: montoFisico, notas: notasCaja });
      toast.success('Cierre de caja registrado exitosamente.');
      setResumenCierreFinal(res.data.resumenCierre);
      setMontoCierreInput('');
      setNotasCaja('');
      fetchCajaEstado();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cerrar caja.');
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
      toast.error('Error al cargar historial.');
    }
  };

  const formatPEN = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val || 0);

  return (
    <div className="space-y-4 animate-fadeIn pb-12">
      {/* CABECERA POS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">Punto de Venta (POS) & Boutique</h2>
          <p className="text-xs text-gray-500 font-medium">
            Facturación rápida, pago mixto, comprobantes, servicios de salón y control de caja.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Botón Control de Caja */}
          <button
            onClick={() => {
              setResumenCierreFinal(null);
              fetchCajaEstado();
              setShowCajaModal(true);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              cajaEstado?.abierta
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 animate-pulse'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${cajaEstado?.abierta ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            {cajaEstado?.abierta ? 'Caja Abierta (Turno Activo)' : 'Caja Cerrada (Abrir Turno)'}
          </button>

          {/* Historial de Ventas */}
          <button
            onClick={openHistory}
            className="bg-white hover:bg-pink-50 text-gray-700 hover:text-pink-600 border border-gray-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <i className="fa-solid fa-clock-rotate-left"></i> Historial
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: CATÁLOGO Y TICKET */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SECCIÓN CATÁLOGO (7 u 8 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          {/* Barra de Filtro de Catálogo: Productos / Servicios / Packs */}
          <div className="bg-white p-2 rounded-2xl border border-pink-100 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="flex gap-1 w-full sm:w-auto">
              <button
                onClick={() => setCatalogoTab('PRODUCTOS')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  catalogoTab === 'PRODUCTOS' ? 'bg-pink-500 text-white shadow-2xs' : 'text-gray-600 hover:bg-pink-50'
                }`}
              >
                <i className="fa-solid fa-boxes-stacked mr-1"></i> Productos Cosméticos
              </button>
              <button
                onClick={() => setCatalogoTab('SERVICIOS')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  catalogoTab === 'SERVICIOS' ? 'bg-pink-500 text-white shadow-2xs' : 'text-gray-600 hover:bg-pink-50'
                }`}
              >
                <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> Servicios Boutique
              </button>
              <button
                onClick={() => setCatalogoTab('PACKS')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  catalogoTab === 'PACKS' ? 'bg-pink-500 text-white shadow-2xs' : 'text-gray-600 hover:bg-pink-50'
                }`}
              >
                <i className="fa-solid fa-gift mr-1"></i> Packs & Promos
              </button>
            </div>

            <div className="relative w-full sm:w-56">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                placeholder="Buscar en catálogo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 bg-gray-50/50"
              />
            </div>
          </div>

          {/* VISTA 1: PRODUCTOS */}
          {catalogoTab === 'PRODUCTOS' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[68vh] overflow-y-auto pr-1">
              {productos
                .filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase()))
                .map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => addToCartProducto(prod)}
                    className="bg-white p-3 rounded-2xl border border-gray-100 hover:border-pink-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-mono text-[9px] text-gray-400">{prod.codigo}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                          prod.stock <= 2 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {prod.stock} disp.
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-900 mt-1 line-clamp-2 leading-tight">{prod.nombre}</h4>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center">
                      <span className="text-xs font-black text-pink-600 font-mono">{formatPEN(prod.precio)}</span>
                      <span className="w-6 h-6 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-500 hover:text-white flex items-center justify-center text-xs transition-colors">
                        +
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* VISTA 2: SERVICIOS BOUTIQUE */}
          {catalogoTab === 'SERVICIOS' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[68vh] overflow-y-auto pr-1">
              {servicios
                .filter(s => s.nombre.toLowerCase().includes(search.toLowerCase()) || s.categoria.toLowerCase().includes(search.toLowerCase()))
                .map((serv) => (
                  <div
                    key={serv.id}
                    onClick={() => addToCartServicio(serv)}
                    className="bg-white p-3.5 rounded-2xl border border-pink-100/80 hover:border-pink-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md uppercase">
                          {serv.categoria}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          <i className="fa-regular fa-clock mr-0.5"></i> {serv.duracion}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-900 mt-2 leading-snug">{serv.nombre}</h4>
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{serv.descripcion || 'Servicio profesional'}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-pink-50 flex justify-between items-center">
                      <span className="text-xs font-black text-pink-600 font-mono">{formatPEN(serv.precio)}</span>
                      <button className="bg-pink-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg">
                        + Agregar
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* VISTA 3: PACKS & PROMOS */}
          {catalogoTab === 'PACKS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[68vh] overflow-y-auto pr-1">
              {packs
                .filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()))
                .map((pack) => (
                  <div
                    key={pack.id}
                    onClick={() => addToCartPack(pack)}
                    className="bg-gradient-to-br from-pink-50/60 to-purple-50/60 p-4 rounded-2xl border border-purple-200/80 hover:border-pink-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-purple-600 text-white">
                        Promoción
                      </span>
                      <h4 className="font-bold text-xs text-gray-900 mt-2">{pack.nombre}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">{pack.descripcion || 'Pack especial'}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-purple-100 flex justify-between items-center">
                      <span className="text-sm font-black text-purple-700 font-mono">{formatPEN(pack.precioPromo)}</span>
                      <button className="bg-purple-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg">
                        + Cobrar Pack
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* SECCIÓN TICKET DE VENTA (5 o 4 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white p-4 rounded-3xl border border-pink-100 shadow-2xs flex flex-col justify-between min-h-[580px]">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <i className="fa-solid fa-receipt text-pink-500"></i> Ticket de Venta
              </h3>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Listado de Ítems */}
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto mt-2 pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-300">
                  <i className="fa-solid fa-cart-shopping text-3xl mb-2 text-pink-200"></i>
                  <p className="text-xs">El ticket está vacío</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Toca un producto o servicio para agregar</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-gray-900 truncate">{item.nombre}</p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        {item.qty} x {formatPEN(item.precio)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-gray-900">{formatPEN(item.precio * item.qty)}</span>
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-gray-300 hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totales y Botón Cobrar */}
          <div className="border-t border-gray-100 pt-3 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal:</span>
                <span className="font-mono">{formatPEN(subtotalCart)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 border-t border-gray-100 pt-1">
                <span>Total a Cobrar:</span>
                <span className="font-mono text-pink-600">{formatPEN(totalCart)}</span>
              </div>
            </div>

            <button
              onClick={openCheckout}
              disabled={cart.length === 0}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3.5 rounded-2xl text-xs sm:text-sm shadow-md shadow-pink-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <i className="fa-solid fa-cash-register"></i> Proceder al Cobro
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL CHECKOUT MEJORADO CON PAGO MIXTO, COMPROBANTE Y CRÉDITO ── */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-pink-100 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <i className="fa-solid fa-calculator text-pink-500"></i> Finalizar Venta & Facturación
              </h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4 mt-3 text-xs">
              {/* 1. Tipo de Comprobante */}
              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Tipo de Comprobante *</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'TICKET', label: 'Ticket Interno' },
                    { id: 'BOLETA', label: 'Boleta de Venta' },
                    { id: 'FACTURA', label: 'Factura' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipoComprobante(t.id)}
                      className={`py-2 rounded-xl font-bold transition-all border cursor-pointer ${
                        tipoComprobante === t.id
                          ? 'bg-pink-500 text-white border-pink-500 shadow-2xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Tipo de Venta: Contado o Crédito */}
              <div>
                <label className="block font-bold text-gray-600 uppercase mb-1">Modalidad de Venta *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoVenta('CONTADO')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      tipoVenta === 'CONTADO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <i className="fa-solid fa-money-bill mr-1"></i> Al Contado
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoVenta('CREDITO')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      tipoVenta === 'CREDITO'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <i className="fa-solid fa-handshake mr-1"></i> Al Crédito / A Cuenta
                  </button>
                </div>
              </div>

              {/* 3. Datos del Cliente */}
              <div className="bg-pink-50/40 p-3 rounded-2xl border border-pink-100 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block font-bold text-gray-600 uppercase mb-0.5">DNI Cliente {tipoVenta === 'CREDITO' && '*'}</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        maxLength={8}
                        value={clienteDni}
                        onChange={(e) => setClienteDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="8 dígitos"
                        className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleBuscarClienteDNI}
                        className="bg-pink-500 text-white px-3 py-1.5 rounded-xl font-bold hover:bg-pink-600 cursor-pointer shrink-0"
                      >
                        <i className="fa-solid fa-magnifying-glass"></i>
                      </button>
                    </div>
                  </div>
                </div>

                {dniMessage && (
                  <p className={`text-[11px] font-semibold ${clienteExiste ? 'text-emerald-600' : 'text-amber-700'}`}>
                    {dniMessage}
                  </p>
                )}

                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-0.5">Nombre / Razón Social *</label>
                  <input
                    type="text"
                    required
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Ej. Lucía Fernández"
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white"
                  />
                </div>

                {/* Canje de puntos si existe */}
                {clienteExiste && clientePuntos > 0 && (
                  <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-purple-900 block">Puntos acumulados: {clientePuntos} pts</span>
                      <span className="text-[10px] text-purple-600">Canje: 1 pt = S/ 0.50</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={clientePuntos}
                      value={puntosCanjeados}
                      onChange={(e) => setPuntosCanjeados(Math.min(clientePuntos, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-16 px-2 py-1 rounded-lg border border-purple-200 text-center font-bold bg-white"
                    />
                  </div>
                )}
              </div>

              {/* 4. Forma de Pago y Pago Mixto */}
              {tipoVenta === 'CONTADO' && (
                <div className="space-y-2">
                  <label className="block font-bold text-gray-600 uppercase">Método de Pago *</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia', 'Pago Mixto'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMetodoPago(m)}
                        className={`py-1.5 rounded-xl font-bold border transition-all text-[11px] cursor-pointer ${
                          metodoPago === m
                            ? 'bg-pink-500 text-white border-pink-500 shadow-2xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Formulario de Pago Mixto */}
                  {metodoPago === 'Pago Mixto' && (
                    <div className="bg-pink-50/60 p-3 rounded-2xl border border-pink-200 space-y-2">
                      <p className="font-bold text-pink-800 text-[11px]">Desglose de Pago Mixto (Total: {formatPEN(totalCart)}):</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-600 font-bold mb-0.5">Efectivo (S/)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={montoEfectivo}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMontoEfectivo(val);
                              const rest = Math.max(0, totalCart - (parseFloat(val) || 0));
                              setMontoDigital(rest > 0 ? rest.toFixed(2) : '0.00');
                            }}
                            placeholder="0.00"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-600 font-bold mb-0.5">Digital (S/)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={montoDigital}
                            onChange={(e) => setMontoDigital(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white font-mono font-bold"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-gray-600">Medio Digital:</label>
                        <select
                          value={metodoPagoDigital}
                          onChange={(e) => setMetodoPagoDigital(e.target.value)}
                          className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs cursor-pointer"
                        >
                          <option value="Yape">Yape</option>
                          <option value="Plin">Plin</option>
                          <option value="Tarjeta">Tarjeta</option>
                          <option value="Transferencia">Transferencia</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Si es Venta al Crédito: Abono Inicial */}
              {tipoVenta === 'CREDITO' && (
                <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200 space-y-2">
                  <span className="font-bold text-purple-900 block">Condiciones de Crédito / Fiado:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-600 font-bold mb-0.5">Abono Inicial (Opcional)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={montoEfectivo}
                        onChange={(e) => setMontoEfectivo(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-600 font-bold mb-0.5">Saldo a Deber</label>
                      <input
                        type="text"
                        disabled
                        value={formatPEN(Math.max(0, totalCart - (parseFloat(montoEfectivo) || 0)))}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-purple-200 bg-purple-100 font-mono font-bold text-purple-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Total final */}
              <div className="bg-pink-500 text-white p-3 rounded-2xl flex justify-between items-center shadow-xs">
                <span className="font-bold text-xs">Total Facturado:</span>
                <span className="text-xl font-black font-mono">{formatPEN(totalCart)}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-2.5 rounded-xl shadow-md shadow-pink-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <i className="fa-solid fa-check"></i> Emitir {tipoComprobante}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL COMPROBANTE EMITIDO (VISTA TICKET TÉRMICO LISTO PARA IMPRIMIR) ── */}
      {showComprobanteModal && comprobanteEmitido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-pink-100 max-h-[92vh] overflow-y-auto">
            {/* Header del Ticket */}
            <div className="text-center pb-3 border-b-2 border-dashed border-gray-300 font-mono">
              <h3 className="font-black text-base text-gray-900 uppercase tracking-wider">GLOWMANAGER PRO</h3>
              <p className="text-[10px] text-gray-500">MakeUp, Beauty Studio & Boutique</p>
              <p className="text-[10px] text-gray-500">RUC: 20601234567 | Av. Principal 123</p>
              <p className="text-[10px] text-gray-500">Tel: 987 654 321</p>
              <div className="mt-2 bg-pink-50 text-pink-700 font-bold text-xs py-1 rounded-lg">
                {comprobanteEmitido.tipoComprobante || 'TICKET'} N° {comprobanteEmitido.numeroComprobante || `TK-${comprobanteEmitido.id}`}
              </div>
            </div>

            {/* Datos del Cliente y Venta */}
            <div className="py-2.5 border-b border-dashed border-gray-200 text-[11px] font-mono space-y-0.5">
              <p><strong>Fecha:</strong> {new Date(comprobanteEmitido.fecha).toLocaleString('es-PE')}</p>
              <p><strong>Cliente:</strong> {comprobanteEmitido.clienteNombre}</p>
              <p><strong>Modalidad:</strong> {comprobanteEmitido.tipoVenta}</p>
              <p><strong>Medio de Pago:</strong> {comprobanteEmitido.metodoPago}</p>
            </div>

            {/* Detalle de Ítems */}
            <div className="py-2.5 border-b-2 border-dashed border-gray-300 text-[11px] font-mono space-y-1">
              {comprobanteEmitido.items?.map((it, i) => (
                <div key={i} className="flex justify-between items-start">
                  <span className="truncate pr-1">{it.cantidad}x {it.nombreProducto}</span>
                  <span className="shrink-0">{formatPEN(parseFloat(it.precioUnitario) * it.cantidad)}</span>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="py-2.5 space-y-1 text-xs font-mono">
              <div className="flex justify-between text-base font-black text-gray-900">
                <span>TOTAL:</span>
                <span>{formatPEN(comprobanteEmitido.total)}</span>
              </div>
              {parseFloat(comprobanteEmitido.saldoPendiente) > 0 && (
                <div className="flex justify-between text-purple-700 font-bold">
                  <span>SALDO AL CRÉDITO:</span>
                  <span>{formatPEN(comprobanteEmitido.saldoPendiente)}</span>
                </div>
              )}
            </div>

            <div className="text-center pt-2 text-[10px] text-gray-400 font-mono">
              <p>¡Gracias por realzar tu belleza con nosotros!</p>
              <p>www.glowmanager.com</p>
            </div>

            {/* Botones */}
            <div className="flex gap-2 mt-4 pt-2 border-t border-gray-100">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-gray-900 hover:bg-black text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <i className="fa-solid fa-print"></i> Imprimir Ticket
              </button>
              <button
                onClick={() => setShowComprobanteModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONTROL Y CIERRE DE CAJA ── */}
      {showCajaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-pink-100 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-vault text-pink-500 text-lg"></i>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Control & Cierre de Caja</h3>
                  <p className="text-[10px] text-gray-400">Arqueo de turno y conciliación de valores</p>
                </div>
              </div>
              <button onClick={() => setShowCajaModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* SI LA CAJA ESTÁ CERRADA: FORMULARIO DE APERTURA */}
            {!cajaEstado?.abierta ? (
              <form onSubmit={handleAbrirCaja} className="space-y-3 mt-4 text-xs">
                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-amber-800">
                  <p className="font-bold">⚠️ Actualmente no hay una sesión de caja abierta.</p>
                  <p className="text-[11px] mt-0.5">Ingresa el monto en efectivo con el que se inicia el turno en el cajón.</p>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Monto Inicial en Efectivo (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={montoAperturaInput}
                    onChange={(e) => setMontoAperturaInput(e.target.value)}
                    placeholder="100.00"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-emerald-600 focus:outline-none focus:border-pink-400 bg-gray-50/50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Notas de Turno</label>
                  <input
                    type="text"
                    value={notasCaja}
                    onChange={(e) => setNotasCaja(e.target.value)}
                    placeholder="Ej. Turno Mañana - Cajera Lucía"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 bg-gray-50/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-emerald-200 transition-all cursor-pointer mt-2"
                >
                  <i className="fa-solid fa-lock-open mr-1"></i> Abrir Caja de Turno
                </button>
              </form>
            ) : (
              /* SI LA CAJA ESTÁ ABIERTA: RESUMEN DE TURNO Y ARQUEO */
              <div className="space-y-4 mt-3 text-xs">
                {resumenCierreFinal ? (
                  /* TICKET DE CIERRE REALIZADO */
                  <div className="bg-pink-50/60 p-4 rounded-2xl border border-pink-200 space-y-2">
                    <div className="text-center pb-2 border-b border-pink-200">
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Caja Cerrada con Éxito
                      </span>
                      <h4 className="font-bold text-gray-900 mt-1">Ticket de Cierre de Caja</h4>
                    </div>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between"><span>Apertura:</span><span>{formatPEN(resumenCierreFinal.montoApertura)}</span></div>
                      <div className="flex justify-between"><span>Ventas Efectivo:</span><span>+{formatPEN(resumenCierreFinal.totalVentasEfectivo)}</span></div>
                      <div className="flex justify-between"><span>Abonos Efectivo:</span><span>+{formatPEN(resumenCierreFinal.totalAbonosEfectivo)}</span></div>
                      <div className="flex justify-between"><span>Gastos Efectivo:</span><span>-{formatPEN(resumenCierreFinal.totalGastosEfectivo)}</span></div>
                      <div className="flex justify-between border-t border-pink-200 pt-1 font-bold">
                        <span>Esperado en Cajón:</span>
                        <span>{formatPEN(resumenCierreFinal.saldoEfectivoEsperado)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-purple-700">
                        <span>Contado Físico:</span>
                        <span>{formatPEN(resumenCierreFinal.efectivoFisicoContado)}</span>
                      </div>
                      <div className="flex justify-between font-black text-sm pt-1 border-t border-pink-200">
                        <span>Diferencia:</span>
                        <span className={resumenCierreFinal.diferencia < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                          {resumenCierreFinal.diferencia >= 0 ? '+' : ''}{formatPEN(resumenCierreFinal.diferencia)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Tarjetas de Resumen en Vivo */}
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fondo Inicial:</span>
                        <span className="font-bold">{formatPEN(cajaEstado.resumen?.montoApertura)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Ventas Efectivo (+):</span>
                        <span className="font-bold">+{formatPEN(cajaEstado.resumen?.totalVentasEfectivo)}</span>
                      </div>
                      <div className="flex justify-between text-purple-700">
                        <span>Ventas Digitales:</span>
                        <span className="font-bold">{formatPEN(cajaEstado.resumen?.totalVentasDigital)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>Salidas de Caja / Gastos (-):</span>
                        <span className="font-bold">-{formatPEN(cajaEstado.resumen?.totalGastosEfectivo)}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-1 text-sm font-bold text-gray-900">
                        <span>Efectivo Esperado en Cajón:</span>
                        <span className="text-pink-600">{formatPEN(cajaEstado.resumen?.saldoEfectivoEsperado)}</span>
                      </div>
                    </div>

                    {/* Formulario de Cierre de Caja */}
                    <form onSubmit={handleCerrarCaja} className="space-y-3 pt-1">
                      <div>
                        <label className="block font-bold text-gray-700 uppercase mb-1">
                          Efectivo Físico Contado en Cajón (S/) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0"
                          value={montoCierreInput}
                          onChange={(e) => setMontoCierreInput(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-purple-700 focus:outline-none focus:border-pink-400 bg-white"
                        />
                      </div>

                      {montoCierreInput && (
                        <div className="p-2.5 rounded-xl border text-xs flex justify-between font-mono bg-pink-50 border-pink-200">
                          <span className="font-bold text-gray-700">Diferencia de Arqueo:</span>
                          <span className={`font-black ${
                            parseFloat(montoCierreInput) - (cajaEstado.resumen?.saldoEfectivoEsperado || 0) < 0
                              ? 'text-rose-600'
                              : 'text-emerald-600'
                          }`}>
                            {formatPEN(parseFloat(montoCierreInput) - (cajaEstado.resumen?.saldoEfectivoEsperado || 0))}
                          </span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-rose-200 transition-all cursor-pointer"
                      >
                        <i className="fa-solid fa-lock mr-1"></i> Cerrar Caja y Finalizar Turno
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL HISTORIAL DE VENTAS ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-pink-100 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Historial de Ventas</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <input
                type="text"
                placeholder="Buscar por cliente o comprobante..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 bg-gray-50/50"
              />

              <div className="overflow-x-auto divide-y divide-gray-100 max-h-96">
                {history
                  .filter(v => v.clienteNombre.toLowerCase().includes(historySearch.toLowerCase()) || (v.numeroComprobante || '').toLowerCase().includes(historySearch.toLowerCase()))
                  .map((v) => (
                    <div key={v.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">
                            {v.numeroComprobante || `${v.tipoComprobante || 'TK'} #${v.id}`}
                          </span>
                          <span className="font-bold text-gray-900">{v.clienteNombre}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(v.fecha).toLocaleString('es-PE')} — {v.metodoPago} ({v.tipoVenta || 'CONTADO'})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-emerald-600">{formatPEN(v.total)}</span>
                        <button
                          onClick={() => {
                            setComprobanteEmitido(v);
                            setShowComprobanteModal(true);
                          }}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Ver Ticket
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
