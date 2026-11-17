import { MiCursoDTO } from '../Models/DTOs/mis-cursos-dto';
import { GrupoDestinoCruce, hoyEnBogota, normalizarFranja, primerCruce } from './cruce-horarios.util';

const h = (dia: string, horaInicio: string, horaFin: string) => ({ dia, horaInicio, horaFin });

/** Grupo destino: Baloncesto masculino, grupo A, 2026-2. */
const destino = (horarios: GrupoDestinoCruce['horarios'], extra: Partial<GrupoDestinoCruce> = {}): GrupoDestinoCruce =>
  ({ categoria: 'Deportes', curso: 'Baloncesto masculino', anio: 2026, iterable: 1, periodo: 2, horarios, ...extra });

/** Inscripción del Alumno (lo que devuelve GET /inscripcion/misCursos). */
const mio = (curso: string, iterable: number, horarios: ReturnType<typeof h>[], extra: Partial<MiCursoDTO> = {}): MiCursoDTO =>
  ({
    categoria: 'Deportes', curso, anio: 2026, iterable, periodo: 2, estado: 'INSCRITO', nombreInstructor: null, grupoActivo: true,
    horarios: horarios.map((x, i) => ({ id: i + 1, categoria: 'Deportes', curso, anio: 2026, iterable, escenario: null, ...x })),
    ...extra,
  });

const HOY = '2026-11-16';
const cruce = (d: GrupoDestinoCruce, cursos: MiCursoDTO[] | null | undefined, hoy = HOY) => primerCruce(d, cursos, hoy);

describe('cruce-horarios.util › primerCruce', () => {
  it('caso real: Baloncesto A (lun y mié 18:00-20:00) contra Acondicionamiento Físico A (lun y mié 18:00-19:30)', () => {
    const r = cruce(destino([h('LUNES', '18:00', '20:00'), h('MIERCOLES', '18:00', '20:00')]),
      [mio('Acondicionamiento Físico', 1, [h('LUNES', '18:00', '19:30'), h('MIERCOLES', '18:00', '19:30')])]);
    expect(r?.texto).toBe('Se cruza con Acondicionamiento Físico, grupo A, lunes 18:00-19:30');
  });

  it('mismo día y franjas solapadas: hay cruce, en ambos sentidos', () => {
    expect(cruce(destino([h('MARTES', '10:00', '12:00')]), [mio('Yoga', 2, [h('MARTES', '11:00', '13:00')])])).not.toBeNull();
    expect(cruce(destino([h('MARTES', '11:00', '13:00')]), [mio('Yoga', 2, [h('MARTES', '10:00', '12:00')])])).not.toBeNull();
  });

  it('borde exacto (uno termina cuando empieza el otro): NO hay cruce', () => {
    expect(cruce(destino([h('MARTES', '10:00', '12:00')]), [mio('Yoga', 2, [h('MARTES', '12:00', '14:00')])])).toBeNull();
    expect(cruce(destino([h('MARTES', '12:00', '14:00')]), [mio('Yoga', 2, [h('MARTES', '10:00', '12:00')])])).toBeNull();
  });

  it('una franja contenida dentro de la otra: hay cruce', () => {
    expect(cruce(destino([h('MARTES', '08:00', '18:00')]), [mio('Yoga', 2, [h('MARTES', '10:00', '11:00')])])).not.toBeNull();
    expect(cruce(destino([h('MARTES', '10:00', '11:00')]), [mio('Yoga', 2, [h('MARTES', '08:00', '18:00')])])).not.toBeNull();
  });

  it('días distintos: no hay cruce', () => {
    expect(cruce(destino([h('MARTES', '10:00', '12:00')]), [mio('Yoga', 2, [h('MIERCOLES', '10:00', '12:00')])])).toBeNull();
  });

  it('otro año u otro periodo: no hay cruce', () => {
    const d = destino([h('MARTES', '10:00', '12:00')]);
    expect(cruce(d, [mio('Yoga', 2, [h('MARTES', '10:00', '12:00')], { anio: 2025 })])).toBeNull();
    expect(cruce(d, [mio('Yoga', 2, [h('MARTES', '10:00', '12:00')], { periodo: 1 })])).toBeNull();
  });

  it('EN_ESPERA no cuenta', () => {
    expect(cruce(destino([h('MARTES', '10:00', '12:00')]),
      [mio('Yoga', 2, [h('MARTES', '10:00', '12:00')], { estado: 'EN_ESPERA' })])).toBeNull();
  });

  it('grupoActivo en falso se ignora; ausente o en true cuenta', () => {
    const d = destino([h('MARTES', '10:00', '12:00')]);
    expect(cruce(d, [mio('Yoga', 2, [h('MARTES', '10:00', '12:00')], { grupoActivo: false })])).toBeNull();
    expect(cruce(d, [mio('Yoga', 2, [h('MARTES', '10:00', '12:00')], { grupoActivo: undefined as any })])).not.toBeNull();
  });

  it('el propio grupo destino se excluye; otro grupo del mismo curso sí cuenta', () => {
    const d = destino([h('MARTES', '10:00', '12:00')]);
    expect(cruce(d, [mio('Baloncesto masculino', 1, [h('MARTES', '10:00', '12:00')])])).toBeNull();
    expect(cruce(d, [mio('Baloncesto masculino', 2, [h('MARTES', '10:00', '12:00')])])?.texto)
      .toBe('Se cruza con Baloncesto masculino, grupo B, martes 10:00-12:00');
  });

  describe('grupos terminados (fechaFinalizacion)', () => {
    const d = destino([h('MARTES', '10:00', '12:00')]);
    const con = (fechaFinalizacion: string | null | undefined) =>
      mio('Yoga', 2, [h('MARTES', '10:00', '12:00')], { fechaFinalizacion });

    it('terminó ayer: se ignora', () => expect(cruce(d, [con('2026-11-15')])).toBeNull());
    it('termina hoy: cuenta como vigente (>= hoy)', () => expect(cruce(d, [con('2026-11-16')])).not.toBeNull());
    it('termina mañana: cuenta', () => expect(cruce(d, [con('2026-11-17')])).not.toBeNull());
    it('null: vigente', () => expect(cruce(d, [con(null)])).not.toBeNull());
    it('ausente (undefined, backend viejo): vigente', () => expect(cruce(d, [con(undefined)])).not.toBeNull());
    it('fecha ilegible: no se tiene en cuenta como terminada (vigente)', () => expect(cruce(d, [con('mañana')])).not.toBeNull());
  });

  describe('"hoy" es el de Bogotá, no el del navegador', () => {
    const d = destino([h('MARTES', '10:00', '12:00')]);
    const terminaEl16 = [mio('Yoga', 2, [h('MARTES', '10:00', '12:00')], { fechaFinalizacion: '2026-11-16' })];

    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('hoyEnBogota: 23:59:59 de Bogotá sigue siendo el mismo día; a las 00:00 cambia', () => {
      expect(hoyEnBogota(new Date('2026-11-17T04:59:59Z'))).toBe('2026-11-16');
      expect(hoyEnBogota(new Date('2026-11-17T05:00:00Z'))).toBe('2026-11-17');
      expect(hoyEnBogota(new Date('2026-11-16T05:00:00Z'))).toBe('2026-11-16');
      expect(hoyEnBogota(new Date('2026-11-16T04:59:59Z'))).toBe('2026-11-15');
    });

    it('22:00 del 16 en Bogotá (ya es el 17 en UTC): un grupo que termina el 16 sigue vigente', () => {
      jasmine.clock().mockDate(new Date('2026-11-17T03:00:00Z'));
      expect(primerCruce(d, terminaEl16)).not.toBeNull();
    });

    it('00:00 del 17 en Bogotá: ese mismo grupo ya terminó', () => {
      jasmine.clock().mockDate(new Date('2026-11-17T05:00:00Z'));
      expect(primerCruce(d, terminaEl16)).toBeNull();
    });
  });

  describe('datos dudosos: nunca avisa ni lanza error', () => {
    it('horas mal formadas, fuera de rango, día desconocido o fin <= inicio se ignoran', () => {
      const basura = [
        h('MARTES', '', '12:00'), h('MARTES', '10:00', ''), h('MARTES', 'diez', 'doce'), h('MARTES', '25:00', '26:00'),
        h('MARTES', '10:60', '11:00'), h('MARTES', '10:00:00', '12:00:00'), h('MARTES', '12:00', '10:00'),
        h('MARTES', '10:00', '10:00'), h('FUNDAY', '10:00', '12:00'), h('', '10:00', '12:00'),
        { dia: null, horaInicio: null, horaFin: null }, { dia: undefined, horaInicio: undefined, horaFin: undefined },
      ];
      for (const x of basura) {
        expect(normalizarFranja(x)).withContext(JSON.stringify(x)).toBeNull();
        expect(() => cruce(destino([h('MARTES', '10:00', '12:00')]), [mio('Yoga', 2, [x as any])])).not.toThrow();
        expect(cruce(destino([h('MARTES', '10:00', '12:00')]), [mio('Yoga', 2, [x as any])])).toBeNull();
        expect(cruce(destino([x as any]), [mio('Yoga', 2, [h('MARTES', '10:00', '12:00')])])).toBeNull();
      }
    });

    it('normaliza el día (tildes, mayúsculas, espacios) y la hora sin cero inicial', () => {
      expect(cruce(destino([h('MIERCOLES', '10:00', '12:00')]), [mio('Yoga', 2, [h(' Miércoles ', '9:30', '10:30')])])).not.toBeNull();
      expect(cruce(destino([h('sábado', '8:00', '9:00')]), [mio('Yoga', 2, [h('SABADO', '08:30', '09:30')])])?.texto)
        .toBe('Se cruza con Yoga, grupo B, sábado 08:30-09:30');
    });

    it('sin periodo, sin año, sin horarios cargados, sin horarios válidos o sin misCursos: no calcula', () => {
      const cursos = [mio('Yoga', 2, [h('MARTES', '10:00', '12:00')])];
      const franjas = [h('MARTES', '10:00', '12:00')];
      expect(cruce(destino(franjas, { periodo: null }), cursos)).toBeNull();
      expect(cruce(destino(franjas, { periodo: undefined }), cursos)).toBeNull();
      expect(cruce(destino(franjas, { anio: null }), cursos)).toBeNull();
      expect(cruce(destino(undefined), cursos)).toBeNull();
      expect(cruce(destino([]), cursos)).toBeNull();
      expect(cruce(destino(franjas), null)).toBeNull();
      expect(cruce(destino(franjas), undefined)).toBeNull();
      expect(cruce(destino(franjas), [])).toBeNull();
    });
  });

  describe('varios cruces: siempre el mismo, sin importar el orden', () => {
    it('ordena por categoría, curso, grupo, día, inicio y fin; el texto lleva la letra del grupo', () => {
      const d = destino([h('LUNES', '10:00', '12:00'), h('MARTES', '10:00', '12:00')]);
      const zumba = mio('Zumba', 1, [h('MARTES', '10:30', '11:30')]);
      const yogaB = mio('Yoga', 2, [h('MARTES', '11:00', '12:00')]);
      const yogaA = mio('Yoga', 1, [h('MARTES', '11:30', '12:00'), h('LUNES', '10:00', '12:00')]);
      const esperado = 'Se cruza con Yoga, grupo A, lunes 10:00-12:00';

      expect(cruce(d, [zumba, yogaB, yogaA])?.texto).toBe(esperado);
      expect(cruce(d, [yogaA, yogaB, zumba])?.texto).toBe(esperado);
      expect(cruce(d, [yogaB, zumba, yogaA])?.texto).toBe(esperado);
    });

    it('la categoría manda sobre el curso (igual que el backend)', () => {
      const d = destino([h('MARTES', '10:00', '12:00')]);
      const r = cruce(d, [
        mio('Yoga', 1, [h('MARTES', '10:00', '12:00')], { categoria: 'Recreativo' }),
        mio('Zumba', 1, [h('MARTES', '10:00', '12:00')], { categoria: 'Deportes' }),
      ]);
      expect(r?.curso).toBe('Zumba');
    });
  });

  it('letra del grupo: A, B, Z y "?" para un número no válido (como iterable-letra.util)', () => {
    const d = destino([h('MARTES', '10:00', '12:00')]);
    const texto = (n: number) => cruce(d, [mio('Yoga', n, [h('MARTES', '10:00', '12:00')])])?.texto;
    expect(texto(1)).toContain('grupo A,');
    expect(texto(2)).toContain('grupo B,');
    expect(texto(26)).toContain('grupo Z,');
    expect(texto(0)).toContain('grupo ?,');
  });

  it('mismo texto que el backend para cada día de la semana, con tilde y en minúscula', () => {
    const dias: [string, string][] = [['LUNES', 'lunes'], ['MARTES', 'martes'], ['MIERCOLES', 'miércoles'], ['JUEVES', 'jueves'],
      ['VIERNES', 'viernes'], ['SABADO', 'sábado'], ['DOMINGO', 'domingo']];
    for (const [dia, visible] of dias) {
      expect(cruce(destino([h(dia, '08:05', '09:00')]), [mio('Yoga', 1, [h(dia, '8:05', '9:00')])])?.texto)
        .toBe(`Se cruza con Yoga, grupo A, ${visible} 08:05-09:00`);
    }
  });
});
