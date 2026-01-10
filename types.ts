
export interface Lesson {
  id: string;
  module_id: string; // Obligatorio para integridad referencial
  title: string;
  video_url: string;
  duration?: string;
  description: string;
  resources: { name: string; url: string }[];
  order_index?: number;
  created_at?: string;
}

export interface Module {
  id: string;
  course_id: string; // Obligatorio
  title: string;
  lessons: Lesson[];
  order_index?: number;
  created_at?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  order_index?: number;
  modules: Module[];
  created_at?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'student';
  fullName: string;
  progress: string[];
  last_seen?: string;
  created_at?: string;
}
