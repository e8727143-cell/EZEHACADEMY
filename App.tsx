
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Admin from './pages/Admin.tsx';
import { User } from './types.ts';
import { supabase, ADMIN_EMAIL } from './lib/supabase.ts';
import { ShieldAlert, Home, LogOut, Loader2 } from 'lucide-react';

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

  // Tracking de actividad y Presence API
  useEffect(() => {
    if (user) {
      // 1. Heartbeat Database (Respaldo histórico)
      const updateActivity = async () => {
        try {
          await supabase
            .from('profiles')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', user.id);
        } catch (e) {
          console.error("Error updating heartbeat", e);
        }
      };
      updateActivity();
      const interval = setInterval(updateActivity, 3 * 60 * 1000);

      // 2. Presence API (Tracking en tiempo real instantáneo)
      const channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channel
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

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
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-red-600/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
        </div>
        <div className="text-center">
          <p className="text-white font-black uppercase tracking-[0.5em] text-sm italic">EZEH ACADEMY</p>
          <div className="flex items-center justify-center gap-2 mt-3">
             <Loader2 size={12} className="animate-spin text-red-600" />
             <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Sincronizando acceso...</p>
          </div>
        </div>
      </div>
    );
  }

  const AccessDenied = () => (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-600/10 border border-red-600/20 rounded-full flex items-center justify-center mb-6">
        <ShieldAlert size={40} className="text-red-600" />
      </div>
      <h1 className="text-3xl font-black mb-4 uppercase italic">ACCESO DENEGADO</h1>
      <p className="text-gray-500 max-w-md mb-8 text-sm font-medium">
        No tienes privilegios de administrador. Contacta al soporte si esto es un error.
      </p>
      <div className="flex gap-4">
        <button onClick={() => window.location.hash = '#/dashboard'} className="bg-white text-black px-8 py-4 rounded-2xl font-black uppercase text-xs hover:bg-red-600 hover:text-white transition-all">
          <Home size={18} className="inline mr-2"/> Inicio
        </button>
      </div>
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user ? (user.role === 'admin' ? <Admin onLogout={handleLogout} /> : <AccessDenied />) : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
