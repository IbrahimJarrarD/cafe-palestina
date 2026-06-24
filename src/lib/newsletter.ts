import { supabase } from './supabase';
import type { Language } from '../i18n/translations';

// Public newsletter signup (single opt-in). Inserts only; the anon role cannot
// read the table back (admin-only SELECT), so we do not chain .select() here.
export async function subscribeNewsletter(email: string, lang: Language, consented: boolean) {
  const clean = email.trim().toLowerCase();

  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({ email: clean, lang, consented, source: 'website' } as never);

  if (error) {
    // Unique violation = this email is already subscribed.
    if (error.code === '23505') {
      return { success: false, error: 'already' as const };
    }
    console.error('[newsletter] subscribe failed:', error.message);
    return { success: false, error: 'unknown' as const };
  }

  return { success: true as const };
}
