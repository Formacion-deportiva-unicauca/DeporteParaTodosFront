import { HorarioDTO } from '../Models/DTOs/horario-dto';
import {
  DIAS_SEMANA, diaSemanaSinTildes, diasConClase, duracionManualValida, esRolSinRestriccion, formatoHora12,
  franjaDelDia, hoyTexto, textoDiasDeClase, textoDuracion,
} from './ventana-registro.util';

const h = (dia: string, horaInicio: string, horaFin: string, extra: Partial<HorarioDTO> = {}): HorarioDTO => ({
  id: 1, categoria: 'C', curso: 'X', anio: 2026, iterable: 1, dia, horaInicio, horaFin, escenario: 'Coliseo', eliminado: 0, ...extra,
});

describe('ventana-registro.util', () => {
  describe('hoyTexto', () => {
    it('yyyy-MM-dd con componentes locales (23:59 sigue siendo el mismo día)', () => {
      expect(hoyTexto(new Date(2026, 9, 15, 23, 59))).toBe('2026-10-15');
      expect(hoyTexto(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
    });
  });

  describe('diaSemanaSinTildes: los 7 días, sin tildes, sin depender de la zona horaria', () => {
    const casos: [string, string][] = [
      ['2026-10-12', 'LUNES'], ['2026-10-13', 'MARTES'], ['2026-10-14', 'MIERCOLES'], ['2026-10-15', 'JUEVES'],
      ['2026-10-16', 'VIERNES'], ['2026-10-17', 'SABADO'], ['2026-10-18', 'DOMINGO'],
    ];
    for (const [fecha, dia] of casos) {
      it(`${fecha} → ${dia}`, () => expect(diaSemanaSinTildes(fecha)).toBe(dia));
    }

    it('ningún nombre lleva tildes ni minúsculas', () => {
      expect(DIAS_SEMANA.length).toBe(7);
      for (const d of DIAS_SEMANA) expect(d).toMatch(/^[A-Z]+$/);
    });

    it('fin de año y año bisiesto', () => {
      expect(diaSemanaSinTildes('2026-12-31')).toBe('JUEVES');
      expect(diaSemanaSinTildes('2024-02-29')).toBe('JUEVES');
    });

    it('inválido → null', () => {
      for (const x of [null, undefined, '', 'abc', '15/10/2026']) expect(diaSemanaSinTildes(x as any)).withContext(String(x)).toBeNull();
    });
  });

  describe('formatoHora12', () => {
    it('p. m. y a. m. con minutos', () => {
      expect(formatoHora12('14:00')).toBe('2:00 p. m.');
      expect(formatoHora12('08:05')).toBe('8:05 a. m.');
      expect(formatoHora12('23:59')).toBe('11:59 p. m.');
    });
    it('mediodía y medianoche', () => {
      expect(formatoHora12('12:00')).toBe('12:00 p. m.');
      expect(formatoHora12('00:30')).toBe('12:30 a. m.');
    });
    it('acepta HH:mm:ss', () => expect(formatoHora12('08:00:00')).toBe('8:00 a. m.'));
  });

  describe('textoDuracion', () => {
    it('horas, horas y minutos, solo minutos', () => {
      expect(textoDuracion(120)).toBe('2 h');
      expect(textoDuracion(60)).toBe('1 h');
      expect(textoDuracion(90)).toBe('1 h 30 min');
      expect(textoDuracion(45)).toBe('45 min');
    });
  });

  describe('franjaDelDia', () => {
    const miercoles = '2026-10-14';

    it('una franja: texto "2:00 p. m. a 4:00 p. m. (2 h)" y horas/minutos calculados', () => {
      const f = franjaDelDia([h('MIERCOLES', '14:00', '16:00')], miercoles)!;
      expect(f.texto).toBe('2:00 p. m. a 4:00 p. m. (2 h)');
      expect([f.horas, f.minutos, f.minutosTotales]).toEqual([2, 0, 120]);
    });

    it('varias franjas el mismo día se suman', () => {
      const f = franjaDelDia([h('MIERCOLES', '14:00', '16:00'), h('MIERCOLES', '18:00', '19:30')], miercoles)!;
      expect(f.texto).toBe('2:00 p. m. a 4:00 p. m. y 6:00 p. m. a 7:30 p. m. (3 h 30 min)');
      expect([f.horas, f.minutos]).toEqual([3, 30]);
    });

    it('reconoce el día con tildes o minúsculas en el dato y HH:mm:ss', () => {
      expect(franjaDelDia([h('MIÉRCOLES', '14:00:00', '16:00:00')], miercoles)).not.toBeNull();
      expect(franjaDelDia([h('miercoles', '14:00', '16:00')], miercoles)).not.toBeNull();
    });

    it('sin franja ese día → null', () => {
      expect(franjaDelDia([h('LUNES', '14:00', '16:00')], miercoles)).toBeNull();
    });

    it('sin horarios, null o vacío → null', () => {
      expect(franjaDelDia([], miercoles)).toBeNull();
      expect(franjaDelDia(null, miercoles)).toBeNull();
      expect(franjaDelDia(undefined, miercoles)).toBeNull();
    });

    it('ignora franjas eliminadas y fechas inválidas', () => {
      expect(franjaDelDia([h('MIERCOLES', '14:00', '16:00', { eliminado: 1 })], miercoles)).toBeNull();
      expect(franjaDelDia([h('MIERCOLES', '14:00', '16:00')], 'xx')).toBeNull();
    });

    it('franja con fin anterior al inicio no se toma como válida', () => {
      expect(franjaDelDia([h('MIERCOLES', '16:00', '14:00')], miercoles)).toBeNull();
    });
  });

  describe('duracionManualValida (horas 0-12, minutos 0-59, total > 0 y <= 12 h)', () => {
    it('válidas', () => {
      for (const [hh, mm] of [[1, 0], [0, 1], [12, 0], [2, 59], [0, 59]]) {
        expect(duracionManualValida(hh, mm)).withContext(`${hh}:${mm}`).toBeTrue();
      }
    });
    it('inválidas', () => {
      for (const [hh, mm] of [[0, 0], [12, 1], [13, 0], [0, 60], [-1, 30], [1.5, 0], [1, 0.5]]) {
        expect(duracionManualValida(hh, mm)).withContext(`${hh}:${mm}`).toBeFalse();
      }
      expect(duracionManualValida(null, 10)).toBeFalse();
      expect(duracionManualValida(1, null)).toBeFalse();
    });
  });

  describe('esRolSinRestriccion', () => {
    it('solo el Coordinador puede registrar un día sin clase; Instructor, Administrador y el resto no', () => {
      expect(esRolSinRestriccion('Coordinador')).toBeTrue();
      expect(esRolSinRestriccion('Administrador')).toBeFalse();
      expect(esRolSinRestriccion('Instructor')).toBeFalse();
      for (const rol of ['Instructor', 'Alumno', '']) expect(esRolSinRestriccion(rol)).withContext(rol).toBeFalse();
    });
  });

  describe('diasConClase', () => {
    it('días únicos del horario, ordenados de lunes a domingo (no por el orden de los datos)', () => {
      const horarios = [h('JUEVES', '14:00', '16:00'), h('MARTES', '14:00', '16:00'), h('JUEVES', '18:00', '19:00')];
      expect(diasConClase(horarios)).toEqual(['MARTES', 'JUEVES']);
    });

    it('los 7 días con sus nombres sin tildes', () => {
      const todos = DIAS_SEMANA.map(d => h(d, '08:00', '09:00'));
      expect(diasConClase(todos)).toEqual(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']);
    });

    it('normaliza tildes y minúsculas del dato', () => {
      expect(diasConClase([h('MIÉRCOLES', '08:00', '09:00'), h('sábado', '08:00', '09:00')])).toEqual(['MIERCOLES', 'SABADO']);
    });

    it('ignora franjas eliminadas o inválidas; sin horarios → []', () => {
      expect(diasConClase([h('LUNES', '08:00', '09:00', { eliminado: 1 }), h('MARTES', '10:00', '09:00')])).toEqual([]);
      expect(diasConClase([])).toEqual([]);
      expect(diasConClase(null)).toEqual([]);
      expect(diasConClase(undefined)).toEqual([]);
    });
  });

  describe('textoDiasDeClase', () => {
    it('"Este grupo tiene clases los martes y jueves"', () => {
      expect(textoDiasDeClase([h('JUEVES', '14:00', '16:00'), h('MARTES', '14:00', '16:00')])).toBe('Este grupo tiene clases los martes y jueves');
    });
    it('un solo día', () => expect(textoDiasDeClase([h('LUNES', '08:00', '09:00')])).toBe('Este grupo tiene clases los lunes'));
    it('tres o más: comas y "y" al final, con tildes de lectura', () => {
      expect(textoDiasDeClase([h('MIERCOLES', '08:00', '09:00'), h('LUNES', '08:00', '09:00'), h('SABADO', '08:00', '09:00')]))
        .toBe('Este grupo tiene clases los lunes, miércoles y sábados');
    });
    it('varias franjas el mismo día cuentan una sola vez', () => {
      expect(textoDiasDeClase([h('MARTES', '14:00', '16:00'), h('MARTES', '18:00', '19:30')])).toBe('Este grupo tiene clases los martes');
    });
    it('domingo y sin horario', () => {
      expect(textoDiasDeClase([h('DOMINGO', '08:00', '09:00')])).toBe('Este grupo tiene clases los domingos');
      expect(textoDiasDeClase([])).toBe('');
    });
  });

});
