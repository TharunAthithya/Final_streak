---
name: supabase-backend
description: Implements secure database patterns using Supabase, PostgreSQL, and Row Level Security (RLS). Use this skill when writing database queries, configuring schemas, or handling user authentication in the app.
---

# Supabase Backend & Database Security

When writing database logic, schemas, or data-fetching functions, adhere to these strict security constraints:

## Row Level Security (RLS)
- **Always Enable RLS:** Every new table must have Row Level Security enabled (`ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`).
- **Use auth.uid():** When writing RLS policies, explicitly check the user's UUID using `auth.uid() = user_id`. Never trust user IDs passed from the client payload for security checks.
- **Policy Isolation:** Write separate, explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.

## Data Fetching & TypeScript
- **Strong Typing:** Always use the generated TypeScript types (`src/types/supabase.ts`) instead of `any`. Create clients using `createClient<Database>(...)`.
- **Client-Side Limits:** Never write complex data aggregations or multi-table joins on the client side if it impacts performance. Move complex logic into Postgres Functions (RPCs) or Database Views.

## Authentication
- **Secure Sessions:** Use Supabase Auth for React Native. Ensure secure storage is utilized for session persistence.
- **Server-Side Trust:** Do not execute administrative actions (e.g., deleting user accounts) from the client. Handle those via Supabase Edge Functions with a Service Role key.