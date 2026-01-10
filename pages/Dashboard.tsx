
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, CheckCircle, Menu, X, FileText, LogOut, ExternalLink, Bookmark, Star, RefreshCw, AlertCircle, Check
} from 'lucide-react';
import { User, Module, Lesson, Course } from '../types.ts';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import { supabase } from '../lib/supabase.ts';
import VideoPlayer from '../components/VideoPlayer.tsx';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [progress, setProgress] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      console.log("Dashboard: Fetching data via manual joins...");
      
      // 1. Fetch Course
      const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .limit(1);

      if (courseError) throw courseError;

      if (!courses || courses.length === 0) {
        setCourse(null);
        setLoading(false);
        return;
      }

      const mainCourse = courses[0];

      // 2. Fetch Modules manually (bypass relationship check)
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', mainCourse.id)
        .order('created_at', { ascending: true });

      if (modulesError) throw modulesError;

      // 3. Fetch Lessons manually
      let allLessons: any[] = [];
      if (modules && modules.length > 0) {
        const moduleIds = modules.map((m: any) => m.id);
        const { data: lessons, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .in('module_id', moduleIds)
          .order('created_at', { ascending: true });
          
        if (lessonsError) throw lessonsError;
        allLessons = lessons || [];
      }

      // 4. Reconstruct Hierarchy
      const modulesWithLessons = modules?.map((mod: any) => ({
        ...mod,
        lessons: allLessons.filter((l: any) => l.module_id === mod.id)
      })) || [];

      const fullCourse: Course = {
        ...mainCourse,
        modules: modulesWithLessons
      };

      setCourse(fullCourse);

      // 5. Set Active Lesson
      if (modulesWithLessons.length > 0 && modulesWithLessons[0].lessons.length > 0) {
        setActiveLesson(modulesWithLessons[0].lessons[0]);
      }

      // 6. Fetch Progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('lesson_id')
        .eq('user_id', user.id);

      if (!progressError && progressData) {
        setProgress(progressData.map((p: any) => p.lesson_id));
      }

    } catch (err: any) {
      console.error("DASHBOARD_ERROR:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const onToggleProgress = async (lessonId: string) => {
    try {
      if (progress.includes(lessonId)) {
        // Uncomplete
        const { error } = await supabase.from('user_progress').delete().eq('user_id', user.id).eq('lesson_id', lessonId);
        if (error) throw error;
        setProgress(prev => prev.filter(id => id !== lessonId));
      } else {
        // Complete
        const { error } = await supabase.from('user_progress').insert({ user_id: user.id, lesson_id: lessonId });
        if (error) throw error;
        setProgress(prev => [...prev, lessonId]);
      }
    } catch (e: any) {
      console.error("Progress Error:", e.message);
      // Optional: alert user
    }
  };

  const progressPercent = useMemo(() => {
    if (!course || !course.modules) return 0;
    const allLessons = course.modules.flatMap(m => m.lessons || []);
    if (allLessons.length === 0) return 0;
    return Math.round((progress.length / allLessons.length) * 100);
  }, [course, progress]);

  const htmlDescription = useMemo(() => activeLesson ? marked.parse(activeLesson.description || '') : '', [activeLesson]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(239,68,68,0.3)]" />
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-red-600 animate-pulse italic">Cargando Academia</p>
          <p className="text-gray-600 text-[8px] mt-2 font-bold uppercase tracking-widest">Estableciendo conexión estratégica...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-red-600 font-sans">
      <nav className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/5">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="text-2xl font-black italic tracking-tighter flex items-center gap-2 uppercase select-none">
            <span className="text-red-600">EZEH</span> ACADEMY
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden md:flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Avance del Master</span>
              <span className="text-xs font-bold text-red-500">{progressPercent}%</span>
            </div>
            <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className="h-full bg-red-600 shadow-[0_0_15px_#ef4444]" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <Link to="/admin" className="p-2.5 text-gray-500 hover:text-white transition-all bg-white/5 rounded-xl border border-white/5 hover:border-red-600/30">
                <Bookmark size={20} />
              </Link>
            )}
            <button onClick={onLogout} className="p-2.5 text-gray-500 hover:text-red-600 transition-colors bg-white/5 rounded-xl border border-white/5 hover:border-red-600/30">
              <LogOut size={18}/>
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-black border border-white/20 shadow-2xl shadow-red-600/20">
              {user.fullName?.charAt(0)}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 pt-[72px] h-screen overflow-hidden">
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside initial={{ x: -350, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -350, opacity: 0 }} className="w-full lg:w-[360px] bg-[#080808] border-r border-white/5 overflow-y-auto custom-scrollbar flex-shrink-0">
              <div className="p-8 pb-32">
                {course ? (
                  <>
                    <div className="mb-12">
                      <h2 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mb-4">Currículo del Master</h2>
                      <h1 className="text-sm font-black uppercase italic tracking-tighter text-white leading-tight">{course.title}</h1>
                    </div>

                    {course.modules && course.modules.length > 0 ? (
                      course.modules.map((mod, i) => (
                        <div key={mod.id} className="mb-10">
                          <div className="flex items-center gap-3 mb-4">
                             <span className="text-[8px] font-black text-red-600 uppercase bg-red-600/10 px-2 py-0.5 rounded border border-red-600/20">MOD {i + 1}</span>
                             <h3 className="text-xs font-black uppercase tracking-[0.1em] text-gray-400 truncate">{mod.title}</h3>
                          </div>
                          <div className="space-y-2 ml-1 border-l border-white/5 pl-5 py-1">
                            {mod.lessons && mod.lessons.map(l => (
                              <button 
                                key={l.id} 
                                onClick={() => setActiveLesson(l)} 
                                className={`w-full text-left p-4 rounded-2xl text-[11px] font-bold transition-all flex items-center justify-between group border ${activeLesson?.id === l.id ? 'bg-white/10 text-white border-white/10 shadow-2xl' : 'text-gray-500 hover:bg-white/5 border-transparent'}`}
                              >
                                <span className="uppercase tracking-tighter pr-4 break-words flex-1 leading-normal group-hover:text-white transition-colors">
                                  {l.title}
                                </span>
                                <div 
                                  onClick={(e) => { e.stopPropagation(); onToggleProgress(l.id); }} 
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${progress.includes(l.id) ? 'bg-green-600 text-white shadow-lg shadow-green-600/20 scale-110' : 'bg-white/5 text-white/20 border border-white/10 group-hover:border-white/30'}`}
                                >
                                  {progress.includes(l.id) ? <Check size={14} strokeWidth={3} /> : <CheckCircle size={14} />}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center px-4">
                        <AlertCircle size={32} className="mx-auto text-gray-800 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-700">Contenido en preparación.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-24 text-center">
                    <RefreshCw className="animate-spin mx-auto text-red-600 mb-6" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Cargando formación...</p>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-scroll bg-black p-4 lg:p-12 custom-scrollbar relative">
          {activeLesson ? (
            <div className="max-w-6xl mx-auto pb-40">
              <div className="mb-14 group/player relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-900 rounded-[1.8rem] blur opacity-10 group-hover/player:opacity-20 transition duration-1000"></div>
                <div className="relative">
                   <VideoPlayer url={activeLesson.video_url} title={activeLesson.title} />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-10 mb-12 border-b border-white/5 pb-12">
                <div className="flex-1">
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] mb-3 block">Sesión Activa</span>
                  <h1 className="text-3xl lg:text-4xl font-black italic tracking-tighter uppercase break-words leading-[0.9]">
                    {activeLesson.title}
                  </h1>
                </div>

                <div className="flex flex-col items-start md:items-end gap-3 bg-white/5 p-6 rounded-3xl border border-white/5">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Valoración de Clase</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setRating(star)} className="outline-none transform active:scale-90 transition-transform">
                        <Star size={22} fill={star <= rating ? "#FFD700" : "none"} className={`transition-colors ${star <= rating ? "text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" : "text-gray-800"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                <div className="lg:col-span-8">
                  <h3 className="text-xl font-black uppercase tracking-tighter italic mb-8 flex items-center gap-4">
                    <span className="w-8 h-px bg-red-600"></span> Resumen Estratégico
                  </h3>
                  <div className="prose prose-invert max-w-none prose-p:text-gray-400 prose-p:text-lg prose-headings:text-white leading-relaxed" 
                       dangerouslySetInnerHTML={{ __html: htmlDescription }} />
                </div>

                <div className="lg:col-span-4">
                  <div className="bg-[#080808] border border-white/5 rounded-[2.5rem] p-8 lg:p-10 sticky top-8">
                    <h3 className="text-lg font-black uppercase tracking-tighter italic mb-8 flex items-center gap-3">
                      <FileText size={20} className="text-red-600" /> Materiales
                    </h3>
                    
                    <div className="space-y-4">
                      {activeLesson.resources && activeLesson.resources.length > 0 ? (
                        activeLesson.resources.map((r, i) => (
                          <motion.a key={i} href={r.url} target="_blank" rel="noopener noreferrer" whileHover={{ x: 5 }} className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl transition-all group hover:border-red-600/50">
                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center group-hover:bg-red-600/10 transition-colors">
                              <FileText size={18} className="text-gray-500 group-hover:text-red-600 transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black uppercase tracking-tighter truncate text-gray-200">{r.name}</p>
                              <p className="text-[9px] text-gray-600 font-bold uppercase mt-1">Descargar</p>
                            </div>
                            <ExternalLink size={14} className="text-gray-800 group-hover:text-red-600 transition-colors" />
                          </motion.a>
                        ))
                      ) : (
                        <div className="text-center py-12 border border-dashed border-white/5 rounded-3xl opacity-20">
                           <p className="text-[9px] font-black uppercase tracking-[0.2em]">Sin archivos adjuntos</p>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => onToggleProgress(activeLesson.id)} 
                      className={`w-full mt-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${progress.includes(activeLesson.id) ? 'bg-green-600/10 text-green-500 border border-green-600/20' : 'bg-red-600 hover:bg-red-700 text-white shadow-2xl shadow-red-600/20'}`}
                    >
                      {progress.includes(activeLesson.id) ? (
                        <><Check size={16} strokeWidth={3}/> Clase Completada</>
                      ) : (
                        'Marcar Finalizada'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 select-none">
               <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative mb-14">
                  <div className="absolute inset-0 bg-red-600/20 blur-[120px] rounded-full animate-pulse" />
                  <div className="relative w-40 h-40 bg-white/5 rounded-[3rem] flex items-center justify-center border border-white/10 rotate-12">
                    <Play size={64} className="text-white/5 ml-3 -rotate-12" />
                  </div>
               </motion.div>
               <h3 className="text-4xl font-black uppercase tracking-[0.4em] italic leading-tight text-white/50">
                 CENTRAL DE <span className="text-red-600">FORMACIÓN</span>
               </h3>
               <p className="text-[11px] font-bold text-gray-700 mt-8 uppercase tracking-[0.5em] max-w-sm leading-relaxed">
                 Selecciona un módulo del currículo lateral para comenzar tu transformación digital.
               </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
