/** Respuesta de GET /api/v2/reportes/mensual (solo cifras agregadas; solo el Coordinador puede pedirla). */
export interface ReporteMensualDTO {
  anio: number;
  mes: number;
  filtros: FiltrosAplicadosDTO | null;
  filas: FilaReporteDTO[];
  totales: TotalesReporteDTO | null;
  porVinculo: PorVinculoDTO[];
  calidad: CalidadReporteDTO | null;
}

export interface FiltrosAplicadosDTO {
  disciplina: string | null;
  modalidad: string | null;
  publico: string | null;
  vinculos: string[];
  genero: string | null;
  facultad: string | null;
  agruparFuncionarios: boolean;
}

/** Una fila por curso, con su modalidad ya normalizada ("seleccionado " llega como "Seleccionado"). */
export interface FilaReporteDTO {
  modalidad: string;
  curso: string;
  disciplina: string | null;
  publico: string | null;
  inscritosHombres: number;
  inscritosMujeres: number;
  inscritosTotal: number;
  atencionesHombres: number;
  atencionesMujeres: number;
  atencionesTotal: number;
}

/** Los totales son la suma de las filas; las personas distintas vienen de una consulta aparte (no se suman). */
export interface TotalesReporteDTO {
  inscritosHombres: number;
  inscritosMujeres: number;
  inscritosTotal: number;
  atencionesHombres: number;
  atencionesMujeres: number;
  atencionesTotal: number;
  personasDistintasInscritas: number;
  personasDistintasAtendidas: number;
}

export interface PorVinculoDTO {
  vinculo: string;
  inscritos: number;
  atenciones: number;
}

export interface CalidadReporteDTO {
  clasesSinConfirmar: number;
  atencionesSinInscripcion: number;
}

/** GET /api/v2/reportes/mensual/opciones: valores de los filtros y primer/último mes con datos (yyyy-MM, o null sin datos). */
export interface OpcionesReporteDTO {
  primerMes: string | null;
  ultimoMes: string | null;
  disciplinas: string[];
  modalidades: string[];
  publicos: string[];
  vinculos: string[];
  facultades: string[];
}

/** Filtros del formulario (vacíos = sin filtro). */
export interface FiltrosReporte {
  /** yyyy-MM */
  mes: string;
  disciplina: string;
  modalidad: string;
  publico: string;
  /** Subconjunto de Estudiante, Docente, Administrativo, Contratista; vacío = todos. */
  vinculos: string[];
  agruparFuncionarios: boolean;
  genero: string;
  facultad: string;
}
