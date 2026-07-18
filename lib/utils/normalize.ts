/**
 * Normalizes Arabic text for searching and duplicate detection.
 * It removes diacritics (Harakat), normalizes different shapes of Alef,
 * Teh Marbuta, Alef Maksura, and strips extra spaces.
 */
export function normalizeArabic(text: string): string {
  if (!text) return "";

  // 1. Convert to lowercase and trim
  let normalized = text.trim().toLowerCase();

  // 2. Remove Arabic diacritics (Tashkeel)
  // Range of diacritics: U+064B to U+065F, and U+0670 (superscript alef)
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, "");

  // 3. Normalize Alef shapes (أ, إ, آ, ٱ -> ا)
  normalized = normalized.replace(/[أإآٱ]/g, "ا");

  // 4. Normalize Teh Marbuta (ة -> ه)
  normalized = normalized.replace(/ة/g, "ه");

  // 5. Normalize Alef Maksura (ى -> ي)
  normalized = normalized.replace(/ى/g, "ي");

  // 6. Normalize Tatweel/Kashida (ـ -> remove)
  normalized = normalized.replace(/\u0640/g, "");

  // 7. Replace multiple whitespace characters with a single space
  normalized = normalized.replace(/\s+/g, " ");

  return normalized;
}

/**
 * Creates a URL-friendly slug from Arabic or English text.
 */
export function generateSlug(text: string): string {
  if (!text) return "";

  // Normalize Arabic first
  let slug = normalizeArabic(text);

  // Replace non-word characters (except spaces/hyphens) with empty string
  // Keep letters and numbers in Arabic and English
  slug = slug.replace(/[^\w\s\u0600-\u06FF-]/g, "");

  // Replace spaces with hyphens and trim extra hyphens
  slug = slug.replace(/\s+/g, "-");
  slug = slug.replace(/-+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");

  return slug || Date.now().toString();
}
