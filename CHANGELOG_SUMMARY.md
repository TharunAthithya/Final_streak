# Final Streak - Release & Changes Summary

## Overview of Changes

This update delivers a complete overhaul of the **Final Streak** mobile app, including a brand-new Figma-matched Dark & Gold design system, a WhatsApp-style Accountability Rooms feature, a complete Room Invitation & Join Approval system, smart habit icon resolution, and key database migrations and bug fixes.

---

## Key Features & Refinements

### 1. Modern Dark-Gold Design System
- **Curated Color Tokens**: Applied curated design tokens across all screens (`#0B0B0C` background, `#181513` cards, `#E8C08A` primary gold, `#F5F2EC` ink, `#9C958C` muted text).
- **Navigation & Layout**: Streamlined 3-tab layout (`Today`, `Rooms`, `You/Profile`). Redesigned Auth screens (`Login` & `Register`) with gold brand styling and unique username fields.
- **Typography & Components**: Applied crisp hierarchy with custom icons (`Feather` and `MaterialCommunityIcons`), progress rings, and styled habit cards.

### 2. Accountability Rooms Feature (Figma Spec)
- **WhatsApp-Style Activity Feed**: Visual timeline with origin markers (`🌱 Room created`), date dividers (`Fri, 17 Jul`), member join cards, and check-in completion bubbles.
- **Reactions System**: Added real-time reactions (`Heart`, `Fire`, `ThumbsUp`) with toggle counts on activity messages.
- **Pixel-Matched Room Info Sheet**: Bottom sheet modal showing room description, active member indicators, role subtitles (`Room creator · here since day one`, `Joined [Date]`, `YOU` badge), 6-character invite code, and invite by username form.

### 3. Room Invitations & Join Flow
- **Direct Username Invites**: Room owners can invite users directly via `@username`. Sends a `DIRECT_INVITE` notification with **Accept** / **Decline** options.
- **Invite Code Joins**:
  - **Public Rooms**: Entering an invite code joins the room immediately.
  - **Private Rooms**: Entering an invite code sends a `JOIN_REQUEST` notification to the room owner for approval.
- **Informational Notifications**: Approving a join request notifies the requester with a clean notice (`"You are now part of [Room Name]"`) without duplicate action buttons. The owner sees `"[User Name] has joined your room!"`.
- **Clipboard Integration**: Migrated to `expo-clipboard` (`Clipboard.setStringAsync`) for zero-warning copying of invite codes.

### 4. Smart Habit Icon System & Habit Detail Modal
- **Smart Icon Resolution**: Word-boundary keyword dictionary matching habit names (`code`, `water`, `gym`, `read`, `journal`, etc.) with fallback to manual overrides.
- **Habit Detail Modal**: Displays habit stats, monthly progress calendar, habit deletion, and an interactive icon picker with instant display updates and a dark-gold confirmation toast.

### 5. Database Migrations (`supabase/migrations/`)
- **`0005_room_invitations.sql`**: Schema for room invitations, in-app notifications, and `send_room_invitation` & `request_to_join_room` RPCs.
- **`0006_room_reactions.sql`**: Reactions table, `toggle_activity_reaction` RPC, and `notify_linked_room_on_check_in` trigger.
- **`0007_delete_habit_fix.sql`**: `SECURITY DEFINER` `delete_habit` RPC to safely delete habits bypassing cascade locks, and guaranteed fallback usernames for profile creation.
- **`0008_fix_room_invitations.sql`**: Replaced partial-index `ON CONFLICT` with explicit `IF EXISTS` logic in `respond_to_invitation` to fix invitation acceptance errors.
- **`0009_room_invite_rpc.sql`**: `SECURITY DEFINER` `join_room_by_code` RPC allowing non-members to look up private rooms by invite code without RLS select errors.
- **`0010_invitation_wording_fix.sql`**: Informational `ROOM_JOINED` notifications and tailored room owner approval wording.

### 6. Auth & Session Resilience
- **Bearer Header Persistence**: Explicitly calls `setSession()` during startup (`initAuth`) to ensure Supabase client attaches `Authorization: Bearer` headers to all API requests.
- **Stale Token Handling**: Automatically clears stale/invalid local sessions and redirects cleanly to the Sign In screen.
- **Profile Auto-Recovery**: Automatically creates a default profile row if a user exists in Supabase Auth but lacks a profile entry.

### 7. Core Bug & Crash Fixes
- **React Rules of Hooks Fix**: Fixed `Internal React error: Expected static flag was missing` by moving early returns in `HabitDetailModal.tsx` and replacing `presentationStyle="pageSheet"` with explicit `style={{ flex: 1, backgroundColor: '#0B0B0C' }}` modal backdrop containers.
- **NativeWind `truncate` Fix**: Replaced native text `truncate` CSS classes with `numberOfLines={1}` across habit and room cards.
- **"MY ROOMS" Filter**: Filtered `getRooms()` to active user memberships so new accounts start cleanly with 0 pre-populated rooms.

---

## File Summary

| Path | Summary |
|------|---------|
| `supabase/migrations/0005_room_invitations.sql` | Room invitations & notifications schema |
| `supabase/migrations/0006_room_reactions.sql` | Activity reactions & check-in triggers |
| `supabase/migrations/0007_delete_habit_fix.sql` | `delete_habit` RPC & unique username guarantee |
| `supabase/migrations/0008_fix_room_invitations.sql` | Fix `respond_to_invitation` ON CONFLICT error |
| `supabase/migrations/0009_room_invite_rpc.sql` | `join_room_by_code` RPC bypassing RLS |
| `supabase/migrations/0010_invitation_wording_fix.sql` | Informational `ROOM_JOINED` notifications |
| `packages/api-client/src/index.ts` | Complete API client RPC mappings & auto profile recovery |
| `apps/mobile/app/(auth)/login.tsx` | Redesigned Login screen |
| `apps/mobile/app/(auth)/register.tsx` | Redesigned Register screen with username field |
| `apps/mobile/app/(tabs)/today.tsx` | Today screen with habits list & habit icon update sync |
| `apps/mobile/app/(tabs)/rooms.tsx` | Rooms screen feed & info sheet trigger |
| `apps/mobile/app/(tabs)/profile.tsx` | You/Profile screen |
| `apps/mobile/src/components/habits/HabitCard.tsx` | Styled Habit Card component |
| `apps/mobile/src/components/habits/HabitDetailModal.tsx` | Habit detail modal with monthly grid & icon picker |
| `apps/mobile/src/components/rooms/RoomInfoSheet.tsx` | Room info sheet bottom panel |
| `apps/mobile/src/components/ui/NotificationScreen.tsx` | Notifications screen with actionable invitation cards |
| `project_audit_report.md` | Workspace audit log of all incremental changes |
