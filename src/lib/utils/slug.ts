export function slugifyBusinessName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateBusinessSlug(name: string): string {
  const base = slugifyBusinessName(name) || 'bisnis';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}
