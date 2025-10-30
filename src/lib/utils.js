export function isObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

export function sanitizeEndpoint(urlLike) {
  if (!urlLike || typeof urlLike !== 'string') return '';
  let s = urlLike.trim();
  if (s.startsWith('<') && s.endsWith('>')) {
    s = s.slice(1, -1);
  }
  return s;
}

export function uuidv4() {
  // Not cryptographically strong, but sufficient for client correlation header
  const getRand = () => Math.floor(Math.random() * 16);
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = getRand();
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
