import { MisCursosHorarioDTO } from '../Models/DTOs/mis-cursos-dto';
import { DIAS_SEMANA } from './ventana-registro.util';

/** "Miércoles" / "MIERCOLES" / "miércoles " → "MIERCOLES": se compara sin tildes, sin mayúsculas y sin espacios. */
export function normalizarDia(dia: string | null | undefined): string {
  return (dia ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}

/** Los horarios de un grupo que caen en el día de la semana de `hoy`, de la franja más temprana a la más tardía. */
export function horariosDeHoy(horarios: MisCursosHorarioDTO[] | null | undefined, hoy: Date = new Date()): MisCursosHorarioDTO[] {
  const dia = DIAS_SEMANA[hoy.getDay()];
  return (horarios ?? [])
    .filter(h => normalizarDia(h.dia) === dia)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
}

/** Nombre del día de `hoy` en español, con mayúscula inicial ("Miércoles"). */
export function nombreDiaDeHoy(hoy: Date = new Date()): string {
  const dia = new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(hoy);
  return dia.charAt(0).toUpperCase() + dia.slice(1);
}
