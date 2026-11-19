import { FiltrosReporte, ReporteMensualDTO } from '../Models/DTOs/reporte-mensual-dto';
import {
  datosBarrasPorCurso, datosBarrasPorVinculo, datosDonaGenero, estadoDelReporte, etiquetaMes, fechaDeGeneracion, filtrosEnTexto,
  filtrosVacios, formatoNumero, formatoPorcentaje, hayFiltros, mesActual, mesInicial, mesesDisponibles, nombrePublico, resumenGrafica,
  valorDeFila,
} from './reporte-mensual.util';
import { contenidoExportable } from './reporte-mensual-exportar.util';

const reporte = (extra: Partial<ReporteMensualDTO> = {}): ReporteMensualDTO => ({
  anio: 2026, mes: 10, filtros: null,
  filas: [
    { modalidad: 'Seleccionado', curso: 'Voleibol', disciplina: 'Voleibol', publico: 'MIXTO', inscritosHombres: 8, inscritosMujeres: 12, inscritosTotal: 20,
      atencionesHombres: 30, atencionesMujeres: 50, atencionesTotal: 80 },
    { modalidad: 'Recreativo', curso: 'Natación', disciplina: 'Natacion', publico: 'ESTUDIANTE', inscritosHombres: 5, inscritosMujeres: 5, inscritosTotal: 10,
      atencionesHombres: 10, atencionesMujeres: 20, atencionesTotal: 30 },
  ],
  totales: { inscritosHombres: 13, inscritosMujeres: 17, inscritosTotal: 30, atencionesHombres: 40, atencionesMujeres: 70, atencionesTotal: 110,
    personasDistintasInscritas: 28, personasDistintasAtendidas: 25 },
  porVinculo: [{ vinculo: 'Estudiante', inscritos: 20, atenciones: 80 }, { vinculo: 'Docente', inscritos: 10, atenciones: 30 }],
  calidad: { clasesSinConfirmar: 2, atencionesSinInscripcion: 1 },
  ...extra,
});

describe('reporte-mensual.util', () => {
  describe('formato es-CO', () => {
    it('separa los miles con punto y trata null como 0', () => {
      expect(formatoNumero(1234567)).toBe('1.234.567');
      expect(formatoNumero(12)).toBe('12');
      expect(formatoNumero(null)).toBe('0');
    });
    it('porcentaje con coma decimal y sin dividir por cero', () => {
      expect(formatoPorcentaje(1, 4)).toBe('25 %');
      expect(formatoPorcentaje(1, 8)).toBe('12,5 %');
      expect(formatoPorcentaje(0, 0)).toBe('—');
    });
    it('etiquetas de mes en español con mayúscula inicial', () => {
      expect(etiquetaMes('2026-10')).toBe('Octubre de 2026');
      expect(etiquetaMes('2026-01')).toBe('Enero de 2026');
    });
    it('la fecha de generación está en español y en la zona de Bogotá', () => {
      // 2026-11-20 02:30 UTC = 19 de noviembre, 21:30 en Bogotá.
      expect(fechaDeGeneracion(new Date('2026-11-20T02:30:00Z'))).toContain('19 de noviembre de 2026');
    });
    it('el público del curso en palabras', () => {
      expect(nombrePublico('ESTUDIANTE')).toBe('Estudiantes');
      expect(nombrePublico('FUNCIONARIO')).toBe('Funcionarios');
      expect(nombrePublico('MIXTO')).toBe('Toda la comunidad');
      expect(nombrePublico(null)).toBe('Sin dato');
    });
  });

  describe('meses', () => {
    it('el mes actual es el de Bogotá: a las 23:59 del 31 de octubre sigue siendo octubre, a las 00:00 ya es noviembre', () => {
      expect(mesActual(new Date('2026-11-01T04:59:59Z'))).toBe('2026-10');
      expect(mesActual(new Date('2026-11-01T05:00:00Z'))).toBe('2026-11');
    });
    it('el selector empieza en el primer mes con datos y llega hasta el mes actual, del más reciente al más antiguo', () => {
      expect(mesesDisponibles('2026-09', '2026-11').map(m => m.valor)).toEqual(['2026-11', '2026-10', '2026-09']);
      expect(mesesDisponibles('2025-11', '2026-02').map(m => m.valor)).toEqual(['2026-02', '2026-01', '2025-12', '2025-11']);
      expect(mesesDisponibles('2026-09', '2026-11')[2].etiqueta).toBe('Septiembre de 2026');
    });
    it('sin datos (o con un primer mes futuro) solo ofrece el mes actual', () => {
      expect(mesesDisponibles(null, '2026-11').map(m => m.valor)).toEqual(['2026-11']);
      expect(mesesDisponibles('2027-03', '2026-11').map(m => m.valor)).toEqual(['2026-11']);
    });
    it('abre en el mes anterior si ya hay datos desde entonces; si no, en el primer mes con datos', () => {
      expect(mesInicial('2026-09', '2026-11')).toBe('2026-10');
      expect(mesInicial('2026-10', '2026-11')).toBe('2026-10');
      expect(mesInicial('2026-11', '2026-11')).toBe('2026-11');
      expect(mesInicial(null, '2026-11')).toBe('2026-11');
      expect(mesInicial('2025-12', '2026-01')).toBe('2025-12');
    });
  });

  describe('filtros', () => {
    it('sin filtros salvo el mes: no hay filtros; con cualquiera, sí', () => {
      expect(hayFiltros(filtrosVacios('2026-10'))).toBeFalse();
      for (const extra of [{ disciplina: 'Voleibol' }, { modalidad: 'Semillero' }, { publico: 'MIXTO' }, { vinculos: ['Docente'] },
        { agruparFuncionarios: true }, { genero: 'F' }, { facultad: 'Ingeniería' }]) {
        expect(hayFiltros({ ...filtrosVacios('2026-10'), ...extra })).withContext(JSON.stringify(extra)).toBeTrue();
      }
    });
    it('los filtros activos en texto legible (para las etiquetas y el encabezado del archivo)', () => {
      const f: FiltrosReporte = { ...filtrosVacios('2026-10'), disciplina: 'Voleibol', publico: 'FUNCIONARIO', vinculos: ['Docente', 'Contratista'],
        genero: 'F', facultad: 'Ingeniería', agruparFuncionarios: true };
      expect(filtrosEnTexto(f)).toEqual([
        { nombre: 'Mes', valor: 'Octubre de 2026' }, { nombre: 'Disciplina', valor: 'Voleibol' },
        { nombre: 'Público del curso', valor: 'Funcionarios' }, { nombre: 'Vínculo', valor: 'Docente, Contratista' },
        { nombre: 'Agrupado', valor: 'Funcionarios (docentes, administrativos y contratistas)' },
        { nombre: 'Género', valor: 'Mujeres' }, { nombre: 'Facultad', valor: 'Ingeniería' },
      ]);
      expect(filtrosEnTexto(filtrosVacios('2026-10')).length).toBe(1);
    });
  });

  describe('estado del reporte', () => {
    const vacio = reporte({ filas: [], totales: { inscritosHombres: 0, inscritosMujeres: 0, inscritosTotal: 0, atencionesHombres: 0, atencionesMujeres: 0,
      atencionesTotal: 0, personasDistintasInscritas: 0, personasDistintasAtendidas: 0 } });
    it('con datos: listo', () => expect(estadoDelReporte(reporte(), filtrosVacios('2026-10'))).toBe('listo'));
    it('vacío sin filtros: no hay datos del mes', () => expect(estadoDelReporte(vacio, filtrosVacios('2026-10'))).toBe('sinDatosDelMes'));
    it('vacío con algún filtro: vacío por filtros', () =>
      expect(estadoDelReporte(vacio, { ...filtrosVacios('2026-10'), genero: 'M' })).toBe('vacioPorFiltros'));
    it('sin totales (respuesta mínima) tampoco falla', () =>
      expect(estadoDelReporte(reporte({ filas: [], totales: null }), filtrosVacios('2026-10'))).toBe('sinDatosDelMes'));
  });

  describe('datos de las gráficas', () => {
    it('barras por curso: hombres y mujeres de la medida elegida', () => {
      expect(datosBarrasPorCurso(reporte(), 'atenciones')[0]).toEqual({ name: 'Voleibol', series: [{ name: 'Hombres', value: 30 }, { name: 'Mujeres', value: 50 }] });
      expect(datosBarrasPorCurso(reporte(), 'inscritos')[1].series).toEqual([{ name: 'Hombres', value: 5 }, { name: 'Mujeres', value: 5 }]);
    });
    it('dona por género y barras por vínculo concilian con los totales', () => {
      const g = datosDonaGenero(reporte(), 'atenciones');
      expect(g.reduce((s, d) => s + d.value, 0)).toBe(110);
      expect(datosDonaGenero(reporte(), 'inscritos')).toEqual([{ name: 'Hombres', value: 13 }, { name: 'Mujeres', value: 17 }]);
      expect(datosBarrasPorVinculo(reporte(), 'atenciones')).toEqual([{ name: 'Estudiante', value: 80 }, { name: 'Docente', value: 30 }]);
      expect(datosDonaGenero(reporte({ totales: null }), 'atenciones')).toEqual([]);
    });
    it('el texto para lectores de pantalla dice lo mismo que la tabla', () => {
      expect(resumenGrafica([{ name: 'Hombres', value: 1234 }, { name: 'Mujeres', value: 5 }])).toBe('Hombres: 1.234; Mujeres: 5');
    });
    it('valorDeFila', () => {
      expect(valorDeFila(reporte().filas[0], 'inscritos')).toEqual({ hombres: 8, mujeres: 12, total: 20 });
    });
  });

  describe('contenido exportable (PDF)', () => {
    it('lleva los filtros aplicados y la fecha de generación en el encabezado, las filas, los totales y las notas de calidad', () => {
      const f: FiltrosReporte = { ...filtrosVacios('2026-10'), genero: 'F', facultad: 'Ingeniería' };
      const c = contenidoExportable(reporte(), f, '19 de noviembre de 2026, 3:30 p. m.');
      expect(c.generado).toContain('19 de noviembre de 2026');
      expect(c.filtros).toEqual(['Mes: Octubre de 2026', 'Género: Mujeres', 'Facultad: Ingeniería']);
      expect(c.cabecera.length).toBe(9);
      expect(c.filas.length).toBe(2);
      expect(c.filas[0]).toEqual(['Seleccionado', 'Voleibol', 'Toda la comunidad', '8', '12', '20', '30', '50', '80']);
      expect(c.pie).toEqual(['Total', '', '', '13', '17', '30', '40', '70', '110']);
      expect(c.vinculos).toEqual([['Estudiante', '20', '80'], ['Docente', '10', '30']]);
      expect(c.notas.join(' ')).toContain('Personas distintas atendidas: 25');
      expect(c.notas.join(' ')).toContain('2 clases sin confirmar');
    });
    it('los totales del archivo son los de la pantalla (suma de las filas)', () => {
      const r = reporte();
      const c = contenidoExportable(r, filtrosVacios('2026-10'), 'x');
      const suma = c.filas.reduce((s, fila) => s + Number(fila[8].replace(/\./g, '')), 0);
      expect(suma).toBe(Number(c.pie[8]));
    });
  });
});
