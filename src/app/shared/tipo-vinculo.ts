import { PerfilDTO } from '../Models/DTOs/perfil-tdo';

/**
 * Tipos de vínculo con la Universidad. El rol (Alumno, Instructor…) define qué puede hacer en el sistema;
 * el tipo de vínculo define quién es la persona y qué datos se le piden.
 * Los tres últimos son "Funcionarios" en el formulario de inscripción de 2026-2.
 */
export const TIPOS_VINCULO: string[] = ['Estudiante', 'Docente', 'Administrativo', 'Contratista'];

type Tipo = string | null | undefined;

/** Solo el Estudiante tiene código institucional. */
export function requiereCodigo(tipo: Tipo): boolean {
  return tipo === 'Estudiante';
}

/** Estudiante y Docente pertenecen a una facultad y a un programa académico. */
export function requiereFacultadYPrograma(tipo: Tipo): boolean {
  return tipo === 'Estudiante' || tipo === 'Docente';
}

/** Administrativo y Contratista indican la dependencia, oficina o unidad donde trabajan. */
export function requiereDependencia(tipo: Tipo): boolean {
  return tipo === 'Administrativo' || tipo === 'Contratista';
}

/** Deja solo los datos que corresponden al tipo de vínculo, igual que lo hace el backend al registrar. */
export function datosSegunTipo(perfil: PerfilDTO): PerfilDTO {
  const tipo = perfil.tipoAlumno;
  const conFacultad = requiereFacultadYPrograma(tipo);
  return {
    ...perfil,
    alumnoCodigo: requiereCodigo(tipo) ? perfil.alumnoCodigo : '',
    facultad: conFacultad ? perfil.facultad : '',
    programa: conFacultad ? perfil.programa ?? '' : '',
    dependencia: requiereDependencia(tipo) ? perfil.dependencia ?? '' : '',
  };
}
