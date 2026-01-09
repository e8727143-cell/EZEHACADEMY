
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Edit3, ChevronLeft, Save, Users, BookOpen, LogOut, X, Video, FileText, Loader2, AlertTriangle, Database, ShieldCheck, Globe, Mail, Calendar, User as UserIcon
} from 'lucide-react';
import { Module, Lesson, User } from '../types';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface AdminProps {
  onLogout: () => void;
}

const Admin: React.FC<AdminProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'content' | 'users'>('content');
  const [modules, setModules] = useState<Module[]>([]);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Estadísticas de Usuarios
  const [students, setStudents] = useState<User[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  
  // Estados para creación inline
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [addingLessonToModule, setAddingLessonToModule] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchContent();
    fetchUserList();

    // 1. Monitoreo REAL-TIME de la base de datos (Nuevos registros)
    const dbChannel = supabase
      .channel('admin-profiles-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUserList();
      })
      .subscribe();

    // 2. Monitoreo REAL-TIME de Presencia (Online/Offline instantáneo)
    const presenceChannel = supabase.channel('online-users');

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const activeIds = new Set<string>();
        
        Object.keys(state).forEach((key) => {
          activeIds.add(key);
        });
        
        setOnlineUserIds(activeIds);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  useEffect(() => {
    if (isAddingModule && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingModule]);

  const isUserOnline = (userId: string) => {
    return onlineUserIds.has(userId);
  };

  async function fetchUserList() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mappedStudents = (data || []).map((p: any) => ({
        id: p.id,
        fullName: p.full_name || 'Sin nombre',
        email: p.email || 'S/E',
        role: p.role || 'student',
        last_seen: p.last_seen,
        created_at: p.created_at,
        progress: []
      })) as User[];

      setStudents(mappedStudents);
      setTotalStudents(mappedStudents.length);
    } catch (err) {
      console.error("Error fetching user stats:", err);
    }
  }

  async function fetchContent() {
    setLoading(true);
    setLastError(null);
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*, lessons(*)')
        .order('order_index');
      
      if (error) throw error;
      
      const sortedData = (data || []).map(mod => ({
        ...mod,
        lessons: (mod.lessons || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
      }));

      setModules(sortedData);
    } catch (err: any) {
      console.error("Error en fetchContent:", err);
      setLastError(`Error de conexión: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateModule = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("❌ ERROR: No hay una sesión activa.");
      setIsAddingModule(false);
      return;
    }

    if (!newModuleTitle.trim()) {
      setIsAddingModule(false);
      return;
    }

    setIsProcessing(true);
    try {
      const { data: courses } = await supabase.from('courses').select('id').limit(1);
      const courseId = courses && courses.length > 0 ? courses[0].id : null;

      const payload: any = { 
        title: newModuleTitle.trim(), 
        order_index: modules.length
      };

      if (courseId) payload.course_id = courseId;

      const { error } = await supabase.from('modules').insert(payload);
      if (error) throw error;
      
      setNewModuleTitle('');
      setIsAddingModule(false);
      await fetchContent();
    } catch (err: any) {
      alert(`❌ ERROR: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateLesson = async (moduleId: string) => {
    if (!newLessonTitle.trim()) {
      setAddingLessonToModule(null);
      return;
    }

    setIsProcessing(true);
    try {
      const targetModule = modules.find(m => m.id === moduleId);
      const nextIndex = targetModule?.lessons?.length || 0;

      const payload = { 
        module_id: moduleId, 
        title: newLessonTitle.trim(), 
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        description: '### Nueva Clase\nEscribe aquí el contenido educativo.',
        duration: '00:00',
        resources: [],
        order_index: nextIndex
      };

      const { error } = await supabase.from('lessons').insert(payload);
      if (error) throw error;

      setNewLessonTitle('');
      setAddingLessonToModule(null);
      await fetchContent();
    } catch (err: any) {
      alert(`❌ ERROR: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveLessonChanges = async () => {
    if (!editingLesson) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('lessons').update({
        title: editingLesson.title,
        video_url: editingLesson.video_url,
        description: editingLesson.description,
        resources: editingLesson.resources
      }).eq('id', editingLesson.id);

      if (error) throw error;
      alert("✅ Sincronizado correctamente");
      await fetchContent();
    } catch (err: any) {
      alert("❌ Error al guardar: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteModule = async (id: string) => {
    if (!window.confirm('¿Eliminar módulo y todo su contenido?')) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (error) throw error;
      fetchContent();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 font-sans">
      <nav className="border-b border-white/5 px-8 py-5 flex justify-between items-center bg-black/90 sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest">
            <ChevronLeft size={16}/> Volver al Master
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <h1 className="text-xl font-black tracking-tighter uppercase italic">EZEH <span className="text-red-600">ADMIN</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isProcessing ? 'border-red-600/50 bg-red-600/5' : 'border-white/5 bg-white/5'}`}>
             {isProcessing ? <Loader2 className="animate-spin text-red-600" size={14} /> : <div className="w-2 h-2 bg-green-500 rounded-full" />}
             <span className="text-[9px] font-black uppercase text-gray-500">{isProcessing ? 'Sincronizando' : 'Cloud Online'}</span>
          </div>
          <button onClick={onLogout} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><LogOut size={20}/></button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 lg:p-12 pb-40">
        <div className="flex gap-4 mb-12">
          <button onClick={() => setActiveTab('content')} className={`px-10 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] border transition-all ${activeTab === 'content' ? 'bg-white text-black border-white shadow-2xl shadow-white/5' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>
            <BookOpen size={16} className="inline mr-3"/> Gestión de Contenido
          </button>
          <button onClick={() => { setActiveTab('users'); fetchUserList(); }} className={`px-10 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] border transition-all ${activeTab === 'users' ? 'bg-white text-black border-white shadow-2xl shadow-white/5' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>
            <Users size={16} className="inline mr-3"/> Alumnos y Acceso
          </button>
        </div>

        {lastError && (
          <div className="mb-8 p-6 bg-red-600/10 border border-red-600/20 rounded-3xl flex items-center gap-4 text-red-500">
            <AlertTriangle className="flex-shrink-0" />
            <div className="flex-1 text-xs font-bold uppercase tracking-widest">{lastError}</div>
            <button onClick={fetchContent} className="px-4 py-2 bg-red-600 text-white text-[10px] font-black rounded-xl">Reintentar</button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <Loader2 className="animate-spin text-red-600" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-600 animate-pulse">Conectando con EZEH Cloud...</p>
          </div>
        ) : activeTab === 'content' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* PANEL DE MÓDULOS */}
            <div className="lg:col-span-4 space-y-6">
              <div className="flex justify-between items-center px-4">
                <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Jerarquía del Curso</h2>
                <button 
                  onClick={() => setIsAddingModule(true)}
                  disabled={isProcessing}
                  className="p-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50"
                >
                  <Plus size={24}/>
                </button>
              </div>
              
              <div className="space-y-4">
                {isAddingModule && (
                  <div className="bg-[#111] border-2 border-red-600/50 rounded-[2.5rem] p-6 animate-in fade-in zoom-in duration-200 shadow-2xl">
                    <label className="text-[8px] font-black text-red-600 uppercase mb-2 block tracking-widest">Nuevo Módulo</label>
                    <input 
                      ref={inputRef}
                      type="text" 
                      placeholder="Ej: Fundamentos de React"
                      className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs font-bold outline-none focus:border-red-600 mb-4 transition-all"
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      disabled={isProcessing}
                    />
                    <div className="flex gap-3">
                      <button 
                        onClick={handleCreateModule} 
                        disabled={isProcessing || !newModuleTitle.trim()}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-[10px] font-black uppercase py-3 rounded-xl transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                      >
                        {isProcessing ? <Loader2 className="animate-spin" size={14}/> : 'Confirmar'}
                      </button>
                      <button 
                        onClick={() => setIsAddingModule(false)} 
                        disabled={isProcessing}
                        className="px-6 bg-white/5 text-[10px] font-black uppercase rounded-xl hover:bg-white/10 disabled:opacity-30"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {modules.length === 0 && !isAddingModule && (
                  <div className="p-20 border-2 border-dashed border-white/5 rounded-[3rem] text-center opacity-20">
                    <Database size={40} className="mx-auto mb-4" />
                    <p className="text-[9px] font-black uppercase tracking-widest leading-loose">Base de Datos vacía<br/>Crea tu primer módulo</p>
                  </div>
                )}

                {modules.map((mod, mIdx) => (
                  <div key={mod.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-white/10 transition-colors shadow-2xl">
                    <div className="p-5 flex justify-between bg-white/[0.01] border-b border-white/5 items-center">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-red-600 uppercase tracking-widest mb-0.5">MOD {mIdx + 1}</span>
                        <span className="font-black text-[11px] uppercase tracking-tighter text-gray-300">{mod.title}</span>
                      </div>
                      <button onClick={() => deleteModule(mod.id)} className="text-gray-800 hover:text-red-500 transition-colors p-2"><Trash2 size={16}/></button>
                    </div>
                    <div className="p-4 space-y-2">
                      {mod.lessons?.map(l => (
                        <button key={l.id} onClick={() => setEditingLesson(l)} className={`w-full flex justify-between items-center p-4 rounded-2xl border text-[11px] font-bold transition-all ${editingLesson?.id === l.id ? 'bg-red-600 text-white border-red-600 shadow-xl' : 'bg-black/40 border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                          <span className="truncate pr-4 uppercase tracking-tighter">{l.title}</span>
                          <Edit3 size={14} className={editingLesson?.id === l.id ? 'opacity-100' : 'opacity-30'}/>
                        </button>
                      ))}
                      
                      {addingLessonToModule === mod.id ? (
                        <div className="p-2 space-y-2 animate-in slide-in-from-top-1">
                          <input 
                            autoFocus
                            type="text" 
                            placeholder="Nombre lección..."
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none focus:border-red-600"
                            value={newLessonTitle}
                            onChange={(e) => setNewLessonTitle(e.target.value)}
                            disabled={isProcessing}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleCreateLesson(mod.id)} disabled={isProcessing} className="flex-1 bg-red-600 text-[9px] font-black uppercase py-2 rounded-lg flex items-center justify-center">
                              {isProcessing ? <Loader2 className="animate-spin" size={12}/> : 'Crear'}
                            </button>
                            <button onClick={() => setAddingLessonToModule(null)} disabled={isProcessing} className="px-3 bg-white/5 text-[9px] font-black uppercase rounded-lg">X</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setAddingLessonToModule(mod.id)} disabled={isProcessing} className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-[9px] font-black uppercase text-gray-700 hover:text-red-600 hover:border-red-600/20 transition-all">+ Nueva Clase</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EDITOR DE LECCIÓN */}
            <div className="lg:col-span-8">
              {editingLesson ? (
                <div className="bg-[#0a0a0a] border border-white/5 rounded-[3.5rem] p-8 lg:p-12 space-y-12 shadow-2xl relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Estudio de Producción</span>
                      </div>
                      <h2 className="text-4xl font-black tracking-tighter uppercase italic">EZEH<span className="text-red-600">STUDIO</span></h2>
                    </div>
                    <button onClick={() => setEditingLesson(null)} className="p-4 bg-white/5 hover:bg-red-600 hover:text-white rounded-full transition-all text-gray-600"><X size={20}/></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Título de la Clase</label>
                        <input type="text" value={editingLesson.title} onChange={(e) => setEditingLesson({...editingLesson, title: e.target.value})} className="w-full bg-black border border-white/5 rounded-3xl p-5 font-bold focus:border-red-600 outline-none text-sm text-gray-200" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Video (YouTube/Vimeo URL)</label>
                        <input type="text" value={editingLesson.video_url} onChange={(e) => setEditingLesson({...editingLesson, video_url: e.target.value})} className="w-full bg-black border border-white/5 rounded-3xl p-5 text-xs font-mono text-gray-500 focus:border-red-600 outline-none" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Materiales del Alumno</label>
                        <div className="bg-black/80 border border-white/5 rounded-[2rem] p-6 space-y-3 min-h-[120px]">
                          {editingLesson.resources?.map((res, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                              <span className="text-[10px] font-black truncate uppercase text-white">{res.name}</span>
                              <button onClick={() => {
                                const nr = [...editingLesson.resources];
                                nr.splice(idx, 1);
                                setEditingLesson({...editingLesson, resources: nr});
                              }} className="text-gray-700 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                          ))}
                          <button onClick={() => {
                            const name = prompt('Nombre:');
                            const url = prompt('URL:');
                            if(name && url) setEditingLesson({...editingLesson, resources: [...(editingLesson.resources || []), {name, url}]});
                          }} className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all">+ Añadir Archivo</button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Descripción (Markdown)</label>
                      <textarea value={editingLesson.description} onChange={(e) => setEditingLesson({...editingLesson, description: e.target.value})} className="w-full bg-black border border-white/5 rounded-[2.5rem] p-8 text-sm text-gray-400 font-mono resize-none focus:border-red-600 outline-none h-[560px] custom-scrollbar leading-relaxed" />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 pt-10 border-t border-white/5">
                    <button onClick={saveLessonChanges} disabled={isProcessing} className="flex-[2] bg-red-600 hover:bg-red-700 text-white py-6 rounded-[1.8rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50">
                      {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Save size={20}/>} Guardar Cambios en la Nube
                    </button>
                    <button onClick={() => { if(confirm('¿Borrar lección?')) supabase.from('lessons').delete().eq('id', editingLesson.id).then(() => { setEditingLesson(null); fetchContent(); }) }} className="flex-1 border border-red-600/30 text-red-600 px-8 py-6 rounded-[1.8rem] font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all">Eliminar</button>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[700px] border-2 border-dashed border-white/5 rounded-[4.5rem] flex flex-col items-center justify-center text-center p-20 opacity-10">
                  <Video size={80} className="mb-8" />
                  <h3 className="text-2xl font-black uppercase tracking-widest">EZEH STUDIO</h3>
                  <p className="text-sm font-bold max-w-xs mt-4 uppercase tracking-[0.2em] leading-loose">Selecciona una lección para inyectar contenido educativo.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* CARDS DE ESTADÍSTICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-8 bg-[#0a0a0a] border border-white/5 rounded-[3rem] group hover:border-red-600/20 transition-all hover:bg-red-600/[0.02] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 blur-3xl rounded-full" />
                <div className="flex justify-between items-start mb-4">
                  <ShieldCheck size={28} className="text-red-600" />
                </div>
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Total Alumnos</p>
                <p className="text-5xl font-black text-white tracking-tighter">{totalStudents}</p>
              </div>

              <div className="p-8 bg-[#0a0a0a] border border-white/5 rounded-[3rem] group hover:border-green-600/20 transition-all hover:bg-green-600/[0.02] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-600/5 blur-3xl rounded-full" />
                <div className="flex justify-between items-start mb-4">
                  <div className="relative">
                     <div className="absolute w-2 h-2 bg-green-500 rounded-full animate-ping" />
                     <Globe size={28} className="text-green-500" />
                  </div>
                </div>
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Alumnos Online</p>
                <p className="text-5xl font-black text-green-500 tracking-tighter">{onlineUserIds.size}</p>
              </div>

              <div className="p-8 bg-[#0a0a0a] border border-white/5 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <BookOpen size={28} className="text-gray-700" />
                </div>
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Módulos</p>
                <p className="text-5xl font-black text-white tracking-tighter">{modules.length}</p>
              </div>

              <div className="p-8 bg-[#0a0a0a] border border-white/5 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <Database size={28} className="text-gray-700" />
                </div>
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Cloud Engine</p>
                <p className="text-[11px] font-black text-green-500 tracking-[0.2em] mt-8 uppercase italic leading-none">Status: Óptimo</p>
              </div>
            </div>

            {/* LISTADO DE ALUMNOS */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-[4rem] overflow-hidden shadow-2xl">
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <div>
                   <h2 className="text-2xl font-black uppercase tracking-tighter italic">Comunidad <span className="text-red-600">EZEH</span></h2>
                   <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mt-2">Monitoreo Presence API activado</p>
                </div>
                <button 
                  onClick={fetchUserList}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  Refrescar Lista
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-white/5 bg-white/[0.01]">
                    <tr>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Alumno</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Registro</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Última Conexión</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest text-right">Status Live</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {students.map((student) => (
                      <tr key={student.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border border-white/10 shadow-xl ${isUserOnline(student.id) ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500'}`}>
                              {student.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-sm uppercase tracking-tighter text-white">{student.fullName}</p>
                              <p className="text-[10px] font-bold text-gray-600 flex items-center gap-1.5 mt-0.5"><Mail size={10} className="text-red-600" /> {student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-2 text-gray-500 text-[11px] font-bold">
                            <Calendar size={14} className="opacity-40" />
                            {student.created_at ? new Date(student.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-2 text-gray-500 text-[11px] font-bold">
                            <Globe size={14} className="opacity-40" />
                            {student.last_seen ? new Date(student.last_seen).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
                          </div>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className={`inline-flex items-center gap-3 px-5 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest ${isUserOnline(student.id) ? 'border-green-500/20 bg-green-500/5 text-green-500' : 'border-white/5 bg-white/5 text-gray-700'}`}>
                            <div className={`w-2 h-2 rounded-full ${isUserOnline(student.id) ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-800'}`} />
                            {isUserOnline(student.id) ? 'Online' : 'Offline'}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-10 py-20 text-center opacity-20">
                           <UserIcon size={40} className="mx-auto mb-4" />
                           <p className="text-[10px] font-black uppercase tracking-[0.3em]">No hay alumnos registrados</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #050505;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #111;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ef4444;
        }
      `}</style>
    </div>
  );
};

export default Admin;
