-- Room Invitations and In-App Notifications Migration
-- Drop existing objects if any
DROP FUNCTION IF EXISTS public.respond_to_invitation CASCADE;
DROP FUNCTION IF EXISTS public.send_room_invitation CASCADE;
DROP FUNCTION IF EXISTS public.request_to_join_room CASCADE;
DROP TABLE IF EXISTS public.in_app_notifications CASCADE;
DROP TABLE IF EXISTS public.room_invitations CASCADE;

-- ==========================================================
-- 1. Room Invitations Table
-- ==========================================================
CREATE TABLE public.room_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'DIRECT_INVITE', -- DIRECT_INVITE or JOIN_REQUEST
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',      -- PENDING, ACCEPTED, REJECTED
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_room_invitations_invitee ON public.room_invitations(invitee_id);
CREATE INDEX idx_room_invitations_inviter ON public.room_invitations(inviter_id);
CREATE INDEX idx_room_invitations_room ON public.room_invitations(room_id);

-- ==========================================================
-- 2. In-App Notifications Table
-- ==========================================================
CREATE TABLE public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- ROOM_INVITATION, JOIN_REQUEST, BADGE_EARNED, etc.
  title TEXT NOT NULL,
  body TEXT,
  icon_name VARCHAR(50) DEFAULT 'bell',
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_in_app_notifications_profile ON public.in_app_notifications(profile_id, created_at DESC);

-- ==========================================================
-- 3. Enable RLS
-- ==========================================================
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- 4. RLS Policies
-- ==========================================================

-- Room Invitations: both inviter and invitee can read
CREATE POLICY room_invitations_select ON public.room_invitations
  FOR SELECT USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);

-- Room Invitations: inviter can create (direct invite)
CREATE POLICY room_invitations_insert ON public.room_invitations
  FOR INSERT WITH CHECK (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- Room Invitations: invitee can update (respond) — for DIRECT_INVITE
-- inviter can update (respond) — for JOIN_REQUEST (owner approves)
CREATE POLICY room_invitations_update ON public.room_invitations
  FOR UPDATE USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);

-- In-App Notifications: owner can read, update, delete
CREATE POLICY in_app_notifications_select ON public.in_app_notifications
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY in_app_notifications_insert ON public.in_app_notifications
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY in_app_notifications_update ON public.in_app_notifications
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY in_app_notifications_delete ON public.in_app_notifications
  FOR DELETE USING (auth.uid() = profile_id);

-- ==========================================================
-- 5. RPC: send_room_invitation (Option A — Direct Invite)
-- ==========================================================
CREATE OR REPLACE FUNCTION public.send_room_invitation(
  p_room_id UUID,
  p_invitee_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_name TEXT;
  v_room_name TEXT;
  v_invitation_id UUID;
BEGIN
  -- Validate: inviter must be an active member of this room
  IF NOT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id AND profile_id = auth.uid() AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'You are not a member of this room';
  END IF;

  -- Validate: invitee must not already be an active member
  IF EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id AND profile_id = p_invitee_id AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User is already a member of this room';
  END IF;

  -- Validate: no duplicate PENDING invitation for this user+room
  IF EXISTS (
    SELECT 1 FROM public.room_invitations
    WHERE room_id = p_room_id AND invitee_id = p_invitee_id AND status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'An invitation is already pending for this user';
  END IF;

  -- Get names for notification text
  SELECT display_name INTO v_inviter_name FROM public.profiles WHERE id = auth.uid();
  SELECT name INTO v_room_name FROM public.rooms WHERE id = p_room_id;

  -- Create invitation record
  INSERT INTO public.room_invitations (room_id, inviter_id, invitee_id, type, status)
  VALUES (p_room_id, auth.uid(), p_invitee_id, 'DIRECT_INVITE', 'PENDING')
  RETURNING id INTO v_invitation_id;

  -- Create notification for invitee
  INSERT INTO public.in_app_notifications (profile_id, type, title, body, icon_name, reference_id)
  VALUES (
    p_invitee_id,
    'ROOM_INVITATION',
    v_inviter_name || ' invited you to join ' || v_room_name,
    'Tap to accept or decline the invitation.',
    'account-group',
    v_invitation_id
  );

  RETURN json_build_object('invitationId', v_invitation_id, 'success', true);
END;
$$;

-- ==========================================================
-- 6. RPC: request_to_join_room (Option B — Join Request)
-- ==========================================================
CREATE OR REPLACE FUNCTION public.request_to_join_room(
  p_invite_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room RECORD;
  v_requester_name TEXT;
  v_invitation_id UUID;
BEGIN
  -- Find the room by invite code
  SELECT * INTO v_room FROM public.rooms
  WHERE invite_code = upper(p_invite_code) AND archived_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code or room archived';
  END IF;

  -- If room is PUBLIC, just let them join directly (caller should use join_room instead)
  IF v_room.visibility = 'PUBLIC' THEN
    RAISE EXCEPTION 'PUBLIC_ROOM';
  END IF;

  -- Check if already an active member
  IF EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = v_room.id AND profile_id = auth.uid() AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'You are already a member of this room';
  END IF;

  -- Check for existing pending request
  IF EXISTS (
    SELECT 1 FROM public.room_invitations
    WHERE room_id = v_room.id AND invitee_id = auth.uid() AND status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'You already have a pending request for this room';
  END IF;

  -- Get requester name
  SELECT display_name INTO v_requester_name FROM public.profiles WHERE id = auth.uid();

  -- Create join request invitation (inviter = requester, invitee = requester for data consistency;
  -- the notification goes to the owner)
  INSERT INTO public.room_invitations (room_id, inviter_id, invitee_id, type, status)
  VALUES (v_room.id, auth.uid(), auth.uid(), 'JOIN_REQUEST', 'PENDING')
  RETURNING id INTO v_invitation_id;

  -- Notify the room owner
  INSERT INTO public.in_app_notifications (profile_id, type, title, body, icon_name, reference_id)
  VALUES (
    v_room.owner_id,
    'JOIN_REQUEST',
    v_requester_name || ' wants to join ' || v_room.name,
    'Approve or decline this join request.',
    'account-plus',
    v_invitation_id
  );

  RETURN json_build_object(
    'requestId', v_invitation_id,
    'roomName', v_room.name,
    'requestSent', true
  );
END;
$$;

-- ==========================================================
-- 7. RPC: respond_to_invitation (handles both types)
-- ==========================================================
CREATE OR REPLACE FUNCTION public.respond_to_invitation(
  p_invitation_id UUID,
  p_accept BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_status VARCHAR(20);
  v_room_name TEXT;
  v_responder_name TEXT;
  v_joiner_id UUID;
BEGIN
  -- Fetch invitation
  SELECT * INTO v_invitation FROM public.room_invitations
  WHERE id = p_invitation_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already responded';
  END IF;

  -- Authorization check:
  -- DIRECT_INVITE: only the invitee can respond
  -- JOIN_REQUEST: only the room owner can respond
  IF v_invitation.type = 'DIRECT_INVITE' THEN
    IF auth.uid() <> v_invitation.invitee_id THEN
      RAISE EXCEPTION 'Only the invitee can respond to a direct invitation';
    END IF;
    v_joiner_id := v_invitation.invitee_id;
  ELSIF v_invitation.type = 'JOIN_REQUEST' THEN
    -- Check that responder is the room owner
    IF NOT EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = v_invitation.room_id AND owner_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Only the room owner can respond to join requests';
    END IF;
    v_joiner_id := v_invitation.inviter_id; -- the requester becomes the joiner
  ELSE
    RAISE EXCEPTION 'Unknown invitation type';
  END IF;

  -- Get names for notifications
  SELECT name INTO v_room_name FROM public.rooms WHERE id = v_invitation.room_id;
  SELECT display_name INTO v_responder_name FROM public.profiles WHERE id = auth.uid();

  IF p_accept THEN
    v_status := 'ACCEPTED';

    -- Add user to room_members
    INSERT INTO public.room_members (room_id, profile_id, role)
    VALUES (v_invitation.room_id, v_joiner_id, 'MEMBER')
    ON CONFLICT (room_id, profile_id) DO UPDATE SET left_at = NULL;

    -- Add activity entry for room join
    INSERT INTO public.activities (actor_profile_id, room_id, type, message)
    VALUES (v_joiner_id, v_invitation.room_id, 'ROOM_JOIN', 'joined the room');

    -- Notify the other party about acceptance
    IF v_invitation.type = 'JOIN_REQUEST' THEN
      -- Notify the requester that they were accepted
      INSERT INTO public.in_app_notifications (profile_id, type, title, body, icon_name, reference_id)
      VALUES (
        v_joiner_id,
        'ROOM_INVITATION',
        'Your request to join ' || v_room_name || ' was accepted!',
        'You are now a member.',
        'check-circle',
        v_invitation.room_id
      );
    END IF;
  ELSE
    v_status := 'REJECTED';

    -- Notify the requester about rejection (for join requests)
    IF v_invitation.type = 'JOIN_REQUEST' THEN
      INSERT INTO public.in_app_notifications (profile_id, type, title, body, icon_name, reference_id)
      VALUES (
        v_joiner_id,
        'ROOM_INVITATION',
        'Your request to join ' || v_room_name || ' was declined.',
        NULL,
        'close-circle',
        v_invitation.room_id
      );
    END IF;
  END IF;

  -- Update invitation status
  UPDATE public.room_invitations
  SET status = v_status, responded_at = NOW()
  WHERE id = p_invitation_id;

  -- Mark related notification as read
  UPDATE public.in_app_notifications
  SET is_read = TRUE
  WHERE reference_id = p_invitation_id AND profile_id = auth.uid();

  RETURN TRUE;
END;
$$;
