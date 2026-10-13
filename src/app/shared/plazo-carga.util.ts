import { EstadoReporte, PlazoCargaDTO } from '../Models/DTOs/plazo-carga-dto';
import { formatearFecha } from './fecha-grupo.util';

/**
 * Presentación del plazo de carga de atenciones de un instructor.
 * El estado (SIN_PLAZO, PENDIENTE, VENCIDO, GENERADO) y plazoVencido los calcula el backend; aquí solo se muestran.
 * Las fechas se formatean por texto (fecha-grupo.util): sin Date ni zona horaria.
 */
export type EstadoPlazo = Pick<PlazoCargaDTO, 'estadoReporte' | 'fechaLimite' | 'plazoVencido'>;

export function textoReporte(p: EstadoPlazo): string {
  const fecha = formatearFecha(p.fechaLimite);
  switch (p.estadoReporte) {
    case 'SIN_PLAZO': return 'Sin plazo';
    case 'PENDIENTE': return fecha ? `Pendiente · hasta ${fecha}` : 'Pendiente';
    case 'VENCIDO': return fecha ? `Vencido · límite ${fecha}` : 'Vencido';
    case 'GENERADO': return p.plazoVencido ? 'Generado · plazo cerrado' : 'Generado';
  }
}

/** Un icono distinto por estado: el estado nunca se comunica solo con color. */
export function iconoReporte(estado: EstadoReporte): string {
  switch (estado) {
    case 'SIN_PLAZO': return 'remove_circle_outline';
    case 'PENDIENTE': return 'schedule';
    case 'VENCIDO': return 'error_outline';
    case 'GENERADO': return 'check_circle';
  }
}

export function textoBotonPlazo(p: EstadoPlazo): string {
  if (p.estadoReporte === 'SIN_PLAZO') return 'Asignar plazo';
  if (p.plazoVencido) return 'Ampliar plazo';
  return 'Cambiar plazo';
}

/** Aviso sobre la tabla; null si todos generaron su reporte. El periodo se toma del primer elemento. */
export function textoAvisoReportes(plazos: PlazoCargaDTO[]): string | null {
  const sinReporte = plazos.filter(p => p.estadoReporte !== 'GENERADO');
  const n = sinReporte.length;
  if (n === 0) return null;
  const vencidos = sinReporte.filter(p => p.plazoVencido).length;
  const { anio, periodo } = plazos[0];
  const base = n === 1
    ? `1 instructor aún no ha generado su reporte del periodo ${anio}-${periodo}`
    : `${n} instructores aún no han generado su reporte del periodo ${anio}-${periodo}`;
  return vencidos > 0 ? `${base} (${vencidos} con plazo vencido)` : base;
}
