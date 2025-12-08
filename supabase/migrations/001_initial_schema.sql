-- Cafe Palestine Colonia Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/scctrpnoisvehdnspoej/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LOOKUP TABLES (Admin can manage these!)
-- ============================================

-- Event categories (e.g., Workshop, Film, Reading)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  icon TEXT, -- emoji or icon name
  color TEXT, -- hex color for badges
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Image types/templates for events
CREATE TABLE image_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  -- Could store SVG data or image URL here
  preview_color_1 TEXT DEFAULT '#6b8c42',
  preview_color_2 TEXT DEFAULT '#8fb14e',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MAIN TABLES
-- ============================================

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT NOT NULL,
  image_type_id UUID REFERENCES image_types(id) ON DELETE SET NULL,
  
  -- Multilingual content
  title_de TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description_de TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  
  -- Settings
  max_attendees INTEGER,
  is_published BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVPs table
CREATE TABLE rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  guests INTEGER DEFAULT 1,
  message TEXT,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate RSVPs
  UNIQUE(event_id, email)
);

-- Page content table (for editable text blocks)
CREATE TABLE page_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  content_de TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_published ON events(is_published);
CREATE INDEX idx_events_category ON events(category_id);
CREATE INDEX idx_rsvps_event ON rsvps(event_id);
CREATE INDEX idx_rsvps_email ON rsvps(email);

-- ============================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER page_content_updated_at
  BEFORE UPDATE ON page_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories and image types
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public can view image_types" ON image_types FOR SELECT USING (true);

-- Public can read published events
CREATE POLICY "Public can view published events"
  ON events FOR SELECT
  USING (is_published = true);

-- Public can create RSVPs
CREATE POLICY "Anyone can RSVP"
  ON rsvps FOR INSERT
  WITH CHECK (true);

-- Public can view RSVPs (for count display)
CREATE POLICY "Public can view RSVPs"
  ON rsvps FOR SELECT
  USING (true);

-- Public can read page content
CREATE POLICY "Public can view page content"
  ON page_content FOR SELECT
  USING (true);

-- ============================================
-- SEED DATA: Default categories
-- ============================================

INSERT INTO categories (slug, name_de, name_en, name_ar, icon, color, sort_order) VALUES
('workshop', 'Workshop', 'Workshop', 'ورشة عمل', '🎨', '#6b8c42', 1),
('reading', 'Lesung', 'Reading', 'قراءة', '📖', '#1a3d2e', 2),
('film', 'Film', 'Film', 'فيلم', '🎬', '#2d5a47', 3),
('meeting', 'Treffen', 'Meeting', 'لقاء', '🤝', '#d4a853', 4),
('exhibition', 'Ausstellung', 'Exhibition', 'معرض', '🖼️', '#c75146', 5),
('concert', 'Konzert', 'Concert', 'حفل موسيقي', '🎵', '#8b6f47', 6),
('lecture', 'Vortrag', 'Lecture', 'محاضرة', '🎤', '#4a7c59', 7),
('food', 'Essen', 'Food', 'طعام', '🍽️', '#d4a853', 8),
('celebration', 'Feier', 'Celebration', 'احتفال', '🎉', '#c75146', 9);

-- ============================================
-- SEED DATA: Default image types
-- ============================================

INSERT INTO image_types (slug, name_de, name_en, name_ar, preview_color_1, preview_color_2) VALUES
('cooking', 'Kochen', 'Cooking', 'طبخ', '#6b8c42', '#8fb14e'),
('reading', 'Lesen', 'Reading', 'قراءة', '#1a3d2e', '#2d5a47'),
('film', 'Film', 'Film', 'فيلم', '#2d5a47', '#6b8c42'),
('embroidery', 'Stickerei', 'Embroidery', 'تطريز', '#c75146', '#d4a853'),
('music', 'Musik', 'Music', 'موسيقى', '#d4a853', '#6b8c42'),
('general', 'Allgemein', 'General', 'عام', '#1a3d2e', '#6b8c42'),
('community', 'Gemeinschaft', 'Community', 'مجتمع', '#4a7c59', '#8fb14e');

-- ============================================
-- SEED DATA: Page content
-- ============================================

INSERT INTO page_content (key, content_de, content_en, content_ar) VALUES
('hero_title', 'Gemeinsam Kulturen verbinden', 'Connecting Cultures Together', 'توحيد الثقافات معاً'),
('hero_subtitle', 'Entdecke Workshops, Lesungen, Filmabende und kulturelle Zusammenkünfte, die Palästina und Deutschland vereinen.', 'Discover workshops, readings, film nights, and cultural gatherings that unite Palestine and Germany.', 'اكتشف ورش العمل والقراءات وليالي الأفلام والتجمعات الثقافية التي توحد فلسطين وألمانيا.');

-- ============================================
-- SEED DATA: Sample events
-- ============================================

INSERT INTO events (slug, category_id, date, time, location, address, image_type_id, title_de, title_en, title_ar, description_de, description_en, description_ar)
SELECT 
  'palaestinensische-kueche-workshop',
  (SELECT id FROM categories WHERE slug = 'workshop'),
  CURRENT_DATE + INTERVAL '7 days',
  '18:00 - 20:00',
  'Cafe Palestine Colonia',
  'Geisselstraße 3–5, 50823 Köln',
  (SELECT id FROM image_types WHERE slug = 'cooking'),
  'Workshop: Palästinensische Küche',
  'Workshop: Palestinian Cuisine',
  'ورشة عمل: الطهي الفلسطيني',
  'Lerne die authentische Zubereitung palästinensischer Gerichte. Von Hummus bis Tabbouleh – entdecke die Vielfalt der levantinischen Küche.',
  'Learn authentic Palestinian cooking. From hummus to tabbouleh – discover the diversity of Levantine cuisine.',
  'تعلم تحضير الأطباق الفلسطينية الأصيلة. من الحمص إلى التبولة – اكتشف تنوع المطبخ الشامي.';

INSERT INTO events (slug, category_id, date, time, location, address, image_type_id, title_de, title_en, title_ar, description_de, description_en, description_ar)
SELECT 
  'maerchen-leseabend',
  (SELECT id FROM categories WHERE slug = 'reading'),
  CURRENT_DATE + INTERVAL '14 days',
  '19:30 - 21:30',
  'Stadtbibliothek Köln',
  'Josef-Haubrich-Hof 1, 50676 Köln',
  (SELECT id FROM image_types WHERE slug = 'reading'),
  'Leseabend: Märchen aus Palästina',
  'Reading Night: Tales from Palestine',
  'أمسية قراءة: حكايات من فلسطين',
  'Ein wundervoller Abend mit traditionellen und modernen palästinensischen Märchen.',
  'A wonderful evening with traditional and modern Palestinian tales.',
  'مساء رائع مع حكايات فلسطينية تقليدية وحديثة.';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE categories IS 'Event categories - admin can add/edit/delete';
COMMENT ON TABLE image_types IS 'Image templates for events - admin can manage';
COMMENT ON TABLE events IS 'Cultural events for Cafe Palestine Colonia';
COMMENT ON TABLE rsvps IS 'Event RSVPs from visitors';
COMMENT ON TABLE page_content IS 'Editable page content blocks';
