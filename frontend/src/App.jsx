import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Clientes from './pages/Clientes';
import Inventario from './pages/Inventario';
import Gastos from './pages/Gastos';
import Citas from './pages/Citas';
import Finanzas from './pages/Finanzas';
import ReservaPublica from './pages/ReservaPublica';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          {/* Rutas públicas (Sin acceso a administración) */}
          <Route path="/login" element={<Login />} />
          <Route path="/reservar" element={<ReservaPublica />} />

          {/* Rutas protegidas con Diseño Layout */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/gastos" element={<Gastos />} />
              <Route path="/citas" element={<Citas />} />
              <Route path="/finanzas" element={<Finanzas />} />
            </Route>
          </Route>

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
