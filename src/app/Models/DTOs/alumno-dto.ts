export interface AlumnoDTO {
    eliminadoestado?: number;
    id: number;
    codigo:string;
    tipo: string;
    nombre: string;
    correo: string;
    sexo: string;
    tipoid: string;
    imagen: number;
    /** Total de faltas acumuladas del alumno en el grupo (solo en GET /alumnosGrupo; lo calcula el backend). */
    faltas?: number;
}