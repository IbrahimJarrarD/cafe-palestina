import { defineMiddleware } from 'astro:middleware';

// Middleware placeholder - auth is handled client-side
// because Supabase stores tokens in localStorage
export const onRequest = defineMiddleware(async (context, next) => {
  return next();
});
