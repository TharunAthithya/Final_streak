# Risk Register & Mitigations

This document outlines the major technical and product risks identified for the Streak App and our engineering mitigations.

| Risk ID | Risk Description | Severity | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **R-01** | Timezone shifting (User travels or clocks skew) corrupts historical streak calculations. | **High** | Check-ins store the local date as a calendar `DATE` (YYYY-MM-DD) instead of raw UTC timestamp. The streak engine uses the user's explicit timezone setting (IANA ID) to determine daily boundaries. |
| **R-02** | Offline completions create duplicates or overwrite valid data when syncing back. | **High** | Enforce database-level unique constraint on `(user_id, habit_id, local_date)`. Client generates deterministic client-side UUIDs and an `idempotencyKey` based on this composite key. |
| **R-03** | Social feed queries degrade performance as rooms and member counts grow. | **Medium** | Paginated feed retrieval, heavy indexing on `room_id` + `created_at DESC`, and caching / materializing `habit_stats` to avoid costly real-time queries. |
| **R-04** | Unauthorized access to private Room feeds by editing URLs. | **High** | Mandate NestJS Guards that verify the requesting user's active membership in the requested `room_id` before processing any data queries. |
| **R-05** | Double-allocation of gamification XP on network retries. | **Medium** | XP transactions are bound to the idempotency key of the source check-in or milestone. The database checks for a matching source transaction before allocating XP. |
| **R-06** | Privacy leak of personal habits due to automatic social feed generation. | **High** | Abandon automatic/implicit habit-matching behavior. Enforce explicit user-driven linking between personal habits and Room accountability targets (`room_habit_links`). Check-ins only generate Room activities if an active link exists. |
