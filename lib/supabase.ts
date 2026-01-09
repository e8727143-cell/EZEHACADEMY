
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uqkwfmgmzivbefyanpiu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxa3dmbWdteml2YmVmeWFucGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NzUwNzYsImV4cCI6MjA3OTM1MTA3Nn0.MB0OmqtxrQhf160YJ5c8zry3Ezcfrv-mkddiu36Pwrs';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const ADMIN_EMAIL = 'ezehcontactooficial@gmail.com';
