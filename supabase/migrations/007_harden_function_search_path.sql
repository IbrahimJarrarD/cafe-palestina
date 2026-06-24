-- Migration 007: Harden function search_path
-- Applied to production 2026-06-24 via the Supabase MCP.
--
-- Pins search_path on SECURITY DEFINER (and trigger) functions to prevent
-- search_path hijacking. Clears the Supabase advisor "function_search_path_mutable"
-- warnings. Reversible with ALTER FUNCTION ... RESET search_path.

alter function public.get_my_role() set search_path = public, pg_temp;
alter function public.get_users_with_roles() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.is_admin(uuid) set search_path = public, pg_temp;
alter function public.update_updated_at() set search_path = public, pg_temp;
