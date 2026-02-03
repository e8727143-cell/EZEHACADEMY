
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Eye, EyeOff, Power, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionCheck, setSessionCheck] = useState(true);
  const navigate = useNavigate();

  // Verificar que el usuario realmente tiene una sesión activa (por el link del email)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Si no hay sesión, el link es inválido o expiró
        setError("El enlace de activación ha expirado o es inválido.");
      }
      setSessionCheck(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres.");
      }

      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) throw error;

      // Éxito: Redirigir al dashboard
      navigate('/dashboard');
      
    } catch (err: any) {
      setError(err.message || "Error al activar la cuenta");
    } finally {
      setLoading(false);
    }
  };

  if (sessionCheck) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="animate-spin text-red-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-900/10 blur-[100px] rounded-full" />
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative z-10 backdrop-blur-xl"
      >
        <div className="text-center mb-10">
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-red-600/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative bg-[#050505] border border-red-600/50 w-full h-full rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.3)]">
               <ShieldCheck className="text-red-600" size={36} />
            </div>
          </div>
          <h1 className="text-3xl font-black uppercase italic text-white tracking-tighter">
            ACTIVAR <span className="text-red-600">CUENTA</span>
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-3 px-4 leading-relaxed">
            Bienvenido a Ezeh Academy. Define tu credencial de acceso para desbloquear el contenido.
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-900/20 border border-red-600/30 rounded-xl flex items-center gap-3 text-red-500 text-xs font-black uppercase tracking-wide"
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Establecer Contraseña</label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-600 transition-colors" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#050505] border border-white/10 rounded-2xl px-14 pr-12 py-5 focus:border-red-600/50 outline-none transition-all text-sm font-bold text-white placeholder:text-zinc-800 shadow-inner"
                placeholder="Mínimo 6 caracteres"
                required
                disabled={!!error && !password} // Deshabilitar si hubo error de sesión
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || (!!error && !password)}
            className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-black py-5 rounded-2xl transition-all shadow-lg shadow-red-900/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em]"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Power size={18} />}
            {loading ? 'Activando...' : 'ACTIVAR CUENTA'}
          </button>
        </form>
        
        <div className="mt-8 text-center">
             <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">
                Acceso Seguro SSL Encriptado
             </p>
        </div>
      </motion.div>
    </div>
  );
};

export default UpdatePassword;
