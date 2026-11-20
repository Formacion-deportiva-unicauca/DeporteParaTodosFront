export interface MisCursosHorarioDTO {
  id: number;
  categoria: string;
  curso: string;
  anio: number;
  iterable: number;
  dia: string;
  horaInicio: string;
  horaFin: string;
  escenario: string | null;
}

export interface MiCursoDTO {
  categoria: string;
  curso: string;
  anio: number;
  iterable: number;
  periodo: number;
  estado: 'INSCRITO' | 'EN_ESPERA';
  nombreInstructor: string | null;
  grupoActivo: boolean;
  horarios: MisCursosHorarioDTO[];
  /** Fecha de finalización del grupo (yyyy-MM-dd); null o ausente si no tiene: se trata como vigente. */
  fechaFinalizacion?: string | null;
}

export interface MiGrupoInstructorDTO {
  categoria: string;
  curso: string;
  anio: number;
  iterable: number;
  periodo: number;
  cupos: number | null;
  estadoCurso: 'ACTIVO' | 'INACTIVO';
  estadoInscripciones: 'ABIERTO' | 'CERRADO';
  inscritos: number;
  enEspera: number;
  horarios: MisCursosHorarioDTO[];
  /** La clase de hoy fue marcada como no realizada (novedad activa); null o ausente si se dicta normalmente. */
  novedadHoy?: NovedadHoyDTO | null;
}

/** Novedad activa de hoy de un grupo, tal como la devuelve "Cursos a mi cargo". */
export interface NovedadHoyDTO {
  codigo: number;
  fecha: string; // yyyy-MM-dd
  motivo: string;
  descripcion: string | null;
}

/** Curso del alumno con el nombre del instructor ya normalizado y su código (resuelto por nombre; null si no se encuentra). */
export interface FilaMisCursos extends MiCursoDTO {
  instructorNombre: string | null;
  instructorCodigo: string | null;
}
