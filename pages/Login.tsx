
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, ShieldCheck, AlertCircle, Loader2, Play, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isRegistering) {
        // 1. Registro en Supabase Auth
        // El Trigger SQL configurado en el backend se encargará de crear el registro en 'public.profiles' automáticamente.
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name } // Esto se pasa al trigger como raw_user_meta_data
          }
        });

        if (signUpError) throw signUpError;

        setSuccessMsg('¡Cuenta creada! Si recibiste un correo de confirmación, acéptalo antes de entrar.');
        setIsRegistering(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          if (signInError.message.includes('Email not confirmed')) throw new Error('Debes confirmar tu correo electrónico antes de entrar.');
          if (signInError.message.includes('Invalid login credentials')) throw new Error('Credenciales incorrectas. Revisa tu email y contraseña.');
          throw signInError;
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err.message || err);
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#050505] overflow-hidden selection:bg-red-600 selection:text-white">
      
      {/* SECCIÓN IZQUIERDA: ANIMACIÓN 3D & VISUALS */}
      <div className="hidden lg:flex flex-1 relative flex-col items-center justify-center overflow-hidden border-r border-white/5">
        
        {/* LUZ DE FONDO ROJA (MANTENIDA) */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/30 blur-[160px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-900/20 blur-[120px] rounded-full" />
        
        <motion.div 
          style={{ perspective: 1200 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="relative z-10 flex flex-col items-center"
        >
          <motion.div
            animate={{ 
              rotateY: [0, 10, -10, 0],
              rotateX: [0, 5, -5, 0],
              y: [-10, 10, -10]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="relative mb-20"
          >
            {/* GLOW ROJO DETRÁS DEL OBJETO */}
            <div className="absolute inset-0 bg-red-600 blur-[90px] opacity-40 scale-125 animate-pulse" />
            
            {/* --- BLOQUE DE ORO (ESTILO YOUTUBE PLAY BUTTON) --- */}
            <div className="relative w-56 h-40 bg-gradient-to-br from-[#fff7ad] via-[#ffa900] to-[#b45309] rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-4px_8px_rgba(180,83,9,0.5)] border-t border-white/40 border-b border-[#78350f] flex items-center justify-center overflow-hidden group">
              
              {/* Reflejo metálico superior */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
              
              {/* Brillo dinámico (Shimmer) */}
              <div className="absolute -inset-full top-0 block h-full w-full -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-30 animate-[shimmer_3s_infinite]" />

              {/* Triángulo PLAY (Hundido/Grabado en el oro) */}
              <div className="relative z-20 ml-2 drop-shadow-[0_2px_2px_rgba(255,255,255,0.5)]">
                 <Play 
                    size={80} 
                    fill="#78350f" // Color Bronce Oscuro para el relleno
                    strokeWidth={0}
                    className="filter drop-shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)]"
                 />
                 {/* Capa extra para dar profundidad al icono */}
                 <Play 
                    size={80} 
                    fill="url(#goldGradient)"
                    strokeWidth={0}
                    className="absolute inset-0 opacity-80 mix-blend-overlay"
                 />
              </div>

            </div>

            {/* PARTÍCULAS DORADAS FLOTANTES */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  y: [0, -40, 0], 
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 3 + i, 
                  repeat: Infinity, 
                  delay: i * 0.5 
                }}
                className="absolute w-1.5 h-1.5 bg-[#fbbf24] rounded-full blur-[0.5px] shadow-[0_0_8px_#f59e0b]"
                style={{
                  top: `${Math.random() * 120 - 10}%`,
                  left: `${Math.random() * 140 - 20}%`,
                }}
              />
            ))}
          </motion.div>

          <div className="relative flex flex-col items-center group cursor-default">
            {/* Texto Principal */}
            <div className="relative overflow-hidden">
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-7xl font-black tracking-tighter text-white drop-shadow-[0_10px_20px_rgba(255,255,255,0.1)] relative"
              >
                EZEH<span className="text-red-600">ACADEMY</span>
                {/* Capa de luz reflejante texto */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full skew-x-[-20deg]"
                  initial={{ x: '-150%' }}
                  animate={{ x: '200%' }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    repeatDelay: 2
                  }}
                />
              </motion.h2>
            </div>
            
            {/* Texto de Reflexión (Efecto Espejo) */}
            <div className="absolute top-full mt-[-8px] pointer-events-none select-none">
              <motion.h2 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.25 }}
                className="text-7xl font-black tracking-tighter scale-y-[-1] blur-[3px] bg-gradient-to-t from-transparent via-red-600/40 to-white/20 bg-clip-text text-transparent"
              >
                EZEHACADEMY
              </motion.h2>
            </div>
          </div>
        </motion.div>

        <div className="absolute bottom-10 left-0 right-0 px-20 flex justify-between items-center opacity-20">
            <div className="h-px bg-white/50 flex-1 mx-4" />
            <div className="text-[8px] font-bold text-white tracking-[0.5em] uppercase">Solo Acceso Privado</div>
            <div className="h-px bg-white/50 flex-1 mx-4" />
        </div>
      </div>

      {/* SECCIÓN DERECHA: FORMULARIO */}
      <div className="w-full lg:w-[600px] flex items-center justify-center p-8 sm:p-12 relative bg-[#070707]/80 backdrop-blur-3xl">
        <div className="absolute inset-0 lg:hidden bg-gradient-to-b from-red-600/5 to-transparent pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-16 text-center">
            <p className="text-gray-400 text-sm font-black uppercase tracking-[0.3em]">
              {isRegistering ? 'Crear nueva cuenta' : 'Acceso Estudiantes'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-8 p-5 bg-red-600/10 border border-red-600/20 text-red-500 text-[11px] font-black rounded-2xl flex items-center gap-4 uppercase tracking-widest"
              >
                <AlertCircle size={18} className="flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-8 p-5 bg-green-600/10 border border-green-600/20 text-green-500 text-[11px] font-black rounded-2xl flex items-center gap-4 uppercase tracking-widest"
              >
                <ShieldCheck size={18} className="flex-shrink-0" />
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegistering && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 ml-1">Nombre Completo</label>
                <div className="relative group">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-red-600 transition-colors" size={18} />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-white/5 rounded-2xl px-14 py-5 focus:border-red-600/50 outline-none transition-all text-sm font-bold text-gray-200"
                    placeholder="Tu nombre"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 ml-1">Correo Electrónico</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-red-600 transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-white/5 rounded-2xl px-14 py-5 focus:border-red-600/50 outline-none transition-all text-sm font-bold text-gray-200"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">Contraseña</label>
                {!isRegistering && <button type="button" className="text-[10px] text-red-600 font-black uppercase hover:text-red-500">¿Olvidaste?</button>}
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-red-600 transition-colors" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-white/5 rounded-2xl px-14 pr-16 py-5 focus:border-red-600/50 outline-none transition-all text-sm font-bold text-gray-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-700 hover:text-red-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl transition-all shadow-2xl shadow-red-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4 text-xs uppercase tracking-[0.2em]"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                isRegistering ? 'Crear Cuenta' : 'Entrar a la Academia'
              )}
            </button>
          </form>

          <div className="mt-12 text-center">
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-gray-600 hover:text-white transition-colors text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
            >
              {isRegistering ? '¿Ya eres miembro? Iniciar Sesión' : '¿Nuevo aquí? Crear cuenta gratuita'}
            </button>
          </div>

          <div className="mt-16 pt-8 border-t border-white/5 flex items-center justify-center opacity-50 group">
            <div className="flex items-center gap-3 text-[10px] text-gray-400 uppercase font-black tracking-[0.3em]">
              <ShieldCheck size={14} className="text-red-600" /> 
              100% SEGURO
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
