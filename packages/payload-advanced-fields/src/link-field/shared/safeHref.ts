/** Checks whether a stored link target uses a browser-safe destination scheme. */
export function isSafeLinkHref(value: unknown): value is string {
  if (typeof value !== 'string' || !value || /\s/.test(value)) return false;

  try {
    const parsed = new URL(value, 'https://relative.invalid');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
