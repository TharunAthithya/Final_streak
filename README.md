# Final Streak 🚀

An accountability and habit-tracking monorepo project powered by **Expo (React Native)** and **Supabase (Serverless PostgreSQL)**.

## 📱 Project Overview

Final Streak is a mobile application built to help users establish long-term habits through social accountability. Users can track their personal habits, join "Accountability Rooms" with friends, view live leaderboards, and log their completions to share progress.

This repository was migrated from a legacy NestJS / Prisma REST API architecture to a **Supabase-first serverless architecture** to maximize scalability and eliminate server maintenance.

---

## 🛠 Tech Stack

- **Frontend**: Expo (React Native SDK 56), React Navigation (`expo-router`), NativeWind v4 (Tailwind CSS), Zustand (State Management)
- **Backend/Database**: Supabase (PostgreSQL), Row Level Security (RLS) policies, Custom PL/pgSQL database functions (RPCs)
- **Package Management**: Monorepo using `pnpm` workspace

---

## 📂 Repository Structure

```
├── apps
│   └── mobile               # Expo Mobile Application (SDK 56)
├── packages
│   └── api-client           # Custom SDK wrapper for Supabase Auth and RPCs
├── supabase                 # Database migrations, functions, and setup scripts
│   ├── migrations           # Raw schema migrations (0001_schema.sql)
│   ├── full_rebuild.sql     # Database reset and initial setup script
│   └── fix_get_leaderboard.sql # Leaderboard typecasting fix
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- A [Supabase](https://supabase.com) account & project

### Database Setup

1. Create a new project in your **Supabase Dashboard**.
2. Go to the **SQL Editor**.
3. Copy the contents of [`supabase/migrations/0001_schema.sql`](supabase/migrations/0001_schema.sql) (or [`supabase/full_rebuild.sql`](supabase/full_rebuild.sql) if doing a fresh rebuild).
4. Run the query to create all tables, triggers, and RPC functions.

> ⚠️ **Important Development Note**: In your Supabase Dashboard under **Authentication -> Providers -> Email**, disable **"Confirm email"** for local testing to bypass email rate limits.

### Mobile App Installation

1. Install dependencies from the repository root:
   ```bash
   pnpm install
   ```
2. Navigate to the mobile app directory:
   ```bash
   cd apps/mobile
   ```
3. Create a `.env` or `.env.local` file with your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Start the Expo development server:
   ```bash
   pnpm start -c
   ```
   *(Note: `-c` clears the Metro bundler cache, which is recommended after config updates)*

---

## 🔐 Database Design & Security

The database utilizes PostgreSQL **Row Level Security (RLS)** to enforce privacy boundaries:
- **Profiles & Habits**: Read/write access restricted to the owner (`auth.uid() = profile_id`).
- **Rooms**: Public rooms are readable by anyone; private rooms are only accessible to room members.
- **Recursion-Free RLS**: Features a `security definer` function `is_room_member` to avoid infinite RLS lookup loops on memberships.

### Database RPC Functions
- `complete_habit`: Handles complex daily/specific/flexible habit calculations, recalculates streaks and XP, and logs social activities.
- `undo_complete_habit`: Safely reverses habit completion and rolls back statistics.
- `get_leaderboard`: Computes weekly and monthly leaderboard rankings within a room.
- `join_room` / `leave_room` / `create_room`: Manages active members and ownership bounds.