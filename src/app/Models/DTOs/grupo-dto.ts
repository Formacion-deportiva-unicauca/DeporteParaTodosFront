import { HorarioDTO } from "./horario-dto";
export interface GrupoDTO {
  categoria: string;
  curso: string;
  anio: number | null;
  iterable: number | null;
  periodo?: number | null;
  imagenGrupo?: number | null;
  idInstructor?: string | null;
  nombreInstructor?: string | null;
  cupos: number;
  fechaCreacion: string | null;
  fechaFinalizacion?: string | null;
  fechaInscripcionApertura?: string | null;
  fechaIncripcionCierre?: string | null;
  imagenBase64?: string | null;
  tipoArchivo?: string | null;
  horarios?: HorarioDTO[];
  // Solo de SALIDA (calculados por el backend); nunca se envían en POST/PUT /grupo
  inscripcionesAbiertas?: boolean;
  motivoInscripcion?: 'ABIERTAS' | 'NO_ABIERTAS' | 'CERRADAS';
}
