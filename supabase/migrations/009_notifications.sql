-- Migration 009: Centralized Notifications & Alerts System
-- ResQAI Platform Phase 11

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all extended columns exist cleanly
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reallocation_event_id VARCHAR(255);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'INFO';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_label VARCHAR(100) DEFAULT 'VIEW';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS state VARCHAR(20) DEFAULT 'UNREAD';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS deduplication_key VARCHAR(255);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_state ON public.notifications(state);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON public.notifications(severity);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Notifications
DROP POLICY IF EXISTS "Operators can view all notifications" ON public.notifications;
CREATE POLICY "Operators can view all notifications"
  ON public.notifications
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Operators can insert notifications" ON public.notifications;
CREATE POLICY "Operators can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Operators can update notifications" ON public.notifications;
CREATE POLICY "Operators can update notifications"
  ON public.notifications
  FOR UPDATE
  USING (true);
