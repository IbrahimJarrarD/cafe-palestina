// Allowed tags and attributes for event descriptions and page content
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 'b', 'i',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'img',
  'blockquote', 'pre', 'code',
  'div', 'span',
]);

const ALLOWED_ATTR = new Set([
  'href', 'target', 'rel',
  'src', 'alt', 'width', 'height',
  'class', 'style',
]);

// SSR-safe sanitizer that strips disallowed tags and attributes.
// Works in both server (Astro SSR) and client (Svelte) contexts
// without requiring jsdom or a browser DOM.
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  // Remove script tags and their content
  let clean = dirty.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, onload, etc.)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // Remove javascript: protocol from href/src attributes
  clean = clean.replace(/(href|src)\s*=\s*["']?\s*javascript\s*:/gi, '$1="');

  // Remove data: protocol from src attributes (except images)
  clean = clean.replace(/src\s*=\s*["']?\s*data\s*:(?!image\/)/gi, 'src="');

  // Strip disallowed tags (keep their text content)
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tagName) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';

    // For allowed tags, strip disallowed attributes
    if (match.startsWith('</')) return `</${tag}>`;

    return match.replace(/\s+([a-zA-Z-]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/g, (attrMatch, attrName) => {
      if (!ALLOWED_ATTR.has(attrName.toLowerCase())) return '';
      return attrMatch;
    });
  });

  return clean;
}
