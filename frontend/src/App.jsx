import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          {/* Ruta pública de Login */}
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              {/* Las demás rutas de los módulos se agregarán aquí en fases posteriores */}
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
