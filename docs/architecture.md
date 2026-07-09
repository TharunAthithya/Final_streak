# Architectural Decisions & System Architecture

This document outlines the core architecture decisions (ADRs) for the Streak application, defining patterns for state, notifications, offline synchronization, and database design.

---

## ADR 1: Monorepo Structure & Build Tooling
* **Decision**: Use `pnpm` workspaces combined with `Turborepo`.
* **Rationale**: Enables sharing TypeScript interfaces (contracts, validation schemas, design tokens) seamlessly between frontend (mobile, web) and backend without complex package publishing, while caching builds and test runs.
* **Structure**:
  * `apps/mobile`: Expo (React Native) app.
  * `apps/web`: React + Vite client.
  * `apps/api`: NestJS server.
  * `packages/contracts`: API Request/Response shapes and Shared Enums.
  * `packages/validation`: Zod schemas for forms, validation, and DTOs.
  * `packages/api-client`: Reusable, strongly-typed HTTP API wrapper.
  * `packages/design-tokens`: Shared styling system, colors, spacing, typography.
  * `packages/config`: ESLint, Prettier, TypeScript base configs.

---

## ADR 2: State Management & Offline Strategy
* **Decision**: Primary state is split between **TanStack Query** (server state) and **Zustand** (minimal client-only UI state).
* **Rationale**: Server data shouldn't be duplicated in local stores (like Redux/Zustand), avoiding synchronization bugs. TanStack Query automatically manages caching, loading/error states, and background revalidation.
* **Offline Execution**:
  * **Today Screen Cache**: Habit list is persisted using TanStack Query's persistent cache adapters (`persister`).
  * **Queueing Mutation Operations**: Check-in mutations are queued in an offline-safe SQLite/SecureStore database (or AsyncStorage on web if applicable).
  * **Revalidation**: On reconnect, the client re-authenticates `/users/me`. If authenticated, queued mutations are replayed with their stable client-generated UUIDs and `idempotencyKey` to avoid double-completions.

---

## ADR 3: Streak Calculation Engine
* **Decision**: All canonical streak calculations are executed on the NestJS backend. Clients are forbidden from calculating streaks independently.
* **Rationale**: Minimizes code duplication and prevents client-side time-skew exploitation or inconsistent definitions of streak rules.
* **Key Mechanics**:
  * Check-ins require a `localDate` field (`YYYY-MM-DD`) and `timezone` identifier (e.g. `Asia/Kolkata`).
  * Backend calculates streaks relative to the user's localized time.
  * Unique constraint on `(userId, habitId, localDate)` prevents double-completions.

---

## ADR 4: Database Access & Migrations
* **Decision**: Use **Prisma** as the ORM / database access layer, with **PostgreSQL** as the database engine hosted on **Supabase** (managed database platform). Migrations will be tracked strictly in Git.
* **Rationale**: Prisma provides type-safety, declarative schemas, and structured database migrations. PostgreSQL provides robust relational integrity. RLS (Row Level Security) will be configured in Supabase PostgreSQL primarily as a defense-in-depth security layer, but authorization check logic will live in NestJS guards/services to keep business logic consolidated.

---

## ADR 5: Realtime & Accountability
* **Decision**: Use **Supabase Realtime** for lightweight event broadcasting (reactions, room updates).
* **Rationale**: Out-of-the-box support from Supabase reduces operational overhead compared to configuring a separate WebSockets server, while maintaining low latency.
