-- Migration 0018: Complete Account Deletion from auth.users and public schema
-- Run this script in the Supabase Dashboard SQL Editor.

-- 1. Ensure rooms.owner_id uses ON DELETE CASCADE
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_owner_id_fkey;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Allow authenticated users to insert their own profile row if missing
DROP POLICY IF EXISTS profiles_insert_owner ON public.profiles;
CREATE POLICY profiles_insert_owner ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Replace delete_account RPC to delete from auth.users directly
CREATE OR REPLACE FUNCTION public.delete_account(
  p_profile_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  -- Security check: Ensure authenticated caller matches requested profile ID
  IF v_caller_id IS NULL OR v_caller_id <> p_profile_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only delete your own account';
  END IF;

  -- 1. Delete rooms owned by this user
  DELETE FROM public.rooms WHERE owner_id = p_profile_id;

  -- 2. Delete user profile from public.profiles
  DELETE FROM public.profiles WHERE id = p_profile_id;

  -- 3. Delete auth account from auth.users (Completely removes login credentials)
  DELETE FROM auth.users WHERE id = p_profile_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Grant EXECUTE permissions to authenticated and service_role users
GRANT EXECUTE ON FUNCTION public.delete_account(UUID) TO authenticated, service_role;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
