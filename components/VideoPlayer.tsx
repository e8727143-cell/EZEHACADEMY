
import React, { useState, useRef } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Volume2, Maximize } from 'lucide-react';

export default function VideoPlayer({ url, title }: { url: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const playerRef = useRef<any>(null);

  // Formatear tiempo (00:00)
  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPlayed(val);
    playerRef.current?.seekTo(val);
  };

  const toggleFullScreen = () => {
    // Attempt to find the container div to request fullscreen
    const container = playerRef.current?.wrapper?.parentElement;
    if (container) {
      if (!document.fullscreenElement) {
        container.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div 
      className="relative group w-full aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* 1. EL REPRODUCTOR (BASE) */}
      <div className="absolute inset-0">
        <ReactPlayer
          ref={playerRef}
          url={url}
          width="100%"
          height="100%"
          playing={playing}
          volume={volume}
          onProgress={(state) => setPlayed(state.played)}
          onDuration={(d) => setDuration(d)}
          config={{
            youtube: {
              playerVars: { 
                modestbranding: 1, 
                rel: 0, 
                showinfo: 0, 
                controls: 0, 
                iv_load_policy: 3,
                disablekb: 1,
                fs: 0
              }
            }
          }}
          style={{ pointerEvents: 'none' }} // Bloquea clics directos en YT
        />
      </div>

      {/* 2. MÁSCARA ANTI-RECOMENDACIONES (SOLO EN PAUSA) */}
      {!playing && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-10 flex flex-col items-center justify-center animate-in fade-in duration-500">
           <div className="text-red-600 font-black text-2xl mb-4 tracking-tighter italic">EZEH ACADEMY</div>
           <button 
             onClick={() => setPlaying(true)}
             className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl shadow-red-600/40 border border-white/10"
           >
             <Play fill="white" size={32} className="ml-1 text-white" />
           </button>
           <p className="mt-6 text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Pausado: {title}</p>
        </div>
      )}

      {/* 3. PARCHES QUIRÚRGICOS (TAPAR LOGO Y TÍTULO SIN ZOOM) */}
      <div className="absolute top-0 left-0 w-full h-[80px] bg-gradient-to-b from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-[120px] h-[50px] bg-black z-20 pointer-events-none rounded-lg" />

      {/* 4. CONTROLES PERSONALIZADOS (ESTILO NETFLIX) */}
      <div className={`absolute inset-x-0 bottom-0 z-30 transition-opacity duration-500 ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-8">
          
          {/* TIMELINE */}
          <div className="group/timeline relative w-full h-1.5 bg-white/10 rounded-full mb-6 cursor-pointer">
            <div 
              className="absolute top-0 left-0 h-full bg-red-600 rounded-full z-10 shadow-[0_0_15px_rgba(239,68,68,0.8)]" 
              style={{ width: `${played * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={0.999999}
              step="any"
              value={played}
              onChange={handleSeekChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full shadow-xl opacity-0 group-hover/timeline:opacity-100 transition-opacity z-30 pointer-events-none border-2 border-white"
              style={{ left: `calc(${played * 100}% - 8px)` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <button onClick={() => setPlaying(!playing)} className="text-white hover:text-red-600 transition-all hover:scale-110 active:scale-95">
                {playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
              </button>
              
              <div className="flex items-center gap-4 group/vol">
                <Volume2 size={20} className="text-white/40 group-hover/vol:text-red-600 transition-colors" />
                <input 
                  type="range" min={0} max={1} step="any" 
                  value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-24 accent-red-600 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
              </div>

              <div className="text-[11px] font-black tracking-widest uppercase tabular-nums">
                <span className="text-white">{formatTime(played * duration)}</span>
                <span className="text-white/20 mx-2">/</span>
                <span className="text-white/40">{formatTime(duration)}</span>
              </div>
            </div>

            <button onClick={toggleFullScreen} className="text-white/40 hover:text-white transition-all hover:scale-110 active:scale-95">
              <Maximize size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
