import {
  FILTROS_PUBLICO,
  PUBLICOS_CURSO,
  PublicoCurso,
  descripcionPublico,
  etiquetaPublico,
  filtrarPorPublico,
} from './publico-curso';

describe('publico-curso', () => {
  it('ofrece los tres públicos con su etiqueta, empezando por toda la comunidad', () => {
    expect(PUBLICOS_CURSO.map(p => p.valor)).toEqual(['MIXTO', 'ESTUDIANTE', 'FUNCIONARIO']);
    expect(PUBLICOS_CURSO.map(p => p.etiqueta)).toEqual(['Toda la comunidad', 'Estudiantes', 'Funcionarios']);
  });

  it('el filtro agrega "Cualquiera" (sin filtro) antes de los tres públicos', () => {
    expect(FILTROS_PUBLICO.map(f => f.valor)).toEqual(['TODOS', 'MIXTO', 'ESTUDIANTE', 'FUNCIONARIO']);
    expect(FILTROS_PUBLICO[0].etiqueta).toBe('Cualquiera');
  });

  describe('etiquetaPublico()', () => {
    it('devuelve la etiqueta de cada público', () => {
      expect(etiquetaPublico('ESTUDIANTE')).toBe('Estudiantes');
      expect(etiquetaPublico('FUNCIONARIO')).toBe('Funcionarios');
      expect(etiquetaPublico('MIXTO')).toBe('Toda la comunidad');
    });

    it('un público ausente o desconocido se muestra como toda la comunidad', () => {
      expect(etiquetaPublico(undefined)).toBe('Toda la comunidad');
      expect(etiquetaPublico(null)).toBe('Toda la comunidad');
      expect(etiquetaPublico('OTRO')).toBe('Toda la comunidad');
    });
  });

  describe('descripcionPublico()', () => {
    it('explica quiénes entran en cada público', () => {
      expect(descripcionPublico('FUNCIONARIO')).toContain('docentes');
      expect(descripcionPublico('FUNCIONARIO')).toContain('contratistas');
      expect(descripcionPublico('ESTUDIANTE')).toContain('estudiantes');
      expect(descripcionPublico('MIXTO')).toContain('todos');
    });

    it('un público ausente se describe como toda la comunidad', () => {
      expect(descripcionPublico(undefined)).toBe(descripcionPublico('MIXTO'));
    });
  });

  describe('filtrarPorPublico()', () => {
    const cursos: { nombre: string; publico?: PublicoCurso | null }[] = [
      { nombre: 'A', publico: 'ESTUDIANTE' },
      { nombre: 'B', publico: 'FUNCIONARIO' },
      { nombre: 'C', publico: 'MIXTO' },
      { nombre: 'D' },
      { nombre: 'E', publico: null },
    ];

    it('"Cualquiera" no filtra nada', () => {
      expect(filtrarPorPublico(cursos, 'TODOS').map(c => c.nombre)).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('el filtro es exacto: Estudiantes no incluye a los de toda la comunidad', () => {
      expect(filtrarPorPublico(cursos, 'ESTUDIANTE').map(c => c.nombre)).toEqual(['A']);
      expect(filtrarPorPublico(cursos, 'FUNCIONARIO').map(c => c.nombre)).toEqual(['B']);
    });

    it('los cursos sin público cuentan como toda la comunidad', () => {
      expect(filtrarPorPublico(cursos, 'MIXTO').map(c => c.nombre)).toEqual(['C', 'D', 'E']);
    });

    it('con una lista vacía devuelve una lista vacía', () => {
      expect(filtrarPorPublico([], 'ESTUDIANTE')).toEqual([]);
    });

    it('no modifica la lista original', () => {
      const copia = [...cursos];
      filtrarPorPublico(cursos, 'ESTUDIANTE');
      expect(cursos).toEqual(copia);
    });
  });
});
