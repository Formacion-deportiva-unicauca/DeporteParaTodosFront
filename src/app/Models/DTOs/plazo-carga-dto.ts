export type EstadoReporte = 'SIN_PLAZO' | 'PENDIENTE' | 'VENCIDO' | 'GENERADO';

/** Plazo de carga de atenciones de un instructor para el periodo vigente (calculado por el backend). */
export interface PlazoCargaDTO {
  idInstructor: string;
  anio: number;
  periodo: number;
  fechaLimite: string | null;   // yyyy-MM-dd
  estadoReporte: EstadoReporte;
  plazoVencido: boolean;
  clasesConAsistencia: number;
}
