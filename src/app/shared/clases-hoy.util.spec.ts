import { MisCursosHorarioDTO } from '../Models/DTOs/mis-cursos-dto';
import { horariosDeHoy, nombreDiaDeHoy, normalizarDia } from './clases-hoy.util';

const h = (id: number, dia: string, horaInicio: string): MisCursosHorarioDTO =>
  ({ id, categoria: 'C', curso: 'X', anio: 2026, iterable: 1, dia, horaInicio, horaFin: '23:00', escenario: null });

describe('clases-hoy.util', () => {
  // 2026-11-04 es miércoles
  const miercoles = new Date(2026, 10, 4, 9, 0);

  it('normalizarDia ignora tildes, mayúsculas y espacios', () => {
    expect(normalizarDia(' Miércoles ')).toBe('MIERCOLES');
    expect(normalizarDia('SABADO')).toBe('SABADO');
    expect(normalizarDia(null)).toBe('');
  });

  it('horariosDeHoy devuelve solo los del día de hoy, de la franja más temprana a la más tardía', () => {
    const lista = [h(1, 'Viernes', '17:00'), h(2, 'Miércoles', '18:00'), h(3, 'MIERCOLES', '08:00')];
    expect(horariosDeHoy(lista, miercoles).map(x => x.id)).toEqual([3, 2]);
  });

  it('sin horarios o sin coincidencias devuelve una lista vacía', () => {
    expect(horariosDeHoy(null, miercoles)).toEqual([]);
    expect(horariosDeHoy([h(1, 'Lunes', '08:00')], miercoles)).toEqual([]);
  });

  it('nombreDiaDeHoy da el día en español con mayúscula inicial', () => {
    expect(nombreDiaDeHoy(miercoles)).toMatch(/^Mi[eé]rcoles$/);
  });
});
