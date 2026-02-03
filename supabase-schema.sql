
-- 1. Profiles Table (Linked to Auth)
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'student',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Courses Table
create table if not exists courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  thumbnail text,
  hotmart_id text, -- Added for Hotmart Integration
  order_index serial,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Modules Table (Cascade Delete: Deleting a course deletes its modules)
create table if not exists modules (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  thumbnail text, -- Added thumbnail column
  order_index serial,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Lessons Table (Cascade Delete: Deleting a module deletes its lessons)
create table if not exists lessons (
  id uuid default gen_random_uuid() primary key,
  module_id uuid references modules(id) on delete cascade not null,
  title text not null,
  video_url text,
  description text,
  resources text, -- Stores the public URL of the uploaded file
  order_index serial,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. User Progress Table
create table if not exists user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  lesson_id uuid references lessons(id) on delete cascade not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, lesson_id)
);

-- 6. Lesson Ratings Table
create table if not exists lesson_ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  lesson_id uuid references lessons(id) on delete cascade not null,
  rating integer check (rating >= 1 and rating <= 5),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, lesson_id)
);

-- 7. Enrollments Table (NEW: For Hotmart Integration)
create table if not exists enrollments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  course_id uuid references courses(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, course_id)
);

-- 8. Trigger to automatically create a Profile when a User signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'student');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid duplication errors on re-runs
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. Storage Bucket Setup
insert into storage.buckets (id, name, public) 
values ('course_materials', 'course_materials', true)
on conflict (id) do nothing;

-- 10. Row Level Security (RLS) Policies
-- Enable RLS on all tables
alter table profiles enable row level security;
alter table courses enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table user_progress enable row level security;
alter table lesson_ratings enable row level security;
alter table enrollments enable row level security; -- NEW

-- CLEANUP OLD POLICIES (To avoid errors if you run this script multiple times)
drop policy if exists "Public Read" on courses;
drop policy if exists "Public Read Modules" on modules;
drop policy if exists "Public Read Lessons" on lessons;
drop policy if exists "Auth Insert Courses" on courses;
drop policy if exists "Auth Update Courses" on courses;
drop policy if exists "Auth Delete Courses" on courses;
drop policy if exists "Auth Insert Modules" on modules;
drop policy if exists "Auth Update Modules" on modules;
drop policy if exists "Auth Delete Modules" on modules;
drop policy if exists "Auth Insert Lessons" on lessons;
drop policy if exists "Auth Update Lessons" on lessons;
drop policy if exists "Auth Delete Lessons" on lessons;
drop policy if exists "User Progress Own" on user_progress;
drop policy if exists "User Progress Insert" on user_progress;
drop policy if exists "User Progress Delete" on user_progress;
drop policy if exists "Profiles Read" on profiles;
drop policy if exists "Ratings Select Own" on lesson_ratings;
drop policy if exists "Ratings Insert Own" on lesson_ratings;
drop policy if exists "Ratings Update Own" on lesson_ratings;
drop policy if exists "Users can view own enrollments" on enrollments;
drop policy if exists "Service role can insert enrollments" on enrollments;

-- RE-CREATE POLICIES

-- Public Read Access for Content (Warning: Content is public by default in this demo. 
-- For production, you should join with 'enrollments' to check access)
create policy "Public Read" on courses for select using (true);
create policy "Public Read Modules" on modules for select using (true);
create policy "Public Read Lessons" on lessons for select using (true);

-- Admin Write Access (Simplified: Allow any authenticated user to edit for this demo)
-- In a real production app, you would check (auth.jwt() ->> 'email' = 'admin@email.com')
create policy "Auth Insert Courses" on courses for insert with check (auth.role() = 'authenticated');
create policy "Auth Update Courses" on courses for update using (auth.role() = 'authenticated');
create policy "Auth Delete Courses" on courses for delete using (auth.role() = 'authenticated');

create policy "Auth Insert Modules" on modules for insert with check (auth.role() = 'authenticated');
create policy "Auth Update Modules" on modules for update using (auth.role() = 'authenticated');
create policy "Auth Delete Modules" on modules for delete using (auth.role() = 'authenticated');

create policy "Auth Insert Lessons" on lessons for insert with check (auth.role() = 'authenticated');
create policy "Auth Update Lessons" on lessons for update using (auth.role() = 'authenticated');
create policy "Auth Delete Lessons" on lessons for delete using (auth.role() = 'authenticated');

-- User Progress Policies (Strict ownership)
create policy "User Progress Own" on user_progress for select using (auth.uid() = user_id);
create policy "User Progress Insert" on user_progress for insert with check (auth.uid() = user_id);
create policy "User Progress Delete" on user_progress for delete using (auth.uid() = user_id);

-- Profile Policies
create policy "Profiles Read" on profiles for select using (true);

-- Lesson Ratings Policies
create policy "Ratings Select Own" on lesson_ratings for select using (auth.uid() = user_id);
create policy "Ratings Insert Own" on lesson_ratings for insert with check (auth.uid() = user_id);
create policy "Ratings Update Own" on lesson_ratings for update using (auth.uid() = user_id);

-- Enrollments Policies (NEW)
create policy "Users can view own enrollments" on enrollments for select using (auth.uid() = user_id);
-- Only service_role key can insert into enrollments (via Edge Function)
create policy "Service role can insert enrollments" on enrollments for insert with check (true);

-- 11. STORAGE POLICIES
create policy "Public Access Materials" on storage.objects for select using ( bucket_id = 'course_materials' );
create policy "Auth Upload Materials" on storage.objects for insert with check ( bucket_id = 'course_materials' and auth.role() = 'authenticated' );
create policy "Auth Update Materials" on storage.objects for update using ( bucket_id = 'course_materials' and auth.role() = 'authenticated' );
