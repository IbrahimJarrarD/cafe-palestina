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
  const { data: rsvp, error } = await supabase
    .from('rsvps')
    .insert({
      event_id: data.eventId,
      email: data.email,
      name: data.name,
      guests: data.guests || 1,
      message: data.message || null,
    } as never)
    .select()
    .single();

  if (error) {
    // Check if duplicate
    if (error.code === '23505') {
      return { success: false, error: 'already_registered' as const };
    }
    return { success: false, error: 'unknown' as const };
  }

  return { success: true, rsvp };
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
