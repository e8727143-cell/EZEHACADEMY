
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Loader2, 
  RotateCcw,
  FastForward,
  Rewind
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoPlayerProps {
  url: string;
  thumbnail?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, thumbnail }) => {
  // Estados del Reproductor
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isActivated, setIsActivated] = useState(false);

  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Formateo de URL para modo invisible
  const formattedUrl = useMemo(() => {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      const videoId = match[2];
      return `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&controls=0&showinfo=0&disablekb=1&fs=0`;
    }
    return url;
  }, [url]);

  // Handlers de Control
  const togglePlay = () => {
    if (!isActivated) setIsActivated(true);
    setPlaying(!playing);
  };

  const handleProgress = (state: { played: number }) => {
    if (!seeking) setPlayed(state.played);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => setSeeking(true);
  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false);
    playerRef.current?.seekTo(parseFloat((e.target as HTMLInputElement).value));
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    return `${mm}:${ss}`;
  };

  // Autohide controls logic
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = window.setTimeout(() => {
        if (playing) setShowControls(false);
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }
    return () => container?.removeEventListener('mousemove', handleMouseMove);
  }, [playing]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-[2.5rem] overflow-hidden border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.8)] group select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. MÁSCARA "ANTI-YOUTUBE" (Escalado estratégico) */}
      <div className={`absolute inset-0 transition-all duration-700 ${isActivated ? 'scale-[1.15]' : 'scale-100'}`}>
        <ReactPlayer
          ref={playerRef}
          url={formattedUrl}
          width="100%"
          height="100%"
          playing={playing}
          volume={volume}
          muted={muted}
          onProgress={handleProgress}
          onDuration={(d) => setDuration(d)}
          onReady={() => setIsReady(true)}
          config={{
            youtube: {
              playerVars: { 
                origin: window.location.origin,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                showinfo: 0
              }
            }
          }}
        />
      </div>

      {/* 2. BLOQUEO DE INTERACCIÓN (Invisible Overlay) */}
      <div 
        className="absolute inset-0 z-20 cursor-pointer"
        onClick={togglePlay}
      />

      {/* 3. FONDO DE PRE-CARGA (Thumbnail Blur) */}
      <AnimatePresence>
        {!isActivated && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black"
          >
            <img 
              src={thumbnail || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop"} 
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110"
              alt="Pre-load"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />
            
            {/* Play Central Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={togglePlay}
              className="relative z-40 w-28 h-28 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.5)] border border-white/20 group/play"
            >
              <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-20" />
              <Play fill="white" size={40} className="ml-2 transition-transform group-hover/play:scale-110" />
            </motion.button>
            
            <div className="mt-8 z-40 text-center">
              <h2 className="text-white font-black italic text-2xl tracking-tighter uppercase">EZEH <span className="text-red-600">ACADEMY</span></h2>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-600/60 mt-2">Streaming de Alta Definición</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. CUSTOM CONTROLS (ESTILO NETFLIX) */}
      <AnimatePresence>
        {isActivated && (showControls || !playing) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 pointer-events-none"
          >
            {/* Sombra de Controles Inferior */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black via-black/60 to-transparent" />
            
            {/* Barra de Controles */}
            <div className="absolute bottom-0 left-0 right-0 p-8 pt-0 pointer-events-auto">
              
              {/* Timeline (Barra de Progreso) */}
              <div className="group/timeline relative w-full h-1.5 mb-6 bg-white/10 rounded-full cursor-pointer overflow-visible">
                <div 
                  className="absolute top-0 left-0 h-full bg-red-600 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)] z-10"
                  style={{ width: `${played * 100}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={0.999999}
                  step="any"
                  value={played}
                  onMouseDown={handleSeekMouseDown}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekMouseUp}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                {/* Knob visible en hover */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full shadow-xl opacity-0 group-hover/timeline:opacity-100 transition-opacity z-30 pointer-events-none border-2 border-white"
                  style={{ left: `calc(${played * 100}% - 8px)` }}
                />
              </div>

              {/* Botones y Acciones */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <button onClick={togglePlay} className="text-white hover:text-red-500 transition-all hover:scale-110 active:scale-95">
                    {playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                  </button>
                  
                  <div className="flex items-center gap-4 group/vol relative">
                    <button onClick={() => setMuted(!muted)} className="text-white/80 hover:text-white transition-colors">
                      {muted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>
                    <input 
                      type="range" 
                      min={0} 
                      max={1} 
                      step="any" 
                      value={volume} 
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-0 group-hover/vol:w-24 transition-all duration-300 h-1 bg-white/20 accent-red-600 appearance-none rounded-full cursor-pointer"
                    />
                  </div>

                  <div className="text-[11px] font-black text-white/60 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-white">{formatTime(played * duration)}</span>
                    <span className="opacity-40">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <button onClick={() => playerRef.current?.seekTo(playerRef.current?.getCurrentTime() - 10)} className="text-white/40 hover:text-white transition-all"><RotateCcw size={20}/></button>
                  <button onClick={toggleFullScreen} className="text-white/80 hover:text-white transition-all hover:scale-110">
                    <Maximize size={24} />
                  </button>
                </div>
              </div>
            </div>

            {/* Play/Pause Central (Flash on Action) */}
            {!playing && isActivated && (
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-24 h-24 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 shadow-2xl">
                    <Play fill="white" size={32} className="ml-1 text-white" />
                 </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spinner de Buffering */}
      {!isReady && isActivated && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50">
            <Loader2 className="animate-spin text-red-600" size={60} strokeWidth={1} />
         </div>
      )}
    </div>
  );
};

export default VideoPlayer;
