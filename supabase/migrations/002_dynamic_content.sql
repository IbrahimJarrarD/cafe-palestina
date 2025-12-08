-- Migration 002: Dynamic Content & Image Uploads
-- Run this in Supabase SQL Editor after 001

-- ============================================
-- 1. EVENT IMAGES - Add support for uploaded images
-- ============================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ============================================
-- 2. HERO BANNER / ANNOUNCEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text_de TEXT NOT NULL,
  text_en TEXT NOT NULL,
  text_ar TEXT NOT NULL,
  icon TEXT DEFAULT '🌿',
  link_url TEXT, -- Where it links to (e.g., #events, /event/slug, external URL)
  link_type TEXT DEFAULT 'internal' CHECK (link_type IN ('internal', 'external', 'event')),
  linked_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0, -- Higher = shows first
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active announcement at a time (or use priority)
CREATE INDEX idx_announcements_active ON announcements(is_active, priority DESC);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active announcements" ON announcements FOR SELECT USING (is_active = true);

-- ============================================
-- 3. SITE SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value_de TEXT,
  value_en TEXT,
  value_ar TEXT,
  value TEXT, -- For non-translatable values (URLs, numbers, etc.)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view site settings" ON site_settings FOR SELECT USING (true);

-- Insert default settings
INSERT INTO site_settings (key, value) VALUES
  ('site_name', 'Cafe Palestine Colonia'),
  ('email', 'info@cafepalestine.de'),
  ('phone', ''),
  ('address_street', 'Geisselstraße 3–5'),
  ('address_city', '50823 Köln'),
  ('address_country', 'Deutschland'),
  ('instagram_url', 'https://www.instagram.com/cafepalestinecolonia/'),
  ('facebook_url', 'https://www.facebook.com/cafepalestinecolonia'),
  ('youtube_url', ''),
  ('stats_events_count', '100+'),
  ('stats_visitors_count', '5k+')
ON CONFLICT (key) DO NOTHING;

-- Translatable settings
INSERT INTO site_settings (key, value_de, value_en, value_ar) VALUES
  ('schedule_info', 'Jeden 4. Sonntag im Monat', 'Every 4th Sunday of the month', 'كل الأحد الرابع من الشهر'),
  ('schedule_time', '12:00 – 15:30 Uhr', '12:00 – 3:30 PM', '12:00 – 15:30')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 4. EXPAND PAGE CONTENT
-- ============================================

-- Add more page content entries
INSERT INTO page_content (key, content_de, content_en, content_ar) VALUES
  ('about_text_1', 
    'Wir sind ein kulturelles Zentrum in Köln, das die Verbindung zwischen palästinensischer und deutscher Kultur feiert.',
    'We are a cultural center in Cologne celebrating the connection between Palestinian and German culture.',
    'نحن مركز ثقافي في كولن نحتفي بالعلاقة بين الثقافة الفلسطينية والألمانية.'),
  ('about_text_2',
    'Wenn hier in Deutschland von Palästina die Rede ist, dann wird meist nur das tragische Schicksal der Palästinenser diskutiert. Dass die Palästinenser auch eine hohe Kultur haben, mit Literatur, Malerei, Musik und vielem mehr, ist in der deutschen Öffentlichkeit kaum bekannt.',
    'When Palestine is discussed in Germany, usually only the tragic fate of Palestinians is addressed. That Palestinians also have a rich culture, with literature, painting, music and much more, is hardly known to the German public.',
    'عندما يتم الحديث عن فلسطين في ألمانيا، يتم عادة مناقشة المصير المأساوي للشعب الفلسطيني فحسب. أن الفلسطينيين لديهم ثقافة عميقة، مع الأدب والرسم والموسيقى والكثير غيرها، هذا أمر غير معروف تقريباً للجمهور الألماني.'),
  ('about_why_title',
    'Warum Café Palestine Colonia?',
    'Why Café Palestine Colonia?',
    'لماذا مقهى فلسطين كولونيا؟'),
  ('about_why_text',
    'Das Café Palestine Colonia hat sich zur Aufgabe gemacht, die kulturellen und künstlerischen Hintergründe Palästinas in den Vordergrund zu rücken.',
    'Café Palestine Colonia has made it its mission to bring Palestinian cultural and artistic backgrounds to the forefront.',
    'وضع مقهى فلسطين كولونيا نصب عينيه مهمة تسليط الضوء على الخلفيات الثقافية والفنية لفلسطين.'),
  ('poem_text',
    'Ein anderer Tag wird kommen, ein weiblicher
Mit durchsichtiger Metapher in vollkommener Gestalt
Diamantfarben wie eine Hochzeitsreise so sonnig und fließend
In sanftem Schatten. Niemand sehnt sich nach Selbstmord oder
Emigration. Fernab des Vergangenen ist alles natürlich und wahr,
sind alle Dinge eins mit ihren ersten Eigenschaften.',
    'Another day will come, a feminine one
With transparent metaphor in perfect form
Diamond colors like a honeymoon so sunny and flowing
In gentle shadow. No one longs for suicide or
Emigration. Far from the past, everything is natural and true,
all things are one with their first qualities.',
    'سيأتي يوم آخر، يوم أنثوي
بكنايات شفافة وتجسد مثالي
ألوان الماس كحفلة عرس مشمسة وسائلة
في ظل رقيق. لن يشتاق أحد للانتحار أو
الهجرة. بعيداً عن الماضي، كل شيء طبيعي وحقيقي
وكل الأشياء واحدة مع صفاتها الأولى.'),
  ('poem_author', '— Mahmoud Darwish', '— Mahmoud Darwish', '— محمود درويش'),
  ('footer_description',
    'Ein kulturelles Zentrum für Dialog, Verständnis und gemeinsames Lernen.',
    'A cultural center for dialogue, understanding, and shared learning.',
    'مركز ثقافي للحوار والتفاهم والتعلم المشترك.')
ON CONFLICT (key) DO UPDATE SET
  content_de = EXCLUDED.content_de,
  content_en = EXCLUDED.content_en,
  content_ar = EXCLUDED.content_ar;

-- ============================================
-- 5. STORAGE BUCKET FOR IMAGES
-- ============================================

-- Note: Storage buckets are created via Supabase Dashboard or API, not SQL
-- Go to Storage > Create bucket > Name: "event-images" > Public: true

-- But we can set up policies for when it exists
-- Run this after creating the bucket in the dashboard:
/*
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-images');
*/

-- ============================================
-- SEED: Default announcement
-- ============================================

INSERT INTO announcements (text_de, text_en, text_ar, icon, link_url, link_type, is_active, priority) VALUES
  ('Jeden 4. Sonntag im Monat', 'Every 4th Sunday of the month', 'كل الأحد الرابع من الشهر', '🌿', '#events', 'internal', true, 10);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE announcements IS 'Hero banner/announcement - shows one active at a time';
COMMENT ON TABLE site_settings IS 'Global site settings (contact info, social links, stats)';
COMMENT ON COLUMN events.image_url IS 'URL to uploaded event image in Supabase Storage';

