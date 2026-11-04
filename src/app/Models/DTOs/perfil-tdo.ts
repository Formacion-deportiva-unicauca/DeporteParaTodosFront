export interface PerfilDTO{
    id: number;
    nombre: string;
    correo: string;
    tipoId: string;
    sexo: string;
    facultad: string;
    tipoAlumno: string;
    role: string;
    alumnoCodigo: string;
    /** Estudiante y Docente: programa académico (la facultad se deriva de él). */
    programa?: string;
    /** Administrativo y Contratista: dependencia, oficina o unidad. */
    dependencia?: string;
}