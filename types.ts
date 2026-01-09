
// Defined Lesson with optional module_id for static initial data
export interface Lesson {
  id: string;
  module_id?: string;
  title: string;
  duration: string;
  video_url: string;
  description: string;
  resources: { name: string; url: string }[];
  order_index?: number;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  order_index?: number;
}

// Added missing Course interface
export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  modules: Module[];
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
