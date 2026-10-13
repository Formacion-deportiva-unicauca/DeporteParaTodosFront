import { TestBed } from '@angular/core/testing';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { FechaEsAdapter } from './fecha-es.adapter';

describe('FechaEsAdapter (dd/MM/yyyy)', () => {
  let adaptador: FechaEsAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
        { provide: DateAdapter, useClass: FechaEsAdapter },
      ],
    });
    adaptador = TestBed.inject(DateAdapter) as FechaEsAdapter;
  });

  const ymd = (d: Date | null): number[] | null => (d ? [d.getFullYear(), d.getMonth() + 1, d.getDate()] : null);

  describe('parse', () => {
    it('interpreta día/mes/año: 01/11/2026 es 1 de NOVIEMBRE (no 11 de enero)', () => {
      expect(ymd(adaptador.parse('01/11/2026', null))).toEqual([2026, 11, 1]);
    });

    it('acepta con y sin cero a la izquierda y con espacios alrededor', () => {
      expect(ymd(adaptador.parse('5/3/2026', null))).toEqual([2026, 3, 5]);
      expect(ymd(adaptador.parse('  15/10/2026  ', null))).toEqual([2026, 10, 15]);
    });

    it('fin de año y año bisiesto, a medianoche local (sin desfase)', () => {
      const d = adaptador.parse('31/12/2026', null) as Date;
      expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 11, 31, 0]);
      expect(ymd(adaptador.parse('29/02/2024', null))).toEqual([2024, 2, 29]);
    });

    it('fechas inexistentes son inválidas (31/02, 29/02 en año no bisiesto, mes 13, día 0)', () => {
      for (const x of ['31/02/2026', '29/02/2026', '10/13/2026', '00/05/2026', '15/00/2026']) {
        expect(adaptador.isValid(adaptador.parse(x, null) as Date)).withContext(x).toBeFalse();
      }
    });

    it('formatos distintos a dd/MM/yyyy son inválidos (no se adivinan)', () => {
      for (const x of ['2026-11-01', '1-11-2026', 'hoy', '15/10/26', '15/10', '15.10.2026']) {
        expect(adaptador.isValid(adaptador.parse(x, null) as Date)).withContext(x).toBeFalse();
      }
    });

    it('vacío → null (sin valor, no error de formato)', () => {
      expect(adaptador.parse('', null)).toBeNull();
      expect(adaptador.parse('   ', null)).toBeNull();
      expect(adaptador.parse(null, null)).toBeNull();
    });

    it('un Date o un número recibido se conserva como lo hace Material', () => {
      const d = new Date(2026, 5, 14);
      expect(ymd(adaptador.parse(d, null))).toEqual([2026, 6, 14]);
    });
  });

  describe('format', () => {
    it('muestra día/mes/año en es-CO', () => {
      expect(adaptador.format(new Date(2026, 9, 15), { year: 'numeric', month: 'numeric', day: 'numeric' })).toBe('15/10/2026');
      expect(adaptador.format(new Date(2026, 11, 31), { year: 'numeric', month: 'numeric', day: 'numeric' })).toBe('31/12/2026');
    });

    it('ida y vuelta: parse(format(d)) devuelve la misma fecha', () => {
      for (const d of [new Date(2026, 0, 1), new Date(2026, 8, 5), new Date(2024, 1, 29), new Date(2026, 11, 31)]) {
        const texto = adaptador.format(d, { year: 'numeric', month: 'numeric', day: 'numeric' });
        expect(ymd(adaptador.parse(texto, null))).withContext(texto).toEqual(ymd(d));
      }
    });
  });
});
