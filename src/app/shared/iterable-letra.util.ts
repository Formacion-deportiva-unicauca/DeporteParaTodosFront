export function letraDeIterable(n: number | null): string {
  if (!n || n < 1) return '?';
  return String.fromCharCode(64 + n);
}
