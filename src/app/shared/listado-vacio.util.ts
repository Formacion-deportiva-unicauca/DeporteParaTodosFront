/**
 * Código con el que el backend responde (HTTP 200) cuando un listado está vacío: ListadoVacioExcepcion ->
 * CodigoError.LISTADO_VACIO. Lo usan GET /clasesGrupo y GET /atencionesporclase.
 */
export const CODIGO_LISTADO_VACIO = 'GC-0002';

/**
 * Interpreta el cuerpo de un GET de listado.
 * - Un arreglo es la lista.
 * - El objeto de error GC-0002 (listado vacío, con HTTP 200) es una lista vacía legítima.
 * - Cualquier otra cosa (otro código, null, cadena, objeto sin codigoError…) NO se puede interpretar: devuelve null para que
 *   quien llama lo trate como un error de lectura y nunca como "no hay registros".
 */
export function interpretarListado<T>(cuerpo: unknown): T[] | null {
  if (Array.isArray(cuerpo)) return cuerpo as T[];
  if (typeof cuerpo === 'object' && cuerpo !== null && (cuerpo as { codigoError?: unknown }).codigoError === CODIGO_LISTADO_VACIO) {
    return [];
  }
  return null;
}
