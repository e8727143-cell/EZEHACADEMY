
import React, { useState, useRef } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Volume2, Maximize, Gauge } from 'lucide-react';

export default function VideoPlayer({ url, title }: { url: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const playerRef = useRef<ReactPlayer>(null);

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const toggleFullScreen = () => {
    // Attempt to find the container div to request fullscreen
    const container = playerRef.current?.getInternalPlayer()?.parentElement?.parentElement?.parentElement;
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
      className="relative group w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl"
      onMouseMove={() => { setShowControls(true); }}
      onMouseLeave={() => { if(playing) setShowControls(false); setShowSettings(false); }}
    >
      {/* 1. EL REPRODUCTOR CON CLIP-PATH (ELIMINA TÍTULO Y CANAL DE ARRIBA) */}
      <div className="absolute inset-0 w-full h-full scale-[1.01]" style={{ clipPath: 'inset(8% 0 0 0)' }}>
        <ReactPlayer
          ref={playerRef}
          url={url}
          width="100%"
          height="115%" // Estiramos un poco hacia abajo para compensar el recorte de arriba
          style={{ marginTop: '-8%' }} // Subimos el video para esconder el cabezal de YT
          playing={playing}
          volume={volume}
          playbackRate={playbackRate}
          onProgress={(state) => setPlayed(state.played)}
          onDuration={(d) => setDuration(d)}
          config={{
            youtube: {
              playerVars: { 
                modestbranding: 1, 
                rel: 0, 
                controls: 0, 
                iv_load_policy: 3, 
                disablekb: 1 
              }
            }
          }}
        />
      </div>

      {/* 2. VELO DE PAUSA (ANTI-RECOMENDACIONES) */}
      {!playing && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-40 flex flex-col items-center justify-center transition-all">
           <div className="text-red-600 font-black text-4xl mb-6 tracking-tighter italic drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">EZEH ACADEMY</div>
           <button onClick={() => setPlaying(true)} className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl shadow-red-600/40">
             <Play fill="white" size={40} className="ml-2 text-white" />
           </button>
           <p className="mt-4 text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">{title}</p>
        </div>
      )}

      {/* 3. CAPA INTERACTIVA (BLOQUEA CLIC DERECHO Y DOBLE CLIC DE YT) */}
      <div className="absolute inset-0 z-30" onClick={() => setPlaying(!playing)} onContextMenu={(e) => e.preventDefault()} />

      {/* 4. CONTROLES PERSONALIZADOS */}
      <div className={`absolute inset-x-0 bottom-0 z-50 transition-opacity duration-500 ${showControls || !playing ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
        <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-6 space-y-4">
          
          {/* BARRA DE PROGRESO */}
          <div className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer group/bar">
            <div className="absolute top-0 left-0 h-full bg-red-600 rounded-full shadow-[0_0_10px_#dc2626]" style={{ width: `${played * 100}%` }} />
            <input 
              type="range" min={0} max={0.9999} step="any" value={played}
              onChange={(e) => { 
                const val = parseFloat(e.target.value);
                setPlayed(val); 
                playerRef.current?.seekTo(val); 
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button onClick={() => setPlaying(!playing)} className="text-white hover:text-red-600 transition-all transform active:scale-90">
                {playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
              </button>
              
              <div className="flex items-center gap-3 group/vol">
                <Volume2 size={22} className="text-white/70" />
                <input type="range" min={0} max={1} step="any" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-20 accent-red-600 appearance-none h-1 bg-white/10 rounded-full" />
              </div>

              <div className="text-sm font-black tracking-widest text-white/90 tabular-nums">
                {formatTime(played * duration)} <span className="text-white/30">/</span> {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-5 relative">
              {/* SELECTOR DE VELOCIDAD */}
              <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className="text-white/70 hover:text-red-600 flex items-center gap-1 font-bold text-xs uppercase transition-all">
                <Gauge size={20} /> {playbackRate}x
              </button>

              {showSettings && (
                <div className="absolute bottom-12 right-0 bg-[#111] border border-white/10 p-2 rounded-xl shadow-2xl animate-in slide-in-from-bottom-2 z-50">
                  {[0.5, 1, 1.25, 1.5, 2].map(rate => (
                    <button key={rate} onClick={() => { setPlaybackRate(rate); setShowSettings(false); }} className={`block w-full text-left px-4 py-2 rounded-lg text-xs font-bold ${playbackRate === rate ? 'bg-red-600 text-white' : 'text-white/60 hover:bg-white/5'}`}>
                      {rate}x
                    </button>
                  ))}
                </div>
              )}

              <button onClick={(e) => { e.stopPropagation(); toggleFullScreen(); }} className="text-white/70 hover:text-white transition-transform hover:scale-110 active:scale-90"><Maximize size={22} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
