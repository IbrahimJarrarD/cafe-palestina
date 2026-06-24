import { supabase } from './supabase';
import type { Post } from './database.types';
import type { Language } from '../i18n/translations';

// Fetch all published posts, newest first.
// RLS only exposes published rows to the anon client, so this is safe to call
// from .astro frontmatter (SSR). The explicit status filter keeps it correct
// even when called with an authenticated (admin) session.
export async function getPublishedPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[blog] getPublishedPosts failed:', error.message);
    return [];
  }

  return (data || []) as Post[];
}

// Fetch a single published post by slug. Returns null for missing or unpublished
// slugs (drafts are invisible to the anon client via RLS).
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    return null;
  }

  return data as Post;
}

// Helper: localized post title (falls back to English)
export function getPostTitle(post: Post, lang: Language): string {
  const key = `title_${lang}` as keyof Post;
  return (post[key] as string) || post.title_en;
}

// Helper: localized post excerpt (falls back to English, may be empty)
export function getPostExcerpt(post: Post, lang: Language): string {
  const key = `excerpt_${lang}` as keyof Post;
  return (post[key] as string) || post.excerpt_en || '';
}

// Helper: localized post body (rich HTML, falls back to English)
export function getPostBody(post: Post, lang: Language): string {
  const key = `body_${lang}` as keyof Post;
  return (post[key] as string) || post.body_en || '';
}

// Helper: a plain-text meta description (excerpt, else the start of the body).
export function getPostDescription(post: Post, lang: Language): string {
  const excerpt = getPostExcerpt(post, lang);
  if (excerpt) return excerpt;
  const text = getPostBody(post, lang)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 160);
}
