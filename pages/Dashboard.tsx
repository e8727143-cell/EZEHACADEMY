
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, CheckCircle, Menu, X, ChevronDown, FileText, LogOut, Settings, Clock, ExternalLink, AlertCircle, RefreshCw
} from 'lucide-react';
import { User, Module, Lesson } from '../types.ts';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import { supabase } from '../lib/supabase.ts';
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
  const [videoKey, setVideoKey] = useState(0);
  const playerRef = useRef<any>(null);

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
        setExpandedModules([data[0].id]);
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

  const formatYoutubeUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url?.match(regExp);
    if (match && match[2].length === 11) {
      const videoId = match[2];
      const origin = encodeURIComponent(window.location.origin);
      return `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${origin}&rel=0&modestbranding=1`;
    }
    return url;
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-xl transition-all"><Menu size={20} /></button>
          <div className="text-2xl font-black italic tracking-tighter"><span className="text-red-600">EZEH</span> ACADEMY</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:block text-right">
            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Progreso: {progressPercent}%</p>
            <div className="w-32 h-1 bg-white/5 rounded-full mt-1 overflow-hidden"><div className="h-full bg-red-600 transition-all duration-1000" style={{ width: `${progressPercent}%` }} /></div>
          </div>
          <button onClick={onLogout} className="text-gray-500 hover:text-red-600 transition-colors"><LogOut size={18}/></button>
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-black">{user.fullName.charAt(0)}</div>
        </div>
      </nav>

      <div className="flex flex-1 pt-[72px] h-screen overflow-hidden">
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside initial={{ x: -350 }} animate={{ x: 0 }} exit={{ x: -350 }} className="w-[350px] bg-[#080808] border-r border-white/5 overflow-y-auto custom-scrollbar p-6">
              <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-6">Contenido</h2>
              {modules.map((mod, i) => (
                <div key={mod.id} className="mb-4">
                  <div className="text-[9px] font-black text-red-600 uppercase mb-1">MÓDULO {i + 1}</div>
                  <h3 className="text-sm font-black uppercase tracking-tighter mb-2">{mod.title}</h3>
                  <div className="space-y-1">
                    {mod.lessons?.map(l => (
                      <button key={l.id} onClick={() => setActiveLesson(l)} className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${activeLesson?.id === l.id ? 'bg-red-600 text-white shadow-xl shadow-red-600/10' : 'text-gray-500 hover:bg-white/5'}`}>
                        {progress.includes(l.id) ? <CheckCircle size={14} className="text-green-500"/> : <Play size={12}/>}
                        <span className="truncate">{l.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.aside>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto bg-[#050505] p-6 lg:p-12 custom-scrollbar">
          {activeLesson ? (
            <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
              <div className="aspect-video bg-black rounded-[2.5rem] overflow-hidden border border-white/5 mb-10 shadow-2xl relative group">
                {!videoError ? (
                  <ReactPlayer key={videoKey} url={formatYoutubeUrl(activeLesson.video_url)} width="100%" height="100%" controls playing={false} onError={() => setVideoError(true)} config={{ youtube: { playerVars: { origin: window.location.origin } } }} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10">
                    <AlertCircle size={48} className="text-red-600 mb-4 opacity-50" />
                    <h2 className="text-lg font-black uppercase mb-4">Error de Reproducción</h2>
                    <button onClick={() => setVideoKey(k => k + 1)} className="bg-white text-black px-6 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-red-600 hover:text-white transition-all"><RefreshCw size={14} className="inline mr-2"/> Reintentar</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                  <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-6">{activeLesson.title}</h1>
                  <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: htmlDescription }} />
                </div>
                <div className="space-y-6">
                  <button onClick={() => onToggleProgress(activeLesson.id)} className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${progress.includes(activeLesson.id) ? 'bg-green-600/10 text-green-500 border border-green-600/20' : 'bg-white text-black hover:bg-red-600 hover:text-white'}`}>
                    {progress.includes(activeLesson.id) ? 'Completado ✓' : 'Marcar como Visto'}
                  </button>
                  <div className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem]">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Recursos</h3>
                    {activeLesson.resources?.map((r, i) => (
                      <a key={i} href={r.url} className="flex items-center justify-between p-4 bg-black/40 rounded-xl mb-2 hover:bg-red-600 group transition-all">
                        <span className="text-[10px] font-bold uppercase truncate pr-4">{r.name}</span>
                        <ExternalLink size={12} className="text-gray-600 group-hover:text-white" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse"><Play className="opacity-20 ml-1" /></div>
              <h3 className="text-xl font-black uppercase tracking-widest italic">Selecciona una clase</h3>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
