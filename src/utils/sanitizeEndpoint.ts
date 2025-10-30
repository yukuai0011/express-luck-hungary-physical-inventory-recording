export function sanitizeEndpoint(urlLike: string | undefined | null): string {
  if (!urlLike || typeof urlLike !== 'string') return '';
  let s = urlLike.trim();
  if (s.startsWith('<') && s.endsWith('>')) {
    s = s.slice(1, -1);
  }
  return s;
}
