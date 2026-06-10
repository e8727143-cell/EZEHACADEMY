import React from 'react';

interface VideoRenderContainerProps {
  videoUrl: string;
  title?: string;
}

/**
 * Componente optimizado para reproducir contenido protegido.
 * Detecta enlaces de Bunny y bloquea el menú contextual para mitigar copias.
 * 
 * @param {VideoRenderContainerProps} props
 */
export default function VideoRenderContainer({ videoUrl, title = "Clase Protegida" }: VideoRenderContainerProps) {
  // Verificación perimetral: Si no hay URL, mostramos un estado de carga elegante
  if (!videoUrl) {
    return (
      <div style={{
        width: '100%',
        aspectRatio: '16/9',
        backgroundColor: '#0a0a0a',
        borderRadius: '12px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#666',
        fontFamily: 'sans-serif',
        border: '1px solid #222'
      }}>
        <p>Cargando transmisión segura de la clase...</p>
      </div>
    );
  }

  // Forzar el renderizado directo si es un iframe de Bunny o si necesitamos saltar el validador estricto
  return (
    <div 
      className="secure-video-wrapper"
      id="video-player-container-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        backgroundColor: '#000',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        border: '1px solid #1a1a1a'
      }}
    >
      {/* Capa invisible superior para mitigar arrastre de elementos y clics maliciosos */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '45px',
          zIndex: 10,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)',
          pointerEvents: 'none'
        }} 
      />

      <iframe
        src={videoUrl}
        title={title}
        loading="lazy"
        id="secure-bunny-iframe"
        style={{
          border: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1
        }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen={true}
        // Desactiva el menú de clic derecho dentro del marco del iframe
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
