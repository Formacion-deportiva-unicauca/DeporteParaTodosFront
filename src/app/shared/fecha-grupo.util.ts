import { GrupoDTO } from '../Models/DTOs/grupo-dto';

/**
 * Utilidades de PRESENTACIÓN de la ventana de inscripción de un grupo.
 * Regla: la decisión de si se puede inscribir la toma el backend (inscripcionesAbiertas);
 * estas funciones nunca usan el reloj del navegador. Las fechas solo se muestran.
 * El formato se hace por manipulación de texto: new Date('yyyy-MM-dd') / DatePipe desfasan un día por zona horaria.
 */

/** 'yyyy-MM-dd' (con o sin hora) → 'dd/MM/yyyy'; vacío si no es una fecha válida. */
export function formatearFecha(valor: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function textoVentanaInscripcion(apertura?: string | null, cierre?: string | null): string {
  const desde = formatearFecha(apertura);
  const hasta = formatearFecha(cierre);
  if (desde && hasta) return `Inscripciones desde ${desde} hasta ${hasta}`;
  if (hasta) return `Inscripciones abiertas hasta ${hasta}`;
  if (desde) return `Inscripciones desde ${desde}, sin fecha de cierre`;
  return 'Sin fecha de cierre';
}

/** undefined (backend sin el campo) se trata como abierto. */
export function inscripcionesAbiertasDeGrupo(g: Pick<GrupoDTO, 'inscripcionesAbiertas'> | null | undefined): boolean {
  return g?.inscripcionesAbiertas !== false;
}

/** Etiqueta corta para la tarjeta; null si el grupo está abierto. */
export function etiquetaInscripcionGrupo(g: GrupoDTO | null | undefined): string | null {
  if (inscripcionesAbiertasDeGrupo(g)) return null;
  if (g?.motivoInscripcion === 'NO_ABIERTAS') {
    const desde = formatearFecha(g.fechaInscripcionApertura);
    return desde ? `Abren el ${desde}` : 'Inscripciones aún no abiertas';
  }
  const hasta = formatearFecha(g?.fechaIncripcionCierre);
  return hasta ? `Cerraron el ${hasta}` : 'Inscripciones cerradas';
}

/** Aviso completo para la pantalla de inscripción; null si el grupo está abierto. */
export function avisoInscripcionGrupo(g: GrupoDTO | null | undefined): string | null {
  if (inscripcionesAbiertasDeGrupo(g)) return null;
  if (g?.motivoInscripcion === 'NO_ABIERTAS') {
    const desde = formatearFecha(g.fechaInscripcionApertura);
    return desde ? `Las inscripciones de este grupo abren el ${desde}` : 'Las inscripciones de este grupo aún no están abiertas';
  }
  const hasta = formatearFecha(g?.fechaIncripcionCierre);
  return hasta ? `Las inscripciones de este grupo cerraron el ${hasta}` : 'Las inscripciones de este grupo están cerradas';
}
