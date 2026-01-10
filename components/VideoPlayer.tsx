
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

  // Detectar si es YouTube para aplicar hacks específicos (ocultar título)
  // Si es un MP4 directo o Vimeo, no aplicamos recorte.
  const isYoutube = url && (url.includes('youtube.com') || url.includes('youtu.be'));

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const toggleFullScreen = () => {
    const container = playerRef.current?.getInternalPlayer()?.parentElement?.parentElement?.parentElement;
    if (container) {
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch((err: any) => console.log(err));
      } else {
        document.exitFullscreen().catch((err: any) => console.log(err));
      }
    }
  };

  return (
    <div 
      className="relative group w-full aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"
      onMouseMove={() => { setShowControls(true); }}
      onMouseLeave={() => { if(playing) setShowControls(false); setShowSettings(false); }}
    >
      {/* 1. EL REPRODUCTOR */}
      {/* Aplicamos clipPath y escala SOLO si es YouTube para ocultar info. Si es MP4 nativo, se muestra completo. */}
      <div 
        className="absolute inset-0 w-full h-full" 
        style={isYoutube ? { clipPath: 'inset(8% 0 0 0)', transform: 'scale(1.01)' } : {}}
      >
        <ReactPlayer
          ref={playerRef}
          url={url}
          width="100%"
          height={isYoutube ? "115%" : "100%"} 
          style={isYoutube ? { marginTop: '-8%' } : {}}
          playing={playing}
          volume={volume}
          playbackRate={playbackRate}
          onProgress={(state) => setPlayed(state.played)}
          onDuration={(d) => setDuration(d)}
          onEnded={() => setPlaying(false)}
          config={{
            youtube: {
              playerVars: { 
                modestbranding: 1, 
                rel: 0, 
                controls: 0, 
                iv_load_policy: 3, 
                disablekb: 1 
              }
            },
            file: {
              attributes: {
                controlsList: 'nodownload', // Dificulta descarga directa
                disablePictureInPicture: true
              }
            }
          }}
        />
      </div>

      {/* 2. VELO DE PAUSA (BRANDING) */}
      {!playing && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center transition-all">
           <div className="text-red-600 font-black text-3xl lg:text-4xl mb-6 tracking-tighter italic drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">EZEH ACADEMY</div>
           <button onClick={() => setPlaying(true)} className="w-20 h-20 lg:w-24 lg:h-24 bg-red-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl shadow-red-600/40 group/btn">
             <Play fill="white" size={40} className="ml-2 text-white group-hover/btn:scale-110 transition-transform" />
           </button>
           <p className="mt-6 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] max-w-md text-center px-4">{title}</p>
        </div>
      )}

      {/* 3. CAPA INTERACTIVA (CLICK TO PLAY/PAUSE) */}
      <div className="absolute inset-0 z-30" onClick={() => setPlaying(!playing)} onContextMenu={(e) => e.preventDefault()} />

      {/* 4. CONTROLES PERSONALIZADOS */}
      <div className={`absolute inset-x-0 bottom-0 z-50 transition-opacity duration-500 ${showControls || !playing ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
        <div className="bg-gradient-to-t from-black via-black/80 to-transparent p-6 space-y-4">
          
          {/* BARRA DE PROGRESO */}
          <div className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer group/bar" onClick={(e) => e.stopPropagation()}>
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

          <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-6">
              <button onClick={() => setPlaying(!playing)} className="text-white hover:text-red-600 transition-all transform active:scale-90 outline-none">
                {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              </button>
              
              <div className="hidden sm:flex items-center gap-3 group/vol">
                <Volume2 size={20} className="text-white/70" />
                <input type="range" min={0} max={1} step="any" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-20 accent-red-600 appearance-none h-1 bg-white/10 rounded-full cursor-pointer" />
              </div>

              <div className="text-xs font-black tracking-widest text-white/90 tabular-nums">
                {formatTime(played * duration)} <span className="text-white/30 mx-1">/</span> {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-5 relative">
              {/* SELECTOR DE VELOCIDAD */}
              <button onClick={() => setShowSettings(!showSettings)} className="text-white/70 hover:text-red-600 flex items-center gap-1 font-bold text-[10px] uppercase transition-all outline-none">
                <Gauge size={16} /> {playbackRate}x
              </button>

              {showSettings && (
                <div className="absolute bottom-10 right-0 bg-[#111] border border-white/10 p-2 rounded-xl shadow-2xl z-50 flex flex-col gap-1 min-w-[80px]">
                  {[0.5, 1, 1.25, 1.5, 2].map(rate => (
                    <button key={rate} onClick={() => { setPlaybackRate(rate); setShowSettings(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold transition-colors ${playbackRate === rate ? 'bg-red-600 text-white' : 'text-white/60 hover:bg-white/10'}`}>
                      {rate}x
                    </button>
                  ))}
                </div>
              )}

              <button onClick={toggleFullScreen} className="text-white/70 hover:text-white transition-transform hover:scale-110 active:scale-90 outline-none"><Maximize size={20} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
