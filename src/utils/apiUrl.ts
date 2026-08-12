export const BACKEND_URL = 'https://ais-pre-2ezjlg7ygolcgvkdlo7zla-290275720433.asia-northeast1.run.app';

export function getApiUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }

  // When running inside Android WebView loaded from file:// or local assets
  if (
    typeof window !== 'undefined' &&
    (window.location.protocol === 'file:' || !window.location.hostname || window.location.hostname === 'localhost')
  ) {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${BACKEND_URL}${cleanPath}`;
  }

  return path;
}
