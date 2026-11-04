import { claseEstadoInscripciones, textoEstadoInscripciones } from './estado-inscripciones';

// El estado de inscripciones de un curso lo calcula el backend a partir de sus grupos.
describe('estado-inscripciones', () => {
  it('ABIERTO → "Inscripciones abiertas"', () => {
    expect(textoEstadoInscripciones('ABIERTO')).toBe('Inscripciones abiertas');
  });

  it('CERRADO → "Inscripciones cerradas"', () => {
    expect(textoEstadoInscripciones('CERRADO')).toBe('Inscripciones cerradas');
  });

  it('SIN_GRUPOS → "Sin grupos"', () => {
    expect(textoEstadoInscripciones('SIN_GRUPOS')).toBe('Sin grupos');
  });

  it('un valor ausente o desconocido se trata como cerradas (nunca como abiertas)', () => {
    expect(textoEstadoInscripciones(undefined)).toBe('Inscripciones cerradas');
    expect(textoEstadoInscripciones(null)).toBe('Inscripciones cerradas');
  });

  it('cada estado tiene su color', () => {
    expect(claseEstadoInscripciones('ABIERTO')).toBe('bg-primary');
    expect(claseEstadoInscripciones('CERRADO')).toBe('bg-warning text-dark');
    expect(claseEstadoInscripciones('SIN_GRUPOS')).toBe('bg-secondary');
  });
});
