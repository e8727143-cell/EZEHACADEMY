
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, FileText, ChevronDown, Lock, LogOut, Menu, X, Zap, ExternalLink, 
  CheckCircle, Trophy, Award, Star, Crown, ChevronRight, LayoutDashboard,
  Shield, Medal, ThumbsUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { User } from '../types';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type Rank = "Novato" | "Creador" | "Maestro";
type ViewState = 'HOME' | 'PLAYER';

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [courses, setCourses] = useState<any[]>([]);
  // Use Set for O(1) lookups of completed lessons
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [viewState, setViewState] = useState<ViewState>('HOME');
  const [userRating, setUserRating] = useState<number>(0); // Estado local para la valoración
  
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const isAdmin = user.role === 'admin';

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
    setUserRating(0); // Reset rating visual al cambiar lección
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
    if (percentage >= 50) rank = "Creador";
    if (percentage >= 100) rank = "Maestro";

    return { totalLessons, totalCompleted, percentage, rank };
  }, [courses, completedLessons]);

  const getRankIcon = (r: Rank, size: number = 20) => {
    switch (r) {
      case "Novato": return <Shield size={size} className="text-zinc-400" />;
      case "Creador": return <Award size={size} className="text-yellow-500" />;
      case "Maestro": return <Crown size={size} className="text-red-500" />;
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

        {/* --- UNIFIED HOME PANEL & STATS --- */}
        <div 
            onClick={() => setViewState('HOME')}
            className={`p-6 border-b border-white/5 cursor-pointer transition-all group ${viewState === 'HOME' ? 'bg-white/5' : 'hover:bg-white/5'}`}
        >
           {/* HEADER */}
           <div className="flex items-center gap-3 mb-4">
               <div className={`p-2 rounded-lg ${viewState === 'HOME' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 group-hover:text-white'}`}>
                   <LayoutDashboard size={18}/>
               </div>
               <span className={`text-xs font-black uppercase tracking-widest ${viewState === 'HOME' ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`}>
                   Panel Home
               </span>
           </div>

           {/* STATS (SOLO SI NO ES ADMIN) */}
           {!isAdmin && (
               <div className="bg-[#050505] rounded-xl p-4 border border-white/5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-20 h-20 bg-red-600/20 blur-xl rounded-full"/>
                   <div className="relative z-10 flex items-center justify-between">
                       <div className="flex flex-col">
                           <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Tu Rango</span>
                           <div className="flex items-center gap-2 text-sm font-black italic uppercase text-white">
                                {getRankIcon(stats.rank, 14)} {stats.rank}
                           </div>
                       </div>
                       <div className="w-12 h-12 rounded-full border-2 border-red-600 flex items-center justify-center font-black text-xs text-white bg-red-600/10 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                          {stats.percentage}%
                       </div>
                   </div>
               </div>
           )}

           {isAdmin && (
               <div className="bg-[#050505] rounded-xl p-4 border border-yellow-500/20 relative overflow-hidden group-hover:border-yellow-500/40 transition-colors">
                   <div className="absolute -top-10 -right-10 w-24 h-24 bg-yellow-500/10 blur-xl rounded-full"/>
                   <div className="relative z-10">
                       <span className="text-[9px] text-yellow-500/80 font-bold uppercase tracking-[0.2em] mb-1 block">Modo Dios</span>
                       <div className="text-xs font-black text-white uppercase flex items-center gap-2">
                           <Crown size={14} className="text-yellow-400"/> Administrador
                       </div>
                   </div>
               </div>
           )}
        </div>

        {/* --- COURSE LIST --- */}
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
            {isAdmin && (
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
                 
                 {/* HERO SECTION */}
                 <div className={`relative overflow-hidden rounded-[2.5rem] border p-8 lg:p-12 shadow-2xl transition-all ${
                     isAdmin 
                        ? 'bg-gradient-to-br from-amber-200 via-yellow-500 to-amber-700 border-yellow-400/50 shadow-yellow-600/20' 
                        : 'bg-[#0a0a0a] border-white/10'
                 }`}>
                    {/* Background Effects */}
                    {!isAdmin && (
                         <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 blur-[100px] rounded-full pointer-events-none"/>
                    )}
                    {isAdmin && (
                        <>
                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay pointer-events-none"/>
                            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white/30 blur-[80px] rounded-full pointer-events-none"/>
                        </>
                    )}
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-end md:items-center justify-between gap-8">
                       <div className="space-y-4 max-w-xl">
                          <h1 className={`text-4xl lg:text-6xl font-black italic uppercase tracking-tighter ${isAdmin ? 'text-black drop-shadow-sm' : 'text-white'}`}>
                             Hola, <span className={isAdmin ? 'text-white drop-shadow-md' : 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600'}>{user.fullName}</span>
                          </h1>
                          <p className={`text-sm font-medium leading-relaxed ${isAdmin ? 'text-amber-900' : 'text-zinc-400'}`}>
                             {isAdmin 
                                ? "Bienvenido a tu cuartel general. Desde aquí controlas todo el imperio de Ezeh Academy."
                                : <><span className="text-white font-bold">{stats.totalCompleted}</span> de <span className="text-white font-bold">{stats.totalLessons}</span> misiones completadas. Continúa tu camino hacia la leyenda.</>
                             }
                          </p>
                       </div>
                       
                       <div className="text-right">
                          <div className={`text-[10px] font-black uppercase tracking-[0.3em] mb-2 ${isAdmin ? 'text-amber-900' : 'text-zinc-500'}`}>
                              {isAdmin ? 'Status' : 'Nivel Actual'}
                          </div>
                          <div className={`text-4xl font-black uppercase italic flex items-center justify-end gap-3 ${isAdmin ? 'text-white drop-shadow-md' : 'text-white'}`}>
                             {isAdmin 
                                ? <><Crown size={32} fill="white"/> MASTER</>
                                : <>{getRankIcon(stats.rank, 32)} {stats.rank}</>
                             }
                          </div>
                       </div>
                    </div>

                    {/* ANIMATED PROGRESS BAR */}
                    <div className="mt-12">
                       <div className={`flex justify-between text-xs font-bold uppercase tracking-widest mb-3 ${isAdmin ? 'text-amber-900' : 'text-zinc-500'}`}>
                          <span>{isAdmin ? 'Capacidad del Sistema' : 'Progreso General'}</span>
                          <span className={isAdmin ? 'text-black' : 'text-white'}>{isAdmin ? '100%' : `${stats.percentage}%`}</span>
                       </div>
                       <div className={`h-4 rounded-full overflow-hidden relative ${isAdmin ? 'bg-black/10' : 'bg-white/5'}`}>
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: isAdmin ? '100%' : `${stats.percentage}%` }}
                             transition={{ duration: 1.5, ease: "easeOut" }}
                             className={`absolute top-0 left-0 h-full shadow-[0_0_20px_rgba(220,38,38,0.5)] ${
                                 isAdmin ? 'bg-white' : 'bg-gradient-to-r from-red-600 to-orange-600'
                             }`}
                          />
                       </div>
                    </div>

                    <div className="mt-10">
                       <button onClick={resumeLearning} className={`px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all flex items-center gap-2 shadow-lg ${
                           isAdmin 
                            ? 'bg-black text-white hover:bg-zinc-800 shadow-black/20'
                            : 'bg-white text-black hover:bg-zinc-200 shadow-white/10'
                       }`}>
                          <Play size={16} fill="currentColor" /> {isAdmin ? 'Revisar Contenido' : 'Continuar Aprendizaje'}
                       </button>
                    </div>
                 </div>

                 {/* TROPHY ROOM - CUSTOM 3D PLAQUES */}
                 {!isAdmin && (
                     <div>
                        <h2 className="text-xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                           <Trophy className="text-red-600" /> Sala de Trofeos
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           
                           {/* LOGIC FOR RENDERING 3 TROPHIES */}
                           {[
                             { 
                               limit: 0, 
                               label: "NOVATO", 
                               letter: "N",
                               colors: {
                                 bg: "bg-gradient-to-br from-slate-100 via-slate-300 to-slate-500",
                                 border: "border-slate-400",
                                 shadow: "shadow-slate-500/20",
                                 letterColor: "text-slate-800"
                               }
                             },
                             { 
                               limit: 50, 
                               label: "CREADOR", 
                               letter: "C",
                               colors: {
                                 bg: "bg-gradient-to-br from-[#fff7ad] via-[#ffa900] to-[#b45309]",
                                 border: "border-[#78350f]",
                                 shadow: "shadow-yellow-600/20",
                                 letterColor: "text-[#78350f]"
                               }
                             },
                             { 
                               limit: 100, 
                               label: "MAESTRO DEL CONTENIDO", 
                               letter: "M",
                               colors: {
                                 bg: "bg-gradient-to-br from-red-400 via-red-600 to-red-950",
                                 border: "border-red-900",
                                 shadow: "shadow-red-600/30",
                                 letterColor: "text-red-950"
                               }
                             },
                           ].map((tier, idx) => {
                              const isUnlocked = stats.percentage >= tier.limit;
                              
                              return (
                                 <div key={idx} className="flex flex-col items-center">
                                    <div className={`relative p-8 rounded-[2rem] border border-white/5 bg-[#0a0a0a] w-full aspect-square flex items-center justify-center overflow-hidden shadow-2xl group transition-all duration-500 ${!isUnlocked ? 'grayscale opacity-50' : 'hover:scale-105'}`}>
                                       
                                       {/* 3D FLOATING PLAQUE */}
                                       <motion.div 
                                          animate={isUnlocked ? { 
                                             y: [0, -10, 0],
                                             rotateY: [0, 5, -5, 0],
                                             rotateX: [0, 2, -2, 0]
                                          } : {}}
                                          transition={{ 
                                             duration: 6, 
                                             repeat: Infinity, 
                                             ease: "easeInOut",
                                             delay: idx * 1.5
                                          }}
                                          className={`relative w-32 h-24 ${tier.colors.bg} rounded-3xl shadow-2xl border-t border-white/40 border-b ${tier.colors.border} flex items-center justify-center overflow-hidden`}
                                          style={{ perspective: 1000 }}
                                       >
                                          {/* Reflections */}
                                          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                                          <div className="absolute -inset-full top-0 block h-full w-full -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50 animate-[shimmer_4s_infinite]" />
                                          
                                          {/* Embossed Letter */}
                                          <span className={`text-6xl font-black ${tier.colors.letterColor} drop-shadow-[0_2px_1px_rgba(255,255,255,0.5)] relative z-10 font-serif`}>
                                              {tier.letter}
                                          </span>
                                       </motion.div>

                                       {/* BACKGROUND GLOW IF UNLOCKED */}
                                       {isUnlocked && (
                                            <div className={`absolute inset-0 opacity-20 bg-radial-gradient from-white to-transparent blur-3xl`} />
                                       )}
                                    </div>
                                    
                                    {/* LABEL & USERNAME */}
                                    <div className="text-center mt-6 space-y-2 h-16">
                                        <h3 className={`font-black uppercase text-sm tracking-widest ${isUnlocked ? 'text-white' : 'text-zinc-700'}`}>{tier.label}</h3>
                                        {isUnlocked && (
                                            <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="inline-block px-4 py-1 bg-white/5 rounded-full border border-white/10">
                                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{user.fullName}</span>
                                            </motion.div>
                                        )}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                 )}

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
                      <div className="lg:col-span-2 space-y-8">
                          
                          {/* HEADER & ACTIONS */}
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-white/5 pb-8">
                              <h1 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tight text-white flex-1 leading-none">{activeLesson.title}</h1>
                              
                              <div className="flex flex-col items-end gap-4">
                                  {/* MARK AS COMPLETE BUTTON */}
                                  <button 
                                    onClick={() => toggleLessonCompletion(activeLesson.id)}
                                    className={`px-8 py-4 rounded-xl font-black uppercase tracking-wider text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg ${
                                      completedLessons.has(activeLesson.id) 
                                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-black hover:scale-105 shadow-green-500/20' 
                                      : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-white/30'
                                    }`}
                                  >
                                    {completedLessons.has(activeLesson.id) ? (
                                      <><CheckCircle size={18} fill="black" className="text-white"/> Lección Completada</>
                                    ) : (
                                      <><div className="w-4 h-4 border-2 border-current rounded-full"/> Marcar como Vista</>
                                    )}
                                  </button>
                              </div>
                          </div>

                          {/* RATING SYSTEM (RESTORED WITH ANIMATION) */}
                          <div className="flex items-center gap-6">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Valorar Clase:</span>
                              <div className="flex items-center gap-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                      <motion.button
                                        key={star}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setUserRating(star)}
                                        className="outline-none"
                                      >
                                          <motion.div
                                            animate={{ rotate: userRating >= star ? 360 : 0 }}
                                            transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                          >
                                              <Star 
                                                  size={24} 
                                                  className={userRating >= star ? "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" : "text-zinc-800"} 
                                                  fill={userRating >= star ? "currentColor" : "none"}
                                              />
                                          </motion.div>
                                      </motion.button>
                                  ))}
                              </div>
                          </div>

                          {/* DESCRIPTION */}
                          <div className="p-8 bg-zinc-900/30 rounded-3xl border border-white/5 text-zinc-400 leading-relaxed text-sm">
                              <h3 className="text-white font-bold uppercase mb-4 text-xs tracking-widest flex items-center gap-2"><FileText size={14} className="text-red-600"/> Resumen</h3>
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
                                  className="block p-6 bg-red-600/10 border border-red-600/20 rounded-2xl hover:bg-red-600 hover:text-white transition-all group relative overflow-hidden"
                              >
                                  <div className="absolute inset-0 bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity z-0"/>
                                  <div className="relative z-10">
                                      <div className="flex items-center gap-4 mb-2">
                                          <div className="p-2 bg-red-600 text-white rounded-lg group-hover:bg-white group-hover:text-red-600 transition-colors">
                                              <FileText size={20}/>
                                          </div>
                                          <span className="font-black text-sm uppercase tracking-wide">Descargar Archivo</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-400 group-hover:text-red-100 pl-1">Clic para acceder al recurso</p>
                                  </div>
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
