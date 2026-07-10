# Risk Register & Mitigations

This document outlines the major technical and product risks identified for the Streak App and our engineering mitigations under the Supabase-first serverless architecture.

| Risk ID | Risk Description | Severity | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **R-01** | Timezone shifting (User travels or clocks skew) corrupts historical streak calculations. | **High** | Check-ins store the local date as a calendar `DATE` (YYYY-MM-DD) instead of raw UTC timestamp. The database RPC functions compute daily boundaries relative to the user's explicit timezone settings passed during check-in. |
| **R-02** | Offline completions create duplicates or overwrite valid data when syncing back. | **High** | Enforce database-level unique constraint on `(profile_id, habit_id, local_date)`. The mobile client generates deterministic client-side UUIDs and an `idempotencyKey` based on this composite key, which is validated by the database transaction. |
| **R-03** | Social feed queries degrade performance as rooms and member counts grow. | **Medium** | Paginated feed retrieval, heavy indexing on `room_id` + `created_at DESC`, and caching / materializing `habit_stats` to avoid costly real-time queries. |
| **R-04** | Unauthorized access to private Room feeds by editing URLs or direct database queries. | **High** | Enforce Row Level Security (RLS) policies on `activities`, `room_members`, and `room_habit_links` tables. These policies verify that the requesting user (`auth.uid()`) has an active membership record in the corresponding room before exposing any rows. |
| **R-05** | Double-allocation of gamification XP on network retries. | **Medium** | XP updates are executed in a single PostgreSQL transactional RPC function (`complete_habit()`) that checks the `check_ins` table for duplicate entries (via `idempotency_key` unique constraint) before modifying profile XP balances. |
| **R-06** | Privacy leak of personal habits due to automatic social feed generation. | **High** | Abandon automatic/implicit habit-matching behavior. Enforce explicit user-driven linking between personal habits and Room accountability targets (`room_habit_links`). Check-ins only generate Room activities if an active link exists. |
