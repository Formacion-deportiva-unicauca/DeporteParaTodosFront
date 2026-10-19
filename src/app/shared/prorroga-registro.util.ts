import { ProrrogaDTO } from '../Models/DTOs/prorroga-registro-dto';
import { formatearFecha } from './fecha-grupo.util';

/**
 * Prórroga del registro de asistencia (SCRUM-80 rediseñado): el Coordinador asigna días de prórroga por instructor y
 * por mes. La fecha límite la calcula el backend; aquí solo se arman textos y la lista de meses de la interfaz.
 */
export interface MesRegistro {
  anio: number;
  mes: number;       // 1-12
  valor: string;     // 'yyyy-M', identifica la opción del selector
  etiqueta: string;  // 'octubre de 2026'
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function etiquetaMes(anio: number, mes: number): string {
  return `${MESES[mes - 1]} de ${anio}`;
}

/** Los últimos `cantidad` meses a partir de `hoy` (incluido): el actual primero y hacia atrás. */
export function ultimosMeses(hoy: Date, cantidad = 12): MesRegistro[] {
  const resultado: MesRegistro[] = [];
  let anio = hoy.getFullYear();
  let mes = hoy.getMonth() + 1;
  for (let i = 0; i < cantidad; i++) {
    resultado.push({ anio, mes, valor: `${anio}-${mes}`, etiqueta: etiquetaMes(anio, mes) });
    mes--;
    if (mes === 0) {
      mes = 12;
      anio--;
    }
  }
  return resultado;
}

/**
 * Meses que ofrece el selector. ÚNICO punto que usa el reloj del navegador: es solo una ayuda de interfaz
 * (el servidor es la autoridad y responde 422 si el mes es futuro). Aislado aquí para poder reemplazarlo
 * por un dato del servidor más adelante.
 */
export function mesesDisponibles(): MesRegistro[] {
  return ultimosMeses(new Date());
}

/** 'yyyy-M' → año y mes numéricos; null si no es válido. */
export function parsearValorMes(valor: string): { anio: number; mes: number } | null {
  const m = /^(\d{4})-(\d{1,2})$/.exec(valor ?? '');
  if (!m) return null;
  const mes = +m[2];
  return mes >= 1 && mes <= 12 ? { anio: +m[1], mes } : null;
}

/** Texto del snackbar tras guardar. */
export function textoResultadoProrroga(respuesta: ProrrogaDTO[]): string {
  if (respuesta.length > 0 && respuesta.every(p => p.dias === 0)) return 'Prórroga quitada';
  const n = respuesta.length;
  return `Prórroga asignada a ${n} ${n === 1 ? 'instructor' : 'instructores'}`;
}

/** "10 días · hasta 10/11/2026" o "Sin prórroga". La fecha se formatea por texto (sin Date ni zona horaria). */
export function textoProrrogaVigente(p: ProrrogaDTO | undefined): string {
  if (!p || p.dias === 0) return 'Sin prórroga';
  const fecha = formatearFecha(p.fechaLimite);
  const dias = `${p.dias} ${p.dias === 1 ? 'día' : 'días'}`;
  return fecha ? `${dias} · hasta ${fecha}` : dias;
}
