import { supabase } from './supabase';
import type { Event, EventWithRelations, Category, ImageType } from './database.types';
import type { Language } from '../i18n/translations';

// Fetch all categories
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return [];
  }

  return data || [];
}

// Fetch all image types
export async function getImageTypes() {
  const { data, error } = await supabase
    .from('image_types')
    .select('*');

  if (error) {
    return [];
  }

  return data || [];
}

// Fetch all published events with their relations
export async function getEvents(): Promise<EventWithRelations[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      category:categories(*),
      image_type:image_types(*)
    `)
    .eq('is_published', true)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.error('[events] getEvents failed:', error.message);
    return [];
  }

  return (data || []) as EventWithRelations[];
}

// Fetch single event by slug with relations
export async function getEventBySlug(slug: string): Promise<EventWithRelations | null> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      category:categories(*),
      image_type:image_types(*)
    `)
    .eq('slug', slug)
    .single();

  if (error) {
    return null;
  }

  return data as EventWithRelations;
}

// Get RSVP count for an event
export async function getRSVPCount(eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from('rsvps')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .is('cancelled_at', null);

  if (error) {
    return 0;
  }

  return count || 0;
}

// Submit RSVP
export async function submitRSVP(data: {
  eventId: string;
  email: string;
  name: string;
  guests?: number;
  message?: string;
}) {
  // No .select() here: the anon role cannot read rsvps back (admin-only SELECT),
  // so chaining .single() would error even on a successful insert.
  const { error } = await supabase
    .from('rsvps')
    .insert({
      event_id: data.eventId,
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      guests: data.guests || 1,
      message: data.message?.trim() || null,
      source: 'website',
    } as never);

  if (error) {
    // Unique violation = already registered for this event with this email.
    if (error.code === '23505') {
      return { success: false, error: 'already_registered' as const };
    }
    console.error('[events] submitRSVP failed:', error.message);
    return { success: false, error: 'unknown' as const };
  }

  return { success: true as const };
}

// Helper: Get localized category name
export function getCategoryName(category: Category | null, lang: Language): string {
  if (!category) return '';
  const key = `name_${lang}` as keyof Category;
  return (category[key] as string) || category.name_en;
}

// Helper: Get localized event title
export function getEventTitle(event: Event | EventWithRelations, lang: Language): string {
  const key = `title_${lang}` as keyof Event;
  return (event[key] as string) || event.title_en;
}

// Helper: Get localized event description
export function getEventDescription(event: Event | EventWithRelations, lang: Language): string {
  const key = `description_${lang}` as keyof Event;
  return (event[key] as string) || event.description_en;
}

// Parse a free-form event time ("18:00 - 20:00", "19:30 Uhr", "") with a date
// (YYYY-MM-DD) into ISO 8601 datetimes. Falls back to a date-only (all-day)
// value when no HH:MM can be found, so structured data / calendar links never
// emit an invalid datetime.
export function eventDateTimes(date: string, time: string | null): { start: string; end?: string } {
  const matches = (time || '').match(/\d{1,2}:\d{2}/g) || [];
  if (matches.length === 0) {
    return { start: date };
  }
  const pad = (t: string) => (t.length === 4 ? `0${t}` : t); // "6:00" -> "06:00"
  const start = `${date}T${pad(matches[0])}:00`;
  const end = matches[1] ? `${date}T${pad(matches[1])}:00` : undefined;
  return { start, end };
}
