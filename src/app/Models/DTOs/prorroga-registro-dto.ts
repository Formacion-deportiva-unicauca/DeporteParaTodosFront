/** Cuerpo del PUT /instructores/prorroga-registro: asigna (o quita con dias = 0) la prórroga a varios instructores. */
export interface ProrrogaRequestDTO {
  idsInstructores: string[];
  anio: number;
  mes: number;    // 1-12
  dias: number;   // 0-60; 0 quita la prórroga
}

/** Prórroga vigente de un instructor en un mes (la fecha límite la calcula el backend). */
export interface ProrrogaDTO {
  idInstructor: string;
  dias: number;
  fechaLimite: string | null;   // yyyy-MM-dd; null cuando dias = 0
}
