import { FiltrosReporte, ReporteMensualDTO } from '../Models/DTOs/reporte-mensual-dto';
import { filtrosEnTexto, formatoNumero, nombrePublico } from './reporte-mensual.util';

/** Contenido del PDF del reporte mensual (puro): el mismo que se ve en pantalla, con los filtros aplicados y la fecha de generación. */
export interface ContenidoExportable {
  titulo: string;
  generado: string;
  filtros: string[];
  cabecera: string[];
  filas: string[][];
  pie: string[];
  vinculos: string[][];
  notas: string[];
}

export function contenidoExportable(reporte: ReporteMensualDTO, filtros: FiltrosReporte, generado: string): ContenidoExportable {
  const n = formatoNumero;
  const t = reporte.totales;
  return {
    titulo: 'Reporte mensual · Deporte para Todos',
    generado,
    filtros: filtrosEnTexto(filtros).map(f => `${f.nombre}: ${f.valor}`),
    cabecera: ['Modalidad', 'Curso', 'Público', 'Inscritos H', 'Inscritas M', 'Inscritos total', 'Atenciones H', 'Atenciones M', 'Atenciones total'],
    filas: reporte.filas.map(f => [f.modalidad, f.curso, nombrePublico(f.publico), n(f.inscritosHombres), n(f.inscritosMujeres),
      n(f.inscritosTotal), n(f.atencionesHombres), n(f.atencionesMujeres), n(f.atencionesTotal)]),
    pie: ['Total', '', '', n(t?.inscritosHombres), n(t?.inscritosMujeres), n(t?.inscritosTotal), n(t?.atencionesHombres),
      n(t?.atencionesMujeres), n(t?.atencionesTotal)],
    vinculos: reporte.porVinculo.map(v => [v.vinculo, n(v.inscritos), n(v.atenciones)]),
    notas: [
      `Personas distintas atendidas: ${n(t?.personasDistintasAtendidas)} · personas distintas inscritas: ${n(t?.personasDistintasInscritas)} (no se suman entre cursos).`,
      `Calidad: ${n(reporte.calidad?.clasesSinConfirmar)} clases sin confirmar · ${n(reporte.calidad?.atencionesSinInscripcion)} atenciones de personas sin inscripción en el grupo.`,
      'Atención = una asistencia presente de una persona a una sesión de un grupo. Inscritos = inscritos en algún momento del mes (sin lista de espera).',
    ],
  };
}
