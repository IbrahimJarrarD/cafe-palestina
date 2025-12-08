import { supabase } from './supabase';
import type { Language } from '../i18n/translations';
import type { Announcement, SiteSettings, PageContentMap } from './database.types';

// ============================================
// ANNOUNCEMENTS
// ============================================

export async function getActiveAnnouncement(): Promise<Announcement | null> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('priority', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // No active announcement is fine
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching announcement:', error);
    return null;
  }

  return data;
}

export function getAnnouncementText(announcement: Announcement, lang: Language): string {
  const key = `text_${lang}` as keyof Announcement;
  return (announcement[key] as string) || announcement.text_en;
}

export function getAnnouncementLink(announcement: Announcement, lang: Language): string {
  if (announcement.link_type === 'event' && announcement.linked_event_id) {
    // TODO: Fetch event slug and create link
    return `#events`;
  }
  return announcement.link_url || '#';
}

// ============================================
// SITE SETTINGS
// ============================================

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*');

  if (error) {
    console.error('Error fetching site settings:', error);
    return {};
  }

  // Transform array to key-value map
  const settings: SiteSettings = {};
  for (const row of (data || []) as Array<{
    key: string;
    value: string | null;
    value_de: string | null;
    value_en: string | null;
    value_ar: string | null;
  }>) {
    settings[row.key] = {
      value: row.value,
      de: row.value_de,
      en: row.value_en,
      ar: row.value_ar,
    };
  }

  return settings;
}

export function getSetting(settings: SiteSettings, key: string, lang?: Language): string {
  const setting = settings[key];
  if (!setting) return '';
  
  // If language provided and translatable values exist, use them
  if (lang) {
    const translated = setting[lang];
    if (translated) return translated;
  }
  
  // Fall back to non-translated value
  return setting.value || '';
}

// ============================================
// PAGE CONTENT
// ============================================

export async function getPageContent(): Promise<PageContentMap> {
  const { data, error } = await supabase
    .from('page_content')
    .select('*');

  if (error) {
    console.error('Error fetching page content:', error);
    return {};
  }

  // Transform array to key-value map
  const content: PageContentMap = {};
  for (const row of (data || []) as Array<{
    key: string;
    content_de: string;
    content_en: string;
    content_ar: string;
  }>) {
    content[row.key] = {
      de: row.content_de,
      en: row.content_en,
      ar: row.content_ar,
    };
  }

  return content;
}

export function getContent(content: PageContentMap, key: string, lang: Language): string {
  const item = content[key];
  if (!item) return '';
  return item[lang] || item.en || '';
}

// ============================================
// IMAGE UPLOAD HELPERS
// ============================================

export function getEventImageUrl(imageUrl: string | null, imageTypeSlug?: string): string {
  // If custom image uploaded, use it
  if (imageUrl) {
    return imageUrl;
  }
  // Otherwise return empty - component will show SVG fallback
  return '';
}

export function getSupabaseStorageUrl(bucket: string, path: string): string {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

