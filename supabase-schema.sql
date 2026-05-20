-- ============================================================
-- QUIET PROGRESS — Supabase Database Schema
-- Run this in your Supabase project → SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Habits table ──────────────────────────────────────────────
-- Stores each user's habits (daily or weekly) per month
create table public.habits (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  type        text not null check (type in ('daily', 'weekly')),
  goal        int  not null default 1,
  month       int  not null check (month between 1 and 12),
  year        int  not null,
  sort_order  int  not null default 0,
  created_at  timestamptz default now()
);

-- ── Completions table ─────────────────────────────────────────
-- Stores each tick / check-in for a habit on a given date
create table public.completions (
  id          uuid default uuid_generate_v4() primary key,
  habit_id    uuid references public.habits(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  date        date not null,
  created_at  timestamptz default now(),
  unique(habit_id, date)  -- one completion per habit per day
);

-- ── Row Level Security ────────────────────────────────────────
-- Users can only see and edit their own data

alter table public.habits     enable row level security;
alter table public.completions enable row level security;

-- Habits policies
create policy "Users can view own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can insert own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own habits"
  on public.habits for update
  using (auth.uid() = user_id);

create policy "Users can delete own habits"
  on public.habits for delete
  using (auth.uid() = user_id);

-- Completions policies
create policy "Users can view own completions"
  on public.completions for select
  using (auth.uid() = user_id);

create policy "Users can insert own completions"
  on public.completions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own completions"
  on public.completions for delete
  using (auth.uid() = user_id);

-- ── Indexes for performance ───────────────────────────────────
create index habits_user_month     on public.habits(user_id, year, month);
create index completions_habit     on public.completions(habit_id);
create index completions_user_date on public.completions(user_id, date);

-- ── Default habits function ───────────────────────────────────
-- Call this after a user signs up to seed their first month
create or replace function public.seed_default_habits(
  p_user_id uuid,
  p_month   int,
  p_year    int
)
returns void
language plpgsql security definer as $$
begin
  insert into public.habits (user_id, name, type, goal, month, year, sort_order) values
    -- Daily habits
    (p_user_id, 'Make Your Bed',                  'daily', 31, p_month, p_year, 1),
    (p_user_id, 'Drink 2L of Water',              'daily', 28, p_month, p_year, 2),
    (p_user_id, 'Exercise / Workout',             'daily', 20, p_month, p_year, 3),
    (p_user_id, 'Eat Breakfast',                  'daily', 28, p_month, p_year, 4),
    (p_user_id, 'Read 20 Pages',                  'daily', 22, p_month, p_year, 5),
    (p_user_id, 'Meditate (10 min)',              'daily', 20, p_month, p_year, 6),
    (p_user_id, 'No Junk Food',                   'daily', 22, p_month, p_year, 7),
    (p_user_id, 'Get Outside / Fresh Air',        'daily', 25, p_month, p_year, 8),
    (p_user_id, 'No Social Media AM',             'daily', 22, p_month, p_year, 9),
    (p_user_id, 'Journal',                        'daily', 16, p_month, p_year, 10),
    (p_user_id, 'Take Vitamins',                  'daily', 28, p_month, p_year, 11),
    (p_user_id, 'Stretch / Mobility',             'daily', 18, p_month, p_year, 12),
    (p_user_id, 'No Screens Before Bed',          'daily', 20, p_month, p_year, 13),
    (p_user_id, 'In Bed Before 11pm',             'daily', 22, p_month, p_year, 14),
    (p_user_id, 'Walk 10,000 Steps',              'daily', 18, p_month, p_year, 15),
    (p_user_id, 'Cook a Meal from Scratch',       'daily', 20, p_month, p_year, 16),
    (p_user_id, 'Tidy Up Before Bed',             'daily', 26, p_month, p_year, 17),
    (p_user_id, 'No Energy Drinks',               'daily', 28, p_month, p_year, 18),
    (p_user_id, 'Spend 30 Min Away from Screens', 'daily', 22, p_month, p_year, 19),
    (p_user_id, 'Check & Respond to Messages',    'daily', 25, p_month, p_year, 20),
    (p_user_id, 'Limit Alcohol',                  'daily', 28, p_month, p_year, 21),
    (p_user_id, 'Shower / Get Ready Properly',    'daily', 29, p_month, p_year, 22),
    (p_user_id, 'Deep Work Block (60 min)',        'daily', 18, p_month, p_year, 23),
    -- Weekly habits
    (p_user_id, 'Do Laundry',                     'weekly', 4, p_month, p_year, 1),
    (p_user_id, 'Meal Prep for the Week',         'weekly', 4, p_month, p_year, 2),
    (p_user_id, 'Clean the House / Hoover',       'weekly', 4, p_month, p_year, 3),
    (p_user_id, 'Grocery Shopping Done',          'weekly', 4, p_month, p_year, 4),
    (p_user_id, 'Plan the Week Ahead',            'weekly', 4, p_month, p_year, 5),
    (p_user_id, 'Call a Friend or Family',        'weekly', 3, p_month, p_year, 6),
    (p_user_id, 'Review Finances / Spending',     'weekly', 4, p_month, p_year, 7),
    (p_user_id, 'One Hobby Session',              'weekly', 4, p_month, p_year, 8),
    (p_user_id, 'Self Care (skin, hair etc.)',    'weekly', 3, p_month, p_year, 9),
    (p_user_id, 'One Social Activity',            'weekly', 3, p_month, p_year, 10),
    (p_user_id, 'Batch Emails / Admin Cleared',   'weekly', 4, p_month, p_year, 11),
    (p_user_id, 'Declutter Something Small',      'weekly', 3, p_month, p_year, 12);
end;
$$;
