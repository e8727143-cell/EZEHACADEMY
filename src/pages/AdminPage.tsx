
import React, { useState, useEffect } from 'react';
import { 
  Trash2, LogOut, ChevronDown, Layout, Box, Video, X, Plus, FileText, Link as LinkIcon, Save, PlusCircle, Upload, CheckCircle, Loader2, LayoutDashboard, ArrowLeft, Pencil, Users, Activity, Signal, Search, TrendingUp, Shield, RefreshCw, Zap, Crown, Image as ImageIcon, BookOpen, Wrench, Folder
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, ADMIN_EMAIL } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { User, Niche, Tool, Extension } from '../types';

type AdminView = 'CONTENT' | 'USERS' | 'RESOURCES';

const AdminPage = ({ user, onLogout }: { user: User, onLogout: () => void }) => {
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

      // Handle direct album links (sometimes people paste these thinking they are images)
      // If it's a direct album link /a/ID, we try to use the ID as an image if it's not a known album
      if (cleanUrl.includes("/a/") || cleanUrl.includes("/gallery/")) {
        // Only return cleanUrl if we can't find a potential image ID
        const parts = cleanUrl.split(/[?#]/)[0].replace(/\/+$/, '').split("/");
        const last = parts[parts.length - 1];
        if (last && /^[a-zA-Z0-9]+$/.test(last) && last.length >= 7) {
           // Might be the first image ID in many cases, though risky. 
           // But if it's failing anyway, this is a better guess.
           // However, let's stick to the safe path for now if it's explicitly /a/ or /gallery/
           // Unless we didn't find a hash.
        }
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

  // --- STATE: GLOBAL ---
  const [currentView, setCurrentView] = useState<AdminView>('CONTENT');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  // --- STATE: CONTENT MANAGEMENT ---
  const [courses, setCourses] = useState<any[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [modalType, setModalType] = useState<'NONE' | 'COURSE' | 'MODULE' | 'LESSON'>('NONE');
  const [isEditing, setIsEditing] = useState(false);
  const [tempId, setTempId] = useState<string>(''); 
  const [inputTitle, setInputTitle] = useState('');
  const [inputCourseThumbnail, setInputCourseThumbnail] = useState('');
  // New State for Module Thumbnail
  const [inputModuleThumbnail, setInputModuleThumbnail] = useState('');
  const [lessonData, setLessonData] = useState({ title: '', video_url: '', description: '', resources: '' });
  const [uploading, setUploading] = useState(false);

  // --- STATE: USER ANALYTICS ---
  const [usersList, setUsersList] = useState<any[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set()); // Track specific online IDs
  const [totalLessonsCount, setTotalLessonsCount] = useState(0);

  // --- STATE: RESOURCES MANAGEMENT ---
  const [niches, setNiches] = useState<Niche[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  
  const [newNicheUrl, setNewNicheUrl] = useState('');
  const [savingNiche, setSavingNiche] = useState(false);
  
  const [newToolName, setNewToolName] = useState('');
  const [newToolUrl, setNewToolUrl] = useState('');
  const [newToolPremium, setNewToolPremium] = useState(false);
  const [savingTool, setSavingTool] = useState(false);
  
  const [newExtensionName, setNewExtensionName] = useState('');
  const [newExtensionUrl, setNewExtensionUrl] = useState('');
  const [newExtensionDesc, setNewExtensionDesc] = useState('');
  const [newExtensionPremium, setNewExtensionPremium] = useState(false);
  const [savingExtension, setSavingExtension] = useState(false);

  useEffect(() => {
    fetchContentData();
    fetchUserData();
    fetchResources();
    setupRealtimePresence();
  }, []);

  // --- 1. DATA FETCHING ---

  async function fetchContentData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules(*, lessons(*))') 
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Calculate total lessons in the system for progress percentage
      let lessonCount = 0;
      const sorted = data.map(c => {
        const modules = c.modules?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((m: any) => {
             lessonCount += m.lessons?.length || 0;
             return {
               ...m,
               lessons: m.lessons?.sort((x: any, y: any) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime())
             };
          });
        return { ...c, modules };
      });
      setCourses(sorted);
      setTotalLessonsCount(lessonCount);
    }
    setLoading(false);
  }

  async function fetchUserData() {
    // 1. Get Profiles
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    
    // 2. Get User Progress counts
    const { data: progress } = await supabase.from('user_progress').select('user_id');

    if (profiles) {
      // Map progress count to users
      const combined = profiles.map(p => {
        const completed = progress?.filter(prog => prog.user_id === p.id).length || 0;
        return {
          ...p,
          completedLessons: completed
        };
      });
      setUsersList(combined);
    } else {
        if(error) console.error("Error fetching profiles:", error);
        setUsersList([]);
    }
  }

  async function fetchResources() {
    try {
      // Auto-cleanup niches older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await supabase
        .from('niches')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());

      const [nRes, tRes, eRes] = await Promise.all([
        supabase.from('niches').select('*').order('created_at', { ascending: false }),
        supabase.from('tools').select('*').order('created_at', { ascending: false }),
        supabase.from('extensions').select('*').order('created_at', { ascending: false })
      ]);
      
      if (nRes.data) setNiches(nRes.data);
      if (tRes.data) setTools(tRes.data);
      if (eRes.data) setExtensions(eRes.data);
    } catch (err) {
      console.error("Error fetching resources:", err);
    }
  }

  function setupRealtimePresence() {
    const channel = supabase.channel('online-users');
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Extract all user objects from presence state
        const users = Object.values(state).flat() as any[];
        // Create a Set of unique user IDs that are currently online
        const ids = new Set(users.map(u => u.user_id));
        setOnlineUserIds(ids);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }

  // --- 2. CONTENT MANAGEMENT LOGIC ---

  const handleLessonFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `lesson_${fileName}`;
    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage.from('course_materials').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('course_materials').getPublicUrl(filePath);
      setLessonData(prev => ({ ...prev, resources: data.publicUrl }));
      showNotify('success', 'ARCHIVO SUBIDO CORRECTAMENTE');
    } catch (error: any) { alert("Error: " + error.message); } 
    finally { setUploading(false); }
  };

  const handleModuleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `module_thumb_${fileName}`;
    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage.from('course_materials').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('course_materials').getPublicUrl(filePath);
      setInputModuleThumbnail(data.publicUrl);
      showNotify('success', 'PORTADA DE MÓDULO SUBIDA');
    } catch (error: any) { alert("Error: " + error.message); } 
    finally { setUploading(false); }
  };

  const submitCourse = async () => {
    if (!inputTitle.trim()) return;
    const payload = { title: inputTitle, thumbnail: getDirectImageUrl(inputCourseThumbnail) };
    const { error } = isEditing 
        ? await supabase.from('courses').update(payload).eq('id', tempId)
        : await supabase.from('courses').insert([payload]);
    
    if (!error) { closeModal(); fetchContentData(); showNotify('success', isEditing ? 'MASTER ACTUALIZADO' : 'MASTER CREADO'); } 
    else alert(error.message);
  };

  const submitModule = async () => {
    if (!inputTitle.trim()) return;
    const payload = { title: inputTitle, thumbnail: getDirectImageUrl(inputModuleThumbnail) };
    
    const { error } = isEditing
        ? await supabase.from('modules').update(payload).eq('id', tempId)
        : await supabase.from('modules').insert([{ ...payload, course_id: tempId }]);

    if (!error) { closeModal(); fetchContentData(); showNotify('success', isEditing ? 'MÓDULO ACTUALIZADO' : 'MÓDULO CREADO'); }
    else alert(error.message);
  };

  const submitLesson = async () => {
    if (!lessonData.title.trim()) return alert("Título obligatorio");
    const payload = { title: lessonData.title, video_url: lessonData.video_url, description: lessonData.description, resources: lessonData.resources };
    const { error } = isEditing
        ? await supabase.from('lessons').update(payload).eq('id', tempId)
        : await supabase.from('lessons').insert([{ ...payload, module_id: tempId }]);

    if (!error) { closeModal(); fetchContentData(); showNotify('success', isEditing ? 'CLASE ACTUALIZADA' : 'CLASE GUARDADA'); }
    else alert(error.message);
  };

  const handleDelete = async (table: 'courses'|'modules'|'lessons'|'niches'|'tools'|'extensions', id: string) => {
    if (!window.confirm("¿Confirmar eliminación?")) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) { 
        if (table === 'niches') setNiches(prev => prev.filter(n => n.id !== id));
        else if (table === 'tools') setTools(prev => prev.filter(t => t.id !== id));
        else if (table === 'extensions') setExtensions(prev => prev.filter(e => e.id !== id));
        else fetchContentData(); 
        showNotify('success', 'ELIMINADO'); 
    } 
    else alert(error.message);
  };

  // --- 3. RESOURCES MANAGEMENT LOGIC ---
  async function addNiche() {
    if (!newNicheUrl.trim()) return;
    setSavingNiche(true);
    try {
      let name = "Canal de YouTube";
      let thumbnail = null;
      let subscriberCount = null;
      let videoCount = null;
      let popularVideo = null;

      try {
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/api/youtube/channel-info?url=${encodeURIComponent(newNicheUrl.trim())}`);
        if (response.ok) {
           const channelData = await response.json();
           name = channelData.title || name;
           thumbnail = channelData.thumbnail || null;
           subscriberCount = channelData.subscriberCount || null;
           videoCount = channelData.videoCount || null;
           if (channelData.popularVideo) {
               popularVideo = JSON.stringify(channelData.popularVideo);
           }
        }
      } catch (e) {
          console.log("Could not fetch channel info", e);
      }

      const { data, error } = await supabase
        .from('niches')
        .insert([{ 
            url: newNicheUrl.trim(), 
            name: name,
            thumbnail: thumbnail,
            subscriber_count: subscriberCount,
            video_count: videoCount,
            description: popularVideo
        }])
        .select();
      
      if (error) throw error;
      if (data) setNiches([data[0], ...niches]);
      setNewNicheUrl('');
      showNotify('success', 'NICHO AÑADIDO');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingNiche(false);
    }
  }

  const toggleUserPermission = async (userId: string, field: 'tiene_acceso_cursos' | 'tiene_acceso_nichos' | 'tiene_acceso_herramientas' | 'tiene_acceso_extensiones', currentValue: boolean) => {
    const newVal = !currentValue;
    // Optimistic state update
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, [field]: newVal } : u));
    
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: newVal })
      .eq('id', userId);

    if (error) {
      console.error('Error updating permission:', error);
      showNotify('error', 'Error al actualizar permisos');
      // Revert on error
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, [field]: currentValue } : u));
    } else {
      showNotify('success', 'PERMISOS ACTUALIZADOS');
    }
  };

  const toggleToolPremium = async (toolId: string, current: boolean) => {
    const newVal = !current;
    setTools(prev => prev.map(t => t.id === toolId ? { ...t, es_premium: newVal } : t));
    
    const { error } = await supabase
      .from('tools')
      .update({ es_premium: newVal })
      .eq('id', toolId);

    if (error) {
      console.error('Error toggling tool premium status:', error);
      showNotify('error', 'Error al actualizar estado');
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, es_premium: current } : t));
    } else {
      showNotify('success', 'ESTADO ACTUALIZADO');
    }
  };

  const toggleExtensionPremium = async (extId: string, current: boolean) => {
    const newVal = !current;
    setExtensions(prev => prev.map(e => e.id === extId ? { ...e, es_premium: newVal } : e));
    
    const { error } = await supabase
      .from('extensions')
      .update({ es_premium: newVal })
      .eq('id', extId);

    if (error) {
      console.error('Error toggling extension premium status:', error);
      showNotify('error', 'Error al actualizar estado');
      setExtensions(prev => prev.map(e => e.id === extId ? { ...e, es_premium: current } : e));
    } else {
      showNotify('success', 'ESTADO ACTUALIZADO');
    }
  };

  async function addTool() {
    if (!newToolName.trim() || !newToolUrl.trim()) return;
    setSavingTool(true);
    try {
      const { data, error } = await supabase
        .from('tools')
        .insert([{ name: newToolName.trim(), url: newToolUrl.trim(), es_premium: newToolPremium }])
        .select();
      
      if (error) throw error;
      if (data) setTools([data[0], ...tools]);
      setNewToolName('');
      setNewToolUrl('');
      setNewToolPremium(false);
      showNotify('success', 'HERRAMIENTA AÑADIDA');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingTool(false);
    }
  }

  async function addExtension() {
    if (!newExtensionName.trim() || !newExtensionUrl.trim()) return;
    setSavingExtension(true);
    try {
      const { data, error } = await supabase
        .from('extensions')
        .insert([{ 
            name: newExtensionName.trim(),
            url: newExtensionUrl.trim(),
            description: newExtensionDesc.trim() || null,
            es_premium: newExtensionPremium
        }])
        .select();
      
      if (error) throw error;
      if (data) setExtensions([data[0], ...extensions]);
      setNewExtensionName('');
      setNewExtensionUrl('');
      setNewExtensionDesc('');
      setNewExtensionPremium(false);
      showNotify('success', 'EXTENSIÓN AÑADIDA');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingExtension(false);
    }
  }

  // --- HELPERS ---
  const openCreateCourse = () => { setModalType('COURSE'); setIsEditing(false); setInputTitle(''); setInputCourseThumbnail(''); };
  const openEditCourse = (c: any) => { setModalType('COURSE'); setIsEditing(true); setTempId(c.id); setInputTitle(c.title); setInputCourseThumbnail(c.thumbnail || ''); };
  
  const openCreateModule = (cId: string) => { 
      setTempId(cId); 
      setModalType('MODULE'); 
      setIsEditing(false); 
      setInputTitle(''); 
      setInputModuleThumbnail(''); 
  };
  const openEditModule = (m: any) => { 
      setTempId(m.id); 
      setModalType('MODULE'); 
      setIsEditing(true); 
      setInputTitle(m.title); 
      setInputModuleThumbnail(m.thumbnail || '');
  };

  const openCreateLesson = (mId: string) => { setTempId(mId); setModalType('LESSON'); setIsEditing(false); setLessonData({ title: '', video_url: '', description: '', resources: '' }); };
  const openEditLesson = (l: any) => { setTempId(l.id); setModalType('LESSON'); setIsEditing(true); setLessonData({ title: l.title, video_url: l.video_url||'', description: l.description||'', resources: l.resources||'' }); };
  const closeModal = () => { setModalType('NONE'); setTempId(''); setInputTitle(''); setInputModuleThumbnail(''); setInputCourseThumbnail(''); };
  
  const toggleCourse = (id: string) => {
    const next = new Set(expandedCourses);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedCourses(next);
  };

  const showNotify = (type: 'success'|'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- CALCULATE ONLINE STATUS LOGIC ---
  
  // Filtrar usuarios: Admin vs Estudiantes
  const adminAccount = usersList.find(u => u.email === ADMIN_EMAIL);
  const studentAccounts = usersList.filter(u => u.email !== ADMIN_EMAIL);

  // Contar cuántos ESTUDIANTES (excluyendo admin) están online
  const studentsOnlineCount = Array.from(onlineUserIds).filter(id => id !== user.id).length;
  
  // Lógica de visualización del estado
  const isSoloAdmin = studentsOnlineCount === 0;
  const statusColor = isSoloAdmin 
    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' 
    : 'bg-red-600/20 border-red-600/50 text-red-500';
  
  const statusDot = isSoloAdmin ? 'bg-yellow-500' : 'bg-red-600';
  const statusText = isSoloAdmin ? 'SOLO ADMIN' : `${studentsOnlineCount} ALUMNOS LIVE`;

  // --- RENDER ---

  if (loading && courses.length === 0) return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-red-600" size={40}/>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-xs">Conectando a Ezeh Studio...</p>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600 selection:text-white pb-20">
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-zinc-900 border border-red-600/50 px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2">
             <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"/> {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TOP BAR COMMAND CENTER --- */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-6">
                  <h1 className="text-2xl font-black italic tracking-tighter cursor-pointer" onClick={() => window.location.reload()}>
                    EZEH <span className="text-red-600">STUDIO</span>
                  </h1>
                  <div className="h-6 w-px bg-white/10 hidden md:block"></div>
                  
                  {/* NAVIGATION TABS */}
                  <nav className="hidden md:flex items-center gap-2">
                      <button 
                        onClick={() => setCurrentView('CONTENT')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${currentView === 'CONTENT' ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                      >
                        <LayoutDashboard size={14}/> Content Manager
                      </button>
                      <button 
                        onClick={() => setCurrentView('USERS')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${currentView === 'USERS' ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                      >
                        <Users size={14}/> User Intelligence
                      </button>
                      <button 
                        onClick={() => setCurrentView('RESOURCES')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${currentView === 'RESOURCES' ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                      >
                        <Box size={14}/> Resources
                      </button>
                  </nav>
              </div>

              <div className="flex items-center gap-4">
                  <Link 
                      to="/dashboard" 
                      className="flex items-center gap-2 px-4 py-2 border border-white/10 bg-white/5 hover:bg-red-600 hover:border-red-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                      <ArrowLeft size={14}/> Área de Miembros
                  </Link>
              </div>
          </div>
      </header>
      
      {/* MOBILE NAV (Visible only on small screens) */}
      <div className="md:hidden flex p-4 gap-2 border-b border-white/5 bg-[#0a0a0a]">
          <button onClick={() => setCurrentView('CONTENT')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg ${currentView === 'CONTENT' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Content</button>
          <button onClick={() => setCurrentView('USERS')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg ${currentView === 'USERS' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Users</button>
      </div>

      <main className="max-w-7xl mx-auto p-6 lg:p-10">
          
          {/* ================= VIEW: CONTENT MANAGER ================= */}
          {currentView === 'CONTENT' && (
              <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-8">
                  
                  <div className="flex justify-between items-end">
                      <div>
                          <h2 className="text-4xl font-black text-white mb-2">GESTIÓN DE CONTENIDO</h2>
                          <p className="text-zinc-500 text-sm font-medium">Administra la estructura curricular de la academia.</p>
                      </div>
                      <button onClick={openCreateCourse} className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-900/20 active:scale-95 transition-all flex items-center gap-2">
                          <PlusCircle size={16}/> Nuevo Master
                      </button>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {courses.map((course) => (
                        <div key={course.id} className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden hover:border-white/20 transition-colors group">
                            {/* Course Header */}
                            <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => toggleCourse(course.id)}>
                                <div className="flex items-center gap-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${expandedCourses.has(course.id) ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-zinc-900 text-zinc-600'}`}>
                                        <Layout size={20}/>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-zinc-200 group-hover:text-white transition-colors">{course.title}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-zinc-500 uppercase font-bold tracking-wider">{course.modules?.length || 0} Módulos</span>
                                            <button onClick={(e) => { e.stopPropagation(); openEditCourse(course); }} className="text-zinc-600 hover:text-white"><Pencil size={12}/></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={(e) => { e.stopPropagation(); openCreateModule(course.id); }} className="text-xs font-bold uppercase text-zinc-500 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-all">+ Módulo</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete('courses', course.id); }} className="text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                    <ChevronDown size={20} className={`text-zinc-600 transition-transform ${expandedCourses.has(course.id) ? 'rotate-180' : ''}`}/>
                                </div>
                            </div>

                            {/* Course Content (Modules) */}
                            <AnimatePresence>
                                {expandedCourses.has(course.id) && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/5 bg-zinc-900/20">
                                        <div className="p-6 space-y-4">
                                            {course.modules?.map((mod: any) => (
                                                <div key={mod.id} className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
                                                    <div className="p-4 flex justify-between items-center bg-white/5 border-b border-white/5">
                                                        <div className="flex items-center gap-3">
                                                            {mod.thumbnail ? (
                                                                <img 
                                                                    src={getDirectImageUrl(mod.thumbnail)} 
                                                                    alt="thumb" 
                                                                    className="w-10 h-6 object-cover rounded border border-white/10" 
                                                                    referrerPolicy={mod.thumbnail.includes('imgur.com') ? "no-referrer" : undefined}
                                                                />
                                                            ) : (
                                                                <Box size={14} className="text-zinc-500"/>
                                                            )}
                                                            <span className="font-bold text-sm text-zinc-300 uppercase tracking-wide">{mod.title}</span>
                                                            <button onClick={() => openEditModule(mod)} className="text-zinc-600 hover:text-white"><Pencil size={12}/></button>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => openCreateLesson(mod.id)} className="text-[9px] font-black uppercase text-red-500 bg-red-500/10 px-3 py-1.5 rounded hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"><Plus size={10}/> Clase</button>
                                                            <button onClick={() => handleDelete('modules', mod.id)} className="text-zinc-600 hover:text-red-500 p-1.5"><Trash2 size={14}/></button>
                                                        </div>
                                                    </div>
                                                    <div className="p-2 space-y-1">
                                                        {mod.lessons?.map((l: any) => (
                                                            <div key={l.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 group border border-transparent hover:border-white/5 transition-all">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center text-zinc-600 group-hover:text-red-500 transition-colors"><Video size={10}/></div>
                                                                    <span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase transition-colors">{l.title}</span>
                                                                    {l.resources && <LinkIcon size={10} className="text-green-500"/>}
                                                                </div>
                                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => openEditLesson(l)} className="text-zinc-500 hover:text-white"><Pencil size={12}/></button>
                                                                    <button onClick={() => handleDelete('lessons', l.id)} className="text-zinc-500 hover:text-red-500"><Trash2 size={12}/></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {!mod.lessons?.length && <div className="text-[10px] text-center py-2 text-zinc-700 uppercase tracking-widest">Vacío</div>}
                                                    </div>
                                                </div>
                                            ))}
                                            {!course.modules?.length && <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-zinc-600 text-xs font-black uppercase">Sin módulos asignados</div>}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                  </div>
              </motion.div>
          )}

          {/* ================= VIEW: USER INTELLIGENCE ================= */}
          {currentView === 'USERS' && (
              <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-8">
                  
                  {/* STATS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* CARD 1: TOTAL USERS */}
                      <div className="p-6 bg-[#0a0a0a] border border-white/10 rounded-3xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-800/20 blur-[50px] rounded-full"/>
                          <div className="relative z-10">
                              <div className="flex items-center justify-between gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                                  <div className="flex items-center gap-2"><Users size={14}/> Base de Usuarios</div>
                                  <button onClick={fetchUserData} className="hover:text-white"><RefreshCw size={12}/></button>
                              </div>
                              <div className="text-4xl font-black text-white">{usersList.length}</div>
                              <div className="mt-4 text-xs text-zinc-400 font-medium">Estudiantes registrados en plataforma.</div>
                          </div>
                      </div>

                      {/* CARD 2: REAL TIME ONLINE */}
                      <div className={`p-6 rounded-3xl relative overflow-hidden group shadow-lg transition-colors border ${isSoloAdmin ? 'bg-gradient-to-br from-amber-900/20 to-black border-amber-600/30' : 'bg-gradient-to-br from-[#0a0a0a] to-[#111] border-red-900/20 shadow-red-900/10'}`}>
                          <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-[40px] rounded-full transition-all ${isSoloAdmin ? 'bg-amber-500/10 group-hover:bg-amber-500/20' : 'bg-red-600/10 group-hover:bg-red-600/20'}`}/>
                          <div className="relative z-10">
                              <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isSoloAdmin ? 'text-amber-500' : 'text-red-500'}`}>
                                  <Signal size={14} className="animate-pulse"/> {isSoloAdmin ? 'Modo Espera' : 'Actividad Real'}
                              </div>
                              <div className="text-4xl font-black text-white flex items-end gap-2">
                                  {isSoloAdmin ? (
                                      <span className="text-2xl text-amber-500">SOLO ADMIN</span>
                                  ) : (
                                      <>{studentsOnlineCount} <span className="text-lg text-zinc-600 mb-1">alumnos</span></>
                                  )}
                              </div>
                              <div className={`mt-4 text-xs font-medium ${isSoloAdmin ? 'text-amber-500/60' : 'text-red-400/60'}`}>
                                  {isSoloAdmin ? 'Esperando conexión de estudiantes...' : 'Usuarios aprendiendo ahora mismo.'}
                              </div>
                          </div>
                      </div>

                      {/* CARD 3: ENGAGEMENT */}
                      <div className="p-6 bg-[#0a0a0a] border border-white/10 rounded-3xl relative overflow-hidden">
                          <div className="relative z-10">
                              <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                                  <TrendingUp size={14}/> Engagement
                              </div>
                              <div className="text-4xl font-black text-white">
                                  {totalLessonsCount > 0 
                                    ? Math.round(usersList.reduce((acc, u) => acc + (u.completedLessons || 0), 0) / (usersList.length * totalLessonsCount) * 100) || 0
                                    : 0
                                  }%
                              </div>
                              <div className="mt-4 text-xs text-zinc-400 font-medium">Progreso promedio global de la academia.</div>
                          </div>
                      </div>
                  </div>

                  {/* USER TABLE */}
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden">
                      <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                          <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                              <Shield className="text-zinc-600" size={18}/> Directorio de Estudiantes
                          </h3>
                          <div className="relative w-full md:w-64">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={14}/>
                              <input type="text" placeholder="Buscar estudiante..." className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-white focus:border-red-600 outline-none transition-colors placeholder:text-zinc-700"/>
                          </div>
                      </div>

                      <div className="overflow-x-auto">
                          {usersList.length === 0 ? (
                            <div className="p-12 text-center text-zinc-600 font-bold uppercase tracking-widest text-xs">
                                No se encontraron perfiles. Ejecuta el script SQL para sincronizar.
                            </div>
                          ) : (
                              <table className="w-full text-left border-collapse">
                                  <thead>
                                      <tr className="border-b border-white/5 bg-white/[0.02]">
                                          <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Usuario</th>
                                          <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Rol</th>
                                          <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 w-1/4">Progreso</th>
                                          <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Accesos Permitidos</th>
                                          <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Estado</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {/* --- 1. ADMIN ROW (ALWAYS TOP, GOLDEN) --- */}
                                      {adminAccount && (
                                          <tr className="bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 border-b border-black/20 shadow-lg relative z-10">
                                              <td className="p-6">
                                                  <div className="flex items-center gap-4">
                                                      <div className="relative">
                                                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-amber-600 bg-white shadow-xl">
                                                            E
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
                                                      </div>
                                                      <div>
                                                          <div className="font-black text-base text-black flex items-center gap-2">
                                                            {adminAccount.full_name || 'Ezeh Admin'}
                                                            <Crown size={16} fill="black" className="text-black"/>
                                                          </div>
                                                          <div className="text-[11px] text-black/60 font-bold font-mono uppercase tracking-wider">{adminAccount.email}</div>
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className="p-6">
                                                  <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-black text-yellow-400 shadow-lg">
                                                      ADMIN MASTER
                                                  </span>
                                              </td>
                                              <td className="p-6">
                                                  <div className="w-full max-w-xs opacity-70">
                                                      <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                                                          <div className="h-full rounded-full bg-white w-full"></div>
                                                      </div>
                                                      <div className="text-[9px] font-bold text-black/60 mt-1 text-right">SISTEMA CONTROL TOTAL</div>
                                                  </div>
                                              </td>
                                              <td className="p-6">
                                                  <div className="flex items-center gap-2">
                                                      <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/40 border border-yellow-600/40 text-black text-[10px] font-black uppercase whitespace-nowrap tracking-wide leading-none">
                                                          <Crown size={12} fill="currentColor" className="text-black"/> ACCESO TOTAL (MASTER)
                                                      </span>
                                                  </div>
                                              </td>
                                              <td className="p-6 text-right">
                                                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-black/5 text-black">
                                                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></div>
                                                      <span className="text-[10px] font-black uppercase">ONLINE</span>
                                                  </div>
                                              </td>
                                          </tr>
                                      )}

                                      {/* --- 2. STUDENT ROWS --- */}
                                      {studentAccounts.map((u) => {
                                          const progressPercent = totalLessonsCount > 0 
                                            ? Math.round((u.completedLessons / totalLessonsCount) * 100) 
                                            : 0;
                                          const isOnline = onlineUserIds.has(u.id);

                                          return (
                                              <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                                  <td className="p-6">
                                                      <div className="flex items-center gap-4">
                                                          <div className="relative">
                                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-white/10">
                                                                {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                            {isOnline && (
                                                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-black rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                                                            )}
                                                          </div>
                                                          <div>
                                                              <div className="font-bold text-sm text-white group-hover:text-red-500 transition-colors">
                                                                {u.full_name || 'Sin nombre'}
                                                              </div>
                                                              <div className="text-[10px] text-zinc-500 font-mono">{u.email}</div>
                                                          </div>
                                                      </div>
                                                  </td>
                                                  <td className="p-6">
                                                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-white/5">
                                                          STUDENT
                                                      </span>
                                                  </td>
                                                  <td className="p-6">
                                                      <div className="w-full max-w-xs">
                                                          <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1">
                                                              <span>{u.completedLessons} / {totalLessonsCount} Clases</span>
                                                              <span>{progressPercent}%</span>
                                                          </div>
                                                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                              <div className={`h-full rounded-full ${progressPercent === 100 ? 'bg-green-500' : 'bg-white'}`} style={{ width: `${progressPercent}%` }}></div>
                                                          </div>
                                                      </div>
                                                  </td>
                                                  <td className="p-6">
                                                      <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                                                          {/* Cursos access */}
                                                          <button 
                                                            onClick={() => toggleUserPermission(u.id, 'tiene_acceso_cursos', !!u.tiene_acceso_cursos)}
                                                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all duration-300 ${
                                                              u.tiene_acceso_cursos 
                                                                ? 'bg-red-600/10 border-red-600/35 text-white' 
                                                                : 'bg-zinc-900/60 border-white/5 text-zinc-600 hover:text-zinc-500 hover:bg-zinc-900'
                                                            }`}
                                                            title="Permitir acceso al área de Cursos (Hotmart)"
                                                          >
                                                              <BookOpen size={10} className={u.tiene_acceso_cursos ? 'text-red-500' : 'text-zinc-700'} />
                                                              CURSOS
                                                          </button>

                                                          {/* Nichos access */}
                                                          <button 
                                                            onClick={() => toggleUserPermission(u.id, 'tiene_acceso_nichos', !!u.tiene_acceso_nichos)}
                                                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all duration-300 ${
                                                              u.tiene_acceso_nichos 
                                                                ? 'bg-red-600/10 border-red-600/35 text-white' 
                                                                : 'bg-zinc-900/60 border-white/5 text-zinc-600 hover:text-zinc-500 hover:bg-zinc-900'
                                                            }`}
                                                            title="Permitir acceso al área de Nichos Ganadores"
                                                          >
                                                              <Folder size={10} className={u.tiene_acceso_nichos ? 'text-red-500' : 'text-zinc-700'} />
                                                              NICHOS
                                                          </button>

                                                          {/* Herramientas access */}
                                                          <button 
                                                            onClick={() => toggleUserPermission(u.id, 'tiene_acceso_herramientas', !!u.tiene_acceso_herramientas)}
                                                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all duration-300 ${
                                                              u.tiene_acceso_herramientas 
                                                                ? 'bg-red-600/10 border-red-600/35 text-white' 
                                                                : 'bg-zinc-900/60 border-white/5 text-zinc-600 hover:text-zinc-500 hover:bg-zinc-900'
                                                            }`}
                                                            title="Permitir acceso premium ilimitado a Herramientas"
                                                          >
                                                              <Wrench size={10} className={u.tiene_acceso_herramientas ? 'text-red-500' : 'text-zinc-700'} />
                                                              TOOLS
                                                          </button>

                                                          {/* Extensiones access */}
                                                          <button 
                                                            onClick={() => toggleUserPermission(u.id, 'tiene_acceso_extensiones', !!u.tiene_acceso_extensiones)}
                                                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all duration-300 ${
                                                              u.tiene_acceso_extensiones 
                                                                ? 'bg-red-600/10 border-red-600/35 text-white' 
                                                                : 'bg-zinc-900/60 border-white/5 text-zinc-600 hover:text-zinc-500 hover:bg-zinc-900'
                                                            }`}
                                                            title="Permitir acceso premium ilimitado a Extensiones"
                                                          >
                                                              <PlusCircle size={10} className={u.tiene_acceso_extensiones ? 'text-red-500' : 'text-zinc-700'} />
                                                              EXTS
                                                          </button>
                                                      </div>
                                                  </td>
                                                  <td className="p-6 text-right">
                                                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${isOnline ? 'bg-green-500/10 border-green-500/20' : 'bg-transparent border-transparent'}`}>
                                                          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-700'}`}></div>
                                                          <span className={`text-[10px] font-bold uppercase ${isOnline ? 'text-green-500' : 'text-zinc-600'}`}>
                                                            {isOnline ? 'En Línea' : 'Offline'}
                                                          </span>
                                                      </div>
                                                  </td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          )}
                      </div>
                  </div>
              </motion.div>
          )}

          {/* ================= VIEW: RESOURCES MANAGER ================= */}
          {currentView === 'RESOURCES' && (
              <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-12">
                  
                  {/* GESTIÓN DE NICHOS */}
                  <section className="space-y-6">
                      <div className="flex justify-between items-end">
                          <div>
                              <h2 className="text-3xl font-black text-white mb-2 uppercase">GESTIÓN DE NICHOS</h2>
                              <p className="text-zinc-500 text-sm font-medium">Añade canales de YouTube para la sección de nichos ganadores.</p>
                          </div>
                      </div>
                      
                      <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 space-y-6">
                          <div className="flex gap-4">
                              <input 
                                  type="text" 
                                  value={newNicheUrl} 
                                  onChange={e => setNewNicheUrl(e.target.value)} 
                                  placeholder="URL del canal de YouTube..."
                                  className="flex-1 bg-black border border-white/10 rounded-xl px-6 py-4 text-sm font-bold text-white focus:border-red-600 outline-none transition-colors"
                              />
                              <button 
                                  onClick={addNiche}
                                  disabled={savingNiche || !newNicheUrl.trim()}
                                  className="px-8 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl font-black uppercase text-xs transition-all flex items-center gap-2"
                              >
                                  {savingNiche ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} AÑADIR NICHO
                              </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {niches.map(niche => (
                                  <div key={niche.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group">
                                      <div className="flex items-center gap-3 overflow-hidden">
                                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden border border-white/10">
                                              {niche.thumbnail && (
                                                <img 
                                                    src={getDirectImageUrl(niche.thumbnail)} 
                                                    alt={niche.name} 
                                                    className="w-full h-full object-cover" 
                                                    referrerPolicy={niche.thumbnail?.includes('imgur.com') ? "no-referrer" : undefined}
                                                />
                                              )}
                                          </div>
                                          <div className="truncate">
                                              <p className="text-sm font-bold text-white truncate">{niche.name}</p>
                                              <div className="flex items-center gap-2">
                                                  <p className="text-[10px] text-zinc-500 truncate max-w-[120px]">{niche.url}</p>
                                                  {niche.created_at && (
                                                      <span className="text-[9px] font-black bg-white/10 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                          {(() => {
                                                              const createdDate = new Date(niche.created_at);
                                                              const expiryDate = new Date(createdDate);
                                                              expiryDate.setDate(expiryDate.getDate() + 30);
                                                              const now = new Date();
                                                              const diffTime = expiryDate.getTime() - now.getTime();
                                                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                              return diffDays > 0 ? `${diffDays} DÍAS RESTANTES` : 'EXPIRA HOY';
                                                          })()}
                                                      </span>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                      <button onClick={() => handleDelete('niches', niche.id)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </section>

                  {/* GESTIÓN DE HERRAMIENTAS */}
                  <section className="space-y-6">
                      <div className="flex justify-between items-end">
                          <div>
                              <h2 className="text-3xl font-black text-white mb-2 uppercase">GESTIÓN DE HERRAMIENTAS</h2>
                              <p className="text-zinc-500 text-sm font-medium">Administra los enlaces externos y recursos para alumnos.</p>
                          </div>
                      </div>

                      <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <input 
                                  type="text" 
                                  value={newToolName} 
                                  onChange={e => setNewToolName(e.target.value)} 
                                  placeholder="Nombre de la herramienta..."
                                  className="flex-1 bg-black border border-white/10 rounded-xl px-6 py-4 text-sm font-bold text-white focus:border-red-600 outline-none transition-colors"
                              />
                               <input 
                                  type="text" 
                                  value={newToolUrl} 
                                  onChange={e => setNewToolUrl(e.target.value)} 
                                  placeholder="URL (Link)..."
                                  className="flex-1 bg-black border border-white/10 rounded-xl px-6 py-4 text-sm font-bold text-white focus:border-red-600 outline-none transition-colors"
                              />
                          </div>

                          {/* Premium toggle checkbox */}
                          <div className="flex items-center gap-3 bg-black border border-white/5 p-4 rounded-xl">
                              <input 
                                  type="checkbox" 
                                  id="newToolPremium"
                                  checked={newToolPremium} 
                                  onChange={e => setNewToolPremium(e.target.checked)} 
                                  className="w-4 h-4 rounded accent-red-600 bg-black border-white/10 text-white cursor-pointer"
                              />
                              <label htmlFor="newToolPremium" className="text-xs font-black uppercase text-zinc-400 cursor-pointer select-none">
                                  ¿Es recurso PREMIUM de pago? (Alumnos con acceso "TOOLS" habilitado podrán usarla)
                              </label>
                          </div>

                          <button 
                              onClick={addTool}
                              disabled={savingTool || !newToolName.trim() || !newToolUrl.trim()}
                              className="w-full py-4 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center gap-2"
                          >
                              {savingTool ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} AÑADIR HERRAMIENTA
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {tools.map(tool => (
                                  <div key={tool.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-4">
                                      <div className="truncate flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                              <p className="text-sm font-bold text-white truncate">{tool.name}</p>
                                              <button 
                                                onClick={() => toggleToolPremium(tool.id, !!tool.es_premium)}
                                                className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider transition-all ${
                                                  tool.es_premium 
                                                    ? 'bg-red-600/20 text-red-500 border border-red-600/30 hover:bg-red-600/30' 
                                                    : 'bg-zinc-850 text-zinc-500 border border-white/5 hover:bg-zinc-800'
                                                }`}
                                                title="Hacer clic para cambiar entre PREMIUM/FREE"
                                              >
                                                  {tool.es_premium ? 'PREMIUM' : 'FREE'}
                                              </button>
                                          </div>
                                          <p className="text-[10px] text-zinc-500 truncate font-mono">{tool.url}</p>
                                      </div>
                                      <button onClick={() => handleDelete('tools', tool.id)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </section>

                   {/* GESTIÓN DE EXTENSIONES */}
                   <section className="space-y-6">
                      <div className="flex justify-between items-end">
                          <div>
                              <h2 className="text-3xl font-black text-white mb-2 uppercase">GESTIÓN DE EXTENSIONES</h2>
                              <p className="text-zinc-500 text-sm font-medium">Sube y gestiona las herramientas de Bunny.net.</p>
                          </div>
                      </div>

                      <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <input 
                                  type="text" 
                                  value={newExtensionName} 
                                  onChange={e => setNewExtensionName(e.target.value)} 
                                  placeholder="Nombre de la extensión..."
                                  className="flex-1 bg-black border border-white/10 rounded-xl px-6 py-4 text-sm font-bold text-white focus:border-red-600 outline-none transition-colors"
                              />
                               <input 
                                  type="text" 
                                  value={newExtensionUrl} 
                                  onChange={e => setNewExtensionUrl(e.target.value)} 
                                  placeholder="URL (Bunny.net link)..."
                                  className="flex-1 bg-black border border-white/10 rounded-xl px-6 py-4 text-sm font-bold text-white focus:border-red-600 outline-none transition-colors"
                              />
                          </div>
                          <textarea 
                                value={newExtensionDesc}
                                onChange={e => setNewExtensionDesc(e.target.value)}
                                placeholder="Descripción corta..."
                                rows={2}
                                className="w-full bg-black border border-white/10 rounded-xl px-6 py-4 text-sm font-bold text-white focus:border-red-600 outline-none transition-colors resize-none"
                          />

                          {/* Premium toggle checkbox */}
                          <div className="flex items-center gap-3 bg-black border border-white/5 p-4 rounded-xl">
                              <input 
                                  type="checkbox" 
                                  id="newExtensionPremium"
                                  checked={newExtensionPremium} 
                                  onChange={e => setNewExtensionPremium(e.target.checked)} 
                                  className="w-4 h-4 rounded accent-red-600 bg-black border-white/10 text-white cursor-pointer"
                              />
                              <label htmlFor="newExtensionPremium" className="text-xs font-black uppercase text-zinc-400 cursor-pointer select-none">
                                  ¿Es extensión PREMIUM de pago? (Alumnos con acceso "EXTENSIONES" habilitado podrán descargarla)
                              </label>
                          </div>

                          <button 
                              onClick={addExtension}
                              disabled={savingExtension || !newExtensionName.trim() || !newExtensionUrl.trim()}
                              className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center gap-2"
                          >
                              {savingExtension ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} AÑADIR EXTENSIÓN
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {extensions.map(ext => (
                                  <div key={ext.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-4">
                                      <div className="truncate flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                              <p className="text-sm font-bold text-white truncate">{ext.name}</p>
                                              <button 
                                                onClick={() => toggleExtensionPremium(ext.id, !!ext.es_premium)}
                                                className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider transition-all ${
                                                  ext.es_premium 
                                                    ? 'bg-red-600/20 text-red-500 border border-red-600/30 hover:bg-red-600/30' 
                                                    : 'bg-zinc-850 text-zinc-500 border border-white/5 hover:bg-zinc-800'
                                                }`}
                                                title="Hacer clic para cambiar entre PREMIUM/FREE"
                                              >
                                                  {ext.es_premium ? 'PREMIUM' : 'FREE'}
                                              </button>
                                          </div>
                                          <p className="text-[10px] text-zinc-500 truncate font-mono">{ext.url}</p>
                                      </div>
                                      <button onClick={() => handleDelete('extensions', ext.id)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </section>

              </motion.div>
          )}

      </main>

      {/* --- MODALS (Reused Logic) --- */}
      {modalType === 'COURSE' && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-[#0f0f0f] p-10 rounded-[3rem] w-full max-w-lg border border-white/10 relative shadow-2xl">
                <button onClick={closeModal} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X/></button>
                <h2 className="text-3xl font-black italic uppercase mb-8">{isEditing ? 'Editar' : 'Nuevo'} <span className="text-red-600">Master</span></h2>
                
                <div className="space-y-4 mb-8">
                    {inputCourseThumbnail && (
                        <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center relative group/preview">
                            <img 
                                src={getDirectImageUrl(inputCourseThumbnail)} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                                referrerPolicy={inputCourseThumbnail.includes('imgur.com') ? "no-referrer" : undefined}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1600x900?text=Error+en+URL+de+Imagen';
                                }}
                            />
                            <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-[8px] font-black uppercase text-white backdrop-blur-sm border border-white/10">Vista Previa</div>
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Nombre del Master</label>
                        <input autoFocus type="text" value={inputTitle} onChange={e => setInputTitle(e.target.value)} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-white font-bold outline-none focus:border-red-600 placeholder:text-zinc-800 transition-colors" placeholder="NOMBRE DEL MASTER..."/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Banner / Thumbnail URL (Link Imgur u otro)</label>
                        <input type="text" value={inputCourseThumbnail} onChange={e => setInputCourseThumbnail(e.target.value)} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-white font-bold outline-none focus:border-red-600 placeholder:text-zinc-800 transition-colors font-mono text-xs" placeholder="Ej: https://imgur.com/gPuQuN8"/>
                    </div>
                </div>

                <button onClick={submitCourse} className="w-full bg-red-600 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all">{isEditing ? 'Guardar Cambios' : 'Crear Estructura'}</button>
            </div>
        </div>
      )}

      {modalType === 'MODULE' && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-[#0f0f0f] p-10 rounded-[3rem] w-full max-w-lg border border-white/10 relative shadow-2xl">
                <button onClick={closeModal} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X/></button>
                <h2 className="text-2xl font-black italic uppercase mb-8 flex items-center gap-3"><Box className="text-red-600"/> {isEditing ? 'Editar' : 'Nuevo'} Módulo</h2>
                
                <div className="space-y-4">
                  <input autoFocus type="text" value={inputTitle} onChange={e => setInputTitle(e.target.value)} className="w-full bg-black border border-white/10 p-6 rounded-2xl text-white font-bold outline-none focus:border-red-600 placeholder:text-zinc-800 transition-colors" placeholder="NOMBRE DEL MÓDULO..."/>
                  
                  {/* Thumbnail Upload for Module */}
                  <div className="w-full bg-black border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:border-red-600/50 transition-colors relative">
                      {uploading ? (
                          <div className="flex flex-col items-center text-red-600 animate-pulse">
                              <Loader2 className="animate-spin" size={24}/>
                              <span className="text-[10px] font-black uppercase mt-2">Subiendo...</span>
                          </div>
                      ) : inputModuleThumbnail ? (
                          <div className="w-full relative group/img">
                              <img 
                                  src={getDirectImageUrl(inputModuleThumbnail)} 
                                  alt="Thumbnail" 
                                  className="w-full h-32 object-cover rounded-xl border border-white/20"
                                  referrerPolicy={inputModuleThumbnail.includes('imgur.com') ? "no-referrer" : undefined}
                              />
                              <button onClick={() => setInputModuleThumbnail('')} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-red-600 hover:text-white transition-colors"><Trash2 size={12}/></button>
                              <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white font-bold uppercase backdrop-blur-sm flex items-center gap-1"><CheckCircle size={10} className="text-green-500"/> Portada cargada</div>
                          </div>
                      ) : (
                          <>
                              <ImageIcon size={24} className="text-zinc-700"/>
                              <p className="text-[10px] font-black uppercase text-zinc-500">Subir Portada (Opcional)</p>
                              <input type="file" accept="image/*" onChange={handleModuleThumbnailUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                          </>
                      )}
                  </div>
                </div>

                <button onClick={submitModule} disabled={uploading} className={`w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-all mt-6 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>{isEditing ? 'Guardar Cambios' : 'Añadir Módulo'}</button>
            </div>
        </div>
      )}

      {modalType === 'LESSON' && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-[#0f0f0f] w-full max-w-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-900/30">
                    <h2 className="text-2xl font-black uppercase italic flex items-center gap-3 text-white">
                        <Video className="text-red-600"/> {isEditing ? 'Editar' : 'Nueva'} <span className="text-red-600">Lección</span>
                    </h2>
                    <button onClick={closeModal} className="p-2 bg-white/5 rounded-full hover:bg-red-600 hover:text-white transition-all"><X size={20}/></button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Título</label>
                        <input autoFocus type="text" value={lessonData.title} onChange={e => setLessonData({...lessonData, title: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-bold focus:border-red-600 outline-none transition-all placeholder:text-zinc-800" placeholder="Ej: Estrategia de Ventas..."/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Video URL</label>
                        <input type="text" value={lessonData.video_url} onChange={e => setLessonData({...lessonData, video_url: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-zinc-300 focus:border-red-600 outline-none transition-all font-mono text-sm" placeholder="https://..."/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Descripción</label>
                        <textarea value={lessonData.description} onChange={e => setLessonData({...lessonData, description: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-zinc-400 focus:border-red-600 outline-none transition-all min-h-[100px] resize-none" placeholder="Resumen..."/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Materiales / Archivos</label>
                        <div className="w-full bg-black border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-red-600/50 transition-colors relative">
                            {uploading ? (
                                <div className="flex flex-col items-center text-red-600 animate-pulse">
                                    <Loader2 className="animate-spin" size={32}/>
                                    <span className="text-xs font-black uppercase mt-2">Subiendo...</span>
                                </div>
                            ) : lessonData.resources ? (
                                <div className="flex items-center gap-3 text-green-500">
                                    <CheckCircle size={32}/>
                                    <div className="text-left">
                                        <p className="text-xs font-black uppercase">Cargado</p>
                                        <p className="text-[10px] text-zinc-500 truncate max-w-[200px]">{lessonData.resources}</p>
                                    </div>
                                    <button onClick={() => setLessonData(prev => ({...prev, resources: ''}))} className="p-2 bg-white/5 rounded-full hover:bg-red-600 hover:text-white ml-4"><Trash2 size={14}/></button>
                                </div>
                            ) : (
                                <>
                                    <Upload size={32} className="text-zinc-700"/>
                                    <p className="text-xs font-black uppercase text-zinc-500">Arrastra archivo aquí</p>
                                    <input type="file" onChange={handleLessonFileUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-8 pt-0 bg-gradient-to-t from-[#0f0f0f] to-transparent">
                    <button onClick={submitLesson} disabled={uploading} className={`w-full bg-red-600 py-5 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-3 active:scale-95 text-white ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Save size={20}/> {isEditing ? 'Guardar' : 'Crear Lección'}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminPage;
