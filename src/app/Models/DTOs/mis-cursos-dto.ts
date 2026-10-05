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
}
