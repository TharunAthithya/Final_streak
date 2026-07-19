-- Migration: Create Reflections Table
CREATE TABLE IF NOT EXISTS public.reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_profile_local_date UNIQUE (profile_id, local_date)
);

-- Enable RLS
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own reflections" ON public.reflections
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
