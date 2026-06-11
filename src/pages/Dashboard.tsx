
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, FileText, ChevronDown, Lock, LogOut, Menu, X, Zap, ExternalLink, Home, 
  Check, Award, Star, Crown, ChevronRight, ChevronLeft,
  Shield, CheckSquare, Square, Download, ArrowLeft, Settings, BookOpen, Laptop,
  Youtube, Plus, Trash2, Loader2, Folder
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { User, Niche, Tool, Extension } from '../types';
import VideoRenderContainer from '../components/VideoRenderContainer';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type Rank = "Novato" | "Creador" | "Maestro";
type ViewState = 'HOME' | 'COURSE' | 'MODULE' | 'PLAYER' | 'NICHES' | 'COURSES' | 'TOOLS' | 'EXTENSIONS';

// --- CUSTOM STYLES ---
const CUSTOM_STYLES = `
  @keyframes gradient-slow {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
  }
  .animate-gradient-slow {
      background-size: 200% 200%;
      animation: gradient-slow 8s linear infinite;
  }

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
  const [niches, setNiches] = useState<Niche[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [isNichesOpen, setIsNichesOpen] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  // Navigation State
  const [viewState, setViewState] = useState<ViewState>('HOME');
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<any>(null); // NEW: Track selected module
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [focusedLessonIdx, setFocusedLessonIdx] = useState(0); // NEW: For 3D Carousel
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        try {
            const dataStr = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
            const lowerData = dataStr.toLowerCase();
            if (lowerData.includes('play') && !lowerData.includes('pause')) {
                 setIsVideoPlaying(true);
            } else if (lowerData.includes('pause')) {
                 setIsVideoPlaying(false);
            }
        } catch (e) {
            // ignore
        }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // Rating State
  const [userRating, setUserRating] = useState<number>(0);
  
  // Bunny Stream Token States
  const [bunnySignedUrl, setBunnySignedUrl] = useState<string>('');
  const [loadingBunnyUrl, setLoadingBunnyUrl] = useState<boolean>(false);
  
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCourses(), fetchProgress(), fetchNiches(), fetchTools(), fetchExtensions()]);
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

  async function fetchNiches() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('niches')
        .select('*')
        .gt('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNiches(data || []);
    } catch (err) {
      console.error('Error fetching niches:', err);
    }
  }

  async function fetchTools() {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTools(data || []);
    } catch (err) {
      console.error('Error fetching tools:', err);
    }
  }

  async function fetchExtensions() {
    try {
      const { data, error } = await supabase
        .from('extensions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setExtensions(data || []);
    } catch (err) {
      console.error('Error fetching extensions:', err);
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

  const handleGlobalBack = () => {
    if (viewState === 'PLAYER') {
        goBackToModule();
    } else if (viewState === 'MODULE') {
        goBackToCourse();
    } else if (viewState === 'COURSE') {
        setViewState('COURSES');
        setActiveCourse(null);
    } else {
        goHome();
    }
  };

  // --- CALCULATIONS ---
  const getDirectImageUrl = (url: string | null | undefined): string => {
    if (!url) return "";
    let cleanUrl = url.trim();
    
    // Ensure protocol
    if (!/^https?:\/\//i.test(cleanUrl)) {
      if (cleanUrl.toLowerCase().includes("imgur.com")) {
        cleanUrl = "https://" + cleanUrl;
      }
    }

    // Handle Imgur
    if (cleanUrl.includes("imgur.com") && !cleanUrl.includes("i.imgur.com")) {
      // Priority: Check for hash fragment (common in albums/galleries to point to a specific image)
      const hashSplit = cleanUrl.split('#');
      if (hashSplit.length > 1) {
        const hashId = hashSplit[1].split(/[?]/)[0];
        // Imgur IDs are alphanumeric, usually 5 or 7 chars
        if (hashId && /^[a-zA-Z0-9]+$/.test(hashId) && hashId.length >= 4) {
          return `https://i.imgur.com/${hashId}.jpg`;
        }
      }

      // Handle direct album links
      if (cleanUrl.includes("/a/") || cleanUrl.includes("/gallery/")) {
        // We'll keep the current behavior for generic albums but the hash logic above handles the user's specific case
      }

      // Remove trailing slashes and query params/fragments
      const nakedUrl = cleanUrl.split(/[?#]/)[0].replace(/\/+$/, '');
      const parts = nakedUrl.split("/");
      const lastPart = parts[parts.length - 1];
      
      // Remove extension if already present
      const id = lastPart.split('.')[0];
      
      if (id && /^[a-zA-Z0-9]+$/.test(id) && id.length >= 4) {
        return `https://i.imgur.com/${id}.jpg`;
      }
    }

    // Default: return the URL as is (handles bunny.net, b-cdn.net, etc.)
    return cleanUrl;
  };

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

  // --- BUNNY STREAM CLIENT SIDE SIGNING ---
  const activeLessonId = activeLesson?.id;
  const activeVideoUrl = activeLesson?.video_url;

  useEffect(() => {
    if (!activeVideoUrl) {
      setBunnySignedUrl('');
      return;
    }

    const bunnyRegex = /mediadelivery\.net\/(?:embed|play)\/(\d+)\/([a-zA-Z0-9-]+)/i;
    const match = activeVideoUrl.match(bunnyRegex);
    
    if (match) {
      const libraryId = match[1];
      const videoId = match[2];
      
      setLoadingBunnyUrl(true);
      setBunnySignedUrl('');
      
      fetch('/api/bunny-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libraryId, videoId })
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to sign Bunny token');
          return res.json();
        })
        .then(data => {
          const resolved = data.secureUrl || data.videoUrl;
          if (resolved) {
            setBunnySignedUrl(resolved);
          } else {
            setBunnySignedUrl(activeVideoUrl);
          }
        })
        .catch(err => {
          console.error('Error generating secure Bunny.net Stream URL:', err);
          setBunnySignedUrl(activeVideoUrl);
        })
        .finally(() => {
          setLoadingBunnyUrl(false);
        });
    } else {
      setBunnySignedUrl('');
    }
  }, [activeLessonId, activeVideoUrl]);

  const resolvedVideoUrl = useMemo(() => {
    if (!activeVideoUrl) return '';
    if (activeVideoUrl.includes('mediadelivery.net')) {
      return bunnySignedUrl || activeVideoUrl;
    }
    return getEmbedUrl(activeVideoUrl);
  }, [activeVideoUrl, bunnySignedUrl]);

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
    return url.includes('drive.google.com') || 
           url.includes('youtube.com') || 
           url.includes('youtu.be') || 
           url.includes('vimeo.com') ||
           url.includes('mediadelivery.net');
  };

  const getProgressBarStyles = (percent: number) => {
    if (percent >= 100) return 'from-emerald-600 via-green-400 to-emerald-600 shadow-[0_0_25px_rgba(34,197,94,0.6)]';
    if (percent >= 50) return 'from-amber-600 via-yellow-400 to-amber-600 shadow-[0_0_20px_rgba(234,179,8,0.4)]';
    return 'from-red-800 via-red-500 to-red-800 shadow-[0_0_20px_rgba(220,38,38,0.4)]';
  };

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
        <div className="h-[68px] min-h-[68px] border-b border-white/5 flex flex-col justify-center items-center relative bg-zinc-900/50 cursor-pointer" onClick={goHome}>
            <button onClick={(e) => { e.stopPropagation(); setSidebarOpen(false); }} className="lg:hidden absolute top-1/2 -translate-y-1/2 right-4 text-white"><X/></button>
            <h2 className="font-black italic text-xl tracking-tighter text-center">EZEH <span className="text-red-600">ACADEMY</span></h2>
        </div>

        <div className="p-4 border-b border-white/5">
             <div onClick={goHome} className={`relative overflow-hidden w-full p-6 rounded-2xl cursor-pointer group transition-all duration-500 shadow-[0_0_20px_rgba(234,42,51,0.2)] bg-gradient-to-br from-red-600 to-red-900 border border-white/20 hover:border-white/40`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[shimmer_3s_infinite]" />
                <div className="relative z-10 flex items-center justify-center">
                    <span className={`text-sm font-black uppercase tracking-[0.2em] text-white drop-shadow-md group-hover:scale-105 transition-transform`}>PANEL HOME</span>
                </div>
            </div>
        </div>

        {/* --- DYNAMIC SIDEBAR CONTENT --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-20">
            {/* SIDEBAR NAVIGATION BUTTONS */}
            <div className="space-y-4">
                {/* CURSOS BUTTON (RED) */}
                    <div 
                        onClick={() => { setViewState('COURSES'); setActiveCourse(null); setActiveModule(null); setActiveLesson(null); }} 
                        className={`relative overflow-hidden p-5 rounded-2xl border transition-all cursor-pointer group ${
                            viewState === 'COURSES' || viewState === 'COURSE' || viewState === 'MODULE' || viewState === 'PLAYER'
                                ? 'bg-gradient-to-br from-white/20 to-white/5 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                                : 'bg-gradient-to-br from-red-600 to-red-800 border-white/20 hover:border-white/40 hover:from-red-500 hover:to-red-700 shadow-[0_0_15px_rgba(234,42,51,0.2)]'
                        }`}
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-black uppercase truncate text-white">CURSOS</h3>
                            </div>
                            {(viewState === 'COURSES' || viewState === 'COURSE' || viewState === 'MODULE' || viewState === 'PLAYER') && <ChevronRight size={18} className="text-white"/>}
                        </div>
                    </div>

                    {/* NICHES BUTTON */}
                    {isAdmin && (
                        <div onClick={() => { setViewState('NICHES'); setActiveCourse(null); setActiveModule(null); setActiveLesson(null); }} 
                            className={`relative overflow-hidden p-5 rounded-2xl border transition-all cursor-pointer group ${
                                viewState === 'NICHES'
                                    ? 'bg-gradient-to-br from-white/20 to-white/5 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                                    : 'bg-gradient-to-br from-red-600 to-red-800 border-white/20 hover:border-white/40 hover:from-red-500 hover:to-red-700 shadow-[0_0_15px_rgba(234,42,51,0.2)]'
                            }`}
                        >
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-black uppercase truncate text-white">NICHOS</h3>
                                </div>
                                {viewState === 'NICHES' && <ChevronRight size={18} className="text-white"/>}
                            </div>
                        </div>
                    )}

                    {/* TOOLS BUTTON */}
                    <div onClick={() => { setViewState('TOOLS'); setActiveCourse(null); setActiveModule(null); setActiveLesson(null); }} 
                        className={`relative overflow-hidden p-5 rounded-2xl border transition-all cursor-pointer group ${
                            viewState === 'TOOLS'
                                ? 'bg-gradient-to-br from-white/20 to-white/5 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                                : 'bg-gradient-to-br from-red-600 to-red-800 border-white/20 hover:border-white/40 hover:from-red-500 hover:to-red-700 shadow-[0_0_15px_rgba(234,42,51,0.2)]'
                        }`}
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-black uppercase truncate text-white">HERRAMIENTAS</h3>
                            </div>
                            {viewState === 'TOOLS' && <ChevronRight size={18} className="text-white"/>}
                        </div>
                    </div>

                    {/* EXTENSIONS BUTTON */}
                    <div onClick={() => { setViewState('EXTENSIONS'); setActiveCourse(null); setActiveModule(null); setActiveLesson(null); }} 
                        className={`relative overflow-hidden p-5 rounded-2xl border transition-all cursor-pointer group ${
                            viewState === 'EXTENSIONS'
                                ? 'bg-gradient-to-br from-white/20 to-white/5 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                                : 'bg-gradient-to-br from-red-600 to-red-800 border-white/20 hover:border-white/40 hover:from-red-500 hover:to-red-700 shadow-[0_0_15px_rgba(234,42,51,0.2)]'
                        }`}
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-black uppercase truncate text-white">EXTENSIONES</h3>
                            </div>
                            {viewState === 'EXTENSIONS' && <ChevronRight size={18} className="text-white"/>}
                        </div>
                    </div>
                </div>
        </div>

        <div className="p-4 border-t border-white/5 flex gap-3">
            {isAdmin && (
                <Link to="/admin" className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase text-white bg-gradient-to-r from-red-600 to-red-900 hover:scale-[1.02] transition-transform shadow-lg shadow-red-900/30 flex items-center justify-center gap-1.5 border border-white/10">
                    <Settings size={14} className="text-white"/> EZEH STUDIO
                </Link>
            )}
            <button onClick={onLogout} className="flex-1 py-3 bg-zinc-900 rounded-xl text-[10px] font-bold uppercase text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5">
                <LogOut size={14}/> CERRAR SESIÓN
            </button>
        </div>
      </motion.aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 h-screen relative flex flex-col overflow-hidden bg-[#050505]">
          {/* Invisible trigger zone to show header when hovering top edge */}
          {viewState === 'PLAYER' && isVideoPlaying && (
              <div 
                 className="absolute top-0 left-0 w-full h-12 z-[70]"
                 onMouseEnter={() => setIsHeaderHovered(true)}
              />
          )}

          {/* HEADER BAR */}
          <AnimatePresence>
            {!(viewState === 'PLAYER' && isVideoPlaying && !isHeaderHovered) && (
              <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 68, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onMouseEnter={() => setIsHeaderHovered(true)}
                  onMouseLeave={() => setIsHeaderHovered(false)}
                  className="w-full relative z-50 flex-shrink-0 overflow-hidden bg-gradient-to-r from-[#8b0000] to-[#050505] shadow-[0_4px_30px_rgba(234,42,51,0.15)]"
              >
                  <div className="w-full h-[68px] border-b border-black/50 flex items-center justify-between px-6 absolute bottom-0 left-0 right-0">
                      <div className="flex items-center gap-4">
                          {!sidebarOpen && (
                              <button onClick={() => setSidebarOpen(true)} className="p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white hover:bg-white hover:text-black transition-all">
                                  <Menu size={20}/>
                              </button>
                          )}
                          {viewState !== 'HOME' && (
                              <button onClick={handleGlobalBack} className="text-white hover:text-white/80 transition-colors p-2 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10">
                                  <ArrowLeft size={20} />
                              </button>
                          )}
                      </div>
                      <h1 className="text-white font-black italic tracking-widest text-lg uppercase drop-shadow-md text-right">
                         {viewState === 'HOME' ? 'PANEL HOME' : viewState === 'COURSES' || viewState === 'COURSE' || viewState === 'MODULE' || viewState === 'PLAYER' ? 'CURSOS' : viewState === 'NICHES' ? 'NICHOS GANADORES' : viewState === 'TOOLS' ? 'HERRAMIENTAS' : viewState === 'EXTENSIONS' ? 'EXTENSIONES' : ''}
                      </h1>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>

          <main className="flex-1 overflow-y-auto custom-scrollbar p-0 relative">
                         {/* === VIEW: HOME (LOBBY) === */}
             {viewState === 'HOME' && (
                <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="space-y-8 p-6 lg:p-12">
                   {/* MASTER ADMIN BADGE AT THE LEFT - PEGGED CLOSE TO THE GREETING CONTAINER */}
                   <div className="flex justify-start px-2 -mb-6 relative z-20">
                       <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border shadow-xl ${isAdmin ? 'bg-[#ffca28]/10 border-[#ffca28]/40 text-[#ffca28]' : 'bg-[#ea2a33]/10 border-[#ea2a33]/40 text-[#ea2a33]'}`}>
                           {isAdmin ? <Crown size={16} fill="currentColor"/> : getRankIcon(stats.rank, 16)}
                           <span className="text-xs font-black uppercase italic tracking-wider">{isAdmin ? 'MASTER ADMIN' : stats.rank}</span>
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

                   {/* NICHOS SECTION REMOVED FROM HOME */}
                </motion.div>
             )}

             {/* === VIEW: COURSES LIST (CATALOG GRID) === */}
             {viewState === 'COURSES' && (
                <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="space-y-8 p-6 lg:p-12">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2 max-w-7xl mx-auto">
                       {courses.map(course => (
                           <div 
                               key={course.id} 
                               onClick={() => handleCourseSelect(course)}
                               className="group relative cursor-pointer flex flex-col w-full transition-transform duration-300 hover:-translate-y-1"
                           >
                               {/* The Square Cover */}
                               <div className="aspect-square w-full rounded-2xl overflow-hidden border border-white/5 bg-zinc-950 group-hover:border-red-600/40 transition-all shadow-2xl relative flex-shrink-0">
                                   <img 
                                       src={getDirectImageUrl(course.thumbnail) || "https://picsum.photos/seed/course/800/450"}
                                       alt={course.title}
                                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                       referrerPolicy={course.thumbnail?.includes('imgur.com') ? "no-referrer" : undefined}
                                       onError={(e) => {
                                           if (!course.thumbnail?.includes('picsum.photos')) {
                                               (e.target as HTMLImageElement).src = "https://picsum.photos/seed/course/800/450";
                                           }
                                       }}
                                   />
                               </div>

                               {/* Course title and module badge now below the image as a button-like container */}
                               <div className="mt-4 bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 transition-all group-hover:border-red-600/50 group-hover:bg-gradient-to-r group-hover:from-red-600/20 group-hover:to-red-900/10">
                                   <span className="text-[11px] font-black uppercase tracking-wide text-white truncate flex-1">
                                       {course.title}
                                   </span>
                                   <div className="bg-gradient-to-br from-red-600 to-red-800 px-3 py-1.5 rounded-lg shadow-lg shadow-red-600/20 flex-shrink-0">
                                       <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                                           {course.modules?.length || 0} MOD
                                       </span>
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
                </motion.div>
             )}

             {/* === VIEW: NICHES === */}
             {viewState === 'NICHES' && (
                <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="h-full flex flex-col">
                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12 pt-12">
                        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {niches.map(niche => (
                                <motion.div 
                                    layout
                                    key={niche.id} 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="group relative bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl hover:border-red-600/30 transition-all flex flex-col gap-6"
                                >
                                    {/* Info Panel */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 flex-shrink-0 relative group-hover:border-red-600 transition-colors bg-zinc-900 flex items-center justify-center text-zinc-700">
                                            {niche.thumbnail ? (
                                                <img 
                                                    src={getDirectImageUrl(niche.thumbnail)} 
                                                    alt={niche.name} 
                                                    className="w-full h-full object-cover" 
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <Youtube size={24} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-lg font-black text-white uppercase tracking-tight truncate">
                                                    {niche.name || 'Canal de YouTube'}
                                                </h4>
                                                {niche.created_at && (
                                                    <span className="text-[8px] font-black bg-white/10 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter whitespace-nowrap">
                                                        {(() => {
                                                            const createdDate = new Date(niche.created_at);
                                                            const expiryDate = new Date(createdDate);
                                                            expiryDate.setDate(expiryDate.getDate() + 30);
                                                            const now = new Date();
                                                            const diffTime = expiryDate.getTime() - now.getTime();
                                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                            return diffDays > 0 ? `${diffDays}d` : '0d';
                                                        })()}
                                                    </span>
                                                )}
                                            </div>
                                            {niche.subscriber_count && (
                                                <span className="text-sm font-bold text-red-500 mt-0.5">
                                                    {Number(niche.subscriber_count).toLocaleString()} Subs
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col">
                                        {niche.description && (() => {
                                            try {
                                                const popularVideo = JSON.parse(niche.description);
                                                if (popularVideo && popularVideo.id && popularVideo.title) {
                                                    return (
                                                        <div className="mt-2 border-t border-white/5 pt-4">
                                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Vídeo más popular</h5>
                                                            <a href={`https://youtube.com/watch?v=${popularVideo.id}`} target="_blank" rel="noopener noreferrer" className="group/video block">
                                                                <div className="aspect-video bg-zinc-900 rounded-lg overflow-hidden border border-white/5 relative mb-2 group-hover/video:border-red-600/50 transition-colors">
                                                                    <img 
                                                                        src={getDirectImageUrl(popularVideo.thumbnail)} 
                                                                        alt={popularVideo.title} 
                                                                        className="w-full h-full object-cover" 
                                                                        referrerPolicy="no-referrer"
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/video:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white">
                                                                            <Play size={16} fill="currentColor" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm font-bold text-zinc-300 line-clamp-2 leading-tight group-hover/video:text-white transition-colors">{popularVideo.title}</p>
                                                                {popularVideo.viewCount && (
                                                                    <p className="text-xs font-black bg-red-600/20 text-red-500 inline-block px-2 py-1 rounded mt-2 border border-red-600/30">
                                                                        {Number(popularVideo.viewCount).toLocaleString()} Vistas
                                                                    </p>
                                                                )}
                                                            </a>
                                                        </div>
                                                    );
                                                }
                                            } catch (e) {
                                                return (
                                                    <p className="text-sm text-zinc-400 leading-relaxed border-t border-white/5 pt-4 italic">
                                                        "{niche.description}"
                                                    </p>
                                                );
                                            }
                                        })()}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 border-t border-white/5 pt-4 mt-auto">
                                        <a 
                                            href={niche.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex-1 px-4 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 group/btn"
                                        >
                                            IR AL CANAL <ExternalLink size={12} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                        </a>
                                    </div>
                                </motion.div>
                            ))}
                            
                            {niches.length === 0 && (
                                <div className="py-20 text-center space-y-4 border border-dashed border-white/10 rounded-3xl">
                                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-700">
                                        <Youtube size={32} />
                                    </div>
                                    <p className="text-zinc-600 text-xs font-black uppercase tracking-[0.3em] italic">
                                        No hay nichos compartidos aún
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
             )}

             {/* === VIEW: TOOLS === */}
             {viewState === 'TOOLS' && (
                <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="h-full flex flex-col">
                    {/* Tools Catalog Grid */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12 pt-12">
                        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {tools.map(tool => (
                                <motion.div 
                                    layout
                                    key={tool.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="group relative"
                                >
                                    <a 
                                        href={tool.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block relative h-24 w-full rounded-2xl p-[1px] transition-all hover:scale-[1.02] shadow-xl overflow-hidden border border-white"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-black to-red-900 animate-gradient-slow" />
                                        <div className="relative h-full w-full flex items-center justify-center bg-black/40 backdrop-blur-sm group-hover:bg-transparent transition-colors">
                                            <span className="text-sm font-black uppercase tracking-widest text-white text-center px-4 drop-shadow-md">
                                                {tool.name}
                                            </span>
                                        </div>
                                    </a>
                                    
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
             )}

             {/* === VIEW: EXTENSIONS === */}
             {viewState === 'EXTENSIONS' && (
                <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="h-full flex flex-col">
                    {/* Extensions Catalog Grid (Rows of 3) */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12 pt-12">
                        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {extensions.map(ext => (
                                <motion.div 
                                    layout
                                    key={ext.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="group relative bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl hover:border-red-600/30 transition-all flex flex-col gap-6"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                            <Folder size={28} />
                                        </div>
                                        <h4 className="text-xl font-black text-white uppercase tracking-tight truncate flex-1">
                                            {ext.name}
                                        </h4>
                                    </div>
                                    
                                    <p className="text-sm text-zinc-500 leading-relaxed line-clamp-4 flex-1">
                                        {ext.description || 'Sin descripción disponible.'}
                                    </p>

                                    <div className="pt-4 border-t border-white/5">
                                        <a 
                                            href={ext.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full py-4 rounded-2xl bg-gradient-to-br from-red-600 via-black to-red-900 border border-white/10 text-white text-xs font-black uppercase tracking-[0.2em] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-xl"
                                        >
                                            DESCARGAR EXTENSIÓN <Download size={14} />
                                        </a>
                                    </div>
                                    
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
             )}

             {/* === VIEW: COURSE OVERVIEW (SKEWED MODULE GRID) === */}
             {viewState === 'COURSE' && activeCourse && (
                <motion.div initial={{opacity: 0, x: 20}} animate={{opacity: 1, x: 0}} className="min-h-full p-6 lg:p-12 relative">
                     
                     {/* RESTORED TITLE */}
                     <div className="mb-20 text-center relative z-10 mt-16 lg:mt-0">
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

                            // Use module's thumbnail if available, otherwise fallback to random default image
                            const bgImage = getDirectImageUrl(mod.thumbnail) || MODULE_IMAGES[index % MODULE_IMAGES.length];

                            return (
                                <div 
                                    key={mod.id} 
                                    onClick={() => handleModuleClick(mod, isLocked)}
                                    className={`skewed-card group relative bg-gradient-to-b from-[#2a0a0a] to-black border border-white/5 rounded-2xl overflow-hidden cursor-pointer ${isLocked ? 'opacity-70 grayscale' : ''}`}
                                >
                                    <div className="aspect-[16/10] overflow-hidden relative">
                                        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url("${bgImage}")` }}/>
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent"></div>
                                        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-white/10 text-[9px] font-black tracking-widest uppercase content-unskew text-zinc-300">
                                            Módulo 0{index + 1}
                                        </div>
                                    </div>
                                    <div className="p-8 content-unskew relative bg-transparent">
                                        <h3 className="text-lg md:text-xl font-bold leading-tight mb-6 text-zinc-100 group-hover:text-white uppercase italic line-clamp-2 min-h-[2.5em]">{mod.title}</h3>
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

             {/* === VIEW: MODULE LESSON FLOW (CATALOG) === */}
             {viewState === 'MODULE' && activeModule && activeModule.lessons && (
                 <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="min-h-full p-6 lg:p-12 relative">
                     
                     <header className="w-full max-w-7xl mx-auto flex flex-col items-center z-10 mb-16 mt-16 lg:mt-0">
                         <h1 className="text-3xl md:text-5xl font-black tracking-tight text-center uppercase italic">CLASES DE <span className="text-red-600">{activeModule.title}</span></h1>
                     </header>

                     <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                         {activeModule.lessons.map((lesson: any, idx: number) => {
                             const isCompleted = completedLessons.has(lesson.id);
                             const fallbackImage = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop";

                             return (
                                 <div 
                                    key={lesson.id}
                                    className={`group relative bg-[#0f0f0f] border border-white/5 hover:border-white/20 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02]`}
                                    onClick={() => {
                                        setActiveLesson(lesson);
                                        setViewState('PLAYER');
                                    }}
                                 >
                                     <div className="aspect-video overflow-hidden relative">
                                         <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url("${lesson.thumbnail || fallbackImage}")` }}></div>
                                         <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-black/20 to-transparent"></div>
                                         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <div className="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center play-glow">
                                                <Play size={28} fill="white" className="text-white ml-1"/>
                                            </div>
                                         </div>
                                         <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-white/10 text-[9px] font-black tracking-widest uppercase text-zinc-300">
                                             Clase 0{idx + 1}
                                         </div>
                                     </div>
                                     <div className="p-6 relative bg-transparent">
                                         <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-lg font-bold leading-tight text-zinc-100 group-hover:text-white line-clamp-2">{lesson.title}</h3>
                                         </div>
                                         
                                         <div className="flex items-center justify-between">
                                            <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isCompleted ? 'text-green-500' : 'text-zinc-500'}`}>
                                                {isCompleted ? <><CheckSquare size={14}/> Completada</> : 'Pendiente'}
                                            </span>
                                            {lesson.resources && <BookOpen size={14} className="text-zinc-500"/>}
                                         </div>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                     {activeModule.lessons.length === 0 && (
                         <div className="w-full text-center py-20 text-zinc-500 font-bold uppercase tracking-widest">Este módulo aún no tiene lecciones.</div>
                     )}
                 </motion.div>
              )}

              {/* === VIEW: PLAYER (CLASS) === */}
             {viewState === 'PLAYER' && activeLesson && (
                 <motion.div initial={{opacity: 0, x: 20}} animate={{opacity: 1, x: 0}} className="space-y-8 p-6 lg:p-12 relative">
                     
                     <VideoRenderContainer videoUrl={resolvedVideoUrl} title={activeLesson.title} />

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
       </div>
    </div>
  );
};

export default Dashboard;
