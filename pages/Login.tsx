
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, ShieldCheck, AlertCircle, Loader2, Youtube } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name }
          }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          await supabase.from('profiles').insert([{ id: data.user.id, full_name: name, role: 'user' }]);
        }

        setSuccessMsg('¡Cuenta creada! Revisa tu email para confirmar o intenta iniciar sesión.');
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
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#050505] overflow-hidden selection:bg-red-600 selection:text-white">
      
      {/* SECCIÓN IZQUIERDA: ANIMACIÓN 3D & VISUALS */}
      <div className="hidden lg:flex flex-1 relative flex-col items-center justify-center overflow-hidden border-r border-white/5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/20 blur-[160px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-900/10 blur-[120px] rounded-full" />
        
        <motion.div 
          style={{ perspective: 1200 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="relative z-10 flex flex-col items-center"
        >
          <motion.div
            animate={{ 
              rotateY: [0, 15, -15, 0],
              rotateX: [0, 5, -5, 0],
              y: [-15, 15, -15]
            }}
            transition={{ 
              duration: 10, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="relative mb-20"
          >
            <div className="absolute inset-0 bg-red-600 blur-[80px] opacity-20 scale-150" />
            <div className="relative bg-gradient-to-br from-red-600 to-red-900 p-10 rounded-[3rem] shadow-[0_0_120px_rgba(220,38,38,0.4)] border border-white/20">
              <Youtube size={140} color="white" strokeWidth={1.2} />
            </div>

            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  y: [0, -60, 0], 
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.2, 0.5]
                }}
                transition={{ 
                  duration: 4 + i, 
                  repeat: Infinity, 
                  delay: i * 0.4 
                }}
                className="absolute w-2 h-2 bg-red-500 rounded-full blur-[1px]"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </motion.div>

          <div className="relative flex flex-col items-center group cursor-default">
            {/* Texto Principal con Efecto Shimmer */}
            <div className="relative overflow-hidden">
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-7xl font-black tracking-tighter text-white drop-shadow-[0_10px_20px_rgba(255,255,255,0.1)] relative"
              >
                EZEH<span className="text-red-600">ACADEMY</span>
                {/* Capa de luz reflejante */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full skew-x-[-20deg]"
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
          <div className="mb-12">
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-5xl font-black tracking-tighter text-red-600 mb-4"
            >
              EZEH<span className="text-white">ACADEMY</span>
            </motion.div>
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-red-600" />
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                {isRegistering ? 'Crear nueva cuenta' : 'Acceso Estudiantes'}
              </p>
            </div>
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
                  type="password" 
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-white/5 rounded-2xl px-14 py-5 focus:border-red-600/50 outline-none transition-all text-sm font-bold text-gray-200"
                  placeholder="••••••••"
                />
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

          <div className="mt-16 pt-8 border-t border-white/5 flex items-center justify-between opacity-50 group">
            <div className="flex items-center gap-3 text-[9px] text-gray-400 uppercase font-black tracking-[0.2em]">
              <ShieldCheck size={14} className="text-red-600" /> 
              Seguridad Biometría
            </div>
            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">v2.4.8</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
