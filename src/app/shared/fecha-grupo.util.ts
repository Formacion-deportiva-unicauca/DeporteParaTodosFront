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

/**
 * Conversión entre el texto 'yyyy-MM-dd' y el Date que usa el calendario de Material, siempre en hora LOCAL:
 * new Date('yyyy-MM-dd') se interpreta como UTC y desfasa un día, y toISOString() también.
 */
export function aDateLocal(valor: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

export function formatoLocal(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Fecha en texto largo en español ("domingo, 1 de noviembre de 2026"), para anunciarla a lectores de pantalla. */
export function fechaLarga(valor: string | null | undefined): string {
  const d = aDateLocal(valor);
  return d ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'full' }).format(d) : '';
}
