# Quiet Progress — Habit Tracker

A dark-themed, per-user habit tracker built with Next.js, Supabase, and deployed on Vercel.

---

## Stack

| Layer      | Tech                  |
|------------|-----------------------|
| Frontend   | Next.js 14 (App Router) |
| Styling    | Tailwind CSS          |
| Database   | Supabase (Postgres)   |
| Auth       | Supabase Auth         |
| Deployment | Vercel                |

---

## Setup Guide

### 1. Clone & install

```bash
git clone <your-repo-url>
cd quiet-progress
npm install
```

---

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (pick any name, set a database password)
3. Wait for it to spin up (~1 min)

---

### 3. Set up the database

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase-schema.sql` from this project
3. Paste the entire contents into the SQL editor and click **Run**

This creates:
- `habits` table — stores each user's habits
- `completions` table — stores daily tick-offs
- Row Level Security policies — users only see their own data
- `seed_default_habits()` function — called on signup to pre-populate habits

---

### 4. Get your Supabase keys

In your Supabase dashboard → **Settings → API**:

- Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

---

### 5. Create your .env.local file

```bash
cp .env.local.example .env.local
```

Then fill in your keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

### 6. Run locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

### 7. Deploy to Vercel

1. Push your project to GitHub (make sure `.env.local` is in `.gitignore` ✅)
2. Go to [vercel.com](https://vercel.com) and import your GitHub repo
3. In the Vercel project settings → **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Deploy**

That's it — your app is live!

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout (fonts, global styles)
│   ├── globals.css               # Tailwind + global CSS
│   ├── auth/
│   │   ├── login/page.tsx        # Login page
│   │   └── signup/page.tsx       # Signup page
│   ├── dashboard/
│   │   ├── layout.tsx            # Dashboard layout (nav, auth check)
│   │   └── page.tsx              # Main tracker page
│   └── api/
│       ├── completions/route.ts  # Toggle habit tick API
│       └── habits/seed/route.ts  # Seed habits on signup API
├── components/
│   ├── ui/
│   │   ├── LogoutButton.tsx      # Client-side logout
│   │   └── ProgressBar.tsx       # Reusable progress bar
│   └── tracker/
│       └── HabitTracker.tsx      # Main interactive tracker UI
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   └── server.ts             # Server Supabase client
│   └── utils.ts                  # Helper functions
├── types/
│   └── index.ts                  # TypeScript types
└── middleware.ts                 # Auth redirect middleware
```

---

## How it works

1. User signs up → `seed_default_habits()` runs and adds 23 daily + 12 weekly habits
2. User lands on `/dashboard` → server fetches their habits + completions for the current month
3. User clicks a day cell → optimistic UI update + API call to toggle completion in Supabase
4. Progress bars and stats update instantly on screen

---

## Customising habits

To change the default habits new users get, edit the `seed_default_habits` function in `supabase-schema.sql` and re-run it in the Supabase SQL editor.

To let users add/edit/delete their own habits, you'd add a habit management page (a great next step!).

---

## Next steps to build

- [ ] Add/edit/delete habits UI
- [ ] Month navigation (view past months)
- [ ] Streak counter logic
- [ ] Email reminders (via Supabase Edge Functions)
- [ ] Mobile app (React Native + same Supabase backend)
