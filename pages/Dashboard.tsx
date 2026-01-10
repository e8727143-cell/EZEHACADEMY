
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, FileText, ChevronDown, Lock, LogOut, Menu, X, Zap, ExternalLink, 
  Check, Award, Star, Crown, ChevronRight,
  Shield, CheckSquare, Square, Download
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
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [viewState, setViewState] = useState<ViewState>('HOME');
  const [userRating, setUserRating] = useState<number>(0);
  
  // --- STATE FOR TROPHY ANIMATION ---
  const [selectedTrophy, setSelectedTrophy] = useState<number | null>(null);
  
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

  // Cargar calificación cuando cambia la lección activa
  useEffect(() => {
    if (activeLesson) {
      fetchLessonRating(activeLesson.id);
    }
  }, [activeLesson]);

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

  async function fetchLessonRating(lessonId: string) {
    const { data } = await supabase
      .from('lesson_ratings')
      .select('rating')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .single();
    
    if (data) {
      setUserRating(data.rating);
    } else {
      setUserRating(0);
    }
  }

  const handleRateLesson = async (rating: number) => {
    setUserRating(rating); // Optimistic UI
    
    if (!activeLesson) return;

    const { error } = await supabase
      .from('lesson_ratings')
      .upsert({ 
        user_id: user.id, 
        lesson_id: activeLesson.id, 
        rating: rating 
      }, { onConflict: 'user_id, lesson_id' });

    if (error) {
      console.error("Error saving rating:", error);
    }
  };

  const toggleLessonCompletion = async (lessonId: string) => {
    const isComplete = completedLessons.has(lessonId);
    
    // Optimistic UI Update
    const nextSet = new Set(completedLessons);
    if (isComplete) nextSet.delete(lessonId);
    else nextSet.add(lessonId);
    setCompletedLessons(nextSet);

    if (isComplete) {
      await supabase.from('user_progress').delete().match({ user_id: user.id, lesson_id: lessonId });
    } else {
      await supabase.from('user_progress').insert({ user_id: user.id, lesson_id: lessonId });
    }
  };

  const handleLessonSelect = (lesson: any) => {
    setActiveLesson(lesson);
    setViewState('PLAYER');
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

  // --- PROGRESS BAR HELPER ---
  const getProgressBarStyles = (percent: number) => {
    if (percent >= 100) {
      return 'from-emerald-600 via-green-400 to-emerald-600 shadow-[0_0_25px_rgba(34,197,94,0.6)]';
    } 
    if (percent >= 50) {
      return 'from-amber-600 via-yellow-400 to-amber-600 shadow-[0_0_20px_rgba(234,179,8,0.4)]';
    }
    return 'from-red-800 via-red-500 to-red-800 shadow-[0_0_20px_rgba(220,38,38,0.4)]';
  };

  // --- TROPHY DATA ---
  const trophyTiers = [
     { 
       limit: 0, 
       label: "NOVATO", 
       letter: "N",
       glowColor: "bg-slate-400",
       colors: {
         bg: "bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600",
         border: "border-slate-400",
         letterColor: "text-slate-900"
       }
     },
     { 
       limit: 50, 
       label: "CREADOR", 
       letter: "C",
       glowColor: "bg-amber-500",
       colors: {
         bg: "bg-gradient-to-br from-[#fff7ad] via-[#ffa900] to-[#b45309]",
         border: "border-[#78350f]",
         letterColor: "text-[#78350f]"
       }
     },
     { 
       limit: 100, 
       label: "MAESTRO DEL CONTENIDO", 
       letter: "M",
       glowColor: "bg-red-600",
       colors: {
         bg: "bg-gradient-to-br from-red-500 via-red-600 to-red-950",
         border: "border-red-900",
         letterColor: "text-red-950"
       }
     },
  ];

  // --- TROPHY CARD RENDERER (VISUAL ONLY) ---
  const TrophyCardContent = ({ tier, idx, isUnlocked }: { tier: any, idx: number, isUnlocked: boolean }) => {
      return (
        <div
            className={`w-full h-full bg-[#111] rounded-[4px] border-[12px] border-[#222] shadow-[20px_20px_40px_rgba(0,0,0,0.8)] relative flex flex-col items-center justify-center overflow-hidden ${!isUnlocked ? 'grayscale opacity-30' : 'cursor-pointer'}`}
            style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
        >
            <div className="absolute inset-0 border-[2px] border-white/10 pointer-events-none"/>

            {/* --- THE AWARD (PLAY BUTTON) --- */}
            <div 
              className={`relative w-32 h-24 ${tier.colors.bg} rounded-2xl shadow-xl flex items-center justify-center overflow-hidden mb-6 z-10`}
              style={{ transform: 'translateZ(20px)' }}
            >
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 pointer-events-none" />
                
                {isUnlocked && (
                    <div className="absolute inset-0 z-20">
                        <motion.div 
                            animate={{ x: ['-200%', '200%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: idx * 2 }}
                            className="w-full h-full bg-gradient-to-r from-transparent via-white/60 to-transparent -skew-x-12 opacity-80"
                        />
                    </div>
                )}

                <span className={`text-5xl font-black ${tier.colors.letterColor} drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] relative z-10 font-serif`}>
                    {tier.letter}
                </span>
            </div>

            <div 
              className="absolute bottom-10 px-4 py-2 bg-[#050505] border border-white/10 rounded w-[80%] text-center shadow-inner"
              style={{ transform: 'translateZ(10px)' }}
            >
                {isUnlocked ? (
                    <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block truncate">{user.fullName}</span>
                ) : (
                    <div className="h-3 bg-zinc-800 rounded animate-pulse w-full"/>
                )}
            </div>

            <div className="absolute top-4 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">
                {tier.label}
            </div>
        </div>
      );
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-bold tracking-widest uppercase">Cargando tu Academia...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? '350px' : '0px', opacity: sidebarOpen ? 1 : 0 }}
        className="h-screen bg-[#0a0a0a] border-r border-white/5 flex-shrink-0 flex flex-col overflow-hidden relative z-[60]"
      >
        {/* LOGO CENTRADO Y GRANDE */}
        <div className="p-8 border-b border-white/5 flex flex-col justify-center items-center relative bg-zinc-900/50 cursor-pointer" onClick={() => setViewState('HOME')}>
            <button onClick={(e) => { e.stopPropagation(); setSidebarOpen(false); }} className="lg:hidden absolute top-6 right-6 text-white"><X/></button>
            <h2 className="font-black italic text-3xl tracking-tighter text-center">EZEH <span className="text-red-600">ACADEMY</span></h2>
        </div>

        {/* --- PANEL HOME BUTTON --- */}
        <div className="p-4 border-b border-white/5">
             <div 
                onClick={() => setViewState('HOME')}
                className={`relative overflow-hidden w-full p-6 rounded-2xl cursor-pointer group transition-all duration-500 shadow-2xl ${
                    isAdmin 
                        ? 'bg-gradient-to-r from-[#b45309] via-[#78350f] to-black shadow-yellow-900/20' 
                        : 'bg-gradient-to-r from-red-800 via-red-950 to-black shadow-red-900/20'
                }`}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[shimmer_3s_infinite]" />
                
                <div className="relative z-10 flex items-center justify-between">
                    <span className={`text-sm font-black uppercase tracking-[0.2em] ${isAdmin ? 'text-yellow-100' : 'text-white'}`}>
                        Panel Home
                    </span>
                    <div className={`p-2 rounded-full border ${isAdmin ? 'bg-yellow-500 text-black border-yellow-300' : 'bg-white text-red-600 border-white'} shadow-[0_0_15px_rgba(255,255,255,0.4)]`}>
                        <Play size={14} fill="currentColor" />
                    </div>
                </div>
            </div>
        </div>

        {/* --- COURSE LIST --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-12 pb-20">
            {courses.map(course => (
                <div key={course.id} className="relative">
                    
                    {/* COURSE TITLE (ROOT NODE) */}
                    <div className="relative z-20 px-4 mb-2">
                        <div className="bg-white text-red-600 p-3 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.5)] border-4 border-zinc-200 text-center relative transform transition-transform hover:scale-[1.02]">
                            <h3 className="font-black uppercase tracking-tighter text-base leading-none">
                                {course.title}
                            </h3>
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-white"></div>
                        </div>
                    </div>

                    {/* TREE STRUCTURE */}
                    <div className="relative pl-2">
                        <div className="absolute left-[50%] top-[-10px] h-6 w-0.5 bg-gradient-to-b from-white to-white/10 -translate-x-1/2 z-0"></div>
                        
                        <svg className="absolute top-[14px] left-0 w-full h-8 z-0 pointer-events-none overflow-visible">
                            <path d="M 50% 0 L 50% 15 Q 50% 30 20 30 L 10 30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
                        </svg>

                        <div className="mt-8 space-y-6 relative pl-2">
                            <div className="absolute left-[13px] top-0 bottom-6 w-px border-l-2 border-dashed border-white/10 z-0"></div>

                            {course.modules?.map((mod: any) => (
                                <div key={mod.id} className="relative pl-8">
                                    <div className="absolute left-[13px] top-[26px] w-5 h-px border-t-2 border-dashed border-white/10"></div>

                                    {/* MODULE CARD */}
                                    <div className="bg-black border border-white/5 rounded-2xl overflow-hidden relative z-10">
                                        <button 
                                            onClick={() => toggleModule(mod.id)}
                                            className="w-full p-4 flex justify-between items-center text-left hover:bg-white/5 transition-colors"
                                        >
                                            <span className="font-bold text-sm text-zinc-300 uppercase tracking-wide">{mod.title}</span>
                                            <ChevronDown size={16} className={`text-zinc-600 transition-transform ${expandedModules.has(mod.id) ? 'rotate-180' : ''}`}/>
                                        </button>
                                        
                                        <AnimatePresence>
                                            {expandedModules.has(mod.id) && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }} 
                                                    animate={{ height: 'auto', opacity: 1 }} 
                                                    exit={{ height: 0, opacity: 0 }} 
                                                    className="overflow-hidden bg-zinc-900/30 border-t border-white/5"
                                                >
                                                    <div className="p-2 space-y-1 relative">
                                                        <div className="absolute left-4 top-0 bottom-4 w-px bg-white/5"></div>

                                                        {mod.lessons?.map((lesson: any) => {
                                                            const isCompleted = completedLessons.has(lesson.id);
                                                            const isActive = activeLesson?.id === lesson.id && viewState === 'PLAYER';
                                                            
                                                            return (
                                                              <div key={lesson.id} className="relative pl-6">
                                                                  <div className="absolute left-4 top-1/2 w-2 h-px bg-white/10"></div>

                                                                  <div className={`w-full p-2 pl-3 rounded-xl flex items-center gap-3 transition-all group ${isActive ? 'bg-white/5 border border-red-600/30' : 'hover:bg-white/5 border border-transparent'}`}>
                                                                      <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleLessonCompletion(lesson.id);
                                                                        }}
                                                                        className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all border relative z-20 ${
                                                                            isCompleted 
                                                                            ? 'bg-green-500 border-green-500 text-black' 
                                                                            : 'bg-black border-zinc-600 text-transparent hover:border-zinc-400'
                                                                        }`}
                                                                      >
                                                                          <Check size={12} strokeWidth={4} />
                                                                      </button>

                                                                      <button 
                                                                          onClick={() => handleLessonSelect(lesson)}
                                                                          className="flex-1 text-left flex items-center justify-between min-w-0"
                                                                      >
                                                                          <span className={`text-xs font-bold uppercase truncate ${
                                                                              isActive ? 'text-red-500 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]' : 'text-zinc-400 group-hover:text-zinc-200'
                                                                          } ${isCompleted && !isActive ? 'line-through decoration-zinc-600 opacity-50' : ''}`}>
                                                                              {lesson.title}
                                                                          </span>
                                                                          {isActive && <Play size={8} className="text-red-500 fill-red-500 animate-pulse ml-2 flex-shrink-0"/>}
                                                                      </button>
                                                                  </div>
                                                              </div>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            ))}
                        </div>
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

      {/* --- RIGHT SIDE WRAPPER (Main Content + Overlay) --- */}
      <div className="flex-1 h-screen relative flex flex-col overflow-hidden bg-[#050505]">
          
          {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="absolute top-6 left-6 z-50 p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-red-600 transition-all">
                  <Menu size={20}/>
              </button>
          )}

          {/* SCROLLABLE MAIN CONTENT */}
          <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12 relative">
             
             {/* === VIEW: HOME (LOBBY) === */}
             {viewState === 'HOME' && (
                <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="space-y-8">
                   
                   {/* STATUS HEADER */}
                   <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-3">
                           <div className={`h-8 w-1 rounded-full ${isAdmin ? 'bg-yellow-500' : 'bg-red-600'}`}></div>
                           <span className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Status</span>
                       </div>

                       <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full border shadow-xl ${isAdmin ? 'bg-gradient-to-r from-yellow-600/20 to-black border-yellow-500/50 text-yellow-400' : 'bg-gradient-to-r from-red-900/20 to-black border-red-600/40 text-red-500'}`}>
                           {isAdmin ? <Crown size={20} fill="currentColor"/> : getRankIcon(stats.rank, 20)}
                           <span className="text-sm font-black uppercase italic tracking-wider">
                               {isAdmin ? 'MASTER ADMIN' : stats.rank}
                           </span>
                       </div>
                   </div>

                   {/* MAIN HERO CARD */}
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
                      
                      <div className="relative z-10 flex flex-col gap-6">
                         <div className="space-y-4 max-w-2xl">
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
                         
                         {/* FLUID LIQUID PROGRESS BAR */}
                         <div className="mt-4">
                             <div className={`flex justify-between text-xs font-bold uppercase tracking-widest mb-3 ${isAdmin ? 'text-amber-900' : 'text-zinc-500'}`}>
                                <span>{isAdmin ? 'Capacidad del Sistema' : 'Progreso General'}</span>
                             </div>
                             
                             <div className={`h-8 w-full rounded-xl bg-black/40 border border-white/5 relative overflow-hidden shadow-inner`}>
                                <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ 
                                     width: isAdmin ? '100%' : `${stats.percentage}%`,
                                     backgroundPosition: ["0% 50%", "200% 50%"] 
                                   }}
                                   transition={{ 
                                     width: { duration: 1.5, ease: "easeOut" },
                                     backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" } 
                                   }}
                                   className={`absolute top-0 left-0 h-full bg-[length:200%_100%] bg-gradient-to-r ${getProgressBarStyles(isAdmin ? 100 : stats.percentage)}`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 pointer-events-none" />
                                </motion.div>
                                
                                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                    <span className={`text-xs font-black tracking-widest ${isAdmin ? 'text-black' : 'text-white drop-shadow-md'}`}>
                                        {isAdmin ? '100%' : `${stats.percentage}%`}
                                    </span>
                                </div>
                             </div>
                         </div>

                         <div className="mt-6">
                            <button onClick={resumeLearning} className={`px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all flex items-center gap-2 shadow-lg ${
                                isAdmin 
                                 ? 'bg-black text-white hover:bg-zinc-800 shadow-black/20'
                                 : 'bg-white text-black hover:bg-zinc-200 shadow-white/10'
                            }`}>
                               <Play size={16} fill="currentColor" /> {isAdmin ? 'REGRESAR AL CONTENIDO' : 'CONTINUAR APRENDIZAJE'}
                            </button>
                         </div>
                      </div>
                   </div>

                   {/* TROPHY ROOM */}
                   <div className="relative">
                      <h2 className="text-3xl lg:text-4xl text-center font-black italic uppercase tracking-tighter mb-12 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                         Sala de Trofeos
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 relative z-10">
                         
                         {trophyTiers.map((tier, idx) => {
                            const isUnlocked = isAdmin || stats.percentage >= tier.limit;
                            
                            return (
                               <div key={idx} className="flex flex-col items-center relative group-trophy">
                                  
                                  {/* CONNECTING PATH (CAMINITO) */}
                                  {idx < 2 && selectedTrophy === null && (
                                      <div className="absolute z-0 pointer-events-none
                                          /* Mobile: Vertical Line going Down */
                                          h-16 w-0 border-l-2 border-dotted border-white/10 bottom-[-4rem] left-1/2 -translate-x-1/2
                                          /* Desktop: Horizontal Line going Right */
                                          md:h-0 md:w-full md:border-t-2 md:border-l-0 md:top-1/2 md:left-[50%] md:translate-x-0 md:-translate-y-1/2 md:border-white/10
                                      ">
                                          <div className={`absolute bg-white shadow-[0_0_10px_white] rounded-full
                                              ${isUnlocked ? 'opacity-100' : 'opacity-20'}
                                              w-1.5 h-1.5 left-[-2px] animate-[ping_3s_linear_infinite]
                                          `} />
                                      </div>
                                  )}

                                  {/* GRID ITEM CONTAINER */}
                                  <div 
                                    className="perspective-container relative w-64 h-80" 
                                    style={{ perspective: '1000px' }}
                                    onClick={() => isUnlocked && setSelectedTrophy(idx)}
                                  >
                                      {/* Hide original when selected to allow layoutId transition */}
                                      <div className={selectedTrophy === idx ? 'opacity-0' : 'opacity-100'}>
                                          <motion.div
                                              layoutId={`trophy-card-${idx}`}
                                              initial={false}
                                              animate={{ 
                                                  y: [0, -10, 0],
                                                  rotateY: isUnlocked ? 15 : 0, 
                                              }}
                                              whileHover={isUnlocked ? {
                                                  scale: 1.1,
                                                  rotateY: 0,
                                                  rotateX: 0,
                                                  zIndex: 50,
                                                  transition: { duration: 0.4, ease: "easeOut" }
                                              } : {}}
                                              transition={{ 
                                                  y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: idx * 1.5 },
                                                  rotateY: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: idx * 1.5 }
                                              }}
                                          >
                                             <TrophyCardContent tier={tier} idx={idx} isUnlocked={isUnlocked} />
                                          </motion.div>
                                      </div>
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
                    {/* VIDEO PLAYER & INFO */}
                    <div className="w-full aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl relative group">
                        {activeLesson.video_url ? (
                            isEmbeddable(activeLesson.video_url) ? (
                                <iframe
                                    src={getEmbedUrl(activeLesson.video_url)}
                                    className="w-full h-full"
                                    allowFullScreen
                                    title={activeLesson.title}
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                        <Play size={40} className="text-white/30 ml-2" />
                                    </div>
                                    <h3 className="text-2xl font-black uppercase italic text-white mb-3 tracking-tight">Formato Externo</h3>
                                    <a href={activeLesson.video_url} target="_blank" rel="noopener noreferrer" className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all hover:scale-105 shadow-xl shadow-red-900/20">
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

                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
                            <h1 className="text-2xl lg:text-3xl font-black uppercase italic tracking-tight text-white leading-none">
                               {activeLesson.title}
                            </h1>
                            <div className="flex flex-col items-start md:items-end gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Valorar Clase</span>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <motion.button key={star} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => handleRateLesson(star)} className="outline-none">
                                            <Star size={20} className={userRating >= star ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" : "text-zinc-800"} fill={userRating >= star ? "currentColor" : "none"}/>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-zinc-900/30 rounded-2xl border border-white/5 text-zinc-400 leading-relaxed text-sm">
                            <h3 className="text-white font-bold uppercase mb-3 text-xs tracking-widest flex items-center gap-2"><FileText size={14} className="text-red-600"/> Resumen</h3>
                            {activeLesson.description || "Sin descripción disponible para esta clase."}
                        </div>

                        <div>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Materiales Disponibles</h3>
                            <div className="flex flex-wrap gap-4">
                                {activeLesson.resources ? (
                                    <a href={activeLesson.resources} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-zinc-900 border border-white/10 rounded-xl hover:bg-white/5 hover:border-red-600/50 transition-all group min-w-[250px]">
                                        <div className="p-2 bg-red-600/10 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
                                            <Download size={18}/>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs uppercase text-zinc-300 group-hover:text-white">Descargar Recurso</span>
                                            <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Clic para abrir</span>
                                        </div>
                                    </a>
                                ) : (
                                    <div className="px-6 py-4 border border-dashed border-white/10 rounded-xl">
                                        <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Sin materiales adjuntos</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </motion.div>
             )}
          </main>

          {/* --- HERO ANIMATION OVERLAY --- */}
          <AnimatePresence>
            {selectedTrophy !== null && (
              <>
                 {/* 1. Blur Backdrop */}
                 <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-xl z-[40]"
                    onClick={() => setSelectedTrophy(null)}
                 />

                 {/* 2. The Floating Hero Card Container */}
                 <div className="absolute inset-0 flex items-center justify-center z-[50] pointer-events-none perspective-[1200px]">
                     <motion.div
                        layoutId={`trophy-card-${selectedTrophy}`}
                        className="relative w-80 h-96 cursor-pointer pointer-events-auto"
                        onClick={() => setSelectedTrophy(null)}
                        // GENTLE FLOATING ANIMATION (LEVITATION)
                        animate={{ y: [0, -20, 0] }}
                        transition={{ 
                           y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                           layout: { duration: 0.6, ease: [0.6, 0.01, -0.05, 0.9] } 
                        }}
                        style={{ transformStyle: 'preserve-3d' }}
                     >
                        {/* GLOWING PARTICLES EFFECT */}
                        {[...Array(12)].map((_, i) => (
                           <motion.div
                              key={i}
                              className={`absolute w-1.5 h-1.5 rounded-full ${trophyTiers[selectedTrophy].glowColor} blur-[1px] shadow-[0_0_5px_currentColor]`}
                              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                              animate={{ 
                                 opacity: [0, 0.8, 0], 
                                 scale: [0, 1.5, 0],
                                 x: Math.random() * 200 - 100, // Random spread X
                                 y: Math.random() * 200 - 100  // Random spread Y
                              }}
                              transition={{ 
                                 duration: 2 + Math.random() * 2, 
                                 repeat: Infinity, 
                                 delay: Math.random() * 2,
                                 ease: "easeInOut"
                              }}
                              style={{
                                 top: '50%', 
                                 left: '50%',
                                 zIndex: -1
                              }}
                           />
                        ))}
                        
                        {/* BACK GLOW */}
                        <motion.div 
                           initial={{ opacity: 0, scale: 0.5 }}
                           animate={{ opacity: 1, scale: 1.2 }}
                           exit={{ opacity: 0, scale: 0.5 }}
                           className={`absolute inset-0 ${trophyTiers[selectedTrophy].glowColor} blur-[80px] rounded-full -z-10 opacity-60`}
                           style={{ transform: 'translateZ(-50px)' }}
                        />
                        
                        {/* ACTUAL CARD CONTENT */}
                        <TrophyCardContent tier={trophyTiers[selectedTrophy]} idx={selectedTrophy} isUnlocked={true} />
                     </motion.div>
                 </div>
              </>
            )}
          </AnimatePresence>
      </div>

    </div>
  );
};

export default Dashboard;
