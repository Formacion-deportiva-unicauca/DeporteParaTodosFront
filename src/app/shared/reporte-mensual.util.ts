import { FiltrosReporte, FilaReporteDTO, ReporteMensualDTO } from '../Models/DTOs/reporte-mensual-dto';

/** Reglas de presentación del reporte mensual (funciones puras, sin Angular): formato es-CO, meses, estados y datos de gráficos. */

const ZONA = 'America/Bogota';
const NUMERO = new Intl.NumberFormat('es-CO');
const PORCENTAJE = new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 1 });

export type Medida = 'atenciones' | 'inscritos';
export type EstadoVistaReporte = 'cargando' | 'sinPermiso' | 'error' | 'sinDatosDelMes' | 'vacioPorFiltros' | 'listo';

export const VINCULOS = ['Estudiante', 'Docente', 'Administrativo', 'Contratista'];
export const AVISO_FACULTAD = 'Administrativos y contratistas no tienen facultad registrada y no se incluyen';

export function formatoNumero(n: number | null | undefined): string {
  return NUMERO.format(n ?? 0);
}

/** 0,25 → "25 %": con 0 de total no hay porcentaje que mostrar. */
export function formatoPorcentaje(parte: number, total: number): string {
  return total > 0 ? PORCENTAJE.format(parte / total).replace(/\s?%/, ' %') : '—';
}

/** "2026-10" → "Octubre de 2026". */
export function etiquetaMes(mes: string): string {
  const [anio, m] = mes.split('-').map(Number);
  const texto = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(anio, m - 1, 1)));
  return texto.replace(/^(.)/, c => c.toUpperCase());
}

/** El mes de hoy en Bogotá, "yyyy-MM". */
export function mesActual(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit' }).formatToParts(ahora);
  const valor = (t: string): string => partes.find(p => p.type === t)?.value ?? '';
  return `${valor('year')}-${valor('month')}`;
}

function siguiente(mes: string): string {
  const [anio, m] = mes.split('-').map(Number);
  return m === 12 ? `${anio + 1}-01` : `${anio}-${String(m + 1).padStart(2, '0')}`;
}

function anterior(mes: string): string {
  const [anio, m] = mes.split('-').map(Number);
  return m === 1 ? `${anio - 1}-12` : `${anio}-${String(m - 1).padStart(2, '0')}`;
}

/** Meses del selector: desde el primer mes con datos hasta el mes actual, del más reciente al más antiguo. Sin datos, solo el actual. */
export function mesesDisponibles(primerMes: string | null, hoy: string = mesActual()): { valor: string; etiqueta: string }[] {
  const desde = primerMes && primerMes <= hoy ? primerMes : hoy;
  const meses: string[] = [];
  for (let m = desde; m <= hoy; m = siguiente(m)) meses.push(m);
  return meses.reverse().map(valor => ({ valor, etiqueta: etiquetaMes(valor) }));
}

/** Mes con el que abre el reporte: el anterior al actual si ya hay datos desde entonces; si no, el primero con datos (o el actual). */
export function mesInicial(primerMes: string | null, hoy: string = mesActual()): string {
  const previo = anterior(hoy);
  if (primerMes && primerMes <= previo) return previo;
  return primerMes && primerMes <= hoy ? primerMes : hoy;
}

export function filtrosVacios(mes: string): FiltrosReporte {
  return { mes, disciplina: '', modalidad: '', publico: '', vinculos: [], agruparFuncionarios: false, genero: '', facultad: '' };
}

/** Hay algún filtro distinto del mes. */
export function hayFiltros(f: FiltrosReporte): boolean {
  return !!(f.disciplina || f.modalidad || f.publico || f.vinculos.length || f.agruparFuncionarios || f.genero || f.facultad);
}

export function nombrePublico(publico: string | null | undefined): string {
  switch (publico) {
    case 'ESTUDIANTE': return 'Estudiantes';
    case 'FUNCIONARIO': return 'Funcionarios';
    case 'MIXTO': return 'Toda la comunidad';
    default: return 'Sin dato';
  }
}

export function nombreGenero(genero: string): string {
  return genero === 'M' ? 'Hombres' : genero === 'F' ? 'Mujeres' : genero;
}

/** Los filtros activos como texto legible, para las etiquetas de la pantalla y el encabezado del archivo exportado. */
export function filtrosEnTexto(f: FiltrosReporte): { nombre: string; valor: string }[] {
  const lista: { nombre: string; valor: string }[] = [{ nombre: 'Mes', valor: etiquetaMes(f.mes) }];
  if (f.disciplina) lista.push({ nombre: 'Disciplina', valor: f.disciplina });
  if (f.modalidad) lista.push({ nombre: 'Modalidad', valor: f.modalidad });
  if (f.publico) lista.push({ nombre: 'Público del curso', valor: nombrePublico(f.publico) });
  if (f.vinculos.length) lista.push({ nombre: 'Vínculo', valor: f.vinculos.join(', ') });
  if (f.agruparFuncionarios) lista.push({ nombre: 'Agrupado', valor: 'Funcionarios (docentes, administrativos y contratistas)' });
  if (f.genero) lista.push({ nombre: 'Género', valor: nombreGenero(f.genero) });
  if (f.facultad) lista.push({ nombre: 'Facultad', valor: f.facultad });
  return lista;
}

/** Estado de la pantalla a partir de lo que llegó (sin datos del mes ≠ filtros que no dejan nada). */
export function estadoDelReporte(reporte: ReporteMensualDTO, filtros: FiltrosReporte): EstadoVistaReporte {
  const sinNada = reporte.filas.length === 0
    && (reporte.totales?.atencionesTotal ?? 0) === 0 && (reporte.totales?.inscritosTotal ?? 0) === 0;
  if (!sinNada) return 'listo';
  return hayFiltros(filtros) ? 'vacioPorFiltros' : 'sinDatosDelMes';
}

export function valorDeFila(fila: FilaReporteDTO, medida: Medida): { hombres: number; mujeres: number; total: number } {
  return medida === 'atenciones'
    ? { hombres: fila.atencionesHombres, mujeres: fila.atencionesMujeres, total: fila.atencionesTotal }
    : { hombres: fila.inscritosHombres, mujeres: fila.inscritosMujeres, total: fila.inscritosTotal };
}

/** Barras agrupadas por curso: hombres y mujeres. */
export function datosBarrasPorCurso(reporte: ReporteMensualDTO, medida: Medida): { name: string; series: { name: string; value: number }[] }[] {
  return reporte.filas.map(f => {
    const v = valorDeFila(f, medida);
    return { name: f.curso, series: [{ name: 'Hombres', value: v.hombres }, { name: 'Mujeres', value: v.mujeres }] };
  });
}

export function datosDonaGenero(reporte: ReporteMensualDTO, medida: Medida): { name: string; value: number }[] {
  const t = reporte.totales;
  if (!t) return [];
  return medida === 'atenciones'
    ? [{ name: 'Hombres', value: t.atencionesHombres }, { name: 'Mujeres', value: t.atencionesMujeres }]
    : [{ name: 'Hombres', value: t.inscritosHombres }, { name: 'Mujeres', value: t.inscritosMujeres }];
}

export function datosBarrasPorVinculo(reporte: ReporteMensualDTO, medida: Medida): { name: string; value: number }[] {
  return reporte.porVinculo.map(v => ({ name: v.vinculo, value: medida === 'atenciones' ? v.atenciones : v.inscritos }));
}

/** Texto para lectores de pantalla de una gráfica: lo mismo que dice la tabla equivalente. */
export function resumenGrafica(datos: { name: string; value: number }[]): string {
  return datos.map(d => `${d.name}: ${formatoNumero(d.value)}`).join('; ');
}

/** Fecha y hora de generación del archivo, en Bogotá y formato colombiano. */
export function fechaDeGeneracion(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: ZONA }).format(ahora);
}
