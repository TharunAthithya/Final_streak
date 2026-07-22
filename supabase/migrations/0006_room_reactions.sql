-- Migration 0006: Room Reactions and Automatic Room Check-in Activity Creation

-- Drop existing table if any
DROP TABLE IF EXISTS public.room_activity_reactions CASCADE;

-- Create Room Activity Reactions Table
CREATE TABLE public.room_activity_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL, -- 'heart', 'fire', 'thumb'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(activity_id, profile_id, reaction_type)
);

CREATE INDEX idx_room_activity_reactions_activity ON public.room_activity_reactions(activity_id);

-- Enable RLS
ALTER TABLE public.room_activity_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY room_activity_reactions_select ON public.room_activity_reactions
  FOR SELECT USING (TRUE);

CREATE POLICY room_activity_reactions_insert ON public.room_activity_reactions
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY room_activity_reactions_delete ON public.room_activity_reactions
  FOR DELETE USING (auth.uid() = profile_id);

-- RPC: toggle_activity_reaction
CREATE OR REPLACE FUNCTION public.toggle_activity_reaction(
  p_activity_id UUID,
  p_reaction_type VARCHAR
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_active BOOLEAN;
  v_count INT;
BEGIN
  -- Check if user already reacted
  SELECT id INTO v_existing_id
  FROM public.room_activity_reactions
  WHERE activity_id = p_activity_id
    AND profile_id = auth.uid()
    AND reaction_type = p_reaction_type;

  IF v_existing_id IS NOT NULL THEN
    -- Remove reaction
    DELETE FROM public.room_activity_reactions WHERE id = v_existing_id;
    v_active := FALSE;
  ELSE
    -- Add reaction
    INSERT INTO public.room_activity_reactions (activity_id, profile_id, reaction_type)
    VALUES (p_activity_id, auth.uid(), p_reaction_type);
    v_active := TRUE;
  END IF;

  -- Count total reactions of this type for this activity
  SELECT COUNT(*) INTO v_count
  FROM public.room_activity_reactions
  WHERE activity_id = p_activity_id AND reaction_type = p_reaction_type;

  RETURN json_build_object(
    'activityId', p_activity_id,
    'reactionType', p_reaction_type,
    'active', v_active,
    'count', v_count
  );
END;
$$;

-- Trigger/Function: Automatically log room activity when habit linked to room is completed
CREATE OR REPLACE FUNCTION public.notify_linked_room_on_check_in()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_habit_name TEXT;
  v_user_name TEXT;
BEGIN
  -- Get user name and habit name
  SELECT display_name INTO v_user_name FROM public.profiles WHERE id = NEW.profile_id;
  SELECT name INTO v_habit_name FROM public.habits WHERE id = NEW.habit_id;

  -- Find all rooms linked to this personal habit via room_habits and room_habit_links
  FOR v_link IN
    SELECT rh.room_id
    FROM public.room_habit_links l
    JOIN public.room_habits rh ON rh.id = l.room_habit_id
    WHERE l.personal_habit_id = NEW.habit_id AND l.unlinked_at IS NULL
  LOOP
    -- Insert room activity
    INSERT INTO public.activities (
      actor_profile_id, room_id, type, message, visibility
    ) VALUES (
      NEW.profile_id, v_link.room_id, 'HABIT_COMPLETE', v_habit_name, 'PUBLIC'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create Trigger on check_ins
DROP TRIGGER IF EXISTS trg_notify_linked_room ON public.check_ins;
CREATE TRIGGER trg_notify_linked_room
  AFTER INSERT ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_linked_room_on_check_in();
