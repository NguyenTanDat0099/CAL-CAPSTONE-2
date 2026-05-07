const rawApiBase = (import.meta.env.VITE_API_URL || '/api').trim();

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '');
const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, '');

const normalizeApiBase = (value: string) => {
  const stripped = stripTrailingSlashes(value);
  if (!stripped) return '/api';

  try {
    const url = new URL(stripped);
    const pathname = stripTrailingSlashes(url.pathname);
    if (!pathname || pathname === '/') {
      url.pathname = '/api';
    }
    return stripTrailingSlashes(url.toString());
  } catch {
    return stripped === '/' ? '/api' : stripped;
  }
};

export const API_BASE = normalizeApiBase(rawApiBase);

export const buildApiUrl = (path: string) => {
  const normalizedPath = stripLeadingSlashes(path);
  return `${API_BASE}/${normalizedPath}`;
};
