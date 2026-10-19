import { ProrrogaDTO } from '../Models/DTOs/prorroga-registro-dto';
import {
  etiquetaMes, mesesDisponibles, parsearValorMes, textoProrrogaVigente, textoResultadoProrroga, ultimosMeses,
} from './prorroga-registro.util';

const p = (id: string, dias: number, fechaLimite: string | null): ProrrogaDTO => ({ idInstructor: id, dias, fechaLimite });

describe('prorroga-registro.util', () => {
  describe('etiquetaMes', () => {
    it('"octubre de 2026"', () => expect(etiquetaMes(2026, 10)).toBe('octubre de 2026'));
    it('enero y diciembre', () => {
      expect(etiquetaMes(2026, 1)).toBe('enero de 2026');
      expect(etiquetaMes(2025, 12)).toBe('diciembre de 2025');
    });
  });

  describe('ultimosMeses', () => {
    it('devuelve 12 meses: el actual primero y hacia atrás, con año y mes numéricos', () => {
      const meses = ultimosMeses(new Date(2026, 9, 15));
      expect(meses.length).toBe(12);
      expect(meses[0]).toEqual({ anio: 2026, mes: 10, valor: '2026-10', etiqueta: 'octubre de 2026' });
      expect(meses[11]).toEqual({ anio: 2025, mes: 11, valor: '2025-11', etiqueta: 'noviembre de 2025' });
    });

    it('cruza el cambio de año sin saltos ni repetidos', () => {
      const meses = ultimosMeses(new Date(2026, 1, 3));   // febrero
      expect(meses.map(m => m.valor)).toEqual([
        '2026-2', '2026-1', '2025-12', '2025-11', '2025-10', '2025-9', '2025-8', '2025-7', '2025-6', '2025-5', '2025-4', '2025-3',
      ]);
    });

    it('en enero retrocede al año anterior', () => {
      const meses = ultimosMeses(new Date(2027, 0, 31));
      expect(meses[0].valor).toBe('2027-1');
      expect(meses[1].valor).toBe('2026-12');
      expect(meses[11].valor).toBe('2026-2');
    });

    it('el fin de mes no desfasa el mes (31 de octubre a las 23:59 sigue siendo octubre)', () => {
      expect(ultimosMeses(new Date(2026, 9, 31, 23, 59))[0].valor).toBe('2026-10');
    });

    it('acepta otra cantidad de meses', () => {
      expect(ultimosMeses(new Date(2026, 9, 15), 3).map(m => m.valor)).toEqual(['2026-10', '2026-9', '2026-8']);
    });
  });

  describe('mesesDisponibles (único punto que usa el reloj del navegador)', () => {
    it('son 12 meses y el primero es el mes actual del navegador', () => {
      const meses = mesesDisponibles();
      const hoy = new Date();
      expect(meses.length).toBe(12);
      expect(meses[0].anio).toBe(hoy.getFullYear());
      expect(meses[0].mes).toBe(hoy.getMonth() + 1);
    });
  });

  describe('parsearValorMes', () => {
    it('devuelve año y mes numéricos', () => expect(parsearValorMes('2026-10')).toEqual({ anio: 2026, mes: 10 }));
    it('sin cero a la izquierda', () => expect(parsearValorMes('2026-2')).toEqual({ anio: 2026, mes: 2 }));
    it('inválido → null', () => {
      for (const x of ['', 'abc', '2026', '2026-13', '2026-0', '26-10']) {
        expect(parsearValorMes(x)).withContext(x).toBeNull();
      }
    });
  });

  describe('textoResultadoProrroga (snackbar)', () => {
    it('uno: "Prórroga asignada a 1 instructor"', () =>
      expect(textoResultadoProrroga([p('a', 10, '2026-11-10')])).toBe('Prórroga asignada a 1 instructor'));
    it('varios: "Prórroga asignada a 3 instructores"', () =>
      expect(textoResultadoProrroga([p('a', 5, '2026-11-05'), p('b', 5, '2026-11-05'), p('c', 5, '2026-11-05')])).toBe('Prórroga asignada a 3 instructores'));
    it('dias = 0 para todos: "Prórroga quitada"', () =>
      expect(textoResultadoProrroga([p('a', 0, null), p('b', 0, null)])).toBe('Prórroga quitada'));
  });

  describe('textoProrrogaVigente', () => {
    it('con prórroga: días y fecha dd/MM/yyyy (singular y plural)', () => {
      expect(textoProrrogaVigente(p('a', 10, '2026-11-10'))).toBe('10 días · hasta 10/11/2026');
      expect(textoProrrogaVigente(p('a', 1, '2026-11-01'))).toBe('1 día · hasta 01/11/2026');
    });
    it('sin prórroga (undefined, 0 días o sin fecha): "Sin prórroga"', () => {
      expect(textoProrrogaVigente(undefined)).toBe('Sin prórroga');
      expect(textoProrrogaVigente(p('a', 0, null))).toBe('Sin prórroga');
    });
    it('fin de mes sin desfase de un día', () =>
      expect(textoProrrogaVigente(p('a', 31, '2026-12-31'))).toBe('31 días · hasta 31/12/2026'));
  });
});
