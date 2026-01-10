import React, { useState, useEffect } from 'react';
import { 
  Play, FileText, ChevronDown, CheckCircle, Lock, LogOut, Menu, X, Download, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Para móvil/desktop
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    // 1. Traemos la misma estructura que en el Admin
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules(*, lessons(*))')
      .order('created_at', { ascending: true }); // Ordenamos cronológicamente para el alumno

    if (!error && data) {
      // Ordenar módulos y lecciones
      const sorted = data.map(c => ({
        ...c,
        modules: c.modules?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((m: any) => ({
             ...m,
             lessons: m.lessons?.sort((x: any, y: any) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime())
          }))
      }));
      setCourses(sorted);
      
      // Auto-seleccionar la primera lección del primer curso si existe
      if (sorted.length > 0 && sorted[0].modules?.[0]?.lessons?.[0]) {
        setActiveLesson(sorted[0].modules[0].lessons[0]);
        setExpandedModules(new Set([sorted[0].modules[0].id])); // Expandir primer módulo
      }
    }
    setLoading(false);
  }

  const toggleModule = (id: string) => {
    const next = new Set(expandedModules);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedModules(next);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-bold tracking-widest uppercase">Cargando tu Academia...</div>;

  if (courses.length === 0) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8 text-center">
        <h1 className="text-3xl font-black uppercase mb-4">No hay contenido disponible</h1>
        <p className="text-zinc-500 mb-8">El administrador aún no ha publicado cursos.</p>
        <Link to="/admin" className="text-red-600 underline text-sm">Ir al Admin (Si eres tú)</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex overflow-hidden">
      
      {/* --- SIDEBAR (MENÚ DE CURSOS) --- */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? '350px' : '0px', opacity: sidebarOpen ? 1 : 0 }}
        className="h-screen bg-[#0a0a0a] border-r border-white/5 flex-shrink-0 flex flex-col overflow-hidden relative"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
            <h2 className="font-black italic text-xl tracking-tighter">EZEH <span className="text-red-600">ACADEMY</span></h2>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white"><X/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8">
            {courses.map(course => (
                <div key={course.id}>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 ml-2">{course.title}</h3>
                    <div className="space-y-2">
                        {course.modules?.map((mod: any) => (
                            <div key={mod.id} className="bg-black border border-white/5 rounded-2xl overflow-hidden">
                                <button 
                                    onClick={() => toggleModule(mod.id)}
                                    className="w-full p-4 flex justify-between items-center text-left hover:bg-white/5 transition-colors"
                                >
                                    <span className="font-bold text-sm text-zinc-300 uppercase">{mod.title}</span>
                                    <ChevronDown size={16} className={`text-zinc-600 transition-transform ${expandedModules.has(mod.id) ? 'rotate-180' : ''}`}/>
                                </button>
                                
                                <AnimatePresence>
                                    {expandedModules.has(mod.id) && (
                                        <motion.div 
                                            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} 
                                            className="overflow-hidden bg-zinc-900/30"
                                        >
                                            <div className="p-2 space-y-1">
                                                {mod.lessons?.map((lesson: any) => (
                                                    <button
                                                        key={lesson.id}
                                                        onClick={() => setActiveLesson(lesson)}
                                                        className={`w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all group ${activeLesson?.id === lesson.id ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'hover:bg-white/5 text-zinc-500'}`}
                                                    >
                                                        <div className={`p-1.5 rounded-full ${activeLesson?.id === lesson.id ? 'bg-white/20' : 'bg-black border border-white/10 group-hover:border-white/30'}`}>
                                                            {activeLesson?.id === lesson.id ? <Play size={10} fill="currentColor"/> : <Lock size={10}/>}
                                                        </div>
                                                        <span className="text-xs font-bold uppercase truncate">{lesson.title}</span>
                                                    </button>
                                                ))}
                                                {!mod.lessons?.length && <div className="p-4 text-center text-[9px] text-zinc-700 uppercase font-black">Próximamente</div>}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        <div className="p-4 border-t border-white/5">
            <button onClick={handleLogout} className="w-full py-3 bg-zinc-900 rounded-xl text-xs font-bold uppercase text-zinc-500 hover:text-white hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                <LogOut size={14}/> Cerrar Sesión
            </button>
        </div>
      </motion.aside>

      {/* --- MAIN CONTENT (PLAYER) --- */}
      <main className="flex-1 h-screen overflow-y-auto relative bg-[#050505]">
        {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="absolute top-6 left-6 z-50 p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-red-600 transition-all">
                <Menu size={20}/>
            </button>
        )}

        {activeLesson ? (
            <div className="max-w-5xl mx-auto p-6 lg:p-12 space-y-8">
                {/* VIDEO PLAYER AREA */}
                <div className="w-full aspect-video bg-black rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl relative group">
                    {activeLesson.video_url ? (
                        activeLesson.video_url.includes('youtube') || activeLesson.video_url.includes('vimeo') ? (
                           <iframe 
                             src={activeLesson.video_url.replace('watch?v=', 'embed/')} 
                             className="w-full h-full" 
                             allowFullScreen 
                             title="Video Player"
                           />
                        ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-zinc-900">
                               <Play size={64} className="text-zinc-800"/>
                               <div className="text-center">
                                   <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-4">Video Externo / Drive</p>
                                   <a 
                                     href={activeLesson.video_url} 
                                     target="_blank" 
                                     rel="noopener noreferrer"
                                     className="px-8 py-3 bg-red-600 text-white rounded-full font-black uppercase text-xs hover:bg-red-700 transition-all inline-flex items-center gap-2"
                                   >
                                     <ExternalLink size={14}/> Ver Clase
                                   </a>
                               </div>
                           </div>
                        )
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                             <p className="text-zinc-700 font-black uppercase tracking-[0.5em]">Sin Video Asignado</p>
                        </div>
                    )}
                </div>

                {/* INFO LECCIÓN */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-6">
                        <h1 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tight">{activeLesson.title}</h1>
                        <div className="p-6 bg-zinc-900/30 rounded-2xl border border-white/5 text-zinc-400 leading-relaxed text-sm">
                            {activeLesson.description || "Sin descripción disponible para esta clase."}
                        </div>
                    </div>

                    {/* RECURSOS / ARCHIVOS */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Material de Clase</h3>
                        {activeLesson.resources ? (
                            <a 
                                href={activeLesson.resources} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block p-6 bg-red-600/10 border border-red-600/20 rounded-2xl hover:bg-red-600 hover:text-white transition-all group"
                            >
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-2 bg-red-600 text-white rounded-lg">
                                        <FileText size={20}/>
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-wide">Descargar Archivo</span>
                                </div>
                                <p className="text-[10px] text-zinc-400 group-hover:text-red-100 pl-1">Clic para acceder al recurso</p>
                            </a>
                        ) : (
                            <div className="p-6 border-2 border-dashed border-white/5 rounded-2xl text-center">
                                <p className="text-[10px] font-black uppercase text-zinc-700 tracking-widest">Sin materiales</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ) : (
            <div className="h-full flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest">
                Selecciona una clase para comenzar
            </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;