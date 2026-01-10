import React, { useState, useEffect } from 'react';
import { 
  Trash2, LogOut, ChevronDown, Layout, Box, Video, X, Plus, FileText, Link as LinkIcon, Save, PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const AdminPage = ({ onLogout }: { onLogout: () => void }) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  
  // --- ESTADOS DE LOS MODALES (VENTANAS EMERGENTES) ---
  const [modalType, setModalType] = useState<'NONE' | 'COURSE' | 'MODULE' | 'LESSON'>('NONE');
  
  // Datos temporales para crear cosas
  const [tempId, setTempId] = useState<string>(''); // Guarda el ID del padre (Curso o Módulo)
  const [inputTitle, setInputTitle] = useState(''); // Para títulos simples
  
  // Datos complejos para la Lección
  const [lessonData, setLessonData] = useState({ 
    title: '', video_url: '', description: '', resources: '' 
  });

  const [notification, setNotification] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules(*, lessons(*))') 
      .order('created_at', { ascending: false });

    if (!error && data) {
      const sorted = data.map(c => ({
        ...c,
        modules: c.modules?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((m: any) => ({
             ...m,
             lessons: m.lessons?.sort((x: any, y: any) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime())
          }))
      }));
      setCourses(sorted);
    }
    setLoading(false);
  }

  // --- APERTURA DE MODALES (SIN PROMPTS) ---

  const openCreateCourse = () => {
    setModalType('COURSE');
    setInputTitle('');
  };

  const openCreateModule = (courseId: string) => {
    setTempId(courseId);
    setModalType('MODULE');
    setInputTitle('');
  };

  const openCreateLesson = (moduleId: string) => {
    setTempId(moduleId);
    setModalType('LESSON');
    setLessonData({ title: '', video_url: '', description: '', resources: '' });
  };

  const closeModal = () => {
    setModalType('NONE');
    setTempId('');
    setInputTitle('');
  };

  // --- EJECUCIÓN DE ACCIONES (SUBMIT) ---

  const submitCreateCourse = async () => {
    if (!inputTitle.trim()) return;
    const { error } = await supabase.from('courses').insert([{ title: inputTitle }]);
    if (!error) {
      closeModal();
      fetchData();
      showNotify('success', 'MASTER CREADO');
    } else alert(error.message);
  };

  const submitCreateModule = async () => {
    if (!inputTitle.trim()) return;
    const { error } = await supabase.from('modules').insert([{ title: inputTitle, course_id: tempId }]);
    if (!error) {
      closeModal();
      fetchData();
      showNotify('success', 'MÓDULO CREADO');
    } else alert(error.message);
  };

  const submitCreateLesson = async () => {
    if (!lessonData.title.trim()) return alert("El título es obligatorio");
    const { error } = await supabase.from('lessons').insert([{ 
      title: lessonData.title, 
      module_id: tempId,
      video_url: lessonData.video_url,
      description: lessonData.description,
      resources: lessonData.resources
    }]);

    if (!error) {
      closeModal();
      fetchData();
      showNotify('success', 'CLASE GUARDADA');
    } else alert(error.message);
  };

  // --- ACCIONES DE BORRADO ---
  const handleDelete = async (table: 'courses'|'modules'|'lessons', id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar esto?")) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) {
      if (table === 'courses') setCourses(prev => prev.filter(c => c.id !== id));
      else fetchData();
      showNotify('success', 'ELIMINADO CORRECTAMENTE');
    } else alert(error.message);
  };

  // --- UTILS ---
  const toggleCourse = (id: string) => {
    const next = new Set(expandedCourses);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedCourses(next);
  };

  const showNotify = (type: 'success'|'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-red-600 font-bold uppercase tracking-widest">Cargando Panel...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-8 selection:bg-red-600 selection:text-white">
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-zinc-800 border border-red-600/50 px-6 py-3 rounded-xl font-bold shadow-2xl flex items-center gap-2">
             <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"/> {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto pb-40">
        <nav className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
            <h1 className="text-3xl font-black italic tracking-tighter">EZEH <span className="text-red-600">ADMIN</span></h1>
            <button onClick={onLogout} className="text-zinc-600 hover:text-white transition-colors"><LogOut/></button>
        </nav>

        <div className="mb-10 text-right">
            <button onClick={openCreateCourse} className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-[1.5rem] font-black uppercase tracking-widest shadow-lg shadow-red-900/20 active:scale-95 transition-all flex items-center gap-2 ml-auto">
                <PlusCircle size={20}/> Nuevo Master
            </button>
        </div>

        <div className="space-y-8">
          {courses.map((course) => (
            <div key={course.id} className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
              
              {/* CABECERA CURSO */}
              <div className="p-8 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                <div 
                  className="flex items-center gap-6 cursor-pointer group select-none flex-1"
                  onClick={() => toggleCourse(course.id)}
                >
                    <div className="w-14 h-14 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all border border-red-600/10">
                        {expandedCourses.has(course.id) ? <ChevronDown/> : <Layout/>}
                    </div>
                    <div>
                        <h3 className="font-black text-xl uppercase italic group-hover:text-red-500 transition-colors tracking-tight">{course.title}</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                           {course.modules?.length || 0} Módulos
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 pl-6 border-l border-white/5">
                  <button type="button" onClick={() => openCreateModule(course.id)} className="bg-white text-black px-5 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-zinc-200 transition-all shadow-lg active:scale-95 tracking-wide">
                    + Módulo
                  </button>
                  <button type="button" onClick={() => handleDelete('courses', course.id)} className="p-3 text-zinc-600 hover:text-red-500 bg-zinc-900 rounded-xl border border-white/5 hover:border-red-600/50 transition-all active:scale-95">
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
                         <div key={mod.id} className="bg-black border border-white/5 rounded-3xl overflow-hidden">
                            {/* CABECERA MÓDULO */}
                            <div className="p-5 flex justify-between items-center bg-white/[0.02] border-b border-white/5">
                                <div className="flex items-center gap-4">
                                    <Box size={18} className="text-zinc-500"/>
                                    <span className="font-black text-sm text-zinc-300 uppercase tracking-wide">{mod.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => openCreateLesson(mod.id)} 
                                        className="text-[9px] bg-red-600/10 text-red-500 px-4 py-2 rounded-lg border border-red-600/20 hover:bg-red-600 hover:text-white transition-all font-black uppercase flex items-center gap-2"
                                    >
                                        <Plus size={10}/> Clase
                                    </button>
                                    <button onClick={() => handleDelete('modules', mod.id)} className="text-zinc-600 hover:text-red-500 p-2 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </div>

                            {/* LISTA DE CLASES */}
                            <div className="p-2 bg-[#050505]">
                                {mod.lessons?.map((l: any) => (
                                    <div key={l.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-zinc-900 rounded-lg text-zinc-600 group-hover:text-red-500 transition-colors">
                                                <Video size={14}/>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase block transition-colors">{l.title}</span>
                                                {l.video_url && <span className="text-[9px] text-zinc-600 flex items-center gap-1 mt-1"><LinkIcon size={8}/> Video Adjunto</span>}
                                            </div>
                                        </div>
                                        <button onClick={() => handleDelete('lessons', l.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 p-2 transition-all"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                                {!mod.lessons?.length && <div className="text-[9px] text-zinc-700 text-center py-4 uppercase font-bold tracking-widest opacity-50">Módulo sin contenido</div>}
                            </div>
                         </div>
                      ))}
                      {!course.modules?.length && <div className="text-center text-xs text-zinc-600 uppercase font-black tracking-widest py-4 border-2 border-dashed border-white/5 rounded-2xl">Añade el primer módulo</div>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* ================= MODALES ================= */}

      {/* 1. MODAL CREAR CURSO */}
      {modalType === 'COURSE' && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-[#0f0f0f] p-10 rounded-[3rem] w-full max-w-lg border border-white/10 relative shadow-2xl">
                <button onClick={closeModal} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X/></button>
                <h2 className="text-3xl font-black italic uppercase mb-8">Nuevo <span className="text-red-600">Master</span></h2>
                <input autoFocus type="text" onChange={e => setInputTitle(e.target.value)} className="w-full bg-black border border-white/10 p-6 rounded-2xl text-white font-bold outline-none focus:border-red-600 mb-6 placeholder:text-zinc-800 transition-colors" placeholder="NOMBRE DEL MASTER..."/>
                <button onClick={submitCreateCourse} className="w-full bg-red-600 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all">Crear Estructura</button>
            </div>
        </div>
      )}

      {/* 2. MODAL CREAR MÓDULO */}
      {modalType === 'MODULE' && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-[#0f0f0f] p-10 rounded-[3rem] w-full max-w-lg border border-white/10 relative shadow-2xl">
                <button onClick={closeModal} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X/></button>
                <h2 className="text-2xl font-black italic uppercase mb-8 flex items-center gap-3"><Box className="text-red-600"/> Nuevo Módulo</h2>
                <input autoFocus type="text" onChange={e => setInputTitle(e.target.value)} className="w-full bg-black border border-white/10 p-6 rounded-2xl text-white font-bold outline-none focus:border-red-600 mb-6 placeholder:text-zinc-800 transition-colors" placeholder="NOMBRE DEL MÓDULO..."/>
                <button onClick={submitCreateModule} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-all">Añadir Módulo</button>
            </div>
        </div>
      )}

      {/* 3. MODAL CREAR CLASE (EDITOR) */}
      {modalType === 'LESSON' && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-[#0f0f0f] w-full max-w-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-900/30">
                    <h2 className="text-2xl font-black uppercase italic flex items-center gap-3 text-white">
                        <Video className="text-red-600"/> Nueva <span className="text-red-600">Lección</span>
                    </h2>
                    <button onClick={closeModal} className="p-2 bg-white/5 rounded-full hover:bg-red-600 hover:text-white transition-all"><X size={20}/></button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Título</label>
                        <input autoFocus type="text" value={lessonData.title} onChange={e => setLessonData({...lessonData, title: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-bold focus:border-red-600 outline-none transition-all placeholder:text-zinc-800" placeholder="Ej: Estrategia de Ventas..."/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Video URL (Drive/YouTube)</label>
                        <div className="relative">
                            <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"/>
                            <input type="text" value={lessonData.video_url} onChange={e => setLessonData({...lessonData, video_url: e.target.value})} className="w-full bg-black border border-white/10 p-4 pl-12 rounded-xl text-zinc-300 focus:border-red-600 outline-none transition-all font-mono text-sm" placeholder="https://..."/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Descripción</label>
                        <textarea value={lessonData.description} onChange={e => setLessonData({...lessonData, description: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-zinc-400 focus:border-red-600 outline-none transition-all min-h-[100px] resize-none" placeholder="Resumen..."/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Recursos (Links)</label>
                        <div className="relative">
                            <FileText size={16} className="absolute left-4 top-4 text-zinc-600"/>
                            <textarea value={lessonData.resources} onChange={e => setLessonData({...lessonData, resources: e.target.value})} className="w-full bg-black border border-white/10 p-4 pl-12 rounded-xl text-zinc-400 focus:border-red-600 outline-none transition-all min-h-[80px]" placeholder="Pegar enlaces aquí..."/>
                        </div>
                    </div>
                </div>
                <div className="p-8 pt-0 bg-gradient-to-t from-[#0f0f0f] to-transparent">
                    <button onClick={submitCreateLesson} className="w-full bg-red-600 py-5 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-3 active:scale-95 text-white">
                        <Save size={20}/> Guardar Lección
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;