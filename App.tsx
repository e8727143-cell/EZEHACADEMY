
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import { User } from './types';
import { supabase, ADMIN_EMAIL } from './lib/supabase';
import { ShieldAlert, Home, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        mapSupabaseUser(session.user);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios de estado
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        mapSupabaseUser(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const mapSupabaseUser = (sbUser: any) => {
    const isAdmin = sbUser.email === ADMIN_EMAIL;
    setUser({
      id: sbUser.id,
      email: sbUser.email || '',
      fullName: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0],
      role: isAdmin ? 'admin' : 'student',
      progress: [],
    });
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-red-600/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-white font-black uppercase tracking-[0.3em] text-xs">EZEH ACADEMY</p>
          <p className="text-gray-600 text-[10px] mt-2 animate-pulse uppercase">Autenticando sesión...</p>
        </div>
      </div>
    );
  }

  // Componente de Acceso Denegado
  const AccessDenied = () => (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-600/10 border border-red-600/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
        <ShieldAlert size={40} className="text-red-600" />
      </div>
      <h1 className="text-3xl font-black mb-4 uppercase tracking-tighter">ACCESO DENEGADO</h1>
      <p className="text-gray-500 max-w-md mb-8 text-sm font-medium leading-relaxed">
        No tienes privilegios de administrador para acceder a esta sección protegida. 
        Si crees que esto es un error, contacta con el soporte oficial.
      </p>
      <div className="flex gap-4">
        <button 
          onClick={() => window.location.hash = '#/dashboard'}
          className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-black uppercase text-xs hover:bg-gray-200 transition-all active:scale-95"
        >
          <Home size={18} /> Ir al Inicio
        </button>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-600/10 text-red-500 px-8 py-4 rounded-2xl font-black uppercase text-xs hover:bg-red-600 hover:text-white transition-all border border-red-600/20 active:scale-95"
        >
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </div>
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={user ? <Navigate to="/dashboard" /> : <Login />} 
        />
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/admin" 
          element={
            user ? (
              user.role === 'admin' ? <Admin onLogout={handleLogout} /> : <AccessDenied />
            ) : (
              <Navigate to="/" />
            )
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
