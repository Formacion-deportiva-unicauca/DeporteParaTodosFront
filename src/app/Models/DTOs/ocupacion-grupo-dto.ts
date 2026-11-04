export type NivelOcupacion = 'LLENO' | 'POR_LLENAR' | 'CON_CUPO';
export type PublicoCurso = 'ESTUDIANTE' | 'FUNCIONARIO' | 'MIXTO';

/** Fila del tablero de ocupación del Coordinador (GET /grupo/ocupacion). Solo de salida. */
export interface OcupacionGrupoDTO {
  categoria: string;
  curso: string;
  anio: number;
  iterable: number;
  periodo: number;
  publico: PublicoCurso;
  cupos: number | null;
  inscritos: number;
  enEspera: number;
  nivel: NivelOcupacion;
  estadoInscripcion: 'ABIERTAS' | 'NO_ABIERTAS' | 'CERRADAS';
  cerradaManual: boolean;
  fechaApertura: string | null;
  fechaCierre: string | null;
}

export interface ClaveGrupoDTO {
  categoria: string;
  curso: string;
  anio: number;
  iterable: number;
}

/** Cuerpo del PATCH /grupo/periodo: apertura opcional (null conserva la de cada grupo), cierre obligatorio. */
export interface PeriodoInscripcionRequestDTO {
  fechaApertura: string | null;
  fechaCierre: string;
  grupos: ClaveGrupoDTO[];
}
