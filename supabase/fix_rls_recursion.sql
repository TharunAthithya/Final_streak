-- Fix for Infinite Recursion in Room Members RLS

-- 1. Create a SECURITY DEFINER function to check room membership
-- By using SECURITY DEFINER, this query bypasses RLS on room_members, 
-- preventing infinite recursion when the policy evaluates itself.
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id
      AND profile_id = auth.uid()
      AND left_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Drop existing policies that cause recursion
DROP POLICY IF EXISTS rooms_select_visibility ON public.rooms;
DROP POLICY IF EXISTS members_select_active ON public.room_members;
DROP POLICY IF EXISTS room_habits_select_member ON public.room_habits;
DROP POLICY IF EXISTS links_select_member ON public.room_habit_links;
DROP POLICY IF EXISTS links_insert_owner ON public.room_habit_links;
DROP POLICY IF EXISTS links_delete_owner ON public.room_habit_links;
DROP POLICY IF EXISTS activities_select_member ON public.activities;
DROP POLICY IF EXISTS reactions_select_member ON public.reactions;
DROP POLICY IF EXISTS reactions_insert_member ON public.reactions;

-- 3. Recreate policies using the new function
CREATE POLICY rooms_select_visibility ON public.rooms FOR SELECT 
  USING (visibility = 'PUBLIC' OR public.is_room_member(id));

CREATE POLICY members_select_active ON public.room_members FOR SELECT 
  USING (public.is_room_member(room_id));

-- (Also allow a user to insert themselves into a room if they have the invite code, 
-- or for now, just allow insert if they are the one being inserted. Wait, we need room_members_insert policy!)
-- Wait, the original schema didn't have an insert policy for room_members?
CREATE POLICY members_insert_self ON public.room_members FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY room_habits_select_member ON public.room_habits FOR SELECT 
  USING (public.is_room_member(room_id));

CREATE POLICY links_select_member ON public.room_habit_links FOR SELECT 
  USING (exists (select 1 from public.room_members where room_members.id = room_habit_links.room_member_id and room_members.profile_id = auth.uid()));

CREATE POLICY links_insert_owner ON public.room_habit_links FOR INSERT WITH CHECK 
  (exists (select 1 from public.room_members where room_members.id = room_member_id and room_members.profile_id = auth.uid()));

CREATE POLICY links_delete_owner ON public.room_habit_links FOR DELETE 
  USING (exists (select 1 from public.room_members where room_members.id = room_member_id and room_members.profile_id = auth.uid()));

CREATE POLICY activities_select_member ON public.activities FOR SELECT 
  USING (room_id is null OR public.is_room_member(room_id));

CREATE POLICY reactions_select_member ON public.reactions FOR SELECT 
  USING (exists (select 1 from public.activities where activities.id = reactions.activity_id and (activities.room_id is null or public.is_room_member(activities.room_id))));

CREATE POLICY reactions_insert_member ON public.reactions FOR INSERT WITH CHECK 
  (auth.uid() = profile_id and exists (select 1 from public.activities where activities.id = activity_id and (activities.room_id is null or public.is_room_member(activities.room_id))));

