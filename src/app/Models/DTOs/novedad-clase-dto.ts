/** DTO de respuesta de una novedad de clase no realizada. */
export interface NovedadClaseDto {
  codigo: number;
  categoria: string;
  curso: string;
  anio: number;
  iterable: number;
  fecha: string;        // yyyy-MM-dd
  motivo: string;       // CLIMA | INSTRUCTOR | ESCENARIO | ACTIVIDAD_UNIV | OTRO
  descripcion: string | null;
  estado: string;       // 'NO_REALIZADA'
  idUsuarioCreador: string;
  fechaCreacion: string;
  idUsuarioModificador: string | null;
  fechaModificacion: string | null;
  version: number;
}

/** Cuerpo de petici�n para registrar/actualizar una novedad de clase no realizada. */
export interface NovedadClaseRequestDto {
  categoria: string;
  curso: string;
  anio: number;
  iterable: number;
  fecha: string;        // yyyy-MM-dd
  motivo: string;       // CLIMA | INSTRUCTOR | ESCENARIO | ACTIVIDAD_UNIV | OTRO
  descripcion?: string | null;
}

/** Cat�logo provisional de motivos (sujeto a validaci�n institucional). */
export const MOTIVOS_NOVEDAD: { codigo: string; nombre: string; requiereDescripcion: boolean }[] = [
  { codigo: 'CLIMA', nombre: 'Condiciones climáticas', requiereDescripcion: false },
  { codigo: 'INSTRUCTOR', nombre: 'Instructor no disponible', requiereDescripcion: false },
  { codigo: 'ESCENARIO', nombre: 'Escenario no disponible', requiereDescripcion: false },
  { codigo: 'ACTIVIDAD_UNIV', nombre: 'Actividad universitaria', requiereDescripcion: false },
  { codigo: 'OTRO', nombre: 'Otro motivo', requiereDescripcion: true },
];

/** Código de error del backend cuando una clase no puede tener a la vez novedad y asistencia (HTTP 409). */
export const CODIGO_NOVEDAD_ASISTENCIA = 'GC-0032';

export const MENSAJE_CLASE_NO_REALIZADA = 'Esta clase fue marcada como no realizada. No se puede registrar asistencia para esa fecha.';

/** Qué decirle al usuario ante un 409 al registrar una novedad: ya hay novedad (duplicada) o ya hay asistencia ese día. */
export function mensajeConflictoNovedad(codigoError: string | null | undefined): string {
  return codigoError === CODIGO_NOVEDAD_ASISTENCIA
    ? 'No se puede marcar como no realizada: ya hay personas con asistencia en esta fecha.'
    : 'Ya existe una novedad registrada para este grupo en esta fecha.';
}

export function motivoRequiereDescripcion(motivo: string): boolean {
  const m = MOTIVOS_NOVEDAD.find(mot => mot.codigo === motivo);
  return m ? m.requiereDescripcion : false;
}

export function motivoNombre(motivo: string): string {
  const m = MOTIVOS_NOVEDAD.find(mot => mot.codigo === motivo);
  return m ? m.nombre : motivo;
}
