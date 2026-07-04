import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const Gastos = () => {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [categoria, setCategoria] = useState('Publicidad');
  const [item, setItem] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [costo, setCosto] = useState('');

  // Inventory consumption states
  const [productos, setProductos] = useState([]);
  const [esProductoInventario, setEsProductoInventario] = useState(false);
  const [productoId, setProductoId] = useState('');
  const [productoSearchText, setProductoSearchText] = useState('');
  const [mostrarSugerenciasProd, setMostrarSugerenciasProd] = useState(false);

  // Stats
  const [bolsasStock, setBolsasStock] = useState('0 unidades');
  const [bolsasInversion, setBolsasInversion] = useState(0);
  const [bolsasDuracion, setBolsasDuracion] = useState('Métricas en Curso');

  const fetchGastosYProductos = async () => {
    setLoading(true);
    try {
      const [resGastos, resProductos] = await Promise.all([
        apiClient.get('/gastos'),
        apiClient.get('/productos')
      ]);

      setGastos(resGastos.data);
      setProductos(resProductos.data);

      // Calcular estadísticas de bolsas de regalo (BOLS-001)
      const bolsaProd = resProductos.data.find(p => p.codigo === 'BOLS-001');
      if (bolsaProd) {
        setBolsasStock(`${bolsaProd.stock} unidades`);
        
        const inversion = bolsaProd.lotes.reduce((sum, l) => sum + (l.costo * l.stockInicial), 0);
        setBolsasInversion(inversion);

        const iniciales = bolsaProd.lotes.reduce((sum, l) => sum + l.stockInicial, 0);
        const consumidas = iniciales - bolsaProd.stock;
        
        if (consumidas > 0) {
          // Calcular días de duración desde la fecha del primer lote
          const fechaCreacion = new Date(bolsaProd.createdAt || new Date());
          const diffTime = Math.ceil(Math.abs(new Date() - fechaCreacion) / (1000 * 60 * 60 * 24)) || 1;
          setBolsasDuracion(`${consumidas} entregadas en ${diffTime} día(s)`);
        } else {
          setBolsasDuracion('Sin consumos aún');
        }
      }

    } catch (err) {
      console.error('Error al obtener gastos:', err);
      toast.error('No se pudieron cargar los datos de gastos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGastosYProductos();
  }, []);

  const openAddModal = () => {
    setCategoria('Publicidad');
    setItem('');
    setCantidad('');
    setCosto('');
    setEsProductoInventario(false);
    setProductoId('');
    setProductoSearchText('');
    setMostrarSugerenciasProd(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        categoria,
        cantidad: parseInt(cantidad),
        ...(esProductoInventario 
          ? { productoId: parseInt(productoId) } 
          : { item, costo: parseFloat(costo) })
      };
      const res = await apiClient.post('/gastos', payload);
      toast.success(res.data.mensaje || 'Gasto registrado exitosamente.');
      setShowModal(false);
      fetchGastosYProductos();
    } catch (err) {
      console.error('Error al registrar gasto:', err);
      toast.error(err.response?.data?.error || 'Error al guardar el gasto.');
    }
  };

  const handleConsumir = async (gasto) => {
    const promptVal = window.prompt(
      `¿Cuántas unidades de "${gasto.item}" se consumieron hoy? (Disponibles: ${gasto.cantidadActual})`,
      '1'
    );
    if (promptVal === null) return;
    
    const cantidadConsumida = parseInt(promptVal);
    if (isNaN(cantidadConsumida) || cantidadConsumida <= 0) {
      toast.error('Cantidad inválida.');
      return;
    }

    try {
      const res = await apiClient.put(`/gastos/${gasto.id}/consumo`, { cantidadConsumida });
      toast.success(res.data.mensaje);
      fetchGastosYProductos();
    } catch (err) {
      console.error('Error al registrar consumo:', err);
      toast.error(err.response?.data?.error || 'Error al registrar el consumo.');
    }
  };

  const format = (val) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-sm text-gray-500 font-medium">
          Control de insumos consumibles, publicidad corporativa y atenciones al cliente.
        </p>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-pink-200"
        >
          <i className="fa-solid fa-receipt"></i> Registrar Gasto Interno
        </button>
      </div>

      {/* METRICAS DE BOLSAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-pink-500 to-rose-400 text-white p-5 rounded-2xl shadow-sm border border-pink-100 flex flex-col justify-between">
          <div>
            <h5 className="text-xs font-bold uppercase tracking-widest text-pink-100">Bolsas Corporativas en Stock</h5>
            <h3 className="text-2xl font-black mt-1">{bolsasStock}</h3>
          </div>
          <p className="text-[11px] text-pink-50/80 mt-3">
            <i className="fa-solid fa-circle-info"></i> Se descuentan de forma automatizada al marcar el Check en el POS.
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-pink-100 flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inversión Total Bolsas</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{format(bolsasInversion)}</h3>
          </div>
          <div className="bg-amber-50 text-amber-500 p-3 rounded-xl">
            <i className="fa-solid fa-bag-shopping text-lg"></i>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-pink-100 flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tiempo de Consumo</p>
            <h3 className="text-lg font-bold text-pink-600 mt-1">{bolsasDuracion}</h3>
          </div>
          <div className="bg-pink-50 text-pink-500 p-3 rounded-xl">
            <i className="fa-solid fa-hourglass-half"></i>
          </div>
        </div>
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
                <th className="p-4 pl-6">Categoría</th>
                <th className="p-4">Item / Descripción</th>
                <th className="p-4 text-center">Cantidad Inicial</th>
                <th className="p-4 text-center">Disponible</th>
                <th className="p-4 text-right">Inversión</th>
                <th className="p-4 text-center">Consumo Diario</th>
                <th className="p-4 pr-6 text-center">Rendimiento / Alertas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {gastos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-400 italic">
                    No se han registrado gastos internos.
                  </td>
                </tr>
              ) : (
                gastos.map((g) => {
                  let statusBadge = '';
                  if (g.cantidadActual === 0) {
                    statusBadge = (
                      <span className="px-2 py-1 text-[10px] rounded bg-rose-100 text-rose-700 font-bold uppercase block text-center">
                        Agotado en {g.diasDuracion} días
                      </span>
                    );
                  } else if (g.cantidadActual <= g.cantidadInicial * 0.2) {
                    statusBadge = (
                      <span className="px-2 py-1 text-[10px] rounded bg-amber-100 text-amber-700 font-bold uppercase block text-center animate-pulse">
                        ¡Por Agotarse! ({g.cantidadActual} disp.)
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="px-2 py-1 text-[10px] rounded bg-emerald-100 text-emerald-700 font-bold uppercase block text-center">
                        Activo
                      </span>
                    );
                  }

                  return (
                    <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 pl-6 font-bold text-pink-600 text-xs uppercase">{g.categoria}</td>
                      <td className="p-4 font-semibold text-gray-900">{g.item}</td>
                      <td className="p-4 text-center font-mono">{g.cantidadInicial}</td>
                      <td className={`p-4 text-center font-mono font-bold ${g.cantidadActual === 0 ? 'text-rose-500' : 'text-gray-900'}`}>
                        {g.cantidadActual}
                      </td>
                      <td className="p-4 text-right font-bold text-rose-500">{format(g.costoTotal)}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleConsumir(g)}
                          disabled={g.cantidadActual === 0}
                          className="bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-pink-50 hover:text-pink-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <i className="fa-solid fa-minus"></i> Consumir
                        </button>
                      </td>
                      <td className="p-4 pr-6">{statusBadge}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL GASTO INTERNO */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 md:p-6 shadow-xl border border-pink-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900">Registrar Gasto del Negocio</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-rose-500 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría del Gasto</label>
                <select
                  value={categoria}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategoria(val);
                    if (val === 'Cortesías al Cliente') {
                      setEsProductoInventario(true);
                    } else {
                      setEsProductoInventario(false);
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50 cursor-pointer"
                >
                  <option value="Publicidad">Publicidad (Tarjetas, folletos, pauta)</option>
                  <option value="Productos de Limpieza">Productos de Limpieza</option>
                  <option value="Cortesías al Cliente">Cortesías al Cliente</option>
                  <option value="Otros Gastos">Otros Gastos</option>
                </select>
              </div>
              <div className="flex items-center justify-between bg-pink-50/40 border border-pink-100/50 p-3 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-gray-700 block">¿Consumo de Inventario?</span>
                  <span className="text-[10px] text-gray-400">Extraer producto registrado en stock</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={esProductoInventario}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setEsProductoInventario(val);
                      if (val) {
                        setCategoria('Cortesías al Cliente');
                      } else {
                        if (categoria === 'Cortesías al Cliente') {
                          setCategoria('Publicidad');
                        }
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                </label>
              </div>

              {!esProductoInventario ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item / Insumo</label>
                    <input
                      type="text"
                      required
                      value={item}
                      onChange={(e) => setItem(e.target.value)}
                      placeholder="Ej. Tarjetas de publicidad de mano"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cantidad Adquirida</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                        placeholder="Ej. 100"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Costo Total de Compra (S/)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0.1"
                        value={costo}
                        onChange={(e) => setCosto(e.target.value)}
                        placeholder="Ej. 50.00"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar Producto</label>
                    <input
                      type="text"
                      required
                      placeholder="Haz clic para ver todos o escribe..."
                      value={productoSearchText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProductoSearchText(val);
                        setMostrarSugerenciasProd(true);
                        const match = productos.find(p => p.nombre.toLowerCase() === val.toLowerCase());
                        setProductoId(match ? match.id : '');
                      }}
                      onFocus={() => setMostrarSugerenciasProd(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          setMostrarSugerenciasProd(false);
                        }, 250);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50 cursor-pointer"
                    />
                    {mostrarSugerenciasProd && (
                      (() => {
                        const query = (productoSearchText || '').toLowerCase().trim();
                        const filtered = productos.filter(p => {
                          const stock = p.lotes?.reduce((sum, l) => sum + l.stockActual, 0) || 0;
                          if (stock <= 0) return false;
                          if (query === '') return true;
                          return p.nombre.toLowerCase().includes(query) || p.codigo.toLowerCase().includes(query);
                        });

                        if (filtered.length === 0) return null;

                        return (
                          <ul className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-gray-100 font-sans">
                            {filtered.map(p => {
                              const stock = p.lotes?.reduce((sum, l) => sum + l.stockActual, 0) || 0;
                              return (
                                <li
                                  key={p.id}
                                  onClick={() => {
                                    setProductoId(p.id);
                                    setProductoSearchText(p.nombre);
                                    setMostrarSugerenciasProd(false);
                                  }}
                                  className="px-4 py-2 hover:bg-pink-50 hover:text-pink-600 cursor-pointer text-xs flex justify-between items-center"
                                >
                                  <span className="font-semibold text-left">{p.nombre}</span>
                                  <span className="text-gray-400 font-mono text-[10px] shrink-0 font-semibold">Stock: {stock} ud</span>
                                </li>
                              );
                            })}
                          </ul>
                        );
                      })()
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cantidad a Consumir</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                      placeholder="Ej. 2"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 bg-gray-50/50"
                    />
                  </div>
                  {(() => {
                    const selProd = productos.find(p => p.id === parseInt(productoId));
                    if (!selProd) return null;
                    const stock = selProd.lotes?.reduce((sum, l) => sum + l.stockActual, 0) || 0;
                    return (
                      <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-1.5 font-sans">
                        <i className="fa-solid fa-circle-info text-emerald-500"></i>
                        <span>Stock disponible: <strong>{stock} unidades</strong>. Costo promedio lote: <strong>{format(selProd.lotes?.[0]?.costo || 0)}</strong></span>
                      </div>
                    );
                  })()}
                </>
              )}
              <button
                type="submit"
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-pink-200 mt-4 cursor-pointer"
              >
                <i className="fa-solid fa-floppy-disk mr-2"></i> Guardar Gasto Interno
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gastos;
