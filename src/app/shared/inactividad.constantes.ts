/** Tiempo sin actividad tras el cual se cierra la sesión (30 minutos). */
export const INACTIVIDAD_MS = 30 * 60 * 1000;

/** Cuánto antes del cierre se avisa a la persona (2 minutos antes). */
export const AVISO_PREVIO_MS = 2 * 60 * 1000;

/** Cada cuánto se compara la marca de la última actividad con la hora actual. */
export const INTERVALO_REVISION_MS = 15 * 1000;

/** El movimiento del ratón cuenta como actividad como máximo una vez por este intervalo. */
export const LIMITE_MOUSEMOVE_MS = 1000;
