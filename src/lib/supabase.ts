import { createClient } from '@supabase/supabase-js';

// ==========================================
// CONFIGURACIÓN DE CONEXIÓN A SUPABASE
// Reemplaza estos marcadores de posición con tus llaves reales de Supabase
// o configúralas en tus variables de entorno (.env) como VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
// ==========================================
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://vejdhyiwyaxajbrhlkbq.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlamRoeWl3eWF4YWpicmhsa2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMDU5NDcsImV4cCI6MjA5NjY4MTk0N30.1_K3bBO6wfPr-6UqGYc1U-s87_7JBvh4JHQnEZrcdZE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Correo de administración principal para el Panel de Administrador de Ezeh Academy
export const ADMIN_EMAIL = 'ezehcontactooficial@gmail.com';
