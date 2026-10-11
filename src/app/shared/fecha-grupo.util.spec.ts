import { GrupoDTO } from '../Models/DTOs/grupo-dto';
import {
  avisoInscripcionGrupo, etiquetaInscripcionGrupo, formatearFecha,
  inscripcionesAbiertasDeGrupo, textoVentanaInscripcion,
} from './fecha-grupo.util';

const g = (extra: Partial<GrupoDTO>): GrupoDTO => ({
  categoria: 'C', curso: 'X', anio: 2026, iterable: 1, cupos: 10, fechaCreacion: '2026-01-01', ...extra,
});

describe('fecha-grupo.util', () => {
  describe('formatearFecha', () => {
    it('convierte yyyy-MM-dd a dd/MM/yyyy', () => expect(formatearFecha('2026-06-14')).toBe('14/06/2026'));
    it('fin de mes sin desfase de un día', () => {
      expect(formatearFecha('2026-01-31')).toBe('31/01/2026');
      expect(formatearFecha('2026-12-31')).toBe('31/12/2026');
      expect(formatearFecha('2024-02-29')).toBe('29/02/2024');
    });
    it('ignora la hora si viene', () => expect(formatearFecha('2026-06-14T00:00:00')).toBe('14/06/2026'));
    it('null, vacío o inválido → texto vacío', () => {
      expect(formatearFecha(null)).toBe('');
      expect(formatearFecha(undefined)).toBe('');
      expect(formatearFecha('')).toBe('');
      expect(formatearFecha('14/06/2026')).toBe('');
    });
  });

  describe('textoVentanaInscripcion', () => {
    it('ambas fechas', () =>
      expect(textoVentanaInscripcion('2026-10-01', '2026-10-31')).toBe('Inscripciones desde 01/10/2026 hasta 31/10/2026'));
    it('apertura null', () =>
      expect(textoVentanaInscripcion(null, '2026-10-31')).toBe('Inscripciones abiertas hasta 31/10/2026'));
    it('cierre null', () =>
      expect(textoVentanaInscripcion('2026-10-01', null)).toBe('Inscripciones desde 01/10/2026, sin fecha de cierre'));
    it('ambas null', () => expect(textoVentanaInscripcion(null, null)).toBe('Sin fecha de cierre'));
  });

  describe('inscripcionesAbiertasDeGrupo', () => {
    it('false solo si el backend dice false; undefined se trata como true', () => {
      expect(inscripcionesAbiertasDeGrupo(g({ inscripcionesAbiertas: false }))).toBeFalse();
      expect(inscripcionesAbiertasDeGrupo(g({ inscripcionesAbiertas: true }))).toBeTrue();
      expect(inscripcionesAbiertasDeGrupo(g({}))).toBeTrue();
      expect(inscripcionesAbiertasDeGrupo(null)).toBeTrue();
    });
  });

  describe('etiquetaInscripcionGrupo / avisoInscripcionGrupo', () => {
    it('CERRADAS', () => {
      const grupo = g({ inscripcionesAbiertas: false, motivoInscripcion: 'CERRADAS', fechaIncripcionCierre: '2026-06-14' });
      expect(etiquetaInscripcionGrupo(grupo)).toBe('Cerraron el 14/06/2026');
      expect(avisoInscripcionGrupo(grupo)).toBe('Las inscripciones de este grupo cerraron el 14/06/2026');
    });
    it('NO_ABIERTAS', () => {
      const grupo = g({ inscripcionesAbiertas: false, motivoInscripcion: 'NO_ABIERTAS', fechaInscripcionApertura: '2026-07-01' });
      expect(etiquetaInscripcionGrupo(grupo)).toBe('Abren el 01/07/2026');
      expect(avisoInscripcionGrupo(grupo)).toBe('Las inscripciones de este grupo abren el 01/07/2026');
    });
    it('ABIERTAS, undefined o null → sin etiqueta ni aviso', () => {
      const abierto = g({ inscripcionesAbiertas: true, motivoInscripcion: 'ABIERTAS' });
      expect(etiquetaInscripcionGrupo(abierto)).toBeNull();
      expect(avisoInscripcionGrupo(abierto)).toBeNull();
      expect(etiquetaInscripcionGrupo(g({}))).toBeNull();
      expect(avisoInscripcionGrupo(null)).toBeNull();
    });
    it('cerrado sin fecha disponible: texto sin fecha, sin "undefined"', () => {
      const grupo = g({ inscripcionesAbiertas: false, motivoInscripcion: 'CERRADAS' });
      expect(etiquetaInscripcionGrupo(grupo)).toBe('Inscripciones cerradas');
      expect(avisoInscripcionGrupo(grupo)).toBe('Las inscripciones de este grupo están cerradas');
    });
  });
});
