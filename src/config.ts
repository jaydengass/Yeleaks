export const API_BASE =
  (typeof window !== 'undefined' && (window as any).__API_BASE__) ||
  import.meta.env.VITE_API_BASE ||
  '';

export const api = (path: string) => {
  const base = API_BASE.replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  return base ? `${base}/${p}` : `/${p}`;
};
