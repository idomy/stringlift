// Attributes whose string value is shown to the user.
export const DEFAULT_UI_ATTRS = new Set([
  "title", "label", "placeholder", "description", "tooltip", "heading",
  "subheading", "alt", "emptyMessage", "confirmText", "cancelText",
  "confirmLabel", "cancelLabel", "submitLabel", "actionLabel", "helperText",
  "errorMessage", "successMessage", "caption", "subtitle", "summary", "hint",
  "legend", "buttonLabel", "header", "footer", "message", "tagline",
]);

// Attributes that must never be translated (identifiers, styling, routing…).
export const SKIP_ATTRS = new Set([
  "className", "class", "style", "key", "id", "htmlFor", "to", "href", "path",
  "type", "name", "role", "data-testid", "testId", "variant", "size", "color",
  "icon", "method", "target", "rel", "format", "mode", "as", "ref", "slot",
  "dir", "lang", "viewBox", "d", "xmlns", "fill", "stroke", "width", "height",
  "autoComplete", "inputMode", "pattern",
]);

// Is this string plausibly user-facing prose, not an identifier / url / token?
export function isUserFacing(text) {
  const s = text.trim();
  if (s.length < 2 || !/[A-Za-z]{2}/.test(s)) return false;
  if (/^https?:\/\//.test(s)) return false;
  if (/^\//.test(s)) return false;                       // path
  if (/^[a-z0-9]+([-_./:][a-z0-9]+)+$/.test(s)) return false;
  if (/^[a-z]+([A-Z][a-z0-9]*)+$/.test(s)) return false; // camelCase
  if (/^[A-Z0-9_]{2,}$/.test(s)) return false;           // CONST
  if (/^[A-Za-z][A-Za-z0-9]*(_[A-Za-z0-9]+)+$/.test(s)) return false; // mixed snake_case
  return true;
}

// Does this look like a Tailwind / CSS class list rather than prose?
export function looksLikeCss(s) {
  const toks = s.trim().split(/\s+/);
  if (toks.length < 2)
    return /[-:/\[\]()]/.test(s) && !/[A-Z]/.test(s) && !/[.?!,;]/.test(s);
  const cssish = toks.filter((t) => /^[a-z]/.test(t) && /[-:/\[\]()]/.test(t)).length;
  const hasCap = /[A-Z]/.test(s);
  const hasSentence = /[.?!;:]\s|[.?!;]$/.test(s);
  return !hasCap && !hasSentence && cssish / toks.length >= 0.5;
}
