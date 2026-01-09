
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, CheckCircle, Menu, X, FileText, LogOut, Clock, ExternalLink, Bookmark
} from 'lucide-react';
import { User, Module, Lesson } from '../types.ts';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import { supabase } from '../lib/supabase.ts';
import VideoPlayer from '../components/VideoPlayer.tsx';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [progress, setProgress] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
    fetchProgress();
  }, []);

  async function fetchContent() {
    const { data } = await supabase.from('modules').select('*, lessons(*)').order('order_index');
    if (data) {
      setModules(data);
      if (data.length > 0 && data[0].lessons?.length > 0) {
        setActiveLesson(data[0].lessons[0]);
      }
    }
    setLoading(false);
  }

  async function fetchProgress() {
    const { data } = await supabase.from('user_progress').select('lesson_id').eq('user_id', user.id);
    if (data) setProgress(data.map((p: any) => p.lesson_id));
  }

  const onToggleProgress = async (lessonId: string) => {
    if (progress.includes(lessonId)) {
      await supabase.from('user_progress').delete().eq('user_id', user.id).eq('lesson_id', lessonId);
      setProgress(prev => prev.filter(id => id !== lessonId));
    } else {
      await supabase.from('user_progress').insert({ user_id: user.id, lesson_id: lessonId });
      setProgress(prev => [...prev, lessonId]);
    }
  };

  const progressPercent = useMemo(() => {
    const total = modules.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0);
    return total > 0 ? Math.round((progress.length / total) * 100) : 0;
  }, [modules, progress]);

  const htmlDescription = useMemo(() => activeLesson ? marked.parse(activeLesson.description || '') : '', [activeLesson]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-red-600 selection:text-white">
      <nav className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-white/10 rounded-xl transition-all">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
            <span className="text-red-600">EZEH</span> ACADEMY
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Progreso de la Maestría</span>
              <span className="text-xs font-bold text-red-500">{progressPercent}%</span>
            </div>
            <div className="w-40 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className="h-full bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <Link to="/admin" className="p-2 text-gray-500 hover:text-white transition-colors"><Bookmark size={20} /></Link>
            )}
            <button onClick={onLogout} className="text-gray-500 hover:text-red-600 transition-colors"><LogOut size={18}/></button>
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-black border border-white/10 shadow-xl">{user.fullName.charAt(0)}</div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 pt-[72px] h-screen overflow-hidden">
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside initial={{ x: -350 }} animate={{ x: 0 }} exit={{ x: -350 }} className="w-full lg:w-[350px] bg-[#080808] border-r border-white/5 overflow-y-auto custom-scrollbar">
              <div className="p-8">
                <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-8">Currículo Digital</h2>
                {modules.map((mod, i) => (
                  <div key={mod.id} className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                       <span className="text-[9px] font-black text-red-600 uppercase bg-red-600/10 px-2 py-0.5 rounded">MOD {i + 1}</span>
                       <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 truncate">{mod.title}</h3>
                    </div>
                    <div className="space-y-1.5">
                      {mod.lessons?.map(l => (
                        <button 
                          key={l.id} 
                          onClick={() => setActiveLesson(l)} 
                          className={`w-full text-left p-4 rounded-2xl text-[11px] font-bold transition-all flex items-center justify-between group ${activeLesson?.id === l.id ? 'bg-red-600 text-white shadow-2xl shadow-red-600/20' : 'text-gray-500 hover:bg-white/5'}`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            {progress.includes(l.id) ? <CheckCircle size={14} className="text-green-500"/> : <Play size={12} className={activeLesson?.id === l.id ? 'text-white' : 'text-gray-700'}/>}
                            <span className="truncate">{l.title}</span>
                          </div>
                          <span className="text-[9px] opacity-40 font-mono group-hover:opacity-100 transition-opacity">{l.duration}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto bg-black p-4 lg:p-12 custom-scrollbar">
          {activeLesson ? (
            <div className="max-w-5xl mx-auto">
              {/* REPRODUCTOR PREMIUM CONFIGURADO PARA LOOK NATIVO */}
              <div className="mb-12">
                <VideoPlayer 
                  url={activeLesson.video_url} 
                  title={activeLesson.title}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-4 mb-4">
                     <span className="bg-red-600 text-[9px] font-black uppercase px-3 py-1 rounded-full">Stream Activo</span>
                     <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> {activeLesson.duration} de contenido</span>
                  </div>
                  <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-10 leading-none">
                    {activeLesson.title}
                  </h1>
                  
                  <div className="prose prose-invert max-w-none prose-p:text-gray-400 prose-headings:text-white prose-strong:text-red-500 leading-relaxed" 
                       dangerouslySetInnerHTML={{ __html: htmlDescription }} />
                </div>

                <div className="space-y-8">
                  <button 
                    onClick={() => onToggleProgress(activeLesson.id)} 
                    className={`w-full py-6 rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-95 ${progress.includes(activeLesson.id) ? 'bg-green-600/10 text-green-500 border border-green-600/20' : 'bg-white text-black hover:bg-red-600 hover:text-white'}`}
                  >
                    {progress.includes(activeLesson.id) ? 'Clase Completada ✓' : 'Marcar como Completado'}
                  </button>

                  <div className="p-10 bg-[#080808] border border-white/5 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-3xl rounded-full" />
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                       <FileText size={16} className="text-red-600" /> Archivos de Clase
                    </h3>
                    <div className="space-y-3">
                      {activeLesson.resources?.map((r, i) => (
                        <a 
                          key={i} 
                          href={r.url} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-2xl text-[11px] font-bold hover:bg-red-600 hover:border-red-600 transition-all group/res"
                        >
                          <span className="truncate uppercase pr-4">{r.name}</span>
                          <ExternalLink size={14} className="text-gray-600 group-hover/res:text-white" />
                        </a>
                      ))}
                      {(!activeLesson.resources || activeLesson.resources.length === 0) && (
                        <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                           <p className="text-[9px] font-black uppercase tracking-widest">Sin recursos adicionales</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20">
               <div className="relative mb-10">
                  <div className="absolute inset-0 bg-red-600/20 blur-3xl rounded-full animate-pulse" />
                  <div className="relative w-32 h-32 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <Play size={48} className="opacity-10 ml-2" />
                  </div>
               </div>
               <h3 className="text-3xl font-black uppercase tracking-[0.5em] italic">EZEH <span className="text-red-600">ACADEMY</span></h3>
               <p className="text-[10px] font-bold text-gray-700 mt-6 uppercase tracking-[0.3em] max-w-sm leading-loose">
                 Selecciona una lección del currículo para comenzar tu inyección de conocimiento digital.
               </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
