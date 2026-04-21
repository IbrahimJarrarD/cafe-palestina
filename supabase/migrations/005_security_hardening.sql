-- Migration 005: Security Hardening
-- Run this in Supabase SQL Editor after all previous migrations
-- Safe to re-run — all CREATE POLICY statements are preceded by DROP IF EXISTS
--
-- Fixes:
-- 1. RSVP data publicly readable (privacy issue)
-- 2. Missing admin write policies on content tables
-- 3. Missing admin write policies on announcements/settings
-- 4. RSVP insert validation
-- 5. Disable public signups (Supabase Auth setting should also be toggled in dashboard)

-- ============================================
-- 1. FIX RSVP POLICIES — restrict public reads
-- ============================================

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Public can view RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Admins can view RSVPs" ON rsvps;

-- Only admins can read RSVPs (contains PII: names, emails)
CREATE POLICY "Admins can view RSVPs"
  ON rsvps FOR SELECT
  USING (is_admin());

-- Add validation to RSVP inserts (require name and valid-looking email)
DROP POLICY IF EXISTS "Anyone can RSVP" ON rsvps;
DROP POLICY IF EXISTS "Public can RSVP with valid data" ON rsvps;
CREATE POLICY "Public can RSVP with valid data"
  ON rsvps FOR INSERT
  WITH CHECK (
    name IS NOT NULL AND length(trim(name)) > 0
    AND email IS NOT NULL AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (guests IS NULL OR (guests > 0 AND guests <= 20))
  );

-- Only admins can update/delete RSVPs
DROP POLICY IF EXISTS "Admins can manage RSVPs" ON rsvps;
CREATE POLICY "Admins can manage RSVPs"
  ON rsvps FOR ALL
  USING (is_admin());

-- ============================================
-- 2. ADMIN WRITE POLICIES — events table
-- ============================================

DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  USING (is_admin());

-- ============================================
-- 3. ADMIN WRITE POLICIES — categories table
-- ============================================

DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (is_admin());

-- ============================================
-- 4. ADMIN WRITE POLICIES — page_content table
-- ============================================

DROP POLICY IF EXISTS "Admins can manage page content" ON page_content;
CREATE POLICY "Admins can manage page content"
  ON page_content FOR ALL
  USING (is_admin());

-- ============================================
-- 5. ADMIN WRITE POLICIES — announcements table
-- ============================================

DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL
  USING (is_admin());

-- ============================================
-- 6. ADMIN WRITE POLICIES — site_settings table
-- ============================================

DROP POLICY IF EXISTS "Admins can manage site settings" ON site_settings;
CREATE POLICY "Admins can manage site settings"
  ON site_settings FOR ALL
  USING (is_admin());

-- ============================================
-- 7. ADMIN WRITE POLICIES — image_types table
-- ============================================

DROP POLICY IF EXISTS "Admins can manage image types" ON image_types;
CREATE POLICY "Admins can manage image types"
  ON image_types FOR ALL
  USING (is_admin());

-- ============================================
-- 8. STORAGE POLICIES — tighten image uploads
-- ============================================

-- Only admins can upload images (not just any authenticated user)
-- NOTE: Run these only if storage policies already exist.
-- If they error, the old policies may have different names — check Supabase dashboard.

-- Drop overly permissive upload policy if it exists
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete event images" ON storage.objects;

-- Only admins can upload
CREATE POLICY "Admins can upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-images'
    AND is_admin()
  );

-- Only admins can delete images
CREATE POLICY "Admins can delete event images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-images'
    AND is_admin()
  );

-- ============================================
-- IMPORTANT: Also do these in Supabase Dashboard
-- ============================================
-- 1. Go to Authentication > Providers > Email
--    → Disable "Enable sign ups" (only allow existing users to sign in)
-- 2. Go to Authentication > Rate Limits
--    → Set rate limit for sign-in attempts (e.g., 5 per minute)
-- 3. Go to Storage > event-images > Policies
--    → Verify only the policies above exist
