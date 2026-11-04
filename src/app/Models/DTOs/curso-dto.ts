
export interface CursoDTO {
  nombre: string;

  deporte: string;

  categoriaCurso: string;

  descripcion: string;

  idImagen?: number | null;

  eliminado?: number | null;

  estadoCurso?: 'ACTIVO' | 'INACTIVO' | 'CERRADO';

  horario?: string | null;

  /** Solo de SALIDA: el backend lo calcula con los grupos del curso (ya no se elige ni se envía). */
  estadoInscripciones?: 'ABIERTO' | 'CERRADO' | 'SIN_GRUPOS';

  /** A quién va dirigido el curso; ausente = toda la comunidad. */
  publico?: 'ESTUDIANTE' | 'FUNCIONARIO' | 'MIXTO' | null;

  imagenBase64?: string | null;

  tipoArchivo?: string | null;
}
