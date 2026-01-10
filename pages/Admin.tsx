import React, { useState, useEffect } from 'react';
import { 
  Trash2, LogOut, ChevronDown, Layout, PlusCircle, Box, X, MousePointerClick
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const AdminPage = ({ onLogout }: { onLogout: () => void }) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCourseData, setNewCourseData] = useState({ title: '' });
  const [notification, setNotification] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    // SOLO TRAEMOS CURSOS Y MÓDULOS (Ignoramos lecciones por ahora)
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules(*)') 
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Ordenamos los módulos por fecha de creación
      const sorted = data.map(c => ({
        ...c,
        modules: c.modules?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }));
      setCourses(sorted);
    }
    setLoading(false);
  }

  // --- ACCIONES DE CURSOS ---
  const handleCreateCourse = async () => {
    if (!newCourseData.title.trim()) return;
    const { error } = await supabase.from('courses').insert([{ title: newCourseData.title }]);
    if (!error) {
      setShowCreateModal(false);
      setNewCourseData({ title: '' });
      fetchData();
      showNotify('success', 'MASTER CREADO');
    } else { alert(error.message); }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm("⚠️ ¿ELIMINAR MASTER? Se borrarán todos sus módulos.")) return;
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (!error) {
      setCourses(prev => prev.filter(c => c.id !== id));
      showNotify('success', 'MASTER ELIMINADO');
    } else { alert(error.message); }
  };

  // --- ACCIONES DE MÓDULOS (NUESTRO FOCO AHORA) ---
  const handleAddModule = async (courseId: string) => {
    console.log("🔥 CLICK: Agregar Módulo en curso", courseId);
    
    const title = window.prompt("Nombre del Nuevo Módulo:");
    if (!title) return; // Si cancela, no hacemos nada

    const { error } = await supabase.from('modules').insert([{ title, course_id: courseId }]);
    
    if (error) {
      alert("ERROR AL CREAR MÓDULO: " + error.message);
    } else {
      showNotify('success', 'MÓDULO CREADO');
      fetchData(); // Recargamos para ver el nuevo módulo
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm("¿Borrar este módulo?")) return;
    
    const { error } = await supabase.from('modules').delete().eq('id', moduleId);
    
    if (error) {
      alert("ERROR AL BORRAR: " + error.message);
    } else {
      showNotify('success', 'MÓDULO BORRADO');
      fetchData();
    }
  };

  // --- UTILIDADES ---
  const toggleCourse = (id: string) => {
    const next = new Set(expandedCourses);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedCourses(next);
  };

  const showNotify = (type: 'success'|'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-red-600 font-bold uppercase tracking-widest">Cargando Módulos...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-8">
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-zinc-800 border border-red-600/50 px-6 py-3 rounded-xl font-bold shadow-2xl">
             {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto pb-40">
        <nav className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
            <h1 className="text-3xl font-black italic">GESTIÓN DE <span className="text-red-600">MÓDULOS</span></h1>
            <button onClick={onLogout} className="text-zinc-600 hover:text-white transition-colors"><LogOut/></button>
        </nav>

        <div className="mb-10 text-right">
            <button onClick={() => setShowCreateModal(true)} className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                + Nuevo Master
            </button>
        </div>

        <div className="space-y-8">
          {courses.map((course) => (
            <div key={course.id} className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
              
              {/* CABECERA DEL CURSO */}
              <div className="p-8 flex items-center justify-between">
                {/* ZONA 1: ABRIR/CERRAR */}
                <div 
                  className="flex items-center gap-6 cursor-pointer group select-none flex-1"
                  onClick={() => toggleCourse(course.id)}
                >
                    <div className="w-14 h-14 bg-red-600/10 rounded-xl flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
                        {expandedCourses.has(course.id) ? <ChevronDown/> : <Layout/>}
                    </div>
                    <div>
                        <h3 className="font-black text-xl uppercase italic group-hover:text-red-500 transition-colors">{course.title}</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 group-hover:text-zinc-300 flex items-center gap-2">
                           <MousePointerClick size={10}/> Ver Módulos ({course.modules?.length || 0})
                        </p>
                    </div>
                </div>
                
                {/* ZONA 2: BOTONES DEL CURSO */}
                <div className="flex items-center gap-3 pl-4 border-l border-white/5">
                  <button type="button" onClick={() => handleAddModule(course.id)} className="bg-white text-black px-5 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-zinc-200 transition-all shadow-lg active:scale-95">
                    + Módulo
                  </button>
                  <button type="button" onClick={() => handleDeleteCourse(course.id)} className="p-3 text-zinc-600 hover:text-red-500 bg-zinc-900 rounded-lg border border-white/5 hover:border-red-600 transition-all active:scale-95">
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>

              {/* LISTA DE MÓDULOS */}
              <AnimatePresence>
                {expandedCourses.has(course.id) && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-zinc-900/20 border-t border-white/5">
                    <div className="p-8 space-y-4">
                      {course.modules?.map((mod: any) => (
                         <div key={mod.id} className="bg-black border border-white/5 rounded-2xl p-5 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <Box size={20} className="text-zinc-500"/>
                                <span className="font-black text-sm text-zinc-300 uppercase tracking-wide">{mod.title}</span>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => handleDeleteModule(mod.id)} 
                                className="text-zinc-600 hover:text-red-500 p-2 border border-transparent hover:border-red-600/30 rounded-lg transition-all"
                                title="Borrar Módulo"
                            >
                                <Trash2 size={16}/>
                            </button>
                         </div>
                      ))}
                      {!course.modules?.length && (
                          <div className="text-center text-xs text-zinc-600 uppercase font-black tracking-widest py-4">
                              No hay módulos aún
                          </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6">
            <div className="bg-zinc-900 p-12 rounded-[3rem] w-full max-w-lg border border-white/10 relative">
                <button onClick={() => setShowCreateModal(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white"><X/></button>
                <h2 className="text-3xl font-black italic uppercase mb-8">Crear Master</h2>
                <input autoFocus type="text" onChange={e => setNewCourseData({title: e.target.value})} className="w-full bg-black border border-white/10 p-6 rounded-2xl text-white font-bold outline-none focus:border-red-600 mb-6" placeholder="TÍTULO..."/>
                <button onClick={handleCreateCourse} className="w-full bg-red-600 py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-red-700">Lanzar</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;