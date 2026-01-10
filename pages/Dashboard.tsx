
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, FileText, ChevronDown, Lock, LogOut, Menu, X, Zap, ExternalLink, 
  CheckCircle, Trophy, Award, Star, Crown, ChevronRight, LayoutDashboard,
  Shield, Medal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { User } from '../types';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type Rank = "Novato" | "Creador" | "Partner" | "Referente" | "Leyenda";
type ViewState = 'HOME' | 'PLAYER';

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [courses, setCourses] = useState<any[]>([]);
  // Use Set for O(1) lookups of completed lessons
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [viewState, setViewState] = useState<ViewState>('HOME');
  
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCourses(), fetchProgress()]);
      setLoading(false);
    };
    init();
  }, [user.id]);

  async function fetchCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules(*, lessons(*))')
      .order('created_at', { ascending: true });

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
      
      // Auto-expand first module if exists
      if (sorted.length > 0 && sorted[0].modules?.[0]) {
        setExpandedModules(new Set([sorted[0].modules[0].id]));
      }
    }
  }

  async function fetchProgress() {
    const { data, error } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', user.id);

    if (!error && data) {
      const ids = new Set(data.map(item => item.lesson_id));
      setCompletedLessons(ids);
    }
  }

  const toggleLessonCompletion = async (lessonId: string) => {
    const isComplete = completedLessons.has(lessonId);
    
    // Optimistic UI Update
    const nextSet = new Set(completedLessons);
    if (isComplete) nextSet.delete(lessonId);
    else nextSet.add(lessonId);
    setCompletedLessons(nextSet);

    if (isComplete) {
      // Remove from DB
      await supabase.from('user_progress').delete().match({ user_id: user.id, lesson_id: lessonId });
    } else {
      // Add to DB
      await supabase.from('user_progress').insert({ user_id: user.id, lesson_id: lessonId });
    }
  };

  const handleLessonSelect = (lesson: any) => {
    setActiveLesson(lesson);
    setViewState('PLAYER');
    // Auto close sidebar on mobile
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const toggleModule = (id: string) => {
    const next = new Set(expandedModules);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedModules(next);
  };

  // --- GAMIFICATION & STATS ENGINE ---

  const stats = useMemo(() => {
    let totalLessons = 0;
    let totalCompleted = 0;

    courses.forEach(course => {
      course.modules?.forEach((mod: any) => {
        mod.lessons?.forEach((lesson: any) => {
          totalLessons++;
          if (completedLessons.has(lesson.id)) totalCompleted++;
        });
      });
    });

    const percentage = totalLessons === 0 ? 0 : Math.round((totalCompleted / totalLessons) * 100);
    
    let rank: Rank = "Novato";
    if (percentage >= 25) rank = "Creador";
    if (percentage >= 50) rank = "Partner";
    if (percentage >= 75) rank = "Referente";
    if (percentage >= 100) rank = "Leyenda";

    return { totalLessons, totalCompleted, percentage, rank };
  }, [courses, completedLessons]);

  const getRankIcon = (r: Rank, size: number = 20) => {
    switch (r) {
      case "Novato": return <Shield size={size} className="text-zinc-500" />;
      case "Creador": return <Award size={size} className="text-bronze-500" color="#cd7f32" />;
      case "Partner": return <Star size={size} className="text-zinc-300" fill="currentColor" />;
      case "Referente": return <Crown size={size} className="text-yellow-400" fill="currentColor" />;
      case "Leyenda": return <Trophy size={size} className="text-cyan-400" fill="currentColor" />;
    }
  };

  const resumeLearning = () => {
    // Find first uncompleted lesson
    for (const course of courses) {
      for (const mod of course.modules || []) {
        for (const lesson of mod.lessons || []) {
          if (!completedLessons.has(lesson.id)) {
            handleLessonSelect(lesson);
            return;
          }
        }
      }
    }
    // If all completed, go to first lesson of first course
    if (courses[0]?.modules?.[0]?.lessons?.[0]) {
      handleLessonSelect(courses[0].modules[0].lessons[0]);
    }
  };

  // --- SMART VIDEO EMBEDDER LOGIC ---

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) return url.replace(/\/view.*/, '/preview');
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?modestbranding=1&rel=0` : url;
    }
    if (url.includes('vimeo.com')) {
      const regExp = /vimeo\.com\/(\d+)/;
      const match = url.match(regExp);
      return match ? `https://player.vimeo.com/video/${match[1]}` : url;
    }
    return url;
  };

  const isEmbeddable = (url: string) => {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  };

  // ----------------------------------

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-bold tracking-widest uppercase">Cargando tu Academia...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? '350px' : '0px', opacity: sidebarOpen ? 1 : 0 }}
        className="h-screen bg-[#0a0a0a] border-r border-white/5 flex-shrink-0 flex flex-col overflow-hidden relative z-20"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 cursor-pointer" onClick={() => setViewState('HOME')}>
            <h2 className="font-black italic text-xl tracking-tighter">EZEH <span className="text-red-600">ACADEMY</span></h2>
            <button onClick={(e) => { e.stopPropagation(); setSidebarOpen(false); }} className="lg:hidden text-white"><X/></button>
        </div>

        {/* User Mini Stat in Sidebar */}
        <div className="p-6 bg-gradient-to-br from-red-900/10 to-transparent border-b border-white/5 flex items-center gap-4">
           <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-black text-xs">
              {stats.percentage}%
           </div>
           <div>
              <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Tu Rango</p>
              <div className="flex items-center gap-2 text-sm font-black italic uppercase text-white">
                {getRankIcon(stats.rank, 14)} {stats.rank}
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8">
            <button onClick={() => setViewState('HOME')} className={`w-full text-left flex items-center gap-3 p-4 rounded-xl font-bold uppercase text-xs tracking-widest transition-all ${viewState === 'HOME' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
               <LayoutDashboard size={16}/> Tu Progreso
            </button>

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
                                                {mod.lessons?.map((lesson: any) => {
                                                    const isCompleted = completedLessons.has(lesson.id);
                                                    const isActive = activeLesson?.id === lesson.id && viewState === 'PLAYER';
                                                    return (
                                                      <button
                                                          key={lesson.id}
                                                          onClick={() => handleLessonSelect(lesson)}
                                                          className={`w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all group ${isActive ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'hover:bg-white/5 text-zinc-500'}`}
                                                      >
                                                          <div className={`p-1.5 rounded-full relative ${isActive ? 'bg-white/20' : 'bg-black border border-white/10 group-hover:border-white/30'}`}>
                                                              {isActive ? <Play size={10} fill="currentColor"/> : (
                                                                isCompleted ? <CheckCircle size={10} className="text-green-500" /> : <Lock size={10}/>
                                                              )}
                                                          </div>
                                                          <span className={`text-xs font-bold uppercase truncate flex-1 ${isCompleted && !isActive ? 'text-zinc-300 line-through decoration-red-600/50' : ''}`}>{lesson.title}</span>
                                                      </button>
                                                    );
                                                })}
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

        <div className="p-4 border-t border-white/5 space-y-3">
            {user.email === 'ezehcontactooficial@gmail.com' && (
                <Link 
                    to="/admin" 
                    className="w-full py-4 rounded-xl text-xs font-black uppercase text-white bg-gradient-to-r from-red-600 to-red-900 hover:scale-[1.02] transition-transform shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 border border-white/10"
                >
                    <Zap size={16} className="text-yellow-400 fill-yellow-400 animate-pulse"/> EZEH STUDIO
                </Link>
            )}

            <button onClick={onLogout} className="w-full py-3 bg-zinc-900 rounded-xl text-xs font-bold uppercase text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                <LogOut size={14}/> Cerrar Sesión
            </button>
        </div>
      </motion.aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 h-screen overflow-y-auto relative bg-[#050505] custom-scrollbar">
        {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="absolute top-6 left-6 z-50 p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-red-600 transition-all">
                <Menu size={20}/>
            </button>
        )}

        <div className="max-w-6xl mx-auto p-6 lg:p-12">
           
           {/* === VIEW: HOME (LOBBY) === */}
           {viewState === 'HOME' && (
              <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="space-y-12">
                 
                 {/* HERO PROGRESS SECTION */}
                 <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0a0a0a] border border-white/10 p-8 lg:p-12 shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 blur-[100px] rounded-full pointer-events-none"/>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-end md:items-center justify-between gap-8">
                       <div className="space-y-4 max-w-xl">
                          <h1 className="text-4xl lg:text-6xl font-black italic uppercase tracking-tighter">
                             Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600">{user.fullName}</span>
                          </h1>
                          <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                             Continúa tu camino para convertirte en una Leyenda. Has completado <span className="text-white font-bold">{stats.totalCompleted}</span> de <span className="text-white font-bold">{stats.totalLessons}</span> misiones.
                          </p>
                       </div>
                       
                       <div className="text-right">
                          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">Nivel Actual</div>
                          <div className="text-4xl font-black uppercase italic flex items-center justify-end gap-3">
                             {getRankIcon(stats.rank, 32)} <span className="text-white">{stats.rank}</span>
                          </div>
                       </div>
                    </div>

                    {/* ANIMATED PROGRESS BAR */}
                    <div className="mt-12">
                       <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-3">
                          <span className="text-zinc-500">Progreso General</span>
                          <span className="text-white">{stats.percentage}%</span>
                       </div>
                       <div className="h-4 bg-white/5 rounded-full overflow-hidden relative">
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${stats.percentage}%` }}
                             transition={{ duration: 1.5, ease: "easeOut" }}
                             className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-orange-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                          />
                       </div>
                    </div>

                    <div className="mt-10">
                       <button onClick={resumeLearning} className="bg-white text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-white/10">
                          <Play size={16} fill="black" /> Continuar Aprendizaje
                       </button>
                    </div>
                 </div>

                 {/* TROPHY ROOM */}
                 <div>
                    <h2 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                       <Trophy className="text-red-600" /> Sala de Trofeos
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {[
                         { limit: 25, label: "Creador", icon: Award, color: "text-amber-700" },
                         { limit: 50, label: "Partner", icon: Star, color: "text-zinc-300" },
                         { limit: 75, label: "Referente", icon: Crown, color: "text-yellow-400" },
                         { limit: 100, label: "Leyenda", icon: Medal, color: "text-cyan-400" },
                       ].map((tier, idx) => {
                          const isUnlocked = stats.percentage >= tier.limit;
                          return (
                             <div key={idx} className={`relative p-6 rounded-3xl border ${isUnlocked ? 'bg-[#0f0f0f] border-red-600/30 shadow-[0_0_30px_rgba(220,38,38,0.1)]' : 'bg-black border-white/5 opacity-50 grayscale'} flex flex-col items-center justify-center text-center gap-4 transition-all group overflow-hidden`}>
                                {isUnlocked && <div className="absolute inset-0 bg-gradient-to-t from-red-900/10 to-transparent pointer-events-none" />}
                                <div className={`p-4 rounded-full ${isUnlocked ? 'bg-white/5 scale-110' : 'bg-white/5'}`}>
                                   <tier.icon size={32} className={isUnlocked ? tier.color : 'text-zinc-600'} fill={isUnlocked ? "currentColor" : "none"} />
                                </div>
                                <div>
                                   <h3 className="font-black uppercase text-sm tracking-wide">{tier.label}</h3>
                                   <p className="text-[10px] font-bold text-zinc-600 mt-1">{tier.limit}% COMPLETADO</p>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 </div>

              </motion.div>
           )}

           {/* === VIEW: PLAYER (CLASS) === */}
           {viewState === 'PLAYER' && activeLesson && (
              <motion.div initial={{opacity: 0, x: 20}} animate={{opacity: 1, x: 0}} className="space-y-8">
                  
                  {/* BREADCRUMBS */}
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">
                     <button onClick={() => setViewState('HOME')} className="hover:text-white transition-colors">Inicio</button>
                     <ChevronRight size={12}/>
                     <span>Lección Actual</span>
                  </div>

                  {/* VIDEO PLAYER UI */}
                  <div className="w-full aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl relative group">
                      {activeLesson.video_url ? (
                          isEmbeddable(activeLesson.video_url) ? (
                              <iframe
                                  src={getEmbedUrl(activeLesson.video_url)}
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                  allowFullScreen
                                  title={activeLesson.title}
                              />
                          ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                      <Play size={40} className="text-white/30 ml-2" />
                                  </div>
                                  <h3 className="text-2xl font-black uppercase italic text-white mb-3 tracking-tight">Formato Externo</h3>
                                  <a 
                                      href={activeLesson.video_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all hover:scale-105 shadow-xl shadow-red-900/20"
                                  >
                                      <ExternalLink size={20} /> Abrir Clase Externa
                                  </a>
                              </div>
                          )
                      ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                               <p className="text-zinc-700 font-black uppercase tracking-[0.5em] text-xs">Sin Video Asignado</p>
                          </div>
                      )}
                  </div>

                  {/* LESSON CONTROLS & INFO */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      <div className="lg:col-span-2 space-y-6">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                              <h1 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tight flex-1">{activeLesson.title}</h1>
                              
                              {/* --- COMPLETION TOGGLE BUTTON --- */}
                              <button 
                                onClick={() => toggleLessonCompletion(activeLesson.id)}
                                className={`px-6 py-3 rounded-xl font-black uppercase tracking-wider text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg ${
                                  completedLessons.has(activeLesson.id) 
                                  ? 'bg-green-500 text-black hover:bg-green-400 shadow-green-500/20' 
                                  : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-white/30'
                                }`}
                              >
                                {completedLessons.has(activeLesson.id) ? (
                                  <><CheckCircle size={16} fill="black" className="text-green-500"/> Completada</>
                                ) : (
                                  <><div className="w-4 h-4 border-2 border-current rounded-full"/> Marcar Vista</>
                                )}
                              </button>
                          </div>

                          <div className="p-6 bg-zinc-900/30 rounded-2xl border border-white/5 text-zinc-400 leading-relaxed text-sm">
                              {activeLesson.description || "Sin descripción disponible para esta clase."}
                          </div>
                      </div>

                      {/* SIDEBAR RESOURCES */}
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
              </motion.div>
           )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
