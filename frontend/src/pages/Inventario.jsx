import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const Inventario = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showLotModal, setShowLotModal] = useState(false);

  // Form states
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

  // New lot form states
  const [lotCosto, setLotCosto] = useState('');
  const [lotStock, setLotStock] = useState('');

  // Expandable lots state
  const [expandedProductLots, setExpandedProductLots] = useState(new Set());

  // Derived categories
  const categoriesList = Array.from(new Set(productos.map(p => p.categoria)));

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/productos');
      setProductos(res.data);
    } catch (err) {
      console.error('Error al obtener productos:', err);
      toast.error('No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
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
    // Costo has to be the cost of the first lot
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
      if (selectedProduct) {
        // Actualizar producto existente
        await apiClient.put(`/productos/${selectedProduct.id}`, {
          codigo,
          nombre,
          categoria: finalCategoria,
          precio,
          vencimiento
        });
        toast.success('Producto actualizado exitosamente.');
      } else {
        // Crear nuevo producto
        await apiClient.post('/productos', {
          codigo,
          nombre,
          categoria: finalCategoria,
          precio,
          costo,
          stock,
          vencimiento
        });
        toast.success('Producto creado exitosamente.');
      }
      setShowProductModal(false);
      fetchProductos();
    } catch (err) {
      console.error('Error al guardar producto:', err);
      toast.error(err.response?.data?.error || 'Error al guardar el producto.');
    }
  };

  const handleLotSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/productos/${selectedProduct.id}/lotes`, {
        costo: lotCosto,
        stock: lotStock
      });
      toast.success('Nuevo lote agregado exitosamente.');
      setShowLotModal(false);
      fetchProductos();
    } catch (err) {
      console.error('Error al agregar lote:', err);
      toast.error(err.response?.data?.error || 'Error al agregar el lote.');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este producto?')) {
      try {
        await apiClient.delete(`/productos/${id}`);
        toast.success('Producto eliminado exitosamente.');
        fetchProductos();
      } catch (err) {
        console.error('Error al eliminar producto:', err);
        toast.error(err.response?.data?.error || 'Error al eliminar el producto.');
      }
    }
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setCategoria(val);
    if (val === 'NEW') {
      setShowNuevaCategoriaInput(true);
    } else {
      setShowNuevaCategoriaInput(false);
    }
  };

  const filteredProducts = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const format = (val) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val);
  };

  const renderLotesPrecios = (lotes, productId) => {
    if (!lotes || lotes.length === 0) return <span className="text-gray-400">Sin lotes</span>;

    const activos = lotes.filter(l => l.stockActual > 0);
    const agotados = lotes.filter(l => l.stockActual === 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const isExpanded = expandedProductLots.has(productId);

    return (
      <div className="font-mono text-xs my-0.5 space-y-0.5">
        {/* Lotes activos */}
        {activos.map(l => (
          <div key={l.id} className="text-gray-700 font-medium">
            {format(l.costo)} <span className="text-gray-400 font-normal">(x{l.stockActual})</span>
          </div>
        ))}
        {/* Último lote agotado (en gris y tachado) */}
        {agotados.length > 0 && (
          <div className="text-gray-400 line-through flex items-center gap-1.5" title="Último lote agotado">
            <span>{format(agotados[0].costo)} (x0)</span>
            <span className="text-[9px] font-sans px-1 rounded bg-gray-100 text-gray-500 font-bold uppercase tracking-tight no-underline inline-block font-bold">Agotado</span>
          </div>
        )}
        {/* Lotes agotados anteriores (expandibles) */}
        {isExpanded && agotados.slice(1).map(l => (
          <div key={l.id} className="text-gray-400/80 line-through flex items-center gap-1.5" title="Lote agotado anterior">
            <span>{format(l.costo)} (x0)</span>
          </div>
        ))}
        {/* Botón para expandir/colapsar */}
        {agotados.length > 1 && (
          <button
            type="button"
            onClick={() => toggleExpandLots(productId)}
            className="text-[10px] text-pink-500 hover:text-pink-600 font-sans font-bold hover:underline cursor-pointer block mt-1 pt-0.5 focus:outline-none"
          >
            {isExpanded ? (
              <span><i className="fa-solid fa-chevron-up mr-1 text-[8px]"></i> Ocultar lotes</span>
            ) : (
              <span><i className="fa-solid fa-chevron-down mr-1 text-[8px]"></i> + {agotados.length - 1} lote(s) anterior(es)</span>
            )}
          </button>
        )}
      </div>
    );
  };

  const toggleExpandLots = (productId) => {
    setExpandedProductLots(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
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
            placeholder="Buscar por nombre o código..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 bg-white shadow-sm"
          />
        </div>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-pink-200"
        >
          <i className="fa-solid fa-plus"></i> Agregar Producto
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
                <th className="p-4 pl-6">Código</th>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Precios (Compra / Venta)</th>
                <th className="p-4 text-center">Stock Total</th>
                <th className="p-4">Lotes Activos</th>
                <th className="p-4">Estado</th>
                <th className="p-4 pr-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-400 italic">
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 pl-6 text-xs font-mono font-bold text-gray-600">{p.codigo}</td>
                      <td className="p-4 font-bold text-gray-900">{p.nombre}</td>
                      <td className="p-4 text-xs font-medium text-gray-500">{p.categoria}</td>
                      <td className="p-4 text-xs">
                        <div className="font-bold text-emerald-600 mb-1">P. Venta: {format(p.precio)}</div>
                        <span className="text-gray-400 block mb-0.5">Lotes Costo:</span>
                        {renderLotesPrecios(p.lotes, p.id)}
                      </td>
                      <td className="p-4 text-center font-bold text-base text-gray-900">{p.stock}</td>
                      <td className="p-4 text-xs font-medium text-gray-500">
                        {p.lotes?.filter(l => l.stockActual > 0).length || 0} lote(s)
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-[10px] rounded font-bold uppercase ${
                          p.estado === 'Disponible' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : p.estado === 'Stock Crítico' 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-center">
                        <button
                          onClick={() => openAddLotModal(p)}
                          className="text-emerald-500 hover:text-emerald-700 cursor-pointer mr-3"
                          title="Agregar Lote"
                        >
                          <i className="fa-solid fa-boxes-packing"></i>
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="text-blue-500 hover:text-blue-700 cursor-pointer mr-3"
                          title="Editar"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                          title="Eliminar"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL PRODUCTO (AGREGAR / EDITAR) */}
      {showProductModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-lg p-4 md:p-6 shadow-xl border border-pink-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedProduct ? 'Editar Producto' : 'Agregar Producto'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-gray-400 hover:text-rose-500 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Base Líquida L'Oréal"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50/50 focus:outline-none focus:border-pink-400"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="LRL-001"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50/50 focus:outline-none focus:border-pink-400 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
                  <select
                    value={showNuevaCategoriaInput ? 'NEW' : categoria}
                    onChange={handleCategoryChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50/50 focus:outline-none focus:border-pink-400 cursor-pointer"
                  >
                    {categoriesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="NEW" className="text-pink-600">
                      + Nueva Categoría
                    </option>
                  </select>
                  {showNuevaCategoriaInput && (
                    <input
                      type="text"
                      required
                      value={nuevaCategoria}
                      onChange={(e) => setNuevaCategoria(e.target.value)}
                      placeholder="Nombre de categoría"
                      className="mt-2 w-full px-4 py-2.5 rounded-xl border border-pink-300 text-sm bg-pink-50 focus:outline-none"
                    />
                  )}
                </div>
              </div>
              
              {!selectedProduct && (
                <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-100 py-3 my-2 bg-gray-50/50 -mx-6 px-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Costo Lote Inicial (S/)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={costo}
                      onChange={(e) => setCosto(e.target.value)}
                      placeholder="25.00"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-pink-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Venta (S/)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      placeholder="40.00"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-emerald-700 font-bold focus:outline-none focus:border-pink-400"
                    />
                  </div>
                </div>
              )}

              {selectedProduct && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Venta (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="40.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50/50 text-emerald-700 font-bold focus:outline-none focus:border-pink-400"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {!selectedProduct && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock Lote Inicial</label>
                    <input
                      type="number"
                      required
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="12"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50/50 focus:outline-none focus:border-pink-400"
                    />
                  </div>
                )}
                <div className={selectedProduct ? 'col-span-2' : ''}>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vencimiento</label>
                  <input
                    type="text"
                    value={vencimiento}
                    onChange={(e) => setVencimiento(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50/50 focus:outline-none focus:border-pink-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl shadow-md mt-4 cursor-pointer"
              >
                <i className="fa-solid fa-floppy-disk mr-2"></i> Guardar Producto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR LOTE */}
      {showLotModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 md:p-6 shadow-xl border border-pink-100">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Agregar Lote</h3>
                <p className="text-xs text-gray-500">{selectedProduct?.nombre}</p>
              </div>
              <button
                onClick={() => setShowLotModal(false)}
                className="text-gray-400 hover:text-rose-500 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleLotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Costo Unitario de Compra (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={lotCosto}
                  onChange={(e) => setLotCosto(e.target.value)}
                  placeholder="22.50"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50/50 focus:outline-none focus:border-pink-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock de Lote</label>
                <input
                  type="number"
                  required
                  value={lotStock}
                  onChange={(e) => setLotStock(e.target.value)}
                  placeholder="10"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50/50 focus:outline-none focus:border-pink-400"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md mt-4 cursor-pointer"
              >
                <i className="fa-solid fa-plus mr-2"></i> Añadir Lote
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventario;
