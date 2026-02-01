
-- 1. Profiles Table (Linked to Auth)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'student',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Courses Table
create table courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  thumbnail text,
  order_index serial,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Modules Table (Cascade Delete: Deleting a course deletes its modules)
create table modules (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  order_index serial,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Lessons Table (Cascade Delete: Deleting a module deletes its lessons)
create table lessons (
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
create table user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  lesson_id uuid references lessons(id) on delete cascade not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, lesson_id)
);

-- 6. Lesson Ratings Table
create table lesson_ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  lesson_id uuid references lessons(id) on delete cascade not null,
  rating integer check (rating >= 1 and rating <= 5),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, lesson_id)
);

-- 7. Trigger to automatically create a Profile when a User signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'student');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. Storage Bucket Setup (Run this via SQL or create bucket 'course_materials' in dashboard)
insert into storage.buckets (id, name, public) values ('course_materials', 'course_materials', true);

-- 9. Row Level Security (RLS) Policies (Simplified for development)
-- Enable RLS
alter table profiles enable row level security;
alter table courses enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table user_progress enable row level security;
alter table lesson_ratings enable row level security;

-- Policies (Allow read to everyone/authenticated, Allow write to admins/everyone for demo)
-- NOTE: stricter policies should be applied for production
create policy "Public Read" on courses for select using (true);
create policy "Public Read Modules" on modules for select using (true);
create policy "Public Read Lessons" on lessons for select using (true);

-- Allow authenticated users to insert/update (Simplified for demo admin usage)
create policy "Auth Insert Courses" on courses for insert with check (auth.role() = 'authenticated');
create policy "Auth Update Courses" on courses for update using (auth.role() = 'authenticated');
create policy "Auth Delete Courses" on courses for delete using (auth.role() = 'authenticated');

create policy "Auth Insert Modules" on modules for insert with check (auth.role() = 'authenticated');
create policy "Auth Update Modules" on modules for update using (auth.role() = 'authenticated');
create policy "Auth Delete Modules" on modules for delete using (auth.role() = 'authenticated');

create policy "Auth Insert Lessons" on lessons for insert with check (auth.role() = 'authenticated');
create policy "Auth Update Lessons" on lessons for update using (auth.role() = 'authenticated');
create policy "Auth Delete Lessons" on lessons for delete using (auth.role() = 'authenticated');

-- User Progress Policies
create policy "User Progress Own" on user_progress for select using (auth.uid() = user_id);
create policy "User Progress Insert" on user_progress for insert with check (auth.uid() = user_id);
create policy "User Progress Delete" on user_progress for delete using (auth.uid() = user_id);

-- Profile Policies
create policy "Profiles Read" on profiles for select using (true);
