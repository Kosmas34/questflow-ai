-- ============================================================
-- Migration 002 — AI Setup Wizard columns.
-- Run once on existing installs. Fresh installs get these
-- from the updated schema.sql.
-- ============================================================

alter table public.properties
  add column if not exists welcome_message text not null default '',
  add column if not exists quick_buttons text[] not null
    default array['wifi','checkout','taxi','restaurants','beaches','help'];
