-- Migration 009: Centralized Notifications & Alerts System
-- ResQAI Platform Phase 11

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  reallocation_event_id VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL', 'SUCCESS')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label VARCHAR(100) DEFAULT 'VIEW',
  state VARCHAR(20) NOT NULL DEFAULT 'UNREAD' CHECK (state IN ('UNREAD', 'READ', 'ACKNOWLEDGED', 'DISMISSED')),
  deduplication_key VARCHAR(255) UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_state ON public.notifications(state);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON public.notifications(severity);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_dedup ON public.notifications(deduplication_key);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Notifications
CREATE POLICY "Operators can view all notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Operators can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Operators can update notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
