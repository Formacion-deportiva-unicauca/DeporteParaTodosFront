import { PlazoCargaDTO } from '../Models/DTOs/plazo-carga-dto';
import { iconoReporte, textoAvisoReportes, textoBotonPlazo, textoReporte } from './plazo-carga.util';

const p = (extra: Partial<PlazoCargaDTO>): PlazoCargaDTO => ({
  idInstructor: 'X', anio: 2026, periodo: 2, fechaLimite: null,
  estadoReporte: 'SIN_PLAZO', plazoVencido: false, clasesConAsistencia: 0, ...extra,
});

describe('plazo-carga.util', () => {
  describe('textoReporte', () => {
    it('SIN_PLAZO', () => expect(textoReporte(p({}))).toBe('Sin plazo'));
    it('PENDIENTE con fecha dd/MM/yyyy', () =>
      expect(textoReporte(p({ estadoReporte: 'PENDIENTE', fechaLimite: '2026-10-15' }))).toBe('Pendiente · hasta 15/10/2026'));
    it('VENCIDO con fecha', () =>
      expect(textoReporte(p({ estadoReporte: 'VENCIDO', fechaLimite: '2026-09-30', plazoVencido: true }))).toBe('Vencido · límite 30/09/2026'));
    it('GENERADO', () => expect(textoReporte(p({ estadoReporte: 'GENERADO' }))).toBe('Generado'));
    it('GENERADO con plazo vencido agrega "· plazo cerrado"', () =>
      expect(textoReporte(p({ estadoReporte: 'GENERADO', plazoVencido: true }))).toBe('Generado · plazo cerrado'));
    it('fin de mes sin desfase de un día', () =>
      expect(textoReporte(p({ estadoReporte: 'PENDIENTE', fechaLimite: '2026-12-31' }))).toBe('Pendiente · hasta 31/12/2026'));
    it('PENDIENTE o VENCIDO sin fecha: sin "undefined" ni guion colgando', () => {
      expect(textoReporte(p({ estadoReporte: 'PENDIENTE' }))).toBe('Pendiente');
      expect(textoReporte(p({ estadoReporte: 'VENCIDO' }))).toBe('Vencido');
    });
  });

  describe('iconoReporte', () => {
    it('cada estado tiene un icono distinto (el estado nunca va solo en color)', () => {
      const iconos = (['SIN_PLAZO', 'PENDIENTE', 'VENCIDO', 'GENERADO'] as const).map(iconoReporte);
      expect(iconos.every(i => i.length > 0)).toBeTrue();
      expect(new Set(iconos).size).toBe(4);
    });
  });

  describe('textoBotonPlazo', () => {
    it('SIN_PLAZO → "Asignar plazo"', () => expect(textoBotonPlazo(p({}))).toBe('Asignar plazo'));
    it('plazoVencido → "Ampliar plazo" (VENCIDO y GENERADO con plazo cerrado)', () => {
      expect(textoBotonPlazo(p({ estadoReporte: 'VENCIDO', fechaLimite: '2026-09-30', plazoVencido: true }))).toBe('Ampliar plazo');
      expect(textoBotonPlazo(p({ estadoReporte: 'GENERADO', fechaLimite: '2026-09-30', plazoVencido: true }))).toBe('Ampliar plazo');
    });
    it('los demás casos → "Cambiar plazo"', () => {
      expect(textoBotonPlazo(p({ estadoReporte: 'PENDIENTE', fechaLimite: '2026-10-15' }))).toBe('Cambiar plazo');
      expect(textoBotonPlazo(p({ estadoReporte: 'GENERADO', fechaLimite: '2026-10-15' }))).toBe('Cambiar plazo');
    });
  });

  describe('textoAvisoReportes', () => {
    it('plural con vencidos: "3 instructores aún no han generado su reporte del periodo 2026-2 (1 con plazo vencido)"', () => {
      const plazos = [
        p({ idInstructor: 'a' }),
        p({ idInstructor: 'b', estadoReporte: 'PENDIENTE', fechaLimite: '2026-10-15' }),
        p({ idInstructor: 'c', estadoReporte: 'VENCIDO', fechaLimite: '2026-09-30', plazoVencido: true }),
        p({ idInstructor: 'd', estadoReporte: 'GENERADO', plazoVencido: true }),
      ];
      expect(textoAvisoReportes(plazos)).toBe('3 instructores aún no han generado su reporte del periodo 2026-2 (1 con plazo vencido)');
    });
    it('plural sin vencidos: sin paréntesis', () => {
      const plazos = [p({ idInstructor: 'a' }), p({ idInstructor: 'b', estadoReporte: 'PENDIENTE', fechaLimite: '2026-10-15' })];
      expect(textoAvisoReportes(plazos)).toBe('2 instructores aún no han generado su reporte del periodo 2026-2');
    });
    it('singular', () => {
      expect(textoAvisoReportes([p({}), p({ idInstructor: 'z', estadoReporte: 'GENERADO' })]))
        .toBe('1 instructor aún no ha generado su reporte del periodo 2026-2');
    });
    it('singular con un vencido', () => {
      expect(textoAvisoReportes([p({ estadoReporte: 'VENCIDO', fechaLimite: '2026-09-30', plazoVencido: true })]))
        .toBe('1 instructor aún no ha generado su reporte del periodo 2026-2 (1 con plazo vencido)');
    });
    it('cero (todos generados) o lista vacía → null', () => {
      expect(textoAvisoReportes([p({ estadoReporte: 'GENERADO' })])).toBeNull();
      expect(textoAvisoReportes([])).toBeNull();
    });
    it('el periodo se toma del primer elemento', () => {
      expect(textoAvisoReportes([p({ anio: 2027, periodo: 1 }), p({ anio: 2026, periodo: 2 })]))
        .toBe('2 instructores aún no han generado su reporte del periodo 2027-1');
    });
  });
});
