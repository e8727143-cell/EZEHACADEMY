
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, FileText, ChevronDown, Lock, LogOut, Menu, X, Zap, ExternalLink, 
  Check, Award, Star, Crown, ChevronRight, ChevronLeft,
  Shield, CheckSquare, Square, Download, ArrowLeft, Settings, BookOpen
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
type ViewState = 'HOME' | 'COURSE' | 'MODULE' | 'PLAYER';

// --- CUSTOM STYLES ---
const CUSTOM_STYLES = `
  /* SKEWED GRID (COURSE VIEW) */
  .skewed-grid {
      transform: perspective(1000px) rotateX(4deg) rotateY(-8deg);
  }
  .skewed-card {
      transform: skewX(-4deg);
      transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .skewed-card:hover {
      transform: skewX(-4deg) translateY(-15px) scale(1.03);
      box-shadow: 0 0 30px rgba(234, 42, 51, 0.25);
      z-index: 20;
  }
  .content-unskew {
      transform: skewX(4deg);
  }
  .red-gradient-bar {
      background: linear-gradient(90deg, #ea2a33 0%, #ff5e62 100%);
      box-shadow: 0 0 10px rgba(234, 42, 51, 0.6);
  }

  /* 3D LESSON FLOW (MODULE VIEW) */
  .perspective-container {
      perspective: 2000px;
      overflow: visible;
  }
  .lesson-flow {
      transform-style: preserve-3d;
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
  }
  .lesson-card-3d {
      transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
      transform-style: preserve-3d;
      position: absolute;
      top: 0; 
      left: 0; 
      right: 0; 
      bottom: 0; 
      margin: auto;
      width: 420px;
      height: 260px;
  }
  .card-left {
      transform: translateX(-120%) rotateY(25deg) scale(0.85) translateZ(-100px);
      opacity: 0.6;
      z-index: 10;
      pointer-events: none;
  }
  .card-center {
      transform: translateX(0) rotateY(0deg) scale(1.1) translateZ(100px);
      z-index: 50;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(234, 42, 51, 0.2);
  }
  .card-right {
      transform: translateX(120%) rotateY(-25deg) scale(0.85) translateZ(-100px);
      opacity: 0.6;
      z-index: 10;
      pointer-events: none;
  }
  .card-hidden-left {
      transform: translateX(-200%) scale(0.5) translateZ(-200px);
      opacity: 0;
      z-index: 0;
      pointer-events: none;
  }
  .card-hidden-right {
      transform: translateX(200%) scale(0.5) translateZ(-200px);
      opacity: 0;
      z-index: 0;
      pointer-events: none;
  }
  .play-glow {
      box-shadow: 0 0 40px rgba(234, 42, 51, 0.4);
  }
  @media (max-width: 768px) {
      .lesson-card-3d { width: 300px; height: 180px; }
      .card-left { transform: translateX(-50%) scale(0.8); opacity: 0; }
      .card-right { transform: translateX(50%) scale(0.8); opacity: 0; }
  }
`;

const MODULE_IMAGES = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAj0Q2RlKwJAsYw_hTo7o6PB7e8FJfAJLU5k4e57mb0DExb8strcQkw8O5sy5eh3p4WeIGj5eCeRHLyxGReQF5DcilDsFNr0OZ5CquGAMk_QuulXs187LO77ifjt5HSVOpIJfBXS-LIGt4z69HFqv9VDV8cNpF5Kd59-gnWE5BfzZ8hW-cRMtYRwa5k-JbnwYxNoqUiDcEG-q_FKeIvtAJ3agt1tBGPwRZ-yQUrjKrxiCy6E6TYNvZS9ZeER8px43yxb4vPuaJhdw0",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuB_HbHRxFzmfmIRtKTXkWbcv0OVqKzhaZKuy1nXlyOSs9A5HsyxKJpmTTVNQLlU46AEJJXDXAATWj3YwV7Sr8Au2drVjCpwlicRC0BZyTLoq62dnRzD2U-gT3Vu772Nb3sB9-_rtXqpI0V-QAvJf73n84GabpCJIsl7_GjTqSiIylgA5ztDcT0HIiA50uEp21NrxpQuA28utjs2qWMN9w81YczGvDGEtilO-kwyz3xdYItCEaux8b4OOfdAiVE4AUdDjza8XQ1j9Ys",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCVPecZFuxFvP9QpeTSoZaoWx1HkFfJpBC-SxSRVjWEVRafajE_CdN_W6DVCIU61z1GXAKD0fhof-sGcPRmpDJJKhNb0oR8J2ErqyeNZLJcM9ssClL1oka95tJNDkgHmKFWyW7nB5zhz7P5jKgpSZUUgFAvhSWUsiE0t4D8QzTe3FYszE7ClTtDM9vQyV4Ed_DwcnMcIaUW1o0bzW6L5VNYjJ89WBl_fQfWtebU9IxTBZWjXc6jmBTpQZcqxC4oqTngwvWBA5rAkJg",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDWSxgJKvfDJb-upyc0xoUq03xPSgLmielLtycBo3idniJuCMHAZ2S6pdbwblx02crLInY1WYeoGD2r9djAYfUbsO7nfMSJ-GbYwLT4EYAd7qknEYPtbicdYvU-KzYYp1xqx4niLuKSOfunBEecZqiFbLGmlc_b4UGe0sZLenzh0Jp12POWQV9nCnL6uc8a51ZrO9dk5SctoNL_ojHIXqVzhR-3tz2QoTph9nP18zQpgRsGkciazfxdYeQIyjPUwl5Zm4ONcYJYYPA",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCB2ssRUL09yIZqxEgrM96PguRQ9nTJLj4QHhXGFfEc3F3JKtSpS4LK8GcmBT0Z8hqXg9E9ps2n3T5dl_wzTjfNoTLHavFce4MYnOwNYAzMkEyCTSaW6kHJ9MQIf8_fugGq00gbcRvYZZM7yt8fqwTO3qxvt1IweYRWL1FQxh_5MOdbtrNy9Dt0SgVdsgwvB5luaHO8DaGGsxFLYxLlnze5U5D_ZyF-fSGdzU7XdOukGx0M4-NfGqUUfZTdSvP6KViFnahL8HOqv_A",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBFlkYJ_7AcKbLiRlu_U50bpA_PzA1F2ZA2q1zA-RaWKKcsUiX-CNtLr9b5c8oYfLJSWWh61DVDNGxnsYXGPqlMNOqtqq3ajT-VQBQ_1zd-r_e56tPImA3gcCaBFWrjh_DPkkcvdGED8BGxbPTOP_V4DEPtu5PN64XNyy5Z8JjSJbFXDRwqln_gS2QaN_DqpPvIVkN50uK2a_M0OndiAUZEF4fGalKbIfIoaJ9ufTD8dJMFI8Cw_I76CoaUyEgQZK8G62Gq56nJZPs"
];

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  // Navigation State
  const [viewState, setViewState] = useState<ViewState>('HOME');
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<any>(null); // NEW: Track selected module
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [focusedLessonIdx, setFocusedLessonIdx] = useState(0); // NEW: For 3D Carousel
  
  // Rating State
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

  useEffect(() => {
    if (activeLesson) fetchLessonRating(activeLesson.id);
    else setUserRating(0);
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
    }
  }

  async function fetchProgress() {
    const { data, error } = await supabase.from('user_progress').select('lesson_id').eq('user_id', user.id);
    if (!error && data) {
      setCompletedLessons(new Set(data.map(item => item.lesson_id)));
    }
  }

  async function fetchLessonRating(lessonId: string) {
    // Use maybeSingle() instead of single() to avoid errors in console if no rating exists
    const { data } = await supabase.from('lesson_ratings').select('rating').eq('user_id', user.id).eq('lesson_id', lessonId).maybeSingle();
    setUserRating(data ? data.rating : 0);
  }

  const handleRateLesson = async (rating: number) => {
    setUserRating(rating);
    if (!activeLesson) return;
    
    const { error } = await supabase.from('lesson_ratings').upsert(
        { user_id: user.id, lesson_id: activeLesson.id, rating: rating }, 
        { onConflict: 'user_id, lesson_id' }
    );
    
    if (error) {
        console.error("Error saving rating:", error);
        // Optional: Revert state if needed, but keeping optimistic update is usually fine for UX
    }
  };

  const toggleLessonCompletion = async (lessonId: string) => {
    const isComplete = completedLessons.has(lessonId);
    const nextSet = new Set(completedLessons);
    if (isComplete) nextSet.delete(lessonId); else nextSet.add(lessonId);
    setCompletedLessons(nextSet);

    if (isComplete) await supabase.from('user_progress').delete().match({ user_id: user.id, lesson_id: lessonId });
    else await supabase.from('user_progress').insert({ user_id: user.id, lesson_id: lessonId });
  };

  // --- NAVIGATION HANDLERS ---
  const handleCourseSelect = (course: any) => {
    setActiveCourse(course);
    setViewState('COURSE');
  };

  const handleModuleClick = (module: any, isLocked: boolean) => {
    if (isLocked && !isAdmin) return;
    
    setActiveModule(module);
    setViewState('MODULE');
    
    // Find first unfinished lesson to focus
    if (module.lessons && module.lessons.length > 0) {
        const firstUnfinished = module.lessons.findIndex((l: any) => !completedLessons.has(l.id));
        setFocusedLessonIdx(firstUnfinished !== -1 ? firstUnfinished : 0);
    } else {
        setFocusedLessonIdx(0);
    }
  };

  const handleLessonFlowNav = (direction: 'prev' | 'next') => {
      if (!activeModule?.lessons) return;
      if (direction === 'prev') {
          setFocusedLessonIdx(prev => Math.max(0, prev - 1));
      } else {
          setFocusedLessonIdx(prev => Math.min(activeModule.lessons.length - 1, prev + 1));
      }
  };

  const selectLessonFromFlow = () => {
      if (!activeModule?.lessons || !activeModule.lessons[focusedLessonIdx]) return;
      handleLessonSelect(activeModule.lessons[focusedLessonIdx], activeModule.id);
  };

  const handleLessonSelect = (lesson: any, moduleId?: string) => {
    setActiveLesson(lesson);
    setViewState('PLAYER');
    if (moduleId) {
        setExpandedModules(new Set([moduleId]));
    }
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const toggleModuleInPlayer = (id: string) => {
    const next = new Set(expandedModules);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedModules(next);
  };

  const goBackToCourse = () => {
    setViewState('COURSE');
    setActiveLesson(null);
    setActiveModule(null);
  };

  const goBackToModule = () => {
    if(activeModule) {
        setViewState('MODULE');
        setActiveLesson(null);
    } else {
        goBackToCourse();
    }
  };

  const goHome = () => {
    setViewState('HOME');
    setActiveCourse(null);
    setActiveModule(null);
    setActiveLesson(null);
  };

  // --- CALCULATIONS ---
  const getModuleStats = (mod: any) => {
      const total = mod.lessons?.length || 0;
      const completed = mod.lessons?.filter((l: any) => completedLessons.has(l.id)).length || 0;
      const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
      return { total, completed, percent };
  };

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
            setActiveCourse(course);
            handleLessonSelect(lesson, mod.id);
            return;
          }
        }
      }
    }
    if (courses[0]) {
        setActiveCourse(courses[0]);
        setViewState('COURSE');
    }
  };

  // --- EMBED UTILS ---
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

  const getProgressBarStyles = (percent: number) => {
    if (percent >= 100) return 'from-emerald-600 via-green-400 to-emerald-600 shadow-[0_0_25px_rgba(34,197,94,0.6)]';
    if (percent >= 50) return 'from-amber-600 via-yellow-400 to-amber-600 shadow-[0_0_20px_rgba(234,179,8,0.4)]';
    return 'from-red-800 via-red-500 to-red-800 shadow-[0_0_20px_rgba(220,38,38,0.4)]';
  };

  // --- TROPHY DATA ---
  const trophyTiers = [
     { limit: 0, label: "NOVATO", letter: "N", glowColor: "bg-slate-400", colors: { bg: "bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600", border: "border-slate-400", letterColor: "text-slate-900" } },
     { limit: 50, label: "CREADOR", letter: "C", glowColor: "bg-amber-500", colors: { bg: "bg-gradient-to-br from-[#fff7ad] via-[#ffa900] to-[#b45309]", border: "border-[#78350f]", letterColor: "text-[#78350f]" } },
     { limit: 100, label: "MAESTRO DEL CONTENIDO", letter: "M", glowColor: "bg-red-600", colors: { bg: "bg-gradient-to-br from-red-500 via-red-600 to-red-950", border: "border-red-900", letterColor: "text-red-950" } },
  ];

  const TrophyCardContent = ({ tier, idx, isUnlocked }: { tier: any, idx: number, isUnlocked: boolean }) => (
    <div className={`w-full h-full bg-[#111] rounded-[4px] border-[12px] border-[#222] shadow-[20px_20px_40px_rgba(0,0,0,0.8)] relative flex flex-col items-center justify-center overflow-hidden ${!isUnlocked ? 'grayscale opacity-30' : 'cursor-pointer'}`} style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}>
        <div className="absolute inset-0 border-[2px] border-white/10 pointer-events-none"/>
        <div className={`relative w-32 h-24 ${tier.colors.bg} rounded-2xl shadow-xl flex items-center justify-center overflow-hidden mb-6 z-10`} style={{ transform: 'translateZ(20px)' }}>
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 pointer-events-none" />
            {isUnlocked && <div className="absolute inset-0 z-20"><motion.div animate={{ x: ['-200%', '200%'] }} transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: idx * 2 }} className="w-full h-full bg-gradient-to-r from-transparent via-white/60 to-transparent -skew-x-12 opacity-80"/></div>}
            <span className={`text-5xl font-black ${tier.colors.letterColor} drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] relative z-10 font-serif`}>{tier.letter}</span>
        </div>
        <div className="absolute bottom-10 px-4 py-2 bg-[#050505] border border-white/10 rounded w-[80%] text-center shadow-inner" style={{ transform: 'translateZ(10px)' }}>
            {isUnlocked ? <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block truncate">{user.fullName}</span> : <div className="h-3 bg-zinc-800 rounded animate-pulse w-full"/>}
        </div>
        <div className="absolute top-4 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">{tier.label}</div>
    </div>
  );

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-bold tracking-widest uppercase">Cargando tu Academia...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex overflow-hidden">
      <style>{CUSTOM_STYLES}</style>
      
      {/* --- SIDEBAR --- */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? '350px' : '0px', opacity: sidebarOpen ? 1 : 0 }}
        className="h-screen bg-[#0a0a0a] border-r border-white/5 flex-shrink-0 flex flex-col overflow-hidden relative z-[60]"
      >
        <div className="p-8 border-b border-white/5 flex flex-col justify-center items-center relative bg-zinc-900/50 cursor-pointer" onClick={goHome}>
            <button onClick={(e) => { e.stopPropagation(); setSidebarOpen(false); }} className="lg:hidden absolute top-6 right-6 text-white"><X/></button>
            <h2 className="font-black italic text-3xl tracking-tighter text-center">EZEH <span className="text-red-600">ACADEMY</span></h2>
        </div>

        <div className="p-4 border-b border-white/5">
             <div onClick={goHome} className={`relative overflow-hidden w-full p-6 rounded-2xl cursor-pointer group transition-all duration-500 shadow-2xl ${isAdmin ? 'bg-gradient-to-r from-[#b45309] via-[#78350f] to-black' : 'bg-gradient-to-r from-red-800 via-red-950 to-black'}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[shimmer_3s_infinite]" />
                <div className="relative z-10 flex items-center justify-between">
                    <span className={`text-sm font-black uppercase tracking-[0.2em] ${isAdmin ? 'text-yellow-100' : 'text-white'}`}>Panel Home</span>
                    <div className={`p-2 rounded-full border ${isAdmin ? 'bg-yellow-500 text-black border-yellow-300' : 'bg-white text-red-600 border-white'} shadow-[0_0_15px_rgba(255,255,255,0.4)]`}><Play size={14} fill="currentColor" /></div>
                </div>
            </div>
        </div>

        {/* --- DYNAMIC SIDEBAR CONTENT --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-20">
            {viewState === 'PLAYER' && activeCourse ? (
                // PLAYER MODE: SHOW MODULE TREE FOR ACTIVE COURSE
                <div className="animate-fade-in">
                    <div className="px-4 mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Contenido del Curso</div>
                    <div className="space-y-4">
                    {activeCourse.modules?.map((mod: any) => (
                        <div key={mod.id} className="bg-black border border-white/5 rounded-xl overflow-hidden">
                             <button onClick={() => toggleModuleInPlayer(mod.id)} className="w-full p-4 flex justify-between items-center text-left hover:bg-white/5">
                                <span className="font-bold text-xs text-zinc-300 uppercase tracking-wide">{mod.title}</span>
                                <ChevronDown size={14} className={`text-zinc-600 transition-transform ${expandedModules.has(mod.id) ? 'rotate-180' : ''}`}/>
                             </button>
                             <AnimatePresence>
                                {expandedModules.has(mod.id) && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-zinc-900/30 border-t border-white/5">
                                        <div className="p-2 space-y-1">
                                            {mod.lessons?.map((lesson: any) => {
                                                const isActive = activeLesson?.id === lesson.id;
                                                const isCompleted = completedLessons.has(lesson.id);
                                                return (
                                                  <button key={lesson.id} onClick={() => handleLessonSelect(lesson)} className={`w-full p-2 pl-4 rounded-lg flex items-center gap-3 text-left transition-all ${isActive ? 'bg-white/10 text-red-500' : 'hover:bg-white/5 text-zinc-400'}`}>
                                                      <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-green-500' : (isActive ? 'bg-red-500 animate-pulse' : 'bg-zinc-700')}`} />
                                                      <span className={`text-[10px] font-bold uppercase truncate ${isCompleted && !isActive ? 'line-through opacity-50' : ''}`}>{lesson.title}</span>
                                                  </button>
                                                )
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                             </AnimatePresence>
                        </div>
                    ))}
                    </div>
                    <button onClick={goBackToModule} className="mt-8 w-full py-3 border border-white/10 rounded-xl text-xs font-bold uppercase text-zinc-400 hover:bg-white/5 flex items-center justify-center gap-2"><ArrowLeft size={14}/> Volver</button>
                </div>
            ) : (
                // HOME/COURSE/MODULE MODE: SHOW LIST OF COURSES ONLY
                <div className="space-y-4">
                    <div className="px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Mis Cursos</div>
                    {courses.map(course => {
                        const isActive = activeCourse?.id === course.id;
                        return (
                            <div key={course.id} onClick={() => handleCourseSelect(course)} className={`relative overflow-hidden p-5 rounded-2xl border transition-all cursor-pointer group ${isActive ? 'bg-white/10 border-red-600/50' : 'bg-black border-white/10 hover:border-white/30'}`}>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs ${isActive ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}>
                                        {course.title.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`text-xs font-black uppercase truncate ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{course.title}</h3>
                                        <p className="text-[9px] text-zinc-600 mt-1 uppercase tracking-wider">{course.modules?.length || 0} Módulos</p>
                                    </div>
                                    {isActive && <ChevronRight size={14} className="text-red-600"/>}
                                </div>
                                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-transparent pointer-events-none"/>}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>

        <div className="p-4 border-t border-white/5 space-y-3">
            {isAdmin && (
                <Link to="/admin" className="w-full py-4 rounded-xl text-xs font-black uppercase text-white bg-gradient-to-r from-red-600 to-red-900 hover:scale-[1.02] transition-transform shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 border border-white/10">
                    <Zap size={16} className="text-yellow-400 fill-yellow-400 animate-pulse"/> EZEH STUDIO
                </Link>
            )}
            <button onClick={onLogout} className="w-full py-3 bg-zinc-900 rounded-xl text-xs font-bold uppercase text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                <LogOut size={14}/> Cerrar Sesión
            </button>
        </div>
      </motion.aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 h-screen relative flex flex-col overflow-hidden bg-[#050505]">
          {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="absolute top-6 left-6 z-50 p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-red-600 transition-all">
                  <Menu size={20}/>
              </button>
          )}

          <main className="flex-1 overflow-y-auto custom-scrollbar p-0 relative">
             
             {/* === VIEW: HOME (LOBBY) === */}
             {viewState === 'HOME' && (
                <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="space-y-8 p-6 lg:p-12">
                   {/* RANK & STATUS */}
                   <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-3">
                           <div className={`h-8 w-1 rounded-full ${isAdmin ? 'bg-yellow-500' : 'bg-red-600'}`}></div>
                           <span className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Status</span>
                       </div>
                       <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full border shadow-xl ${isAdmin ? 'bg-gradient-to-r from-yellow-600/20 to-black border-yellow-500/50 text-yellow-400' : 'bg-gradient-to-r from-red-900/20 to-black border-red-600/40 text-red-500'}`}>
                           {isAdmin ? <Crown size={20} fill="currentColor"/> : getRankIcon(stats.rank, 20)}
                           <span className="text-sm font-black uppercase italic tracking-wider">{isAdmin ? 'MASTER ADMIN' : stats.rank}</span>
                       </div>
                   </div>

                   {/* HERO CARD */}
                   <div className={`relative overflow-hidden rounded-[2.5rem] border p-8 lg:p-12 shadow-2xl transition-all ${isAdmin ? 'bg-gradient-to-br from-amber-200 via-yellow-500 to-amber-700 border-yellow-400/50 shadow-yellow-600/20' : 'bg-[#0a0a0a] border-white/10'}`}>
                      {!isAdmin && <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 blur-[100px] rounded-full pointer-events-none"/>}
                      <div className="relative z-10 flex flex-col gap-6">
                         <div className="space-y-4 max-w-2xl">
                            <h1 className={`text-4xl lg:text-6xl font-black italic uppercase tracking-tighter ${isAdmin ? 'text-black drop-shadow-sm' : 'text-white'}`}>
                               Hola, <span className={isAdmin ? 'text-white drop-shadow-md' : 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600'}>{user.fullName}</span>
                            </h1>
                            <p className={`text-sm font-medium leading-relaxed ${isAdmin ? 'text-amber-900' : 'text-zinc-400'}`}>
                               {isAdmin ? "Bienvenido a tu cuartel general. Desde aquí controlas todo el imperio de Ezeh Academy." : <><span className="text-white font-bold">{stats.totalCompleted}</span> de <span className="text-white font-bold">{stats.totalLessons}</span> misiones completadas. Continúa tu camino hacia la leyenda.</>}
                            </p>
                         </div>
                         <div className="mt-4">
                             <div className={`flex justify-between text-xs font-bold uppercase tracking-widest mb-3 ${isAdmin ? 'text-amber-900' : 'text-zinc-500'}`}>
                                <span>{isAdmin ? 'Capacidad del Sistema' : 'Progreso General'}</span>
                             </div>
                             <div className={`h-8 w-full rounded-xl bg-black/40 border border-white/5 relative overflow-hidden shadow-inner`}>
                                <motion.div initial={{ width: 0 }} animate={{ width: isAdmin ? '100%' : `${stats.percentage}%`, backgroundPosition: ["0% 50%", "200% 50%"] }} transition={{ width: { duration: 1.5, ease: "easeOut" }, backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" } }} className={`absolute top-0 left-0 h-full bg-[length:200%_100%] bg-gradient-to-r ${getProgressBarStyles(isAdmin ? 100 : stats.percentage)}`}>
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 pointer-events-none" />
                                </motion.div>
                                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"><span className={`text-xs font-black tracking-widest ${isAdmin ? 'text-black' : 'text-white drop-shadow-md'}`}>{isAdmin ? '100%' : `${stats.percentage}%`}</span></div>
                             </div>
                         </div>
                         <div className="mt-6">
                            <button onClick={resumeLearning} className={`px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all flex items-center gap-2 shadow-lg ${isAdmin ? 'bg-black text-white hover:bg-zinc-800 shadow-black/20' : 'bg-white text-black hover:bg-zinc-200 shadow-white/10'}`}>
                               <Play size={16} fill="currentColor" /> {isAdmin ? 'REGRESAR AL CONTENIDO' : 'CONTINUAR APRENDIZAJE'}
                            </button>
                         </div>
                      </div>
                   </div>

                   {/* TROPHY ROOM */}
                   <div className="relative">
                      <h2 className="text-3xl lg:text-4xl text-center font-black italic uppercase tracking-tighter mb-12 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Sala de Trofeos</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 relative z-10">
                         {trophyTiers.map((tier, idx) => {
                            const isUnlocked = isAdmin || stats.percentage >= tier.limit;
                            return (
                               <div key={idx} className="flex flex-col items-center relative group-trophy">
                                  {idx < 2 && selectedTrophy === null && (
                                      <div className="absolute z-0 pointer-events-none h-16 w-0 border-l-2 border-dotted border-white/10 bottom-[-4rem] left-1/2 -translate-x-1/2 md:h-0 md:w-full md:border-t-2 md:border-l-0 md:top-1/2 md:left-[50%] md:translate-x-0 md:-translate-y-1/2 md:border-white/10">
                                          <div className={`absolute bg-white shadow-[0_0_10px_white] rounded-full ${isUnlocked ? 'opacity-100' : 'opacity-20'} w-1.5 h-1.5 left-[-2px] animate-[ping_3s_linear_infinite]`} />
                                      </div>
                                  )}
                                  <div className="perspective-container relative w-64 h-80" style={{ perspective: '1000px' }} onClick={() => isUnlocked && setSelectedTrophy(idx)}>
                                      <div className={selectedTrophy === idx ? 'opacity-0' : 'opacity-100'}>
                                          <motion.div layoutId={`trophy-card-${idx}`} initial={false} animate={{ y: [0, -10, 0], rotateY: isUnlocked ? 15 : 0 }} whileHover={isUnlocked ? { scale: 1.1, rotateY: 0, rotateX: 0, zIndex: 50, transition: { duration: 0.4, ease: "easeOut" } } : {}} transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: idx * 1.5 }, rotateY: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: idx * 1.5 } }}>
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

             {/* === VIEW: COURSE OVERVIEW (SKEWED MODULE GRID) === */}
             {viewState === 'COURSE' && activeCourse && (
                <motion.div initial={{opacity: 0, x: 20}} animate={{opacity: 1, x: 0}} className="min-h-full p-6 lg:p-12">
                    
                    {/* RESTORED TITLE */}
                    <div className="mb-20 text-center relative z-10">
                         <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase italic">
                            {activeCourse.title.split(' ').map((word: string, i: number) => (
                                <span key={i} className={word.toUpperCase().includes('YOUTUBE') ? "text-red-600" : "text-white"}>
                                    {word}{' '}
                                </span>
                            ))}
                         </h1>
                    </div>
                    
                    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 skewed-grid px-8 pb-32">
                        {activeCourse.modules?.map((mod: any, index: number) => {
                            const { percent } = getModuleStats(mod);
                            const prevModuleStats = index > 0 ? getModuleStats(activeCourse.modules[index - 1]) : { percent: 100 };
                            const isLocked = !isAdmin && index > 0 && prevModuleStats.percent < 100;

                            return (
                                <div 
                                    key={mod.id} 
                                    onClick={() => handleModuleClick(mod, isLocked)}
                                    className={`skewed-card group relative bg-gradient-to-b from-[#2a0a0a] to-black border border-white/5 rounded-2xl overflow-hidden cursor-pointer ${isLocked ? 'opacity-70 grayscale' : ''}`}
                                >
                                    <div className="aspect-[16/10] overflow-hidden relative">
                                        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url("${MODULE_IMAGES[index % MODULE_IMAGES.length]}")` }}/>
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent"></div>
                                        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-white/10 text-[9px] font-black tracking-widest uppercase content-unskew text-zinc-300">
                                            Módulo 0{index + 1}
                                        </div>
                                    </div>
                                    <div className="p-8 content-unskew relative bg-transparent">
                                        <h3 className="text-2xl font-bold leading-tight mb-8 text-zinc-100 group-hover:text-white uppercase italic">{mod.title}</h3>
                                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative mb-6">
                                            <div className="absolute left-0 top-0 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-1000" style={{ width: `${percent}%` }}/>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            {isLocked ? (
                                                <><span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider flex items-center gap-2"><Lock size={12}/> Bloqueado</span><Lock className="text-zinc-700 text-xl" /></>
                                            ) : (
                                                <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">{percent}% Completado</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
             )}

             {/* === VIEW: MODULE LESSON FLOW (3D CAROUSEL) === */}
             {viewState === 'MODULE' && activeModule && activeModule.lessons && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col justify-between items-center py-12 px-4 relative overflow-hidden">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-red-600/5 blur-[120px] pointer-events-none rounded-full"></div>
                     
                     <header className="w-full max-w-7xl flex flex-col items-center z-10">
                         {/* REMOVED BREADCRUMBS AS REQUESTED */}
                         <h1 className="text-3xl md:text-5xl font-black tracking-tight text-center uppercase italic">SECCIÓN DE <span className="text-red-600">CLASES</span></h1>
                     </header>

                     {/* 3D CAROUSEL CONTAINER */}
                     <div className="perspective-container w-full h-[60vh] flex items-center justify-center -mt-10">
                         <div className="lesson-flow">
                             {activeModule.lessons.map((lesson: any, idx: number) => {
                                 const diff = idx - focusedLessonIdx;
                                 let cardClass = 'card-hidden-right';
                                 if (diff === 0) cardClass = 'card-center';
                                 else if (diff === -1) cardClass = 'card-left';
                                 else if (diff === 1) cardClass = 'card-right';
                                 else if (diff < -1) cardClass = 'card-hidden-left';

                                 const isCompleted = completedLessons.has(lesson.id);

                                 return (
                                     <div 
                                        key={lesson.id}
                                        className={`lesson-card-3d group relative bg-[#0f0f0f] border ${diff === 0 ? 'border-white/10' : 'border-white/5'} rounded-xl overflow-hidden cursor-pointer ${cardClass}`}
                                        onClick={() => {
                                            if (diff === 0) selectLessonFromFlow();
                                            else setFocusedLessonIdx(idx);
                                        }}
                                     >
                                         <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuB_HbHRxFzmfmIRtKTXkWbcv0OVqKzhaZKuy1nXlyOSs9A5HsyxKJpmTTVNQLlU46AEJJXDXAATWj3YwV7Sr8Au2drVjCpwlicRC0BZyTLoq62dnRzD2U-gT3Vu772Nb3sB9-_rtXqpI0V-QAvJf73n84GabpCJIsl7_GjTqSiIylgA5ztDcT0HIiA50uEp21NrxpQuA28utjs2qWMN9w81YczGvDGEtilO-kwyz3xdYItCEaux8b4OOfdAiVE4AUdDjza8XQ1j9Ys")` }}></div>
                                         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                         
                                         {/* PLAY BUTTON (Center Card Only) */}
                                         {diff === 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-20 h-20 rounded-full bg-red-600/90 flex items-center justify-center play-glow group-hover:scale-110 transition-transform duration-300">
                                                    <Play size={40} fill="white" className="text-white ml-1"/>
                                                </div>
                                            </div>
                                         )}

                                         <div className="absolute bottom-0 left-0 w-full p-8">
                                             <div className="flex justify-between items-end mb-1">
                                                <span className={`text-[10px] font-black tracking-widest uppercase block ${diff === 0 ? 'text-red-600' : 'text-zinc-500'}`}>
                                                    Lección 0{idx + 1}
                                                </span>
                                                {isCompleted && <CheckSquare size={14} className="text-green-500 mb-1"/>}
                                             </div>
                                             <h3 className={`font-bold leading-tight ${diff === 0 ? 'text-2xl text-white' : 'text-xl text-zinc-400'}`}>{lesson.title}</h3>
                                         </div>
                                         
                                         {/* Progress Bar Line */}
                                         <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/10">
                                            <div className="red-gradient-bar h-full" style={{ width: isCompleted ? '100%' : '0%' }}></div>
                                         </div>
                                     </div>
                                 );
                             })}
                             {activeModule.lessons.length === 0 && (
                                 <div className="text-center text-zinc-500 font-bold uppercase tracking-widest">Este módulo aún no tiene lecciones.</div>
                             )}
                         </div>
                     </div>

                     <footer className="w-full max-w-7xl flex items-center justify-between pb-8 z-10 px-8">
                         <div className="flex items-center gap-6">
                             <button onClick={() => handleLessonFlowNav('prev')} className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors group">
                                 <ChevronLeft className="text-zinc-400 group-hover:text-white"/>
                             </button>
                             <div className="flex flex-col text-center min-w-[100px]">
                                 <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Progreso</span>
                                 <span className="text-sm font-bold text-white">
                                     {focusedLessonIdx + 1} / {activeModule.lessons.length}
                                 </span>
                             </div>
                             <button onClick={() => handleLessonFlowNav('next')} className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors group">
                                 <ChevronRight className="text-zinc-400 group-hover:text-white"/>
                             </button>
                         </div>
                         
                         <div className="flex items-center gap-8">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center">
                                     <BookOpen className="text-red-600" size={18}/>
                                 </div>
                                 <div className="flex flex-col">
                                     <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">Recursos</span>
                                     <span className="text-[10px] text-zinc-600 uppercase">{activeModule.lessons[focusedLessonIdx]?.resources ? 'Disponibles' : 'No disponibles'}</span>
                                 </div>
                             </div>
                             {/* REMOVED VER LECCION BUTTON AS REQUESTED */}
                         </div>
                     </footer>
                 </motion.div>
             )}

             {/* === VIEW: PLAYER (CLASS) === */}
             {viewState === 'PLAYER' && activeLesson && (
                <motion.div initial={{opacity: 0, x: 20}} animate={{opacity: 1, x: 0}} className="space-y-8 p-6 lg:p-12">
                    <div className="w-full aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl relative group">
                        {activeLesson.video_url ? (
                            isEmbeddable(activeLesson.video_url) ? (
                                <iframe src={getEmbedUrl(activeLesson.video_url)} className="w-full h-full" allowFullScreen title={activeLesson.title}/>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]"><Play size={40} className="text-white/30 ml-2" /></div>
                                    <h3 className="text-2xl font-black uppercase italic text-white mb-3 tracking-tight">Formato Externo</h3>
                                    <a href={activeLesson.video_url} target="_blank" rel="noopener noreferrer" className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all hover:scale-105 shadow-xl shadow-red-900/20"><ExternalLink size={20} /> Abrir Clase Externa</a>
                                </div>
                            )
                        ) : <div className="absolute inset-0 flex items-center justify-center"><p className="text-zinc-700 font-black uppercase tracking-[0.5em] text-xs">Sin Video Asignado</p></div>}
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
                            <h1 className="text-2xl lg:text-3xl font-black uppercase italic tracking-tight text-white leading-none">{activeLesson.title}</h1>
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
                                        <div className="p-2 bg-red-600/10 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors"><Download size={18}/></div>
                                        <div className="flex flex-col"><span className="font-bold text-xs uppercase text-zinc-300 group-hover:text-white">Descargar Recurso</span><span className="text-[9px] text-zinc-500 uppercase tracking-wider">Clic para abrir</span></div>
                                    </a>
                                ) : <div className="px-6 py-4 border border-dashed border-white/10 rounded-xl"><p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Sin materiales adjuntos</p></div>}
                            </div>
                        </div>
                    </div>
                </motion.div>
             )}
          </main>

          {/* --- HERO ANIMATION OVERLAY (TROPHY) --- */}
          <AnimatePresence>
            {selectedTrophy !== null && (
              <>
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl z-[40]" onClick={() => setSelectedTrophy(null)}/>
                 <div className="absolute inset-0 flex items-center justify-center z-[50] pointer-events-none perspective-[1200px]">
                     <motion.div layoutId={`trophy-card-${selectedTrophy}`} className="relative w-80 h-96 cursor-pointer pointer-events-auto" onClick={() => setSelectedTrophy(null)} animate={{ y: [0, -20, 0] }} transition={{ y: { duration: 4, repeat: Infinity, ease: "easeInOut" }, layout: { duration: 0.6, ease: [0.6, 0.01, -0.05, 0.9] } }} style={{ transformStyle: 'preserve-3d' }}>
                        {[...Array(12)].map((_, i) => (
                           <motion.div key={i} className={`absolute w-1.5 h-1.5 rounded-full ${trophyTiers[selectedTrophy].glowColor} blur-[1px] shadow-[0_0_5px_currentColor]`} initial={{ opacity: 0, scale: 0, x: 0, y: 0 }} animate={{ opacity: [0, 0.8, 0], scale: [0, 1.5, 0], x: Math.random() * 200 - 100, y: Math.random() * 200 - 100 }} transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2, ease: "easeInOut" }} style={{ top: '50%', left: '50%', zIndex: -1 }}/>
                        ))}
                        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1.2 }} exit={{ opacity: 0, scale: 0.5 }} className={`absolute inset-0 ${trophyTiers[selectedTrophy].glowColor} blur-[80px] rounded-full -z-10 opacity-60`} style={{ transform: 'translateZ(-50px)' }}/>
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
