-- Run this in the Supabase SQL editor to add calorie and gym tracking tables.

-- ── Calorie Entries ────────────────────────────────────────────────────
create table if not exists calorie_entries (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  date        date not null,
  meal_type   text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  food_name   text not null,
  calories    integer not null default 0,
  protein     numeric(6,1) not null default 0,
  carbs       numeric(6,1) not null default 0,
  fat         numeric(6,1) not null default 0,
  created_at  timestamptz default now() not null
);
alter table calorie_entries enable row level security;
create policy "Users manage own calorie entries" on calorie_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── User Settings ──────────────────────────────────────────────────────
create table if not exists user_settings (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users(id) on delete cascade not null unique,
  daily_calorie_goal  integer not null default 2000,
  protein_goal        integer not null default 150,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);
alter table user_settings enable row level security;
create policy "Users manage own settings" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Workout Sessions ───────────────────────────────────────────────────
create table if not exists workout_sessions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  date        date not null,
  name        text not null default '',
  notes       text not null default '',
  created_at  timestamptz default now() not null
);
alter table workout_sessions enable row level security;
create policy "Users manage own sessions" on workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Workout Exercises ──────────────────────────────────────────────────
create table if not exists workout_exercises (
  id          uuid default gen_random_uuid() primary key,
  session_id  uuid references workout_sessions(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  sets        integer not null default 1,
  reps        integer not null default 0,
  weight_kg   numeric(6,2) not null default 0,
  created_at  timestamptz default now() not null
);
alter table workout_exercises enable row level security;
create policy "Users manage own exercises" on workout_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
