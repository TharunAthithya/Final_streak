-- Migration to add reminder_time to habits table
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS reminder_time TIME;
