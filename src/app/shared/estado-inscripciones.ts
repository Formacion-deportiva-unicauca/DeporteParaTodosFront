import { CursoDTO } from '../Models/DTOs/curso-dto';

/**
 * Estado de inscripciones de un CURSO: lo calcula el backend a partir de sus grupos (ventana de fechas + cierre manual).
 * ABIERTO si algún grupo acepta inscripciones hoy, CERRADO si ninguno, SIN_GRUPOS si el curso aún no tiene grupos.
 */
export type EstadoInscripcionesCurso = NonNullable<CursoDTO['estadoInscripciones']>;

/** Un valor ausente o desconocido se muestra como cerradas: nunca se anuncia como abierto algo que no se sabe. */
export function textoEstadoInscripciones(estado?: string | null): string {
  if (estado === 'ABIERTO') return 'Inscripciones abiertas';
  if (estado === 'SIN_GRUPOS') return 'Sin grupos';
  return 'Inscripciones cerradas';
}

export function claseEstadoInscripciones(estado?: string | null): string {
  if (estado === 'ABIERTO') return 'bg-primary';
  if (estado === 'SIN_GRUPOS') return 'bg-secondary';
  return 'bg-warning text-dark';
}
