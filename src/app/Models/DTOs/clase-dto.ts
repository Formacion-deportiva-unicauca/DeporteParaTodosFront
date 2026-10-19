export interface ClaseDTO {
codigo: number;
idGrupoCategoria:string;
idGrupoCurso: string;
idGrupoAnio: number;
idGrupoIterable: number;
idInstructor: string;
fecha: string;
horas: number;
minutos: number;
observacion: string;
justificacion?: string | null;   // 10-500 caracteres; solo para una clase fuera del horario del grupo
eliminado: number;
}