
import React, { useState, useMemo, useRef } from 'react';
import ReactPlayer from 'react-player';
import { AlertCircle, RefreshCw, ExternalLink, Play, Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  thumbnail?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, thumbnail }) => {
  const [videoError, setVideoError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  const playerRef = useRef<any>(null);

  /**
   * PROTOCOLO DE LIMPIEZA EZEH ACADEMY:
   * 1. youtube-nocookie para privacidad.
   * 2. Parámetros para ocultar branding, anuncios y recomendaciones.
   */
  const formattedUrl = useMemo(() => {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[2].length === 11) {
      const videoId = match[2];
      const origin = encodeURIComponent(window.location.origin);
      // enablejsapi=1: Permite control externo
      // modestbranding=1: Quita el logo de la barra
      // rel=0: No muestra sugerencias de otros canales
      // iv_load_policy=3: Quita anotaciones
      // controls=1: Mantiene los controles básicos
      return `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${origin}&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&controls=1&autoplay=0`;
    }
    return url;
  }, [url]);

  const handleRetry = () => {
    setVideoError(false);
    setIsReady(false);
    setVideoKey(prev => prev + 1);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Bloqueo de clic derecho para evitar robo de URL
  };

  return (
    <div 
      className="relative w-full aspect-video bg-black rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl group"
      onContextMenu={handleContextMenu}
    >
      {/* ESTADO DE CARGA / THUMBNAIL BRANDING */}
      {!isReady && !videoError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
          {thumbnail && (
            <img 
              src={thumbnail} 
              alt="Cargando..." 
              className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-110"
            />
          )}
          <div className="relative z-20 flex flex-col items-center">
            <div className="w-20 h-20 mb-6 flex items-center justify-center">
               <Loader2 className="animate-spin text-red-600 absolute" size={80} strokeWidth={1} />
               <span className="text-white font-black italic text-xl tracking-tighter">EZEH</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-600/50 animate-pulse">Sincronizando Stream...</p>
          </div>
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      {/* REPRODUCTOR LIMPIO */}
      {!videoError ? (
        <div className="relative w-full h-full scale-[1.01]"> {/* Ligero zoom para ocultar bordes de YouTube */}
          <ReactPlayer
            key={videoKey}
            ref={playerRef}
            url={formattedUrl}
            width="100%"
            height="100%"
            controls={true}
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
                  fs: 1,
                  disablekb: 0
                }
              }
            }}
          />
          
          {/* MÁSCARA SUPERIOR (HACK PARA TÍTULO) */}
          <div className="absolute top-0 left-0 right-0 h-[60px] bg-gradient-to-b from-black/80 to-transparent pointer-events-auto z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             {/* Esta capa bloquea clics en el título de YouTube pero permite ver el video */}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-center p-10 z-20">
          <AlertCircle size={64} className="text-red-600 mb-6 opacity-40 animate-pulse" />
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-4 italic">ERROR DE <span className="text-red-600">FLUJO</span></h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] max-w-sm leading-loose mb-10">
            Protocolo de seguridad Origin-Bypass fallido. La red rechaza el servidor nocookie.
          </p>
          <div className="flex flex-col sm:flex-row gap-5">
            <button 
              onClick={handleRetry} 
              className="flex items-center justify-center gap-3 bg-white text-black px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-2xl"
            >
              <RefreshCw size={18} /> Forzar Recarga
            </button>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-red-600/10 text-red-500 border border-red-600/20 px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
            >
              <ExternalLink size={18} /> Abrir Externo
            </a>
          </div>
        </div>
      )}

      {/* Overlay Estético Branding Inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    </div>
  );
};

export default VideoPlayer;
