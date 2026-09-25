import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const Inventario = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroAlerta, setFiltroAlerta] = useState('TODOS'); // 'TODOS' | 'QUIEBRE' | 'AGOTADO' | 'PROXIMO' | 'VENCIDO'

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showLotModal, setShowLotModal] = useState(false);
  const [showPacksModal, setShowPacksModal] = useState(false);

  // Form states de Producto
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [showNuevaCategoriaInput, setShowNuevaCategoriaInput] = useState(false);
  const [costo, setCosto] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [vencimiento, setVencimiento] = useState('');

  // Lotes
  const [lotCosto, setLotCosto] = useState('');
  const [lotStock, setLotStock] = useState('');
  const [expandedProductLots, setExpandedProductLots] = useState(new Set());

  // Packs & Promociones
  const [packs, setPacks] = useState([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [showCrearPackForm, setShowCrearPackForm] = useState(false);
  const [packNombre, setPackNombre] = useState('');
  const [packDescripcion, setPackDescripcion] = useState('');
  const [packPrecioPromo, setPackPrecioPromo] = useState('');
  const [packItemsSeleccionados, setPackItemsSeleccionados] = useState([]);

  const categoriesList = Array.from(new Set(productos.map(p => p.categoria)));

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/productos');
      const prodsFiltro = res.data.filter(p => p.codigo !== 'SERV-GENERICO');
      setProductos(prodsFiltro);
    } catch (err) {
      console.error('Error al obtener productos:', err);
      toast.error('No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPacks = async () => {
    setLoadingPacks(true);
    try {
      const res = await apiClient.get('/packs');
      setPacks(res.data);
    } catch (err) {
      console.error('Error al obtener packs:', err);
    } finally {
      setLoadingPacks(false);
    }
  };

  useEffect(() => {
    fetchProductos();
    fetchPacks();
  }, []);

  const openAddModal = () => {
    setSelectedProduct(null);
    setNombre('');
    setCodigo('');
    setCategoria(categoriesList[0] || '');
    setNuevaCategoria('');
    setShowNuevaCategoriaInput(categoriesList.length === 0);
    setCosto('');
    setPrecio('');
    setStock('');
    setVencimiento('');
    setShowProductModal(true);
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setNombre(product.nombre);
    setCodigo(product.codigo);
    setCategoria(product.categoria);
    setNuevaCategoria('');
    setShowNuevaCategoriaInput(false);
    setCosto(product.lotes?.[0]?.costo || '');
    setPrecio(product.precio);
    setStock(product.stock);
    setVencimiento(product.vencimiento || '');
    setShowProductModal(true);
  };

  const openAddLotModal = (product) => {
    setSelectedProduct(product);
    setLotCosto('');
    setLotStock('');
    setShowLotModal(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const finalCategoria = showNuevaCategoriaInput ? nuevaCategoria : categoria;

    if (!finalCategoria) {
      toast.error('Por favor, especifica una categoría.');
      return;
    }

    try {
      const payload = {
        nombre,
        codigo,
        categoria: finalCategoria,
        precio: parseFloat(precio),
        vencimiento: vencimiento || null
      };

      if (selectedProduct) {
        await apiClient.put(`/productos/${selectedProduct.id}`, payload);
        toast.success('Producto actualizado exitosamente.');
      } else {
        payload.costo = parseFloat(costo);
        payload.stock = parseInt(stock);
        await apiClient.post('/productos', payload);
        toast.success('Producto registrado exitosamente.');
      }

      setShowProductModal(false);
      fetchProductos();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al guardar producto.');
    }
  };

  const handleLotSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/productos/${selectedProduct.id}/lotes`, {
        costo: parseFloat(lotCosto),
        stock: parseInt(lotStock)
      });
      toast.success('Lote añadido exitosamente.');
      setShowLotModal(false);
      fetchProductos();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al agregar lote.');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este producto?')) {
      try {
        await apiClient.delete(`/productos/${id}`);
        toast.success('Producto eliminado exitosamente.');
        fetchProductos();
      } catch (err) {
        toast.error('Error al eliminar producto.');
      }
    }
  };

  // Manejo de Packs Promocionales
  const handleGuardarPack = async (e) => {
    e.preventDefault();
    if (packItemsSeleccionados.length === 0) {
      toast.error('Selecciona al menos un producto para el pack.');
      return;
    }
    const precio = parseFloat(packPrecioPromo);
    if (isNaN(precio) || precio < 0) {
      toast.error('Ingresa un precio promocional válido.');
      return;
    }
    try {
      await apiClient.post('/packs', {
        nombre: packNombre,
        descripcion: packDescripcion,
        precioPromo: precio,
        items: packItemsSeleccionados
      });
      toast.success('Pack promocional creado con éxito.');
      setPackNombre('');
      setPackDescripcion('');
      setPackPrecioPromo('');
      setPackItemsSeleccionados([]);
      setShowCrearPackForm(false);
      fetchPacks();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear pack.');
    }
  };

  const handleEliminarPack = async (id) => {
    if (window.confirm('¿Desea eliminar este pack promocional?')) {
      try {
        await apiClient.delete(`/packs/${id}`);
        toast.success('Pack eliminado.');
        fetchPacks();
      } catch (err) {
        toast.error('Error al eliminar pack.');
      }
    }
  };

  const toggleExpand = (productId) => {
    const next = new Set(expandedProductLots);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setExpandedProductLots(next);
  };

  // Helper de estado de vencimiento
  const calcularEstadoVencimiento = (vencStr) => {
    if (!vencStr || vencStr === '-') return 'NORMAL';
    let fechaVenc = null;
    if (vencStr.includes('/')) {
      const [dia, mes, anio] = vencStr.split('/');
      fechaVenc = new Date(`${anio}-${mes}-${dia}T23:59:59.999`);
    } else {
      fechaVenc = new Date(vencStr);
    }
    if (isNaN(fechaVenc.getTime())) return 'NORMAL';
    const hoy = new Date();
    if (fechaVenc < hoy) return 'VENCIDO';
    const diffDays = Math.floor((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
    if (diffDays <= 45) return 'PROXIMO';
    return 'NORMAL';
  };

  const formatPEN = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val || 0);

  // Filtrado
  const productosFiltrados = productos.filter((p) => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase()) || p.categoria.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;

    const estadoVenc = calcularEstadoVencimiento(p.vencimiento);
    if (filtroAlerta === 'QUIEBRE') return p.stock <= 3;
    if (filtroAlerta === 'AGOTADO') return p.stock === 0;
    if (filtroAlerta === 'PROXIMO') return estadoVenc === 'PROXIMO';
    if (filtroAlerta === 'VENCIDO') return estadoVenc === 'VENCIDO';

    return true;
  });

  return (
    <div className="space-y-4 animate-fadeIn pb-12">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">Inventario & Stock de Boutique</h2>
          <p className="text-xs text-gray-500 font-medium">
            Control de cosméticos, alertas de quiebre/vencimiento, lotes y packs promocionales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Botón Packs Promocionales */}
          <button
            onClick={() => setShowPacksModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs shadow-purple-200 cursor-pointer"
          >
            <i className="fa-solid fa-gift"></i> Packs & Promociones ({packs.length})
          </button>

          {/* Botón Nuevo Producto */}
          <button
            onClick={openAddModal}
            className="bg-pink-500 hover:bg-pink-600 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs shadow-pink-200 cursor-pointer"
          >
            <i className="fa-solid fa-plus"></i> Nuevo Producto
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS Y ALERTAS RÁPIDAS */}
      <div className="bg-white p-3 rounded-2xl border border-pink-100 shadow-2xs space-y-2">
        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
          {/* Botones de Filtro de Alerta */}
          <div className="flex overflow-x-auto pb-1 sm:pb-0 gap-1.5 w-full md:w-auto shrink-0">
            {[
              { id: 'TODOS', label: 'Todos los Productos', icon: 'fa-boxes-stacked' },
              { id: 'QUIEBRE', label: '⚠️ Quiebre (≤ 3)', badge: productos.filter(p => p.stock <= 3).length },
              { id: 'AGOTADO', label: '🔴 Agotados (0)', badge: productos.filter(p => p.stock === 0).length },
              { id: 'PROXIMO', label: '⏳ Por Vencer', badge: productos.filter(p => calcularEstadoVencimiento(p.vencimiento) === 'PROXIMO').length },
              { id: 'VENCIDO', label: '❌ Vencidos', badge: productos.filter(p => calcularEstadoVencimiento(p.vencimiento) === 'VENCIDO').length }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltroAlerta(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  filtroAlerta === f.id
                    ? 'bg-pink-500 text-white shadow-2xs'
                    : 'bg-gray-50 text-gray-600 hover:bg-pink-50 hover:text-pink-600'
                }`}
              >
                {f.icon && <i className={`fa-solid ${f.icon}`}></i>}
                <span>{f.label}</span>
                {f.badge > 0 && (
                  <span className={`text-[10px] font-black px-1.5 rounded-full ${
                    filtroAlerta === f.id ? 'bg-white text-pink-600' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {f.badge}
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
              placeholder="Buscar por código, nombre o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-pink-400 bg-gray-50/50"
            />
          </div>
        </div>
      </div>

      {/* TABLA DE PRODUCTOS */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xs border border-pink-100 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-pink-50/30 text-gray-400 uppercase tracking-wider">
                <th className="p-3 pl-4 font-bold">Código / Producto</th>
                <th className="p-3 font-bold">Categoría</th>
                <th className="p-3 font-bold">Stock Total</th>
                <th className="p-3 font-bold">P. Venta</th>
                <th className="p-3 font-bold">Vencimiento</th>
                <th className="p-3 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 italic">
                    No se encontraron productos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((p) => {
                  const estadoVenc = calcularEstadoVencimiento(p.vencimiento);
                  const isExpanded = expandedProductLots.has(p.id);

                  return (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-pink-50/20 transition-colors">
                        <td className="p-3 pl-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {p.codigo}
                            </span>
                            <span className="font-bold text-gray-900">{p.nombre}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            {p.categoria}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono font-black text-xs ${
                              p.stock === 0 ? 'text-rose-600' : p.stock <= 3 ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {p.stock} unid.
                            </span>
                            {p.stock === 0 && (
                              <span className="text-[9px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                                AGOTADO
                              </span>
                            )}
                            {p.stock > 0 && p.stock <= 3 && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
                                QUIEBRE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-gray-800">{formatPEN(p.precio)}</td>
                        <td className="p-3 font-mono">
                          {p.vencimiento ? (
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              estadoVenc === 'VENCIDO' ? 'bg-rose-100 text-rose-700' :
                              estadoVenc === 'PROXIMO' ? 'bg-amber-100 text-amber-800' : 'text-gray-600'
                            }`}>
                              {p.vencimiento} {estadoVenc === 'VENCIDO' && '(Vencido)'} {estadoVenc === 'PROXIMO' && '(Por vencer)'}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">No aplica</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openAddLotModal(p)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                              title="Ingresar nuevo lote de compra"
                            >
                              + Lote
                            </button>
                            <button
                              onClick={() => toggleExpand(p.id)}
                              className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                              title="Ver desglose de lotes"
                            >
                              <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                            </button>
                            <button
                              onClick={() => openEditModal(p)}
                              className="text-blue-500 hover:text-blue-700 p-1 cursor-pointer"
                              title="Editar producto"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                              title="Eliminar"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Lotes Desplegables */}
                      {isExpanded && p.lotes && (
                        <tr className="bg-gray-50/70">
                          <td colSpan="6" className="p-3 pl-8">
                            <div className="text-[11px] space-y-1">
                              <p className="font-bold text-gray-700">Lotes de compra activos (FIFO):</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {p.lotes.map((l, lIdx) => (
                                  <div key={l.id} className="bg-white p-2 rounded-xl border border-gray-200">
                                    <p className="text-gray-500">Lote #{lIdx + 1} — {new Date(l.createdAt).toLocaleDateString('es-PE')}</p>
                                    <p className="font-bold text-gray-800">Costo: {formatPEN(l.costo)} | Stock Actual: {l.stockActual} / {l.stockInicial}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL GESTIÓN DE PACKS Y PROMOCIONES ── */}
      {showPacksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-purple-100 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-gift text-purple-600 text-lg"></i>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Packs & Promociones Personalizadas</h3>
                  <p className="text-[10px] text-gray-400">Arma combos y ofertas de productos para venta rápida en POS</p>
                </div>
              </div>
              <button onClick={() => setShowPacksModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {!showCrearPackForm ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-700">Packs Promocionales Activos:</span>
                    <button
                      onClick={() => setShowCrearPackForm(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <i className="fa-solid fa-plus"></i> Crear Nuevo Pack
                    </button>
                  </div>

                  {packs.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-6 text-center">No hay packs registrados aún.</p>
                  ) : (
                    <div className="space-y-2">
                      {packs.map((pk) => (
                        <div key={pk.id} className="p-3 rounded-2xl border border-purple-100 bg-purple-50/40 flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900">{pk.nombre}</h4>
                              <span className="font-black text-purple-700 font-mono text-sm">{formatPEN(pk.precioPromo)}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">{pk.descripcion}</p>
                            <p className="text-[10px] text-purple-600 font-semibold mt-1">
                              Incluye: {pk.items?.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}
                            </p>
                          </div>
                          <button
                            onClick={() => handleEliminarPack(pk.id)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 cursor-pointer"
                            title="Eliminar Pack"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* FORMULARIO CREAR PACK */
                <form onSubmit={handleGuardarPack} className="space-y-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-200">
                  <h4 className="font-bold text-purple-900 text-sm">Nuevo Pack Promocional</h4>

                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-0.5">Nombre del Pack *</label>
                    <input
                      type="text"
                      required
                      value={packNombre}
                      onChange={(e) => setPackNombre(e.target.value)}
                      placeholder="Ej. Pack Ojos Perfectos (Paleta + Fijador)"
                      className="w-full px-3 py-1.5 rounded-xl border border-gray-200 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-gray-700 uppercase mb-0.5">Precio Promocional (S/) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0"
                        value={packPrecioPromo}
                        onChange={(e) => setPackPrecioPromo(e.target.value)}
                        placeholder="79.90"
                        className="w-full px-3 py-1.5 rounded-xl border border-gray-200 bg-white font-mono font-bold text-purple-700"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 uppercase mb-0.5">Descripción</label>
                      <input
                        type="text"
                        value={packDescripcion}
                        onChange={(e) => setPackDescripcion(e.target.value)}
                        placeholder="Ahorra 20% en este pack"
                        className="w-full px-3 py-1.5 rounded-xl border border-gray-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Selector de Productos para el Pack */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">
                      Productos que incluye el Pack *
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto bg-white p-2 rounded-xl border border-gray-200">
                      {productos.map((prod) => {
                        const isChecked = packItemsSeleccionados.some(i => i.id === prod.id);
                        return (
                          <label key={prod.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer text-[11px]">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPackItemsSeleccionados([...packItemsSeleccionados, { id: prod.id, nombre: prod.nombre, cantidad: 1, precioOriginal: prod.precio }]);
                                } else {
                                  setPackItemsSeleccionados(packItemsSeleccionados.filter(i => i.id !== prod.id));
                                }
                              }}
                            />
                            <span className="truncate">{prod.nombre}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCrearPackForm(false)}
                      className="w-1/3 bg-gray-200 text-gray-700 font-bold py-2 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl"
                    >
                      Guardar Pack
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR / EDITAR PRODUCTO ── */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-pink-100 animate-fadeIn text-xs">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-gray-900">
                {selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-0.5">Código *</label>
                  <input
                    type="text"
                    required
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="Ej. FNTY-002"
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase mb-0.5">Precio Venta (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="45.00"
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-200 font-bold text-pink-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-0.5">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Labial Mate Ruby Woo"
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-0.5">Categoría *</label>
                <select
                  value={showNuevaCategoriaInput ? '__NUEVA__' : categoria}
                  onChange={(e) => {
                    if (e.target.value === '__NUEVA__') setShowNuevaCategoriaInput(true);
                    else {
                      setShowNuevaCategoriaInput(false);
                      setCategoria(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200 cursor-pointer"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__NUEVA__">+ Crear Nueva Categoría...</option>
                </select>
                {showNuevaCategoriaInput && (
                  <input
                    type="text"
                    required
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    placeholder="Escriba nueva categoría..."
                    className="w-full px-3 py-1.5 rounded-xl border border-pink-300 mt-1"
                  />
                )}
              </div>

              {!selectedProduct && (
                <div className="grid grid-cols-2 gap-2 bg-pink-50/50 p-2.5 rounded-xl border border-pink-100">
                  <div>
                    <label className="block font-bold text-gray-600 uppercase mb-0.5">Costo Unitario Lote 1 (S/)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={costo}
                      onChange={(e) => setCosto(e.target.value)}
                      placeholder="25.00"
                      className="w-full px-2.5 py-1 rounded-lg border border-gray-200 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 uppercase mb-0.5">Stock Inicial Lote 1</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="24"
                      className="w-full px-2.5 py-1 rounded-lg border border-gray-200 bg-white font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-0.5">Vencimiento (Opcional)</label>
                <input
                  type="text"
                  value={vencimiento}
                  onChange={(e) => setVencimiento(e.target.value)}
                  placeholder="dd/mm/yyyy"
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200 font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2.5 rounded-xl shadow-xs"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR LOTE ── */}
      {showLotModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-xl border border-emerald-100 animate-fadeIn text-xs">
            <h3 className="font-bold text-sm text-gray-900 mb-1">Ingresar Lote de Mercadería</h3>
            <p className="text-gray-500 mb-3">{selectedProduct.nombre} ({selectedProduct.codigo})</p>

            <form onSubmit={handleLotSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-600 uppercase mb-0.5">Costo Unitario de Compra (S/) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={lotCosto}
                  onChange={(e) => setLotCosto(e.target.value)}
                  placeholder="25.00"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase mb-0.5">Cantidad de Unidades Ingresadas *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={lotStock}
                  onChange={(e) => setLotStock(e.target.value)}
                  placeholder="12"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLotModal(false)}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-xs"
                >
                  Registrar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventario;
