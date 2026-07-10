-- DANGER: This will delete ALL users from your Supabase Auth.
-- Run this to fix broken/orphaned accounts after a database wipe.

DELETE FROM auth.users;
