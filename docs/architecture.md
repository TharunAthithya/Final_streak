# Architectural Decisions & System Architecture

This document outlines the core architecture decisions (ADRs) for the Streak application, defining patterns for state, notifications, offline synchronization, database design, and security using the Supabase-first stack.

---

## ADR 1: Monorepo Structure & Build Tooling
* **Decision**: Use `pnpm` workspaces combined with `Turborepo`.
* **Rationale**: Enables sharing TypeScript interfaces (contracts, validation schemas, design tokens) seamlessly between the mobile frontend and database/RPC wrappers, caching builds and typechecks.
* **Structure**:
  * `apps/mobile`: Expo (React Native) app using Expo Router and NativeWind.
  * `supabase`: Database migrations, Edge Functions (for external services/secrets), configuration, and seed files.
  * `packages/contracts`: Request/Response typings and Shared Enums.
  * `packages/validation`: Zod validation schemas for forms, inputs, and DTOs.
  * `packages/api-client`: Reusable, strongly-typed Supabase SDK client wrapper.
  * `packages/design-tokens`: Shared styling system, colors, spacing, typography.
  * `packages/config`: ESLint, Prettier, and TypeScript base configs.

---

## ADR 2: State Management & Offline Strategy
* **Decision**: Primary state is split between **TanStack Query** (server state cache) and **Zustand** (minimal client-only UI state).
* **Rationale**: Avoids synchronization bugs by preventing server data from being duplicated in local Zustands. TanStack Query automatically manages caching, loading/error states, and background revalidation.
* **Offline Execution**:
  * **Today Screen Cache**: Habit list is persisted using TanStack Query's persistent cache adapters.
  * **Queueing Mutation Operations**: Check-in mutations and complex updates are queued as RPC replay payloads in an offline-safe AsyncStorage database.
  * **Revalidation**: On reconnect, the client re-authenticates `/users/me`. If authenticated, queued mutations are replayed with their stable client-generated UUIDs and `idempotencyKey` to avoid double-completions.

---

## ADR 3: Streak Calculation Engine
* **Decision**: All canonical streak calculations are executed inside PostgreSQL transactional RPC functions (e.g. `complete_habit()`). Clients are forbidden from calculating streaks independently.
* **Rationale**: Minimizes code duplication and prevents client-side time-skew exploitation or inconsistent definitions of streak rules.
* **Key Mechanics**:
  * Check-ins require a `localDate` field (`YYYY-MM-DD`) and `timezone` identifier (e.g. `Asia/Kolkata`).
  * Backend calculates streaks relative to the user's localized time.
  * Unique constraint on `(profile_id, habit_id, local_date)` prevents double-completions.

---

## ADR 4: Database Access & Row Level Security (RLS)
* **Decision**: Use PostgreSQL hosted by Supabase (projects: `streak-dev` and `streak-prod`). RLS (Row Level Security) is enabled on all tables as the primary authorization layer.
* **Rationale**: Relies on native database security, reducing infrastructure overhead. No ORM is used; direct SQL migrations define tables and RLS policies. Simple CRUD queries run directly via the Supabase Client SDK, which respects RLS.

---

## ADR 5: Realtime & Accountability
* **Decision**: Use **Supabase Realtime** for lightweight event broadcasting (reactions, room updates, feed events).
* **Rationale**: Out-of-the-box support from Supabase reduces operational complexity compared to running a WebSockets server, maintaining low latency.

---

## ADR 6: Business Logic Separation
* **Decision**: Direct RPC and Simple CRUD via SDK.
* **Rationale**: Simple actions (reading habits, updating profiles) run via direct table queries using the Supabase SDK. Complex business logic (completing habits, joining/leaving rooms, linking/unlinking habits, creating rooms) must call PostgreSQL transactional RPC functions directly via `supabase.rpc()`. No Edge Functions are used for business workflows. Edge Functions are reserved strictly for operations requiring server-side secrets or external integrations (e.g. Push Notifications, Scheduled Jobs, Email Sending).
