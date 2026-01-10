import { Course } from './types';

// Updated property names to snake_case (video_url) to satisfy Lesson interface
export const INITIAL_COURSE: Course = {
  id: "c1",
  title: "Master en Desarrollo Digital Premium",
  description: "Aprende a construir plataformas de clase mundial utilizando las tecnologías más modernas del mercado.",
  thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop",
  modules: [
    {
      id: "m1",
      course_id: "c1",
      title: "Introducción al Ecosistema",
      lessons: [
        {
          id: "l1",
          module_id: "m1",
          title: "Bienvenida al Master",
          duration: "05:20",
          video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          description: "En esta primera lección, te damos la bienvenida al programa y exploramos la metodología de aprendizaje que utilizaremos durante los próximos meses.",
          resources: [
            { name: "Guía de Bienvenida.pdf", url: "#" },
            { name: "Roadmap_2024.png", url: "#" }
          ]
        },
        {
          id: "l2",
          module_id: "m1",
          title: "Configuración del entorno PRO",
          duration: "12:45",
          video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          description: "Aprenderás a configurar tu terminal, editor de código y herramientas de depuración para maximizar tu productividad diaria.",
          resources: [
            { name: "CheatSheet_VSCode.pdf", url: "#" }
          ]
        }
      ]
    },
    {
      id: "m2",
      course_id: "c1",
      title: "Arquitectura y Diseño",
      lessons: [
        {
          id: "l3",
          module_id: "m2",
          title: "Diseño de bases de datos escalables",
          duration: "45:00",
          video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          description: "Profundizamos en el diseño de esquemas relacionales y no relacionales, optimización de queries y normalización avanzada.",
          resources: [
            { name: "Esquema_DB.sql", url: "#" }
          ]
        },
        {
          id: "l4",
          module_id: "m2",
          title: "APIs y Microservicios Modernos",
          duration: "38:15",
          video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          description: "Conceptos fundamentales de REST vs GraphQL y cómo estructurar servicios independientes que se comuniquen de forma eficiente.",
          resources: []
        }
      ]
    }
  ]
};