export type VigenciaToken = 'vigente' | 'vencido' | 'invalido';

/** Un token que vence en menos de este margen ya se trata como vencido (reloj del navegador y latencia de red). */
export const MARGEN_VIGENCIA_MS = 30_000;

/** Decodifica un segmento base64url (el formato de los JWT) a texto UTF-8. Devuelve null si no es válido. */
function decodificarBase64Url(segmento: string): string | null {
  try {
    let base64 = segmento.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binario = atob(base64);
    const bytes = Uint8Array.from(binario, caracter => caracter.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Instante de expiración (`exp`, en segundos desde 1970) de un JWT, o null si el token no se puede leer. */
export function expiracionDelToken(token: string | null | undefined): number | null {
  if (!token) return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const json = decodificarBase64Url(partes[1]);
  if (json === null) return null;
  try {
    const exp = (JSON.parse(json) as { exp?: unknown } | null)?.exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}

/**
 * Vigencia del token según su `exp`: 'vigente', 'vencido' (incluye el que vence dentro del margen) o 'invalido'
 * (no es un JWT legible o no trae `exp`). No verifica la firma: eso lo hace el backend.
 */
export function vigenciaDelToken(
  token: string | null | undefined,
  ahoraMs: number = Date.now(),
  margenMs: number = MARGEN_VIGENCIA_MS,
): VigenciaToken {
  const exp = expiracionDelToken(token);
  if (exp === null) return 'invalido';
  return exp * 1000 - margenMs > ahoraMs ? 'vigente' : 'vencido';
}
