/** Un alumno en la confirmación de asistencia de una clase (PUT /clase/{codigo}/asistencia). */
export interface ItemConfirmacionAsistenciaDTO {
  idPerfil: string;
  estaAtendido: boolean;
}

/**
 * Cuerpo de la confirmación. El backend marca ausente a quien no venga con estaAtendido=true, así que se envía la lista completa.
 * confirmaTodosAusentes solo se envía en true, tras la confirmación explícita del usuario, cuando nadie asistió.
 */
export interface ConfirmacionAsistenciaRequestDTO {
  asistencias: ItemConfirmacionAsistenciaDTO[];
  confirmaTodosAusentes?: boolean;
}

export interface ConfirmacionAsistenciaDTO {
  codigoClase: number;
  confirmadaEn: string;
  presentes: number;
  ausentes: number;
}
