/**
 * A quién va dirigido un curso. Se compara con el tipo de vínculo de la persona (Estudiante, Docente, Administrativo,
 * Contratista): los tres últimos son "Funcionarios". MIXTO es toda la comunidad universitaria. La regla de quién puede
 * inscribirse la aplica el backend; aquí solo se muestra y se filtra.
 */
export type PublicoCurso = 'ESTUDIANTE' | 'FUNCIONARIO' | 'MIXTO';

/** Filtro de la lista de cursos: "TODOS" es "Cualquiera" (sin filtro). */
export type FiltroPublico = 'TODOS' | PublicoCurso;

export interface OpcionPublico {
  valor: PublicoCurso;
  etiqueta: string;
  descripcion: string;
}

export const PUBLICOS_CURSO: OpcionPublico[] = [
  { valor: 'MIXTO', etiqueta: 'Toda la comunidad', descripcion: 'Estudiantes, docentes, administrativos y contratistas: todos pueden inscribirse' },
  { valor: 'ESTUDIANTE', etiqueta: 'Estudiantes', descripcion: 'Solo estudiantes' },
  { valor: 'FUNCIONARIO', etiqueta: 'Funcionarios', descripcion: 'Solo docentes, administrativos y contratistas' },
];

export const FILTROS_PUBLICO: { valor: FiltroPublico; etiqueta: string }[] = [
  { valor: 'TODOS', etiqueta: 'Cualquiera' },
  ...PUBLICOS_CURSO.map(p => ({ valor: p.valor as FiltroPublico, etiqueta: p.etiqueta })),
];

function opcionDe(valor?: string | null): OpcionPublico {
  return PUBLICOS_CURSO.find(p => p.valor === valor) ?? PUBLICOS_CURSO[0];
}

/** Un público ausente o desconocido se muestra como toda la comunidad. */
export function etiquetaPublico(valor?: string | null): string {
  return opcionDe(valor).etiqueta;
}

export function descripcionPublico(valor?: string | null): string {
  return opcionDe(valor).descripcion;
}

/** Filtro exacto; los cursos sin público cuentan como toda la comunidad. "TODOS" devuelve la lista sin filtrar. */
export function filtrarPorPublico<T extends { publico?: PublicoCurso | null }>(cursos: T[], filtro: FiltroPublico): T[] {
  if (filtro === 'TODOS') return cursos;
  return cursos.filter(c => (c.publico ?? 'MIXTO') === filtro);
}
