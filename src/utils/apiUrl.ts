export const BACKEND_URL = 'https://ais-pre-2ezjlg7ygolcgvkdlo7zla-290275720433.asia-northeast1.run.app';

export function getApiUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }

  // Only prepend remote BACKEND_URL when running inside native Android file:// or offline local asset environment
  if (
    typeof window !== 'undefined' &&
    (window.location.protocol === 'file:' ||
      window.location.origin === 'null' ||
      window.location.href.startsWith('file://'))
  ) {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${BACKEND_URL}${cleanPath}`;
  }

  return path;
}
