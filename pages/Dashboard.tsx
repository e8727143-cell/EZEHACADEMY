
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  CheckCircle, 
  Menu, 
  X, 
  ChevronRight, 
  ChevronDown,
  FileText, 
  LogOut, 
  Settings,
  Star,
  Clock,
  ExternalLink,
  LayoutDashboard,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { User, Module, Lesson } from '../types';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import { supabase } from '../lib/supabase';
import ReactPlayer from 'react-player';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [progress, setProgress] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoKey, setVideoKey] = useState(0); // Para forzar el remonte del componente
  const playerRef = useRef<any>(null);

  useEffect(() => {
    fetchContent();
    fetchProgress();
  }, []);

  async function fetchContent() {
    const { data, error } = await supabase
      .from('modules')
      .select('*, lessons(*)')
      .order('order_index');

    if (data) {
      setModules(data);
      if (data.length > 0 && data[0].lessons?.length > 0) {
        setActiveLesson(data[0].lessons[0]);
        setExpandedModules([data[0].id]);
      }
    }
    setLoading(false);
  }

  async function fetchProgress() {
    const { data } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', user.id);
    
    if (data) setProgress(data.map((p: any) => p.lesson_id));
  }

  const onToggleProgress = async (lessonId: string) => {
    const isCompleted = progress.includes(lessonId);
    if (isCompleted) {
      await supabase.from('user_progress').delete().eq('user_id', user.id).eq('lesson_id', lessonId);
      setProgress(prev => prev.filter(id => id !== lessonId));
    } else {
      await supabase.from('user_progress').insert({ user_id: user.id, lesson_id: lessonId });
      setProgress(prev => [...prev, lessonId]);
    }
  };

  const totalLessons = useMemo(() => modules.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0), [modules]);
  const progressPercent = totalLessons > 0 ? Math.round((progress.length / totalLessons) * 100) : 0;

  const htmlDescription = useMemo(() => {
    return activeLesson ? marked.parse(activeLesson.description || '') : '';
  }, [activeLesson]);

  /**
   * FIX DEFINITIVO ERROR 153:
   * 1. Extrae ID de YouTube.
   * 2. Formatea a youtube-nocookie.com/embed/ID.
   * 3. Inyecta origin y enablejsapi.
   */
  const formatYoutubeUrl = (url: string) => {
    if (!url) return "";
    
    // Regex robusto para YouTube
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[2].length === 11) {
      const videoId = match[2];
      const origin = encodeURIComponent(window.location.origin);
      // Retornamos el formato solicitado con parámetros de limpieza
      return `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${origin}&rel=0&modestbranding=1&autoplay=0`;
    }
    
    return url; // Si no es YouTube (Vimeo, etc), dejar pasar el link original
  };

  const processedVideoUrl = useMemo(() => {
    setVideoError(false);
    return activeLesson ? formatYoutubeUrl(activeLesson.video_url) : "";
  }, [activeLesson]);

  const handleRetry = () => {
    setVideoError(false);
    setVideoKey(prev => prev + 1);
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <nav className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-white/10 rounded-xl transition-all">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="text-2xl font-black tracking-tighter flex items-center gap-2">
            <span className="text-red-600">EZEH</span><span className="text-white hidden sm:inline">ACADEMY</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Progreso Total</span>
              <span className="text-xs font-bold text-red-500">{progressPercent}%</span>
            </div>
            <div className="w-40 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className="h-full bg-red-600" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <Link to="/admin" className="p-2 text-gray-400 hover:text-white transition-colors" title="Panel de Administración"><Settings size={20} /></Link>
            )}
            <button onClick={onLogout} className="text-gray-400 hover:text-red-500 transition-colors" title="Cerrar Sesión"><LogOut size={18} /></button>
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-black text-sm uppercase">{user.fullName.charAt(0)}</div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 pt-[72px] h-screen overflow-hidden">
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside 
              initial={{ x: -350 }} 
              animate={{ x: 0 }} 
              exit={{ x: -350 }} 
              className="w-full lg:w-[350px] bg-[#0d0d0d] border-r border-white/5 overflow-y-auto custom-scrollbar"
            >
              <div className="p-6">
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Contenido del Curso</h2>
                {modules.length === 0 ? (
                  <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest text-center py-10">Cargando módulos...</p>
                ) : modules.map((module, mIdx) => (
                  <div key={module.id} className="mb-4">
                    <button 
                      onClick={() => setExpandedModules(prev => prev.includes(module.id) ? prev.filter(i => i !== module.id) : [...prev, module.id])} 
                      className="w-full flex justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <div className="text-left">
                        <p className="text-[9px] font-black text-red-600 uppercase">MÓDULO {mIdx + 1}</p>
                        <h3 className="text-sm font-bold group-hover:text-red-500 transition-colors">{module.title}</h3>
                      </div>
                      <ChevronDown size={18} className={`transition-transform text-gray-600 ${expandedModules.includes(module.id) ? 'rotate-180 text-white' : ''}`} />
                    </button>
                    {expandedModules.includes(module.id) && module.lessons?.map(lesson => (
                      <button 
                        key={lesson.id} 
                        onClick={() => {
                          setActiveLesson(lesson);
                          if (window.innerWidth < 1024) setSidebarOpen(false);
                        }} 
                        className={`w-full flex items-center gap-4 p-4 pl-6 text-left transition-all rounded-xl mt-1 ${activeLesson?.id === lesson.id ? 'bg-red-600/10 text-white font-bold' : 'text-gray-500 hover:bg-white/5'}`}
                      >
                        {progress.includes(lesson.id) ? <CheckCircle className="text-green-500" size={14} /> : <Play size={14} className={activeLesson?.id === lesson.id ? "text-red-500" : ""} />}
                        <span className="text-xs truncate">{lesson.title}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto bg-black p-4 lg:p-12 custom-scrollbar">
          {activeLesson ? (
            <div className="max-w-5xl mx-auto">
              
              {/* REPRODUCTOR MASTERCLASS EDITION */}
              <div className="relative aspect-video bg-[#050505] rounded-[2rem] overflow-hidden border border-white/5 mb-10 shadow-[0_0_100px_rgba(239,68,68,0.08)] group">
                {!videoError ? (
                  <ReactPlayer
                    key={videoKey}
                    ref={playerRef}
                    url={processedVideoUrl}
                    width="100%"
                    height="100%"
                    controls={true}
                    onError={() => setVideoError(true)}
                    config={{
                      youtube: {
                        playerVars: { 
                          origin: window.location.origin,
                          enablejsapi: 1,
                          modestbranding: 1,
                          rel: 0,
                          showinfo: 0,
                          iv_load_policy: 3
                        },
                        embedOptions: {
                          host: 'https://www.youtube-nocookie.com'
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-center p-10">
                    <AlertCircle size={64} className="text-red-600 mb-6 opacity-40 animate-pulse" />
                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-4 italic">ERROR DE <span className="text-red-600">REPRODUCCIÓN</span></h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] max-w-sm leading-loose mb-10">
                      Error 153 detectado. Se ha aplicado el protocolo de seguridad Origin-Bypass, pero la red sigue rechazando el flujo de video.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-5">
                      <button 
                        onClick={handleRetry} 
                        className="flex items-center justify-center gap-3 bg-white text-black px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-2xl shadow-white/5"
                      >
                        <RefreshCw size={18} /> Forzar Recarga
                      </button>
                      <a 
                        href={activeLesson.video_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 bg-red-600/10 text-red-500 border border-red-600/20 px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
                      >
                        <ExternalLink size={18} /> Abrir en Externo
                      </a>
                    </div>
                  </div>
                )}
                {/* Overlay Estético de Branding Inferior */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-red-600/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full">Lección Actual</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1"><Clock size={12}/> {activeLesson.duration || '10:00'}</span>
                  </div>
                  <h1 className="text-4xl font-black mb-6 tracking-tighter italic uppercase">{activeLesson.title}</h1>
                  <div 
                    className="prose prose-invert max-w-none text-gray-400 font-medium" 
                    dangerouslySetInnerHTML={{ __html: htmlDescription }} 
                  />
                </div>
                <div className="space-y-6">
                  <button 
                    onClick={() => onToggleProgress(activeLesson.id)} 
                    className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl ${progress.includes(activeLesson.id) ? 'bg-green-600/10 text-green-500 border border-green-600/20' : 'bg-white text-black hover:bg-red-600 hover:text-white active:scale-95 shadow-white/5'}`}
                  >
                    {progress.includes(activeLesson.id) ? '✓ Completado satisfactoriamente' : 'Marcar como Completado'}
                  </button>
                  <div className="p-8 bg-[#0d0d0d] border border-white/5 rounded-[3rem] shadow-2xl">
                    <h3 className="text-[10px] font-black uppercase text-gray-500 mb-8 tracking-[0.3em] flex items-center gap-3">
                      <FileText size={16} className="text-red-600"/> Librería de Recursos
                    </h3>
                    {(activeLesson.resources as any[])?.length > 0 ? (activeLesson.resources as any[]).map((r, i) => (
                      <a 
                        key={i} 
                        href={r.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-between p-5 bg-white/5 rounded-2xl text-[11px] font-bold hover:bg-white/10 transition-all mb-4 group border border-transparent hover:border-red-600/30"
                      >
                        <span className="flex items-center gap-4 truncate pr-4">
                          <FileText size={16} className="text-gray-500 group-hover:text-red-600 flex-shrink-0"/> 
                          <span className="truncate uppercase">{r.name}</span>
                        </span>
                        <ExternalLink size={14} className="text-gray-700 group-hover:text-white flex-shrink-0"/>
                      </a>
                    )) : (
                      <div className="text-center py-10 opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                        <p className="text-[9px] font-black uppercase tracking-widest">Sin materiales de apoyo</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-800 p-20 text-center">
               <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-10 animate-pulse">
                  <Play size={48} className="opacity-20 ml-2" />
               </div>
               <h3 className="text-xl font-black uppercase tracking-[0.4em] italic">EZEH <span className="text-red-600">DASHBOARD</span></h3>
               <p className="text-[10px] font-bold opacity-30 mt-4 uppercase tracking-widest max-w-xs leading-loose">Selecciona un módulo en la barra lateral para inyectar conocimiento digital.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
