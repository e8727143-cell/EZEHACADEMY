-- =========================================================================
-- EZEH ACADEMY - COMPREHENSIVE BACKEND AND DATABASE SCHEMA (SUPABASE/POSTGRESQL)
-- Developed by a Senior Database & Security Engineer
-- Target: production-level scalability (1000+ concurrent students)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. CLEANUP (Ensures idempotent "Ready to Run" execution)
-- -------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists tr_protect_profile_fields on public.profiles;
drop trigger if exists tr_track_user_last_seen on public.profiles;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.protect_profile_fields() cascade;

-- --- Clear old policies to prevent collision conflicts ---
drop policy if exists "Admin has full access on courses" on public.courses;
drop policy if exists "Active students can view courses" on public.courses;
drop policy if exists "Admin has full access on modules" on public.modules;
drop policy if exists "Active students can view modules" on public.modules;
drop policy if exists "Admin has full access on lessons" on public.lessons;
drop policy if exists "Active students can view lessons" on public.lessons;
drop policy if exists "Admin has full access on niches" on public.niches;
drop policy if exists "Active students can view niches" on public.niches;

drop policy if exists "Profiles are readable by owner and admin" on public.profiles;
drop policy if exists "Profiles updateable by owner or admin" on public.profiles;

drop policy if exists "Admin can view and manage all student progress" on public.user_progress;
drop policy if exists "Students can view own progress" on public.user_progress;
drop policy if exists "Students can insert own progress" on public.user_progress;
drop policy if exists "Students can delete own progress" on public.user_progress;

drop policy if exists "Admin can view and manage all student ratings" on public.lesson_ratings;
drop policy if exists "Students can view own ratings" on public.lesson_ratings;
drop policy if exists "Students can insert own ratings" on public.lesson_ratings;
drop policy if exists "Students can update own ratings" on public.lesson_ratings;

drop policy if exists "Admin can manage all enrollments" on public.enrollments;
drop policy if exists "Students can view own enrollments" on public.enrollments;

drop policy if exists "Admin can view all access histories" on public.historial_accesos;
drop policy if exists "Students can insert own access history" on public.historial_accesos;
drop policy if exists "Students can view own access history" on public.historial_accesos;

drop policy if exists "Public Access Materials" on storage.objects;
drop policy if exists "Admin full access on storage" on storage.objects;


-- -------------------------------------------------------------------------
-- 1. DATABASE TABLES & SCHEMAS
-- -------------------------------------------------------------------------

-- A. Profiles Table (Supports both current frontend and custom requested columns)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,                      -- Used by current frontend React components
  nombre_completo text,                -- Custom DB representation requested by analyst
  role text default 'student',         -- Role permission ('admin' or 'student')
  estado_suscripcion text default 'activo', -- Access control state ('activo' or 'suspendido')
  fecha_registro timestamp with time zone default timezone('utc'::text, now()) not null, -- Registration date
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,     -- Frontend creation timestamp
  ultimo_acceso timestamp with time zone default timezone('utc'::text, now())             -- Tracker for account sharing detection
);

-- --- SAFEGUARDS: If profiles already exists, force add any missing columns safely ---
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists nombre_completo text;
alter table public.profiles add column if not exists role text default 'student';
alter table public.profiles add column if not exists estado_suscripcion text default 'activo';
alter table public.profiles add column if not exists fecha_registro timestamp with time zone default timezone('utc'::text, now());
alter table public.profiles add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());
alter table public.profiles add column if not exists ultimo_acceso timestamp with time zone default timezone('utc'::text, now());

-- B. Historial de Accesos (Audit logging table to identify concurrent accounts/IP sharing)
create table if not exists public.historial_accesos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  email text,
  ip_address text,
  user_agent text,
  browser text,
  operating_system text,
  accessed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- --- SAFEGUARDS: Ensure all historial_accesos columns exist ---
alter table public.historial_accesos add column if not exists user_id uuid;
alter table public.historial_accesos add column if not exists email text;
alter table public.historial_accesos add column if not exists ip_address text;
alter table public.historial_accesos add column if not exists user_agent text;
alter table public.historial_accesos add column if not exists browser text;
alter table public.historial_accesos add column if not exists operating_system text;
alter table public.historial_accesos add column if not exists accessed_at timestamp with time zone default timezone('utc'::text, now());

-- C. Courses Table
create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  thumbnail text,
  hotmart_id text,                     -- Integration identifier from Hotmart hook
  order_index serial,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- --- SAFEGUARDS: Ensure courses columns exist ---
alter table public.courses add column if not exists title text;
alter table public.courses add column if not exists description text;
alter table public.courses add column if not exists thumbnail text;
alter table public.courses add column if not exists hotmart_id text;
alter table public.courses add column if not exists order_index integer;
alter table public.courses add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());

-- D. Modules Table (With Cascade Delete constraint)
create table if not exists public.modules (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  thumbnail text,                      -- Module cover/preview thumbnail
  order_index serial,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- --- SAFEGUARDS: Ensure modules columns exist ---
alter table public.modules add column if not exists course_id uuid;
alter table public.modules add column if not exists title text;
alter table public.modules add column if not exists thumbnail text;
alter table public.modules add column if not exists order_index integer;
alter table public.modules add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());

-- E. Lessons Table (With Cascade Delete constraint)
create table if not exists public.lessons (
  id uuid default gen_random_uuid() primary key,
  module_id uuid references public.modules(id) on delete cascade not null,
  title text not null,
  video_url text,                      -- Video hosting embed link (Bunny.net or Vimeo/YouTube)
  description text,
  resources text,                      -- Public URL to download lesson files/materials
  order_index serial,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- --- SAFEGUARDS: Ensure lessons columns exist ---
alter table public.lessons add column if not exists module_id uuid;
alter table public.lessons add column if not exists title text;
alter table public.lessons add column if not exists video_url text;
alter table public.lessons add column if not exists description text;
alter table public.lessons add column if not exists resources text;
alter table public.lessons add column if not exists order_index integer;
alter table public.lessons add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());

-- F. User Progress Table (Unique constraint to prevent duplicate completions)
create table if not exists public.user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, lesson_id)
);

-- G. Lesson Ratings Table
create table if not exists public.lesson_ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  rating integer check (rating >= 1 and rating <= 5),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, lesson_id)
);

-- H. Enrollments Table (For Hotmart activation bindings)
create table if not exists public.enrollments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, course_id)
);

-- I. Niches Table (For YouTube Channel Tracking)
create table if not exists public.niches (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  name text,
  description text,
  thumbnail text,
  subscriber_count text,
  video_count text,
  view_count text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- -------------------------------------------------------------------------
-- 2. AUTOMATION: PROCEDURES, TRIGGERS, AND METRIC HOOKS
-- -------------------------------------------------------------------------

-- A. Automation for automatically creating profile records on SignUp (Auth table listener)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  candidate_name text;
begin
  -- Resolve nickname or display name safely from raw metadata triggers
  candidate_name := coalesce(
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'name', 
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (
    id, 
    email, 
    full_name, 
    nombre_completo, 
    role, 
    estado_suscripcion, 
    fecha_registro, 
    created_at,
    ultimo_acceso
  )
  values (
    new.id, 
    new.email, 
    candidate_name,
    candidate_name,
    case 
      when new.email = 'ezehcontactooficial@gmail.com' then 'admin' 
      else 'student' 
    end,
    'activo', -- Active enrollment state standard on signup
    now(),
    now(),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- B. Security Guardrail: Prevent students from elevating roles or modifying 'estado_suscripcion'
create or replace function public.protect_profile_fields()
returns trigger as $$
begin
  -- If action comes from an authenticated role but they're NOT the master administrator
  if auth.role() = 'authenticated' and (auth.jwt() ->> 'email' is distinct from 'ezehcontactooficial@gmail.com') then
    -- Silently discard malicious parameter changes to secure role and active subscription status
    new.role := old.role;
    new.estado_suscripcion := old.estado_suscripcion;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger tr_protect_profile_fields
  before update on public.profiles
  for each row execute procedure public.protect_profile_fields();


-- -------------------------------------------------------------------------
-- 3. SPEED INDICES (For handling 1000+ Students Concurrent Load gracefully)
-- -------------------------------------------------------------------------
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_id on public.profiles(id);
create index if not exists idx_profiles_estado_suscripcion on public.profiles(estado_suscripcion);

create index if not exists idx_user_progress_user_id on public.user_progress(user_id);
create index if not exists idx_user_progress_lesson_id on public.user_progress(lesson_id);

create index if not exists idx_lessons_module_id on public.lessons(module_id);
create index if not exists idx_modules_course_id on public.modules(course_id);

create index if not exists idx_enrollments_user_id on public.enrollments(user_id);
create index if not exists idx_enrollments_course_id on public.enrollments(course_id);

create index if not exists idx_historial_accesos_user_id on public.historial_accesos(user_id);
create index if not exists idx_historial_accesos_email on public.historial_accesos(email);


-- -------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) & POLICIES Configuration
-- -------------------------------------------------------------------------

-- A. Enable RLS on all relational structures
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.user_progress enable row level security;
alter table public.lesson_ratings enable row level security;
alter table public.enrollments enable row level security;
alter table public.niches enable row level security;
alter table public.historial_accesos enable row level security;

-- B. Profiles Policies
create policy "Profiles are readable by owner and admin" 
on public.profiles for select to authenticated 
using (
  auth.uid() = id 
  or (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com')
);

create policy "Profiles updateable by owner or admin"
on public.profiles for update to authenticated
using (
  auth.uid() = id 
  or (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com')
);

-- C. Course Content Policies (Check active subscription or master administrator)
create policy "Admin has full access on courses"
on public.courses for all to authenticated
using (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com')
with check (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com');

create policy "Active students can view courses"
on public.courses for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.estado_suscripcion = 'activo'
  )
  or (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com')
);

-- D. Modules Policies
create policy "Admin has full access on modules"
on public.modules for all to authenticated
using (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com')
with check (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com');

create policy "Active students can view modules"
on public.modules for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.estado_suscripcion = 'activo'
  )
  or (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com')
);

-- E. Lessons Policies (Protects Bunny.net content, only accessible if subscription is active)
create policy "Admin has full access on lessons"
on public.lessons for all to authenticated
using (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com')
with check (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com');

create policy "Active students can view lessons"
on public.lessons for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.estado_suscripcion = 'activo'
  )
  or (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com')
);

-- F. User Progress Policies
create policy "Admin can view and manage all student progress"
on public.user_progress for all to authenticated
using (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com');

create policy "Students can view own progress"
on public.user_progress for select to authenticated
using (auth.uid() = user_id);

create policy "Students can insert own progress"
on public.user_progress for insert to authenticated
with check (auth.uid() = user_id);

create policy "Students can delete own progress"
on public.user_progress for delete to authenticated
using (auth.uid() = user_id);

-- G. Lesson Ratings Policies
create policy "Admin can view and manage all student ratings"
on public.lesson_ratings for all to authenticated
using (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com');

create policy "Students can view own ratings"
on public.lesson_ratings for select to authenticated
using (auth.uid() = user_id);

create policy "Students can insert own ratings"
on public.lesson_ratings for insert to authenticated
with check (auth.uid() = user_id);

create policy "Students can update own ratings"
on public.lesson_ratings for update to authenticated
using (auth.uid() = user_id);

-- H. Enrollments Policies
create policy "Admin can manage all enrollments"
on public.enrollments for all to authenticated
using (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com');

create policy "Students can view own enrollments"
on public.enrollments for select to authenticated
using (auth.uid() = user_id);

-- I. Niches Policies
create policy "Admin has full access on niches"
on public.niches for all to authenticated
using (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com')
with check (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com');

create policy "Active students can view niches"
on public.niches for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.estado_suscripcion = 'activo'
  )
  or (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com')
);

-- J. Access Audit History Policies
create policy "Admin can view all access histories"
on public.historial_accesos for select to authenticated
using (auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com');

create policy "Students can insert own access history"
on public.historial_accesos for insert to authenticated
with check (auth.uid() = user_id);

create policy "Students can view own access history"
on public.historial_accesos for select to authenticated
using (auth.uid() = user_id);


-- -------------------------------------------------------------------------
-- 5. STORAGE BUCKET & POLICIES FOR SECURE UPLOADS
-- -------------------------------------------------------------------------
insert into storage.buckets (id, name, public) 
values ('course_materials', 'course_materials', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
      and tablename = 'objects' 
      and policyname = 'Public Access Materials'
  ) then
    create policy "Public Access Materials" 
    on storage.objects for select 
    using ( bucket_id = 'course_materials' );
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
      and tablename = 'objects' 
      and policyname = 'Admin full access on storage'
  ) then
    create policy "Admin full access on storage" 
    on storage.objects for all to authenticated 
    using ( bucket_id = 'course_materials' and auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com' )
    with check ( bucket_id = 'course_materials' and auth.jwt() ->> 'email' = 'ezehcontactooficial@gmail.com' );
  end if;
end
$$;
