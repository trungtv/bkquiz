export function normalizeTagName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
