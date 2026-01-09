
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Edit3, ChevronLeft, Save, Users, BookOpen, LogOut, X, Video, FileText, Loader2, Link as LinkIcon, PlusCircle, AlertTriangle, Database
} from 'lucide-react';
import { Module, Lesson } from '../types';
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
  
  // Estados para creación inline
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [addingLessonToModule, setAddingLessonToModule] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchContent();
  }, []);

  useEffect(() => {
    if (isAddingModule && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingModule]);

  async function fetchContent() {
    console.log('--- ADMIN: Sincronizando datos con Supabase ---');
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
      console.log('--- ADMIN: Datos cargados ---', sortedData.length, 'módulos encontrados');
    } catch (err: any) {
      console.error("Error en fetchContent:", err);
      setLastError(`Error de conexión: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateModule = async () => {
    console.log('--- ACCIÓN: Iniciando creación de módulo ---');
    
    // 1. Verificar sesión activa
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Usuario actual:", session?.user);

    if (!session) {
      alert("❌ ERROR: No hay una sesión activa. Por favor, cierra sesión y vuelve a entrar.");
      setIsAddingModule(false);
      return;
    }

    if (!newModuleTitle.trim()) {
      setIsAddingModule(false);
      return;
    }

    setIsProcessing(true);
    try {
      // 2. Intentamos obtener el ID de un curso existente por si la tabla lo requiere (Foreign Key)
      const { data: courses, error: courseError } = await supabase.from('courses').select('id').limit(1);
      
      if (courseError) {
        console.warn("No se pudo verificar la tabla de cursos:", courseError);
      }

      const courseId = courses && courses.length > 0 ? courses[0].id : null;

      // 3. Construir payload SIN campo 'id' (Supabase lo genera solo con gen_random_uuid())
      const payload: any = { 
        title: newModuleTitle.trim(), 
        order_index: modules.length
      };

      if (courseId) {
        payload.course_id = courseId;
      }

      console.log('--- SUPABASE INSERT PAYLOAD ---', payload);

      // 4. Inserción
      const { data, error } = await supabase
        .from('modules')
        .insert(payload)
        .select();

      if (error) {
        console.error("--- ERROR AL INSERTAR MÓDULO ---", error);
        alert(`❌ ERROR DE SUPABASE:\n\nCódigo: ${error.code}\nMensaje: ${error.message}\n\nDetalles: ${error.details || 'Sin detalles'}`);
        throw error;
      }

      console.log('--- ÉXITO: Módulo creado ---', data);
      
      // 5. Limpiar y refrescar
      setNewModuleTitle('');
      setIsAddingModule(false);
      await fetchContent();
      
    } catch (err: any) {
      console.error("Excepción crítica en handleCreateModule:", err);
      // No necesitamos alert aquí porque el error de Supabase ya lo lanza arriba
    } finally {
      // 6. IMPORTANTE: Resetear siempre el estado de carga para evitar bloqueo infinito
      setIsProcessing(false);
      console.log('--- ACCIÓN FINALIZADA ---');
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

      // SIN campo ID manual
      const payload = { 
        module_id: moduleId, 
        title: newLessonTitle.trim(), 
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        description: '### Nueva Clase\nEscribe aquí el contenido educativo.',
        duration: '10:00',
        resources: [],
        order_index: nextIndex
      };

      const { error } = await supabase.from('lessons').insert(payload);

      if (error) {
        alert(`❌ ERROR AL CREAR LECCIÓN: ${error.message}`);
        throw error;
      }

      setNewLessonTitle('');
      setAddingLessonToModule(null);
      await fetchContent();
    } catch (err: any) {
      console.error(err);
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
        duration: editingLesson.duration,
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
          <button onClick={() => setActiveTab('users')} className={`px-10 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] border transition-all ${activeTab === 'users' ? 'bg-white text-black border-white shadow-2xl shadow-white/5' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>
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
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Duración (Ej: 15:00)</label>
                        <input type="text" value={editingLesson.duration} onChange={(e) => setEditingLesson({...editingLesson, duration: e.target.value})} className="w-full bg-black border border-white/5 rounded-3xl p-5 font-bold text-sm focus:border-red-600 outline-none text-gray-200" />
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
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[4rem] p-24 text-center shadow-2xl">
            <Users size={80} className="text-red-600 mx-auto mb-10" />
            <h2 className="text-4xl font-black mb-6 uppercase tracking-tighter italic">EZEH <span className="text-red-600">AUTH</span> CONTROL</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm font-medium leading-relaxed mb-16 px-4">
              Gestiona los privilegios de tus alumnos directamente desde el panel de autenticación de Supabase para máxima seguridad.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { label: 'Módulos Totales', val: modules.length },
                { label: 'Status Sistema', val: 'Online' },
                { label: 'Nivel Acceso', val: 'Full Admin' }
              ].map((stat, i) => (
                <div key={i} className="p-10 bg-black/40 border border-white/5 rounded-[2.5rem]">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3">{stat.label}</p>
                  <p className="text-4xl font-black text-white tracking-tighter">{stat.val}</p>
                </div>
              ))}
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
