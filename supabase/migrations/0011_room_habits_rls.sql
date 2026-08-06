-- Migration 0011: RLS Policies for Room Habits (Insert/Update/Delete) and Delete Room RPC

-- 1. Enable RLS and add INSERT / UPDATE / DELETE policies for room_habits
ALTER TABLE public.room_habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_habits_insert_member ON public.room_habits;
CREATE POLICY room_habits_insert_member ON public.room_habits
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS room_habits_update_owner ON public.room_habits;
CREATE POLICY room_habits_update_owner ON public.room_habits
  FOR UPDATE USING (
    public.is_room_member(room_id)
  );

DROP POLICY IF EXISTS room_habits_delete_owner ON public.room_habits;
CREATE POLICY room_habits_delete_owner ON public.room_habits
  FOR DELETE USING (
    public.is_room_member(room_id)
  );

-- 2. Create delete_room RPC (Bypasses RLS to archive room and return success)
CREATE OR REPLACE FUNCTION public.delete_room(
  p_room_id UUID,
  p_owner_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() <> p_owner_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.rooms
  SET archived_at = NOW()
  WHERE id = p_room_id AND owner_id = p_owner_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_room(UUID, UUID) TO authenticated, service_role;
