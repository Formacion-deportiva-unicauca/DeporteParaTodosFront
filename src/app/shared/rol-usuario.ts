import { TIPOS_VINCULO } from './tipo-vinculo';

/**
 * Lo que ve el usuario sobre quién es. El rol del sistema (Alumno, Instructor, Coordinador) define qué puede hacer;
 * a las personas con rol Alumno se les muestra su tipo de vínculo con la Universidad (Estudiante, Docente,
 * Administrativo o Contratista), nunca la palabra "Alumno".
 */
export function etiquetaRol(rol: string | null | undefined, tipoVinculo?: string | null): string {
  if (!rol) {
    return '';
  }
  if (rol === 'Alumno') {
    return tipoVinculo && TIPOS_VINCULO.includes(tipoVinculo) ? tipoVinculo : 'Usuario';
  }
  return rol;
}

/** Tipo de vínculo del perfil guardado en la sesión al iniciar sesión (campo tipoAlumno), o null. */
export function leerTipoVinculoGuardado(): string | null {
  try {
    const crudo = sessionStorage.getItem('dpt_perfil');
    return crudo ? (JSON.parse(crudo).tipoAlumno ?? null) : null;
  } catch {
    return null;
  }
}

/** Título del panel lateral según el rol y, para Alumno, el tipo de vínculo. */
export function tituloPanel(rol: string | null | undefined, tipoVinculo?: string | null): string {
  if (rol === 'Coordinador') {
    return 'Panel de coordinación';
  }
  if (rol === 'Instructor') {
    return 'Panel del instructor';
  }
  if (rol === 'Alumno') {
    return `Panel del ${etiquetaRol(rol, tipoVinculo).toLowerCase()}`;
  }
  return '';
}

/** Mensaje de bienvenida del inicio: cada rol ve lo que puede hacer en el sistema. */
export function descripcionInicio(rol: string | null | undefined): string {
  switch (rol) {
    case 'Coordinador':
      return 'Administre las categorías deportivas e ingrese a la información de cada programa desde este panel.';
    case 'Instructor':
      return 'Gestione la asistencia y consulte la información de los cursos a su cargo desde Mis cursos.';
    case 'Alumno':
      return 'Consulte sus cursos desde Mis cursos e inscríbase en las categorías deportivas.';
    default:
      return 'Consulte las categorías deportivas e ingrese a la información de cada programa.';
  }
}
