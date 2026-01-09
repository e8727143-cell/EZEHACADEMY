
import React, { useState, useMemo, useRef } from 'react';
import ReactPlayer from 'react-player';
import { AlertCircle, RefreshCw, ExternalLink, Play, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoPlayerProps {
  url: string;
  thumbnail?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, thumbnail }) => {
  const [videoError, setVideoError] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  const playerRef = useRef<any>(null);

  /**
   * PROTOCOLO DE INTERFAZ LIMPIA (EZEH ACADEMY):
   * Formateo de URL con parámetros agresivos de limpieza.
   */
  const formattedUrl = useMemo(() => {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[2].length === 11) {
      const videoId = match[2];
      const origin = encodeURIComponent(window.location.origin);
      // controls=0: Ocultamos los controles nativos para el look nativo
      // modestbranding=1: Quita el logo de la barra
      // rel=0: No muestra sugerencias externas
      // iv_load_policy=3: Quita anotaciones
      // autohide=1: Oculta controles automáticamente
      return `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${origin}&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&controls=0&autoplay=1`;
    }
    return url;
  }, [url]);

  const handleStart = () => {
    setIsActivated(true);
  };

  const handleRetry = () => {
    setVideoError(false);
    setIsActivated(false);
    setIsReady(false);
    setVideoKey(prev => prev + 1);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div 
      className="relative w-full aspect-video bg-[#050505] rounded-[2.5rem] overflow-hidden border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.5)] group"
      onContextMenu={handleContextMenu}
    >
      <AnimatePresence mode="wait">
        {!isActivated ? (
          /* 1. CUSTOM OVERLAY (VIDEO COVER) */
          <motion.div 
            key="cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 cursor-pointer group/cover"
            onClick={handleStart}
          >
            {/* Thumbnail con Blur Estético */}
            <div className="absolute inset-0 overflow-hidden">
              <img 
                src={thumbnail || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop"} 
                alt="Clase Preview" 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover/cover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-red-600/10 mix-blend-overlay" />
            </div>

            {/* BOTÓN DE PLAY PERSONALIZADO (Círculo Rojo Pulso) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Efecto de Pulso */}
                <motion.div 
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-red-600 rounded-full blur-xl"
                />
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative z-10 w-24 h-24 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.4)] border border-white/20"
                >
                  <Play fill="white" size={32} className="ml-1 text-white" />
                </motion.div>
              </div>
            </div>

            {/* Texto de Acceso */}
            <div className="absolute bottom-10 left-12">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-px bg-red-600" />
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Iniciar Clase Premium</span>
               </div>
            </div>
          </motion.div>
        ) : (
          /* 2. REPRODUCTOR ACTIVADO */
          <motion.div 
            key="player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full h-full"
          >
            {!videoError ? (
              /* MÁSCARA DE SEGURIDAD (CSS HACK) */
              <div className="relative w-full h-full scale-[1.08] origin-center"> 
                {/* El scale 1.08 empuja los bordes (título y marca de agua) fuera del viewport */}
                <ReactPlayer
                  key={videoKey}
                  ref={playerRef}
                  url={formattedUrl}
                  width="100%"
                  height="100%"
                  playing={true}
                  onReady={() => setIsReady(true)}
                  onError={() => setVideoError(true)}
                  config={{
                    youtube: {
                      playerVars: { 
                        origin: window.location.origin,
                        enablejsapi: 1,
                        modestbranding: 1,
                        rel: 0,
                        showinfo: 0,
                        iv_load_policy: 3,
                        controls: 0,
                        fs: 0
                      }
                    }
                  }}
                />
                
                {/* CAPA DE BLOQUEO SUPERIOR (Anticlic Título) */}
                <div className="absolute top-0 left-0 right-0 h-[80px] z-20 pointer-events-auto cursor-default" />
                
                {/* CAPA DE BLOQUEO INFERIOR (Anticlic Branding) */}
                <div className="absolute bottom-0 left-0 right-0 h-[60px] z-20 pointer-events-auto cursor-default" />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] text-center p-10 z-40">
                <AlertCircle size={64} className="text-red-600 mb-6 opacity-40 animate-pulse" />
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-4 italic">ERROR DE <span className="text-red-600">REPRODUCCIÓN</span></h2>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] max-w-sm leading-loose mb-10">
                  La red ha bloqueado el protocolo de flujo nativo.
                </p>
                <button 
                  onClick={handleRetry} 
                  className="bg-white text-black px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-2xl"
                >
                  <RefreshCw size={18} className="inline mr-3"/> Forzar Reinicio
                </button>
              </div>
            )}

            {/* Spinner de Carga Inicial */}
            {!isReady && !videoError && (
               <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                  <div className="flex flex-col items-center gap-4">
                     <Loader2 className="animate-spin text-red-600" size={40} />
                     <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-700">Cargando Stream Privado...</span>
                  </div>
               </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY DE MARCA FINAL (ESTÉTICO) */}
      <div className="absolute inset-0 border-[1.5rem] border-black/10 pointer-events-none rounded-[2.5rem] z-50" />
    </div>
  );
};

export default VideoPlayer;
