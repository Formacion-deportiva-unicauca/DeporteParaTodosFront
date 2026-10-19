import { HorarioDTO } from '../Models/DTOs/horario-dto';
import { formatoLocal } from './fecha-grupo.util';

/**
 * Ventana de registro de asistencia y datos del horario del día (SCRUM-80 rediseñado).
 *
 * `hoyTexto` recibe la hora como parámetro: quien la llama decide de dónde sale (la pantalla usa ahora(), el reloj del
 * navegador, y luego podrá ser un dato del servidor). El servidor es la autoridad: responde 422 si el día no corresponde.
 */
export interface FranjaDia {
  texto: string;          // "2:00 p. m. a 4:00 p. m. (2 h)"
  horas: number;
  minutos: number;
  minutosTotales: number;
}

/** Nombres de HR_DIA en tbl_horario: sin tildes, indexados como Date.getDay() (0 = domingo). */
export const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

/** Hoy en texto yyyy-MM-dd (hora local del navegador). */
export function hoyTexto(hoy: Date = new Date()): string {
  return formatoLocal(hoy);
}

/** Día de la semana de una fecha yyyy-MM-dd, sin tildes y sin depender de la zona horaria (cálculo en UTC). */
export function diaSemanaSinTildes(fecha: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha ?? '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return DIAS_SEMANA[d.getUTCDay()];
}

/** '14:00' o '14:00:00' → '2:00 p. m.'. */
export function formatoHora12(hora: string): string {
  const [hh, mm] = hora.split(':').map(n => parseInt(n, 10));
  const sufijo = hh >= 12 ? 'p. m.' : 'a. m.';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${sufijo}`;
}

/** 120 → '2 h'; 90 → '1 h 30 min'; 45 → '45 min'. */
export function textoDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h > 0 && m > 0) return `${h} h ${m} min`;
  return h > 0 ? `${h} h` : `${m} min`;
}

const aMinutos = (hora: string): number => {
  const [hh, mm] = hora.split(':').map(n => parseInt(n, 10));
  return hh * 60 + mm;
};

const sinTildes = (s: string): string =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

/**
 * Franja(s) del grupo para el día de la fecha elegida; null si no hay. Con varias franjas el mismo día se suman.
 * Es informativo: la duración real la calcula el servidor desde el horario del grupo.
 */
export function franjaDelDia(horarios: HorarioDTO[] | null | undefined, fecha: string): FranjaDia | null {
  const dia = diaSemanaSinTildes(fecha);
  if (!dia || !horarios) return null;
  const franjas = horarios
    .filter(h => h.eliminado !== 1 && sinTildes(h.dia) === dia)
    .map(h => ({ inicio: h.horaInicio, fin: h.horaFin, minutos: aMinutos(h.horaFin) - aMinutos(h.horaInicio) }))
    .filter(f => f.minutos > 0);
  if (franjas.length === 0) return null;
  const total = franjas.reduce((suma, f) => suma + f.minutos, 0);
  const rangos = franjas.map(f => `${formatoHora12(f.inicio)} a ${formatoHora12(f.fin)}`).join(' y ');
  return { texto: `${rangos} (${textoDuracion(total)})`, horas: Math.floor(total / 60), minutos: total % 60, minutosTotales: total };
}

/** Duración manual de una clase fuera de horario: horas 0-12, minutos 0-59, total > 0 y <= 12 h. */
export function duracionManualValida(horas: number | null, minutos: number | null): boolean {
  if (horas === null || minutos === null || !Number.isInteger(horas) || !Number.isInteger(minutos)) return false;
  if (horas < 0 || horas > 12 || minutos < 0 || minutos > 59) return false;
  const total = horas * 60 + minutos;
  return total > 0 && total <= 720;
}

// ── Restricción de días para el Instructor (corrección SCRUM-80) ────────────

/** Solo el Coordinador puede registrar un día sin clase; Instructor, Administrador y el resto, solo los días del horario. */
export function esRolSinRestriccion(rol: string): boolean {
  return rol === 'Coordinador';
}

const ORDEN_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const NOMBRE_LECTURA: Record<string, string> = {
  LUNES: 'lunes', MARTES: 'martes', MIERCOLES: 'miércoles', JUEVES: 'jueves', VIERNES: 'viernes', SABADO: 'sábados', DOMINGO: 'domingos',
};

/** Días de la semana (sin tildes, de lunes a domingo, sin repetir) en los que el grupo tiene alguna franja válida. */
export function diasConClase(horarios: HorarioDTO[] | null | undefined): string[] {
  const dias = new Set<string>();
  for (const h of horarios ?? []) {
    if (h.eliminado !== 1 && aMinutos(h.horaFin) - aMinutos(h.horaInicio) > 0) dias.add(sinTildes(h.dia));
  }
  return ORDEN_SEMANA.filter(d => dias.has(d));
}

/** "Este grupo tiene clases los martes y jueves"; cadena vacía si el grupo no tiene horario. */
export function textoDiasDeClase(horarios: HorarioDTO[] | null | undefined): string {
  const nombres = diasConClase(horarios).map(d => NOMBRE_LECTURA[d]);
  if (nombres.length === 0) return '';
  const lista = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  return `Este grupo tiene clases los ${lista}`;
}
