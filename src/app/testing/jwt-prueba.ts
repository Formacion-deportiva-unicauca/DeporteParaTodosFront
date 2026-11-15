/** Codifica texto UTF-8 como base64url (el formato de los segmentos de un JWT). */
function aBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  bytes.forEach(b => (binario += String.fromCharCode(b)));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** JWT de prueba (sin firma real) con el payload dado. Solo para pruebas. */
export function crearJwt(payload: Record<string, unknown>): string {
  return `${aBase64Url('{"alg":"HS256","typ":"JWT"}')}.${aBase64Url(JSON.stringify(payload))}.firma-de-prueba`;
}

/** JWT de prueba que vence dentro de `segundos` (negativo: ya venció). */
export function crearJwtQueVenceEn(segundos: number, ahoraMs: number = Date.now()): string {
  return crearJwt({ sub: 'ana@unicauca.edu.co', rol: 'Alumno', exp: Math.floor(ahoraMs / 1000) + segundos });
}
