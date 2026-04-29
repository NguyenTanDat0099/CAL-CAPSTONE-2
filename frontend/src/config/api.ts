const rawApiBase = (import.meta.env.VITE_API_URL || '/api').trim();

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '');
const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, '');

export const API_BASE = stripTrailingSlashes(rawApiBase) || '/api';

export const buildApiUrl = (path: string) => {
  const normalizedPath = stripLeadingSlashes(path);
  return `${API_BASE}/${normalizedPath}`;
};
