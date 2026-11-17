import { MiCursoDTO } from '../Models/DTOs/mis-cursos-dto';
import { letraDeIterable } from './iterable-letra.util';

/**
 * Aviso previo de cruce de horarios. El backend sigue siendo la autoridad (responde 422 GC-0031); esto solo informa antes de
 * intentar y debe dar el mismo resultado que su regla, con una salvedad: ante un dato dudoso NO avisa (es mejor no avisar que
 * avisar de más).
 *
 * Franja = (día, inicio, fin) como intervalo semiabierto [inicio, fin): hay cruce entre dos franjas del MISMO día si
 * inicioA < finB && inicioB < finA. Si una termina justo cuando empieza la otra NO hay cruce.
 */

/** Lo mínimo que se necesita de un horario (sirve tanto para HorarioDTO como para MisCursosHorarioDTO). */
export interface FranjaHorario {
  dia?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
}

/** El grupo al que la persona quiere inscribirse. Sin periodo, año u horarios cargados no se calcula nada. */
export interface GrupoDestinoCruce {
  categoria?: string | null;
  curso?: string | null;
  anio?: number | null;
  iterable?: number | null;
  periodo?: number | null;
  /** undefined = aún no cargaron (no se avisa); [] = sin horario (no hay con qué cruzar). */
  horarios?: FranjaHorario[] | null;
}

export interface CruceHorario {
  curso: string;
  iterable: number;
  /** "Se cruza con Acondicionamiento Físico, grupo A, lunes 18:00-19:30": el mismo texto que el backend. */
  texto: string;
}

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const DIAS_VISIBLES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const HORA = /^\d{1,2}:\d{2}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}/;
const ZONA_BOGOTA = 'America/Bogota';

interface Franja { dia: number; inicio: number; fin: number }

/** Fecha de "hoy" (yyyy-MM-dd) en Bogotá, no la del navegador: a las 19:00 de Bogotá en UTC ya es "mañana". */
export function hoyEnBogota(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_BOGOTA, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(ahora);
  const valor = (tipo: string): string => partes.find(p => p.type === tipo)?.value ?? '';
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

/** Franja normalizada, o null si el día no es de la semana, una hora está mal formada o fin <= inicio (dato dudoso: se ignora). */
export function normalizarFranja(h: FranjaHorario | null | undefined): Franja | null {
  if (!h) return null;
  const clave = (h.dia ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  const dia = DIAS.indexOf(clave);
  const inicio = minutos(h.horaInicio);
  const fin = minutos(h.horaFin);
  if (dia < 0 || inicio === null || fin === null || fin <= inicio) return null;
  return { dia, inicio, fin };
}

function minutos(hora: string | null | undefined): number | null {
  const limpia = (hora ?? '').trim();
  if (!HORA.test(limpia)) return null;
  const [h, m] = limpia.split(':').map(Number);
  return h > 23 || m > 59 ? null : h * 60 + m;
}

function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** Vigente = sin fecha de finalización (null o ausente) o con fecha de hoy o posterior; "hoy" ya viene en Bogotá. */
function vigente(fechaFinalizacion: string | null | undefined, hoy: string): boolean {
  if (!fechaFinalizacion || !FECHA.test(fechaFinalizacion)) return true;
  return fechaFinalizacion.substring(0, 10) >= hoy;
}

function esElMismoGrupo(destino: GrupoDestinoCruce, c: MiCursoDTO): boolean {
  return c.categoria === destino.categoria && c.curso === destino.curso && c.anio === destino.anio && c.iterable === destino.iterable;
}

/**
 * Primer cruce entre el grupo destino y las inscripciones del Alumno, o null si no hay (o no se puede saber).
 * Cuentan solo las filas INSCRITO, con grupoActivo distinto de false, del mismo año y periodo que el destino y cuyo grupo no
 * terminó (fechaFinalizacion null o >= hoy en Bogotá). EN_ESPERA no cuenta y el propio grupo destino se excluye.
 * Con varios cruces se devuelve siempre el mismo, sin importar el orden de entrada: categoría, curso, grupo, día, inicio, fin.
 */
export function primerCruce(destino: GrupoDestinoCruce, misCursos: MiCursoDTO[] | null | undefined,
  hoy: string = hoyEnBogota()): CruceHorario | null {
  if (destino.anio == null || destino.periodo == null || !destino.horarios || !misCursos) return null;
  const franjasDestino = destino.horarios.map(normalizarFranja).filter((f): f is Franja => f !== null);
  if (franjasDestino.length === 0) return null;

  const cruces: { categoria: string; curso: string; iterable: number; franja: Franja }[] = [];
  for (const c of misCursos) {
    if (c.estado !== 'INSCRITO' || c.grupoActivo === false || c.anio !== destino.anio || c.periodo !== destino.periodo
      || !vigente(c.fechaFinalizacion, hoy) || esElMismoGrupo(destino, c)) continue;
    for (const h of c.horarios ?? []) {
      const otra = normalizarFranja(h);
      if (otra && franjasDestino.some(f => f.dia === otra.dia && f.inicio < otra.fin && otra.inicio < f.fin)) {
        cruces.push({ categoria: c.categoria, curso: c.curso, iterable: c.iterable, franja: otra });
      }
    }
  }
  if (cruces.length === 0) return null;

  const comparar = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  cruces.sort((a, b) => comparar(a.categoria, b.categoria) || comparar(a.curso, b.curso) || a.iterable - b.iterable
    || a.franja.dia - b.franja.dia || a.franja.inicio - b.franja.inicio || a.franja.fin - b.franja.fin);
  const { curso, iterable, franja } = cruces[0];
  return {
    curso,
    iterable,
    texto: `Se cruza con ${curso}, grupo ${letraDeIterable(iterable)}, ${DIAS_VISIBLES[franja.dia]} ${hhmm(franja.inicio)}-${hhmm(franja.fin)}`,
  };
}
