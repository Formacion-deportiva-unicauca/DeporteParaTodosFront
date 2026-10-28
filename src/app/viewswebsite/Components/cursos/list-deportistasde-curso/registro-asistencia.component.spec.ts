import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { ListDeportistasdeCursoComponent } from './list-deportistasde-curso.component';
import { ConfirmarSinAsistentesComponent } from './confirmar-sin-asistentes.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { AlumnoDTO } from 'src/app/Models/DTOs/alumno-dto';
import { AtencionDTO } from 'src/app/Models/DTOs/atencion-dto';
import { ClaseDTO } from 'src/app/Models/DTOs/clase-dto';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { HorarioDTO } from 'src/app/Models/DTOs/horario-dto';
import { formatoLocal } from 'src/app/shared/fecha-grupo.util';

const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const alumno = (id: number, nombre: string): AlumnoDTO => ({
  id, codigo: `U${id}`, tipo: 'Estudiante', nombre, correo: `${nombre}@t.co`.toLowerCase(), sexo: 'F', tipoid: 'CC', imagen: 0,
});
const err = (status: number, error?: any): HttpErrorResponse => new HttpErrorResponse({ status, error });
const err422 = (codigoError: string, mensaje: string): HttpErrorResponse => err(422, { codigoError, mensaje });

// Semana de prueba (octubre de 2026): lunes 12 … domingo 18. El jueves 15 es el "hoy" por defecto.
const octubre = (dia: number, h = 12, m = 0, s = 0): Date => new Date(2026, 9, dia, h, m, s);
const JUEVES = octubre(15);

describe('ListDeportistasdeCursoComponent › registrar asistencia de HOY (SCRUM-80 corregido)', () => {
  let component: ListDeportistasdeCursoComponent;
  let fixture: ComponentFixture<ListDeportistasdeCursoComponent>;
  let perfil$: BehaviorSubject<string>;
  let postClase: jasmine.Spy;
  let confirmarAsistencia: jasmine.Spy;
  let getClase: jasmine.Spy;
  let getAtencionesClase: jasmine.Spy;
  let snack: jasmine.Spy;
  let abrirDialogo: jasmine.Spy;
  let ahoraFijo: Date = JUEVES;

  const franja = (dia: string, ini = '14:00', fin = '16:00'): HorarioDTO => ({
    id: 1, categoria: 'Futbol', curso: 'Avanzado', anio: 2024, iterable: 1, dia, horaInicio: ini, horaFin: fin, escenario: 'Coliseo', eliminado: 0,
  });
  const todosLosDias = (): HorarioDTO[] => DIAS.map(d => franja(d));

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(sel: string): T | null => el().querySelector(sel) as T | null;
  const textoQ = (sel: string): string => q(sel)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const guardarBtn = (): HTMLButtonElement => q<HTMLButtonElement>('button.btn-registrar')!;
  const casilla = (nombre: string): HTMLInputElement =>
    Array.from(el().querySelectorAll('tr[mat-row]'))
      .find(tr => tr.textContent!.includes(nombre))!.querySelector('mat-checkbox input') as HTMLInputElement;
  const marcar = (nombre: string): void => { casilla(nombre).click(); fixture.detectChanges(); };
  const escribirEn = (sel: string, valor: string): void => {
    const campo = q<HTMLInputElement | HTMLTextAreaElement>(sel)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const guardar = (): void => { guardarBtn().click(); fixture.detectChanges(); };
  const justificacionValida = 'Clase de reposición por el partido del sábado';

  interface Opciones {
    rol?: string;
    ahora?: Date;
    horarios?: HorarioDTO[] | 'error' | Subject<HorarioDTO[]>;
    clases?: ClaseDTO[] | 'error';
    atenciones?: AtencionDTO[] | 'error' | Subject<AtencionDTO[]>;
  }

  const montar = async (o: Opciones = {}): Promise<void> => {
    TestBed.resetTestingModule();
    // El Instructor de estas pruebas es el titular del grupo ('inst-1'); el caso de otro grupo está en gestion-alumnos-grupo.
    sessionStorage.setItem('dpt_perfil_id', 'inst-1');
    ahoraFijo = o.ahora ?? JUEVES;
    // Hora de la interfaz inyectable: el componente la toma de ahora() (sin mockear el reloj global).
    const proto = ListDeportistasdeCursoComponent.prototype as any;
    if (!jasmine.isSpy(proto.ahora)) spyOn(proto, 'ahora').and.callFake(() => ahoraFijo);

    perfil$ = new BehaviorSubject<string>(o.rol ?? 'Coordinador');
    await TestBed.configureTestingModule({
      imports: [ListDeportistasdeCursoComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: PerfilService, useValue: { perfil$ } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ categoria: 'Futbol', curso: 'Avanzado', anio: '2024', iterable: '1' })) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ListDeportistasdeCursoComponent, { remove: { imports: [SidenavComponent] }, add: { schemas: [NO_ERRORS_SCHEMA] } })
      .compileComponents();

    fixture = TestBed.createComponent(ListDeportistasdeCursoComponent);
    component = fixture.componentInstance;
    const grupo: GrupoDTO = { categoria: 'Futbol', curso: 'Avanzado', anio: 2024, iterable: 1, idInstructor: 'inst-1', cupos: 10, fechaCreacion: '' };
    spyOn(component['grupoService'], 'getGrupo').and.returnValue(of(grupo));
    spyOn(component['alumnoService'], 'getAlumnosGrupo').and.returnValue(of([alumno(1, 'Ana'), alumno(2, 'Beto'), alumno(3, 'Caro')]));
    spyOn(component['inscripcionService'], 'getListaEspera').and.returnValue(of([]));
    const horarios$ = o.horarios === undefined ? of(todosLosDias()) : o.horarios === 'error' ? throwError(() => err(500)) : Array.isArray(o.horarios) ? of(o.horarios) : o.horarios;
    spyOn(component['horarioSerive'], 'getHorarios').and.returnValue(horarios$);
    spyOn(component['instructorService'], 'getInstructor').and.returnValue(of({ nombre: 'Prof' } as any));
    snack = spyOn(component['snackBar'], 'open').and.returnValue(null as any);
    abrirDialogo = spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of(true) } as any);
    postClase = spyOn(component['claseService'], 'postClase').and.callFake((c: ClaseDTO) => of({ ...c, codigo: 50 }));
    getClase = spyOn(component['claseService'], 'getClase').and.returnValue(o.clases === 'error' ? throwError(() => err(500)) : of(o.clases === undefined ? [] : o.clases));
    confirmarAsistencia = spyOn(component['asistenciaService'], 'confirmarAsistencia')
      .and.returnValue(of({ codigoClase: 50, confirmadaEn: '2026-10-15T12:00:00', presentes: 0, ausentes: 0 }));
    const atenciones$ = o.atenciones === 'error' ? throwError(() => err(500)) : o.atenciones instanceof Subject ? o.atenciones : of(o.atenciones === undefined ? [] : o.atenciones);
    getAtencionesClase = spyOn(component['asistenciaService'], 'getAtencionesClase').and.returnValue(atenciones$);
    fixture.detectChanges();
  };

  afterEach(() => { fixture?.destroy(); sessionStorage.removeItem('dpt_perfil_id'); });

  describe('sin calendario: la fecha es HOY', () => {
    beforeEach(() => montar());

    it('no hay calendario ni campo de fecha', () => {
      expect(q('mat-datepicker-toggle')).toBeNull();
      expect(q('mat-datepicker')).toBeNull();
      expect(q('input#fechaClase')).toBeNull();
      expect(q('.registro-asistencia input[type="date"]')).toBeNull();
    });

    it('ya no existen las propiedades del calendario', () => {
      for (const prop of ['fechaCtrl', 'ventana', 'filtroFecha', 'alElegirFecha', 'refrescarVentana', 'fechaActual']) {
        expect(prop in component).withContext(prop).toBeFalse();
      }
    });

    it('muestra la fecha de hoy en texto largo (calculada con ahora(), no congelada)', () => {
      expect(textoQ('.fecha-hoy')).toContain('jueves');
      expect(textoQ('.fecha-hoy')).toContain('15 de octubre de 2026');
      expect(textoQ('.fecha-hoy')).toContain('(hoy)');
    });

    it('el botón dice "Registrar asistencia del día 15/10/2026"', () => {
      expect(textoQ('button.btn-registrar')).toBe('Registrar asistencia del día 15/10/2026');
    });

    it('registra con la fecha de hoy en texto yyyy-MM-dd', () => {
      marcar('Ana');
      guardar();
      expect(postClase.calls.mostRecent().args[0].fecha).toBe('2026-10-15');
    });

    it('la fecha no se congela: si pasa la medianoche con la pantalla abierta, se registra el día nuevo', () => {
      marcar('Ana');
      ahoraFijo = octubre(16, 0, 0, 1);
      fixture.detectChanges();
      expect(textoQ('.fecha-hoy')).toContain('16 de octubre de 2026');
      // Las marcas en pantalla eran del día anterior: el primer clic las recarga para el día nuevo y no guarda.
      guardar();
      expect(postClase).not.toHaveBeenCalled();
      marcar('Ana');
      guardar();
      expect(postClase.calls.mostRecent().args[0].fecha).toBe('2026-10-16');
    });

    it('sin restricción de hora del día: 23:59:59 y 00:00:01 siguen siendo válidos', () => {
      for (const hora of [octubre(15, 23, 59, 59), octubre(15, 0, 0, 1)]) {
        ahoraFijo = hora;
        fixture.detectChanges();
        expect(guardarBtn().disabled).withContext(hora.toTimeString()).toBeFalse();
      }
    });

    it('no habla de crear o agregar una clase', () => {
      expect(el().textContent ?? '').not.toMatch(/crear (la |una )?clase|agregar (la |una )?clase|nueva clase/i);
    });
  });

  describe('Instructor: se valida con los días del horario del grupo', () => {
    const horarioMarJue = [franja('MARTES'), franja('JUEVES')];

    it('hoy es día de clase (jueves): habilita, muestra el horario de hoy y los días de clase', async () => {
      await montar({ rol: 'Instructor', horarios: horarioMarJue });
      expect(guardarBtn().disabled).toBeFalse();
      expect(textoQ('.horario-del-dia')).toBe('Horario de hoy: 2:00 p. m. a 4:00 p. m. (2 h)');
      expect(textoQ('.dias-de-clase')).toBe('Este grupo tiene clases los martes y jueves');
      expect(q('.aviso-horario')).toBeNull();
    });

    it('hoy NO es día de clase (miércoles): avisa con los días de clase y bloquea el registro', async () => {
      await montar({ rol: 'Instructor', horarios: horarioMarJue, ahora: octubre(14) });
      expect(textoQ('.hoy-sin-clase span')).toBe('Hoy no tienes clase asignada para este curso. Este grupo tiene clases los martes y jueves.');
      expect(q('.hoy-sin-clase')?.getAttribute('role')).toBe('alert');
      expect(guardarBtn().disabled).toBeTrue();
      expect(q('.horario-del-dia')).toBeNull();
      guardarBtn().click();
      expect(postClase).not.toHaveBeenCalled();
    });

    it('al pasar la medianoche a un día de clase se habilita sin recargar', async () => {
      await montar({ rol: 'Instructor', horarios: horarioMarJue, ahora: octubre(14, 23, 59, 59) });
      expect(guardarBtn().disabled).toBeTrue();
      ahoraFijo = octubre(15, 0, 0, 1);
      fixture.detectChanges();
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('grupo sin ningún horario: aviso para pedirlo al Coordinador y registro bloqueado', async () => {
      await montar({ rol: 'Instructor', horarios: [] });
      expect(textoQ('.sin-horario span')).toBe('Este grupo no tiene horario definido; pide al Coordinador que lo configure');
      expect(q('.sin-horario')?.getAttribute('role')).toBe('alert');
      expect(q('.dias-de-clase')).toBeNull();
      expect(guardarBtn().disabled).toBeTrue();
    });

    it('si el horario no se pudo cargar no inventa nada: sin avisos y decide el servidor', async () => {
      await montar({ rol: 'Instructor', horarios: 'error' });
      expect(q('.aviso-horario')).toBeNull();
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('mientras el horario carga no se puede registrar; al llegar se valida', async () => {
      const pendiente = new Subject<HorarioDTO[]>();
      await montar({ rol: 'Instructor', horarios: pendiente, ahora: octubre(14) });
      expect(guardarBtn().disabled).toBeTrue();
      expect(q('.aviso-horario')).toBeNull();
      pendiente.next(horarioMarJue);
      fixture.detectChanges();
      expect(textoQ('.hoy-sin-clase span')).toContain('Hoy no tienes clase asignada');
      expect(guardarBtn().disabled).toBeTrue();
    });

    it('NO muestra "Clase fuera de horario" en ningún caso (ni sin franja ni ante GC-0021)', async () => {
      await montar({ rol: 'Instructor', horarios: horarioMarJue, ahora: octubre(14) });
      expect(q('section.fuera-de-horario')).toBeNull();
      await montar({ rol: 'Instructor', horarios: 'error' });
      marcar('Ana');
      postClase.and.returnValue(throwError(() => err422('GC-0021', 'La justificación es requerida')));
      guardar();
      expect(q('section.fuera-de-horario')).toBeNull();
      expect(textoQ('.error-registro')).toBe('La justificación es requerida');
    });

    it('el 422 nuevo (día fuera de horario) muestra su mensaje en la región de alerta y conserva las marcas', async () => {
      await montar({ rol: 'Instructor', horarios: horarioMarJue });
      marcar('Ana');
      postClase.and.returnValue(throwError(() => err422('GC-0024', 'El Instructor solo puede registrar asistencia en los días del horario del grupo')));
      guardar();
      expect(textoQ('.error-registro')).toBe('El Instructor solo puede registrar asistencia en los días del horario del grupo');
      expect(q('.error-registro')?.getAttribute('role')).toBe('alert');
      expect(casilla('Ana').checked).toBeTrue();
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('varias franjas el mismo día: el día cuenta una vez, se suma la duración y se envía como informativa', async () => {
      await montar({ rol: 'Instructor', horarios: [franja('MARTES', '14:00', '16:00'), franja('MARTES', '18:00', '19:30')], ahora: octubre(13) });
      expect(textoQ('.dias-de-clase')).toBe('Este grupo tiene clases los martes');
      expect(textoQ('.horario-del-dia')).toContain('(3 h 30 min)');
      marcar('Ana');
      guardar();
      const enviado: ClaseDTO = postClase.calls.mostRecent().args[0];
      expect([enviado.horas, enviado.minutos]).toEqual([3, 30]);
      expect(enviado.justificacion).toBeUndefined();
    });

    it('reconoce el día aunque el dato venga con tilde o en minúsculas', async () => {
      await montar({ rol: 'Instructor', horarios: [franja('MIÉRCOLES')], ahora: octubre(14) });
      expect(guardarBtn().disabled).toBeFalse();
      expect(textoQ('.dias-de-clase')).toBe('Este grupo tiene clases los miércoles');
    });

    const semana: [string, number][] = [['LUNES', 12], ['MARTES', 13], ['MIERCOLES', 14], ['JUEVES', 15], ['VIERNES', 16], ['SABADO', 17], ['DOMINGO', 18]];
    for (const [nombre, dia] of semana) {
      it(`${nombre}: habilita solo cuando hoy es ${nombre} (nombres sin tildes)`, async () => {
        await montar({ rol: 'Instructor', horarios: [franja(nombre)], ahora: octubre(dia) });
        expect(guardarBtn().disabled).toBeFalse();
        expect(q('.horario-del-dia')).not.toBeNull();
        for (const [, otro] of semana.filter(([n]) => n !== nombre)) {
          ahoraFijo = octubre(otro);
          fixture.detectChanges();
          expect(guardarBtn().disabled).withContext(`${nombre} vs ${otro}`).toBeTrue();
        }
      });
    }
  });

  describe('Coordinador: único rol que puede registrar un día sin clase (con justificación y duración manual)', () => {
    const rol = 'Coordinador';
    const justificacionValida = 'Clase de reposición por el partido del sábado';
    const claseHoy: ClaseDTO = {
      codigo: 50, idGrupoCategoria: 'Futbol', idGrupoCurso: 'Avanzado', idGrupoAnio: 2024, idGrupoIterable: 1,
      idInstructor: 'inst-1', fecha: '2026-10-15', horas: 1, minutos: 0, observacion: '', eliminado: 0,
    };
    const completar = (justificacion = justificacionValida, horas = '1', minutos = '30'): void => {
      escribirEn('textarea#justificacion', justificacion);
      escribirEn('input#horasManual', horas);
      escribirEn('input#minutosManual', minutos);
    };
    /** Pulsa "Registrar asistencia" y dice si se llegó a registrar la clase (es decir, si los datos fueron aceptados). */
    const intentar = (): boolean => {
      postClase.calls.reset();
      guardarBtn().click();
      fixture.detectChanges();
      return postClase.calls.count() > 0;
    };
    const errores = (): string[] => Array.from(el().querySelectorAll('.error-fuera-horario')).map(e => e.textContent!.replace(/\s+/g, ' ').trim());
    const enfocado = (): string => (document.activeElement as HTMLElement | null)?.id ?? '';

    it('hoy con franja: sin justificación ni duración y habilitado', async () => {
      await montar({ rol, horarios: [franja('JUEVES')] });
      expect(q('section.fuera-de-horario')).toBeNull();
      expect(guardarBtn().disabled).toBeFalse();
      expect(textoQ('.horario-del-dia')).toContain('Horario de hoy');
    });

    it('hoy sin franja: aparece "Clase fuera de horario" con los campos y el botón "Registrar asistencia" está habilitado', async () => {
      await montar({ rol, horarios: [franja('MARTES')] });
      expect(textoQ('section.fuera-de-horario h3')).toBe('Clase fuera de horario');
      expect(q('textarea#justificacion')).not.toBeNull();
      expect(q('input#horasManual')).not.toBeNull();
      expect(q('input#minutosManual')).not.toBeNull();
      expect(q('.hoy-sin-clase')).toBeNull();
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('los campos tienen etiqueta asociada y la ayuda de los límites', async () => {
      await montar({ rol, horarios: [franja('MARTES')] });
      for (const id of ['justificacion', 'horasManual', 'minutosManual']) {
        expect(q(`label[for="${id}"]`)).withContext(id).not.toBeNull();
      }
      expect(textoQ('section.fuera-de-horario')).toContain('entre 10 y 500 caracteres');
      expect(textoQ('.contador-justificacion')).toBe('0/500');
    });

    it('fuera de horario NO se ofrece "Registrar novedad de clase no realizada" (solo el registro de la asistencia)', async () => {
      await montar({ rol, horarios: [franja('MARTES')] });
      expect(q('button.btn-novedad')).toBeNull();
      expect(q('button.btn-registrar')).not.toBeNull();
    });

    it('con franja hoy la novedad sigue disponible para el Coordinador', async () => {
      await montar({ rol, horarios: [franja('JUEVES')] });
      expect(q('button.btn-novedad')).not.toBeNull();
    });

    it('si el servidor exige justificación (horario no cargado) también se oculta la novedad', async () => {
      await montar({ rol, horarios: 'error' });
      expect(q('button.btn-novedad')).not.toBeNull();
      marcar('Ana');
      postClase.and.returnValue(throwError(() => err422('GC-0021', 'La justificación es requerida')));
      guardar();
      expect(q('button.btn-novedad')).toBeNull();
    });

    it('Instructor y Administrador conservan el botón de novedad (la sección fuera de horario no es suya)', async () => {
      for (const otro of ['Instructor', 'Administrador']) {
        await montar({ rol: otro, horarios: [franja('JUEVES')] });
        expect(q('button.btn-novedad')).withContext(otro).not.toBeNull();
      }
    });

    it('con campos vacíos al pulsar no se registra nada y se explica qué falta, con el foco en la justificación', async () => {
      await montar({ rol, horarios: [franja('MARTES')] });
      marcar('Ana');
      expect(errores()).toEqual([]);                 // antes de pulsar no se muestran errores
      expect(intentar()).toBeFalse();
      expect(confirmarAsistencia).not.toHaveBeenCalled();
      expect(errores()).toEqual([
        'La justificación es obligatoria: entre 10 y 500 caracteres.',
        'Indica la duración de la clase: mayor que 0 y de hasta 12 horas.',
      ]);
      expect(q('.error-fuera-horario')?.getAttribute('role')).toBe('alert');
      expect(enfocado()).toBe('justificacion');
      expect(casilla('Ana').checked).toBeTrue();     // las marcas no se pierden
      expect(guardarBtn().disabled).toBeFalse();
      expect(abrirDialogo).not.toHaveBeenCalled();
    });

    it('si la justificación es válida y falta la duración, el error es solo el de la duración y el foco va a las horas', async () => {
      await montar({ rol, horarios: [franja('MARTES')] });
      escribirEn('textarea#justificacion', justificacionValida);
      expect(intentar()).toBeFalse();
      expect(errores()).toEqual(['Indica la duración de la clase: mayor que 0 y de hasta 12 horas.']);
      expect(enfocado()).toBe('horasManual');
    });

    it('los campos inválidos se marcan con aria-invalid y apuntan a su mensaje; al corregirlos los errores se actualizan', async () => {
      await montar({ rol, horarios: [franja('MARTES')] });
      intentar();
      expect(q('textarea#justificacion')?.getAttribute('aria-invalid')).toBe('true');
      expect(q('input#horasManual')?.getAttribute('aria-invalid')).toBe('true');
      completar();
      expect(errores()).toEqual([]);
      expect(q('textarea#justificacion')?.getAttribute('aria-invalid')).toBeNull();
      expect(intentar()).toBeTrue();
    });

    it('con "ninguno marcado" y datos incompletos primero se piden los datos, no la confirmación de todos ausentes', async () => {
      await montar({ rol, horarios: [franja('MARTES')] });
      expect(intentar()).toBeFalse();
      expect(abrirDialogo).not.toHaveBeenCalled();
    });

    it('con justificación (10 a 500) y duración válida registra y envía la justificación sin espacios sobrantes y la duración manual', async () => {
      await montar({ rol, horarios: [franja('MARTES')] });
      completar(`  ${justificacionValida}  `, '1', '30');
      marcar('Ana');
      guardar();
      const enviado: ClaseDTO = postClase.calls.mostRecent().args[0];
      expect(enviado.justificacion).toBe(justificacionValida);
      expect([enviado.horas, enviado.minutos]).toEqual([1, 30]);
      expect(confirmarAsistencia).toHaveBeenCalledTimes(1);
    });

    it('justificación inválida (corta, solo espacios, vacía) no se acepta', async () => {
      await montar({ rol, horarios: [franja('MARTES')] });
      for (const texto of ['', 'corta', '         ', '   corta   ']) {
        completar(texto);
        expect(intentar()).withContext(`"${texto}"`).toBeFalse();
      }
    });

    it('justificación: 10 y 500 caracteres son válidos; 9 y 501 no (el contador cuenta el texto sin espacios sobrantes)', async () => {
      for (const [largo, valida] of [[9, false], [10, true], [500, true], [501, false]] as [number, boolean][]) {
        await montar({ rol, horarios: [franja('MARTES')] });
        completar('a'.repeat(largo));
        expect(intentar()).withContext(`${largo}`).toBe(valida);
      }
      await montar({ rol, horarios: [franja('MARTES')] });
      completar('a'.repeat(500));
      expect(textoQ('.contador-justificacion')).toBe('500/500');
    });

    it('duración: horas 0-12, minutos 0-59, total mayor que 0 y hasta 12 horas', async () => {
      const casos: [string, string, boolean][] = [
        ['1', '0', true], ['0', '1', true], ['12', '0', true], ['2', '59', true],
        ['0', '0', false], ['12', '1', false], ['13', '0', false], ['0', '60', false], ['-1', '30', false], ['', '', false], ['1.5', '0', false],
      ];
      for (const [h, m, valida] of casos) {
        await montar({ rol, horarios: [franja('MARTES')] });
        completar(justificacionValida, h, m);
        expect(intentar()).withContext(`${h}h ${m}min`).toBe(valida);
      }
    });

    it('si ya existe la clase de hoy no se vuelve a pedir justificación ni duración (el servidor la reutiliza)', async () => {
      await montar({ rol, horarios: [franja('MARTES')], clases: [claseHoy], atenciones: [{ idPerfil: '1', idClase: 50, estaAtendido: true }] });
      expect(q('section.fuera-de-horario')).toBeNull();
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('tras guardar con éxito la clase ya existe: la sección de justificación desaparece y el registro queda bloqueado', async () => {
      await montar({ rol, horarios: [franja('MARTES')] });
      completar();
      marcar('Ana');
      guardar();
      expect(q('section.fuera-de-horario')).toBeNull();
      expect(guardarBtn().disabled).toBeTrue();
      expect(textoQ('.aviso-registrada')).toContain('ya fue registrada');
    });

    it('el error del servidor se muestra, conserva lo escrito y las marcas, y permite corregir', async () => {
      await montar({ rol, horarios: [franja('MARTES')] });
      completar();
      marcar('Ana');
      postClase.and.returnValue(throwError(() => err422('GC-0022', 'La duración de la clase no es válida')));
      guardar();
      expect(textoQ('.error-registro')).toBe('La duración de la clase no es válida');
      expect((q('textarea#justificacion') as HTMLTextAreaElement).value).toBe(justificacionValida);
      expect(casilla('Ana').checked).toBeTrue();
      postClase.and.callFake((c: ClaseDTO) => of({ ...c, codigo: 50 }));
      completar(justificacionValida, '2', '0');
      guardar();
      expect([postClase.calls.mostRecent().args[0].horas, postClase.calls.mostRecent().args[0].minutos]).toEqual([2, 0]);
    });

    it('sin horario cargado (lista vacía): sin el aviso "sin horario" (es solo del Instructor) y con la sección', async () => {
      await montar({ rol, horarios: [] });
      expect(q('.sin-horario')).toBeNull();
      expect(q('section.fuera-de-horario')).not.toBeNull();
    });

    it('si hay franja hoy, no se envía justificación aunque se hubiera escrito antes de que cambiara el día', async () => {
      await montar({ rol, horarios: [franja('MARTES'), franja('JUEVES')], ahora: octubre(14) });   // miércoles: sin franja
      completar();
      ahoraFijo = JUEVES;                                                                          // pasa a jueves: con franja
      fixture.detectChanges();
      marcar('Ana');
      guardarBtn().click();    // primer clic: recarga marcas del día nuevo
      fixture.detectChanges();
      marcar('Ana');
      guardar();
      expect(postClase.calls.mostRecent().args[0].justificacion).toBeUndefined();
    });
  });

  describe('día sin clase: Instructor y Administrador no pueden subir asistencias ni faltas', () => {
    for (const rol of ['Instructor', 'Administrador']) {
      describe(rol, () => {
        beforeEach(() => montar({ rol, horarios: [franja('MARTES'), franja('JUEVES')], ahora: octubre(14) }));   // miércoles

        it('muestra "Hoy no tienes clase asignada para este curso" con los días de clase, en una región de alerta', () => {
          expect(textoQ('.hoy-sin-clase span')).toBe('Hoy no tienes clase asignada para este curso. Este grupo tiene clases los martes y jueves.');
          expect(q('.hoy-sin-clase')?.getAttribute('role')).toBe('alert');
        });

        it('el aviso no depende del color: lleva un icono decorativo (aria-hidden) además del texto', () => {
          const icono = q('.hoy-sin-clase mat-icon');
          expect(icono).not.toBeNull();
          expect(icono?.getAttribute('aria-hidden')).toBe('true');
        });

        it('las casillas de asistencia quedan deshabilitadas: no se puede marcar asistió ni falta', () => {
          for (const n of ['Ana', 'Beto', 'Caro']) expect(casilla(n).disabled).withContext(n).toBeTrue();
        });

        it('se ocultan la ayuda y los contadores de asistencia (no hay nada que registrar)', () => {
          expect(q('.ayuda-asistencia')).toBeNull();
          expect(q('.contadores-asistencia')).toBeNull();
        });

        it('el botón queda deshabilitado y apunta al aviso con aria-describedby', () => {
          expect(guardarBtn().disabled).toBeTrue();
          const id = guardarBtn().getAttribute('aria-describedby');
          expect(id).toBe('aviso-horario');
          expect(document.getElementById(id!)?.textContent).toContain('Hoy no tienes clase asignada');
        });

        it('no se puede registrar: el clic no crea nada y no aparece "Clase fuera de horario"', () => {
          guardarBtn().click();
          expect(postClase).not.toHaveBeenCalled();
          expect(abrirDialogo).not.toHaveBeenCalled();
          expect(q('section.fuera-de-horario')).toBeNull();
          expect(q('textarea#justificacion')).toBeNull();
        });

        it('el día de clase todo se habilita de nuevo (casillas, ayuda, contadores y botón)', () => {
          ahoraFijo = octubre(15);
          fixture.detectChanges();
          for (const n of ['Ana', 'Beto', 'Caro']) expect(casilla(n).disabled).withContext(n).toBeFalse();
          expect(q('.ayuda-asistencia')).not.toBeNull();
          expect(q('.contadores-asistencia')).not.toBeNull();
          expect(guardarBtn().disabled).toBeFalse();
          expect(guardarBtn().getAttribute('aria-describedby')).toBeNull();
          expect(q('.hoy-sin-clase')).toBeNull();
        });
      });
    }

    it('Administrador sin ningún horario: avisa y bloquea igual que el Instructor', async () => {
      await montar({ rol: 'Administrador', horarios: [] });
      expect(textoQ('.sin-horario span')).toBe('Este grupo no tiene horario definido; pide al Coordinador que lo configure');
      expect(guardarBtn().disabled).toBeTrue();
      expect(q('section.fuera-de-horario')).toBeNull();
    });

    it('el Coordinador NO queda bloqueado en un día sin clase (conserva el flujo fuera de horario)', async () => {
      await montar({ rol: 'Coordinador', horarios: [franja('MARTES')], ahora: octubre(14) });
      expect(q('.hoy-sin-clase')).toBeNull();
      expect(q('section.fuera-de-horario')).not.toBeNull();
      expect(casilla('Ana').disabled).toBeFalse();
    });
  });

  describe('lista de alumnos', () => {
    beforeEach(() => montar());

    it('muestra a TODOS los alumnos, cada uno con su casilla sin marcar y aria-label "Asistió: {nombre}"', () => {
      expect(el().querySelectorAll('tr[mat-row]').length).toBe(3);
      for (const n of ['Ana', 'Beto', 'Caro']) {
        expect(casilla(n).checked).withContext(n).toBeFalse();
        expect(casilla(n).getAttribute('aria-label')).toBe(`Asistió: ${n}`);
      }
    });

    it('contadores "Asistieron N, Faltaron M" en una región aria-live="polite"', () => {
      expect(q('.contadores-asistencia')?.getAttribute('aria-live')).toBe('polite');
      expect(textoQ('.contadores-asistencia')).toBe('Asistieron 0, Faltaron 3');
      marcar('Ana');
      marcar('Caro');
      expect(textoQ('.contadores-asistencia')).toBe('Asistieron 2, Faltaron 1');
      marcar('Ana');
      expect(textoQ('.contadores-asistencia')).toBe('Asistieron 1, Faltaron 2');
    });

    it('texto de ayuda: sin marcar = falta', () => {
      expect(textoQ('.ayuda-asistencia')).toContain('Marca a quienes asistieron');
      expect(textoQ('.ayuda-asistencia')).toContain('sin marcar se registra con falta');
    });

    it('las cabeceras de la tabla de alumnos tienen scope="col"', () => {
      const cabeceras = Array.from(el().querySelectorAll('.tabla-container th'));
      expect(cabeceras.length).toBeGreaterThan(0);
      expect(cabeceras.every(th => th.getAttribute('scope') === 'col')).toBeTrue();
    });

    it('sin div con (click)', () => {
      expect(el().querySelectorAll('div[ng-reflect-click], div[click]').length).toBe(0);
    });
  });

  describe('si el horario no se pudo cargar (Coordinador)', () => {
    beforeEach(() => montar({ rol: 'Coordinador', horarios: 'error' }));

    it('no inventa nada: sin texto de horario ni sección de justificación, y envía sin justificación', () => {
      expect(q('.horario-del-dia')).toBeNull();
      expect(q('section.fuera-de-horario')).toBeNull();
      marcar('Ana');
      guardar();
      expect(postClase.calls.mostRecent().args[0].justificacion).toBeUndefined();
    });

    it('ante GC-0021 se muestra la sección con los campos y se reintenta con la justificación y la duración', () => {
      marcar('Ana');
      postClase.and.returnValue(throwError(() => err422('GC-0021', 'La justificación es requerida para una clase fuera de horario')));
      guardar();
      expect(q('section.fuera-de-horario')).not.toBeNull();
      expect(q('textarea#justificacion')).not.toBeNull();
      expect(textoQ('.error-registro')).toBe('La justificación es requerida para una clase fuera de horario');
      expect(casilla('Ana').checked).toBeTrue();
      expect(guardarBtn().disabled).toBeFalse();
      postClase.calls.reset();
      guardarBtn().click();                       // con los campos vacíos no se envía
      fixture.detectChanges();
      expect(postClase).not.toHaveBeenCalled();
      postClase.and.callFake((c: ClaseDTO) => of({ ...c, codigo: 50 }));
      escribirEn('textarea#justificacion', 'Clase de reposición por el partido del sábado');
      escribirEn('input#horasManual', '2');
      escribirEn('input#minutosManual', '0');
      guardar();
      const enviado: ClaseDTO = postClase.calls.mostRecent().args[0];
      expect(enviado.justificacion).toBe('Clase de reposición por el partido del sábado');
      expect([enviado.horas, enviado.minutos]).toEqual([2, 0]);
    });

    it('ante error de duración se muestra el mensaje y se puede reintentar', () => {
      marcar('Ana');
      postClase.and.returnValue(throwError(() => err422('GC-0022', 'La duración manual no es válida')));
      guardar();
      expect(textoQ('.error-registro')).toBe('La duración manual no es válida');
      expect(casilla('Ana').checked).toBeTrue();
      postClase.and.callFake((c: ClaseDTO) => of({ ...c, codigo: 50 }));
      guardar();
      const enviado: ClaseDTO = postClase.calls.mostRecent().args[0];
      expect(enviado.justificacion).toBeUndefined();
    });
  });

  describe('guardar', () => {
    beforeEach(() => montar());

    it('con alumnos marcados: crea el registro del día y confirma con la lista completa (presentes y ausentes)', () => {
      marcar('Ana');
      marcar('Caro');
      guardar();
      const clase: ClaseDTO = postClase.calls.mostRecent().args[0];
      expect(clase.fecha).toBe('2026-10-15');
      expect([clase.idGrupoCategoria, clase.idGrupoCurso, clase.idGrupoAnio, clase.idGrupoIterable, clase.idInstructor])
        .toEqual(['Futbol', 'Avanzado', 2024, 1, 'inst-1']);
      expect(confirmarAsistencia).toHaveBeenCalledOnceWith(50, {
        asistencias: [
          { idPerfil: '1', estaAtendido: true },
          { idPerfil: '2', estaAtendido: false },
          { idPerfil: '3', estaAtendido: true },
        ],
      });
      expect(abrirDialogo).not.toHaveBeenCalled();
    });

    it('con alguien presente NO se envía confirmaTodosAusentes', () => {
      marcar('Ana');
      guardar();
      expect('confirmaTodosAusentes' in confirmarAsistencia.calls.mostRecent().args[1]).toBeFalse();
    });

    it('éxito: snackbar de éxito', () => {
      marcar('Ana');
      guardar();
      expect(snack).toHaveBeenCalledWith('Asistencia registrada correctamente', 'Cerrar', jasmine.objectContaining({ panelClass: ['snack-success'] }));
    });

    it('ninguno marcado: pide confirmación con el diálogo propio', () => {
      guardar();
      expect(abrirDialogo).toHaveBeenCalledOnceWith(ConfirmarSinAsistentesComponent, jasmine.any(Object));
      expect(postClase).toHaveBeenCalledTimes(1);
    });

    it('ninguno marcado y confirma: todos ausentes y confirmaTodosAusentes en true (confirmación explícita del usuario)', () => {
      guardar();
      expect(postClase).toHaveBeenCalledTimes(1);
      expect(confirmarAsistencia).toHaveBeenCalledOnceWith(50, {
        asistencias: [
          { idPerfil: '1', estaAtendido: false },
          { idPerfil: '2', estaAtendido: false },
          { idPerfil: '3', estaAtendido: false },
        ],
        confirmaTodosAusentes: true,
      });
    });

    it('ninguno marcado y "Volver": no se registra ni confirma nada', () => {
      abrirDialogo.and.returnValue({ afterClosed: () => of(false) } as any);
      guardar();
      expect(postClase).not.toHaveBeenCalled();
      expect(confirmarAsistencia).not.toHaveBeenCalled();
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('doble clic envía UNA sola petición y deja Guardar deshabilitado', () => {
      postClase.and.returnValue(new Subject<ClaseDTO>());
      marcar('Ana');
      guardarBtn().click();
      guardarBtn().click();
      expect(postClase).toHaveBeenCalledTimes(1);
      fixture.detectChanges();
      expect(guardarBtn().disabled).toBeTrue();
    });

    it('doble clic mientras la confirmación está en curso no envía un segundo PUT', () => {
      confirmarAsistencia.and.returnValue(new Subject<any>());
      marcar('Ana');
      guardarBtn().click();
      guardarBtn().click();
      expect(confirmarAsistencia).toHaveBeenCalledTimes(1);
      fixture.detectChanges();
      expect(guardarBtn().disabled).toBeTrue();
    });

    it('doble clic con la confirmación abierta tampoco abre dos', () => {
      abrirDialogo.and.returnValue({ afterClosed: () => new Subject<boolean>() } as any);
      guardarBtn().click();
      guardarBtn().click();
      expect(abrirDialogo).toHaveBeenCalledTimes(1);
    });

    it('tras guardar, la lista de alumnos se recarga (para actualizar las faltas)', () => {
      const getAlumnos = component['alumnoService'].getAlumnosGrupo as jasmine.Spy;
      getAlumnos.calls.reset();
      marcar('Ana');
      guardar();
      expect(getAlumnos).toHaveBeenCalledTimes(1);
    });

    it('si el guardado falla, la lista de alumnos no se recarga', () => {
      const getAlumnos = component['alumnoService'].getAlumnosGrupo as jasmine.Spy;
      getAlumnos.calls.reset();
      confirmarAsistencia.and.returnValue(throwError(() => err422('GC-0019', 'Plazo vencido')));
      marcar('Ana');
      guardar();
      expect(getAlumnos).not.toHaveBeenCalled();
    });
  });

  describe('errores', () => {
    beforeEach(async () => {
      await montar();
      marcar('Ana');
    });

    for (const [codigo, mensaje] of [
      ['GC-0018', 'No se puede registrar asistencia de una fecha futura'],
      ['GC-0019', 'El plazo para registrar la asistencia de ese mes venció'],
      ['GC-0022', 'La duración manual no es válida'],
    ]) {
      it(`${codigo}: muestra el mensaje del servidor en una región de alerta y conserva las marcas`, () => {
        postClase.and.returnValue(throwError(() => err422(codigo, mensaje)));
        guardar();
        expect(textoQ('.error-registro')).toBe(mensaje);
        expect(q('.error-registro')?.getAttribute('role')).toBe('alert');
        expect(casilla('Ana').checked).toBeTrue();
        expect(guardarBtn().disabled).toBeFalse();
      });
    }

    it('error al confirmar la asistencia (con el día ya creado): mensaje, conserva marcas y se puede reintentar', () => {
      confirmarAsistencia.and.returnValue(throwError(() => err422('GC-0019', 'Plazo vencido')));
      guardar();
      expect(textoQ('.error-registro')).toBe('Plazo vencido');
      expect(casilla('Ana').checked).toBeTrue();
      confirmarAsistencia.and.returnValue(of({ codigoClase: 50, confirmadaEn: '2026-10-15T12:00:00', presentes: 1, ausentes: 2 }));
      guardar();
      expect(snack).toHaveBeenCalledWith('Asistencia registrada correctamente', 'Cerrar', jasmine.any(Object));
      expect(q('.error-registro')).toBeNull();
    });

    for (const [status, mensaje] of [[403, 'El Instructor no tiene a cargo el grupo de esta clase'], [404, 'La clase no existe o está eliminada']] as [number, string][]) {
      it(`${status} con mensaje del servidor: lo muestra y conserva las marcas`, () => {
        confirmarAsistencia.and.returnValue(throwError(() => err(status, { mensaje })));
        guardar();
        expect(textoQ('.error-registro')).toBe(mensaje);
        expect(casilla('Ana').checked).toBeTrue();
      });
    }

    it('GC-0027 (alumno fuera del grupo): muestra el mensaje y recarga la lista de alumnos', () => {
      const getAlumnos = component['alumnoService'].getAlumnosGrupo as jasmine.Spy;
      getAlumnos.calls.reset();
      confirmarAsistencia.and.returnValue(throwError(() => err422('GC-0027', 'El alumno 3 no tiene una inscripción activa en el grupo de esta clase')));
      guardar();
      expect(textoQ('.error-registro')).toContain('no tiene una inscripción activa');
      expect(getAlumnos).toHaveBeenCalledTimes(1);
    });

    it('errores sin cuerpo (500, 403): mensaje genérico', () => {
      postClase.and.returnValue(throwError(() => err(500)));
      guardar();
      expect(textoQ('.error-registro')).toContain('No se pudo registrar la asistencia');
      postClase.and.callFake((c: ClaseDTO) => of({ ...c, codigo: 50 }));
      confirmarAsistencia.and.returnValue(throwError(() => err(403)));
      guardar();
      expect(textoQ('.error-registro')).toContain('No se pudo registrar la asistencia');
    });

    it('un nuevo intento limpia el error anterior', () => {
      postClase.and.returnValue(throwError(() => err(500)));
      guardar();
      expect(q('.error-registro')).not.toBeNull();
      postClase.and.returnValue(new Subject<ClaseDTO>());
      guardar();
      expect(q('.error-registro')).toBeNull();
    });
  });

  describe('asistencia de hoy ya registrada', () => {
    const claseExistente: ClaseDTO = {
      codigo: 50, idGrupoCategoria: 'Futbol', idGrupoCurso: 'Avanzado', idGrupoAnio: 2024, idGrupoIterable: 1,
      idInstructor: 'inst-1', fecha: '2026-10-15', horas: 2, minutos: 0, observacion: '', eliminado: 0,
    };
    const previas: AtencionDTO[] = [
      { idPerfil: '1', idClase: 50, estaAtendido: true },
      { idPerfil: '2', idClase: 50, estaAtendido: false },
    ];
    const avisoMarcas = (): string => textoQ('.error-marcas');

    it('al abrir la pantalla precarga las marcas de hoy: asistió = marcado; faltó o sin registro = sin marcar', async () => {
      await montar({ clases: [claseExistente], atenciones: previas });
      expect(getClase).toHaveBeenCalledTimes(1);
      expect(getAtencionesClase).toHaveBeenCalledWith(50);
      expect(casilla('Ana').checked).toBeTrue();
      expect(casilla('Beto').checked).toBeFalse();
      expect(casilla('Caro').checked).toBeFalse();
      expect(textoQ('.contadores-asistencia')).toBe('Asistieron 1, Faltaron 2');
    });

    it('si no hay clase de hoy las marcas quedan en blanco', async () => {
      await montar({ clases: [{ ...claseExistente, fecha: '2026-10-14' }], atenciones: previas });
      expect(getAtencionesClase).not.toHaveBeenCalled();
      expect(textoQ('.contadores-asistencia')).toBe('Asistieron 0, Faltaron 3');
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('mientras carga las marcas avisa y no deja guardar contra una base incompleta', async () => {
      const pendiente = new Subject<AtencionDTO[]>();
      await montar({ clases: [claseExistente], atenciones: pendiente });
      expect(textoQ('.cargando-marcas')).toContain('Cargando');
      expect(guardarBtn().disabled).toBeTrue();
      pendiente.next(previas);
      fixture.detectChanges();
      expect(q('.cargando-marcas')).toBeNull();
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('al guardar envía el estado completo: nuevos presentes, desmarcados como ausentes y el resto igual', async () => {
      await montar({ clases: [claseExistente], atenciones: previas });
      marcar('Ana');    // desmarca (estaba asistida)
      marcar('Caro');   // marca nueva
      guardar();
      expect(confirmarAsistencia).toHaveBeenCalledOnceWith(50, {
        asistencias: [
          { idPerfil: '1', estaAtendido: false },
          { idPerfil: '2', estaAtendido: false },
          { idPerfil: '3', estaAtendido: true },
        ],
      });
    });

    it('sin cambios reenvía el mismo estado (idempotente): nadie pasa a ausente por omisión', async () => {
      await montar({ clases: [claseExistente], atenciones: previas });
      guardar();
      expect(confirmarAsistencia).toHaveBeenCalledOnceWith(50, {
        asistencias: [
          { idPerfil: '1', estaAtendido: true },
          { idPerfil: '2', estaAtendido: false },
          { idPerfil: '3', estaAtendido: false },
        ],
      });
    });

    it('desmarcar a todos los que estaban: pide confirmación y envía confirmaTodosAusentes', async () => {
      await montar({ clases: [claseExistente], atenciones: previas });
      marcar('Ana');
      guardar();
      expect(abrirDialogo).toHaveBeenCalledWith(ConfirmarSinAsistentesComponent, jasmine.any(Object));
      expect(confirmarAsistencia.calls.mostRecent().args[1].confirmaTodosAusentes).toBeTrue();
      expect(confirmarAsistencia.calls.mostRecent().args[1].asistencias.every((a: any) => a.estaAtendido === false)).toBeTrue();
    });

    it('un error al confirmar (422) muestra el mensaje del servidor y conserva el formulario', async () => {
      await montar({ clases: [claseExistente], atenciones: previas });
      confirmarAsistencia.and.returnValue(throwError(() => err422('GC-0019', 'Plazo vencido para el Instructor')));
      marcar('Ana');
      marcar('Caro');
      guardar();
      expect(textoQ('.error-registro')).toBe('Plazo vencido para el Instructor');
      expect(casilla('Caro').checked).toBeTrue();
    });

    it('si el historial de clases no se pudo consultar BLOQUEA guardar (evita sobrescribir lo ya registrado) y avisa', async () => {
      await montar({ clases: 'error' });
      expect(guardarBtn().disabled).toBeTrue();
      expect(avisoMarcas()).toContain('No se pudo leer la asistencia ya registrada de hoy');
      expect(q('.error-marcas')?.getAttribute('role')).toBe('alert');
      expect(casilla('Ana').disabled).toBeTrue();
      guardarBtn().click();
      expect(postClase).not.toHaveBeenCalled();
      expect(confirmarAsistencia).not.toHaveBeenCalled();
    });

    it('si las clases se leen pero no las atenciones de la clase de hoy, también bloquea', async () => {
      await montar({ clases: [claseExistente], atenciones: 'error' });
      expect(guardarBtn().disabled).toBeTrue();
      expect(avisoMarcas()).toContain('No se pudo leer la asistencia ya registrada de hoy');
      expect(casilla('Ana').checked).toBeFalse();
    });

    it('"Reintentar" vuelve a leer las marcas y, si salen bien, habilita el guardado con lo ya registrado', async () => {
      await montar({ clases: 'error' });
      getClase.and.returnValue(of([claseExistente]));
      getAtencionesClase.and.returnValue(of(previas));
      q<HTMLButtonElement>('.btn-reintentar-marcas')!.click();
      fixture.detectChanges();
      expect(q('.error-marcas')).toBeNull();
      expect(guardarBtn().disabled).toBeFalse();
      expect(casilla('Ana').checked).toBeTrue();
    });

    it('clase de hoy sin ninguna fila (200 con GC-0002, listado vacío): sin marcas y sin bloqueo', async () => {
      await montar({ clases: [claseExistente], atenciones: { codigoError: 'GC-0002', mensaje: 'Listado vacío', codigoHttp: 200 } as any });
      expect(q('.error-marcas')).toBeNull();
      expect(guardarBtn().disabled).toBeFalse();
      expect(textoQ('.contadores-asistencia')).toBe('Asistieron 0, Faltaron 3');
    });

    describe('respuesta 200 de las atenciones que no es una lista ni GC-0002: error de lectura, no lista vacía', () => {
      const invalidas: [string, any][] = [
        ['otro código (GC-0099)', { codigoError: 'GC-0099', mensaje: 'x', codigoHttp: 200 }],
        ['null', null],
        ['una cadena', 'ok'],
        ['un objeto sin codigoError', { mensaje: 'sin código' }],
      ];
      for (const [nombre, cuerpo] of invalidas) {
        it(`${nombre}: bloquea el guardado, avisa con "Reintentar" y no envía nada`, async () => {
          await montar({ clases: [claseExistente], atenciones: cuerpo });
          expect(guardarBtn().disabled).toBeTrue();
          expect(textoQ('.error-marcas')).toContain('No se pudo leer la asistencia ya registrada de hoy');
          expect(q('.error-marcas')?.getAttribute('role')).toBe('alert');
          expect(q('.btn-reintentar-marcas')).not.toBeNull();
          expect(casilla('Ana').disabled).toBeTrue();
          expect(casilla('Ana').checked).toBeFalse();
          guardarBtn().click();
          expect(postClase).not.toHaveBeenCalled();
          expect(confirmarAsistencia).not.toHaveBeenCalled();
        });
      }

      it('"Reintentar" con una lectura correcta desbloquea y carga las marcas reales', async () => {
        await montar({ clases: [claseExistente], atenciones: { codigoError: 'GC-0099' } as any });
        getAtencionesClase.and.returnValue(of(previas));
        q<HTMLButtonElement>('.btn-reintentar-marcas')!.click();
        fixture.detectChanges();
        expect(q('.error-marcas')).toBeNull();
        expect(guardarBtn().disabled).toBeFalse();
        expect(casilla('Ana').checked).toBeTrue();
      });

      it('"Reintentar" con GC-0002 desbloquea con las marcas en blanco', async () => {
        await montar({ clases: [claseExistente], atenciones: 'error' });
        getAtencionesClase.and.returnValue(of({ codigoError: 'GC-0002' } as any));
        q<HTMLButtonElement>('.btn-reintentar-marcas')!.click();
        fixture.detectChanges();
        expect(q('.error-marcas')).toBeNull();
        expect(guardarBtn().disabled).toBeFalse();
      });
    });

    it('grupo sin clases (200 con GC-0002, listado vacío): sin marcas y sin bloqueo', async () => {
      await montar({ clases: { codigoError: 'GC-0002', mensaje: 'Listado vacío', codigoHttp: 200 } as any });
      expect(q('.error-marcas')).toBeNull();
      expect(guardarBtn().disabled).toBeFalse();
      expect(getAtencionesClase).not.toHaveBeenCalled();
    });

    describe('respuesta 200 de /clasesGrupo que no es una lista ni GC-0002: error de lectura, no "no hay clases"', () => {
      const invalidas: [string, any][] = [
        ['otro código (GC-0099)', { codigoError: 'GC-0099', mensaje: 'x', codigoHttp: 200 }],
        ['el código anterior GC-0001', { codigoError: 'GC-0001', mensaje: 'Listado vacío' }],
        ['null', null],
        ['una cadena', 'ok'],
        ['un objeto sin codigoError', { mensaje: 'sin código' }],
      ];
      for (const [nombre, cuerpo] of invalidas) {
        it(`${nombre}: bloquea el guardado, avisa con "Reintentar" y no envía nada`, async () => {
          await montar({ clases: cuerpo });
          expect(guardarBtn().disabled).toBeTrue();
          expect(textoQ('.error-marcas')).toContain('No se pudo leer la asistencia ya registrada de hoy');
          expect(q('.error-marcas')?.getAttribute('role')).toBe('alert');
          expect(q('.btn-reintentar-marcas')).not.toBeNull();
          expect(casilla('Ana').disabled).toBeTrue();
          guardarBtn().click();
          expect(postClase).not.toHaveBeenCalled();
          expect(confirmarAsistencia).not.toHaveBeenCalled();
          expect(getAtencionesClase).not.toHaveBeenCalled();
        });
      }

      it('"Reintentar" con una lectura correcta desbloquea y carga las marcas reales', async () => {
        await montar({ clases: { codigoError: 'GC-0099' } as any });
        getClase.and.returnValue(of([claseExistente]));
        getAtencionesClase.and.returnValue(of(previas));
        q<HTMLButtonElement>('.btn-reintentar-marcas')!.click();
        fixture.detectChanges();
        expect(q('.error-marcas')).toBeNull();
        expect(guardarBtn().disabled).toBeFalse();
        expect(casilla('Ana').checked).toBeTrue();
      });

      it('"Reintentar" con GC-0002 desbloquea con las marcas en blanco', async () => {
        await montar({ clases: 'error' });
        getClase.and.returnValue(of({ codigoError: 'GC-0002' } as any));
        q<HTMLButtonElement>('.btn-reintentar-marcas')!.click();
        fixture.detectChanges();
        expect(q('.error-marcas')).toBeNull();
        expect(guardarBtn().disabled).toBeFalse();
      });
    });

    it('tras guardar, un segundo clic no reenvía nada (el registro queda bloqueado)', async () => {
      await montar();
      marcar('Ana');
      guardar();
      guardar();
      expect(confirmarAsistencia).toHaveBeenCalledTimes(1);
      expect(postClase).toHaveBeenCalledTimes(1);
    });

    it('si pasó la medianoche, las marcas en pantalla son del día anterior: el clic las recarga, avisa y NO guarda; el siguiente guarda el día nuevo', async () => {
      await montar({ clases: [claseExistente], atenciones: previas });
      ahoraFijo = octubre(16, 0, 0, 1);
      fixture.detectChanges();
      expect(guardarBtn().disabled).toBeFalse();
      getClase.calls.reset();
      guardar();
      expect(getClase).toHaveBeenCalledTimes(1);
      expect(postClase).not.toHaveBeenCalled();
      expect(confirmarAsistencia).not.toHaveBeenCalled();
      expect(textoQ('.error-registro')).toContain('Cambió el día');
      expect(casilla('Ana').checked).toBeFalse();   // las marcas de ayer no pasan al día nuevo
      marcar('Caro');
      guardar();
      expect(postClase.calls.mostRecent().args[0].fecha).toBe('2026-10-16');
      expect(confirmarAsistencia.calls.mostRecent().args[1].asistencias.find((a: any) => a.idPerfil === '1').estaAtendido).toBeFalse();
      expect(q('.error-registro')).toBeNull();
    });
  });

  describe('asistencia de hoy ya registrada: botones bloqueados y mensaje', () => {
    const confirmada: ClaseDTO = {
      codigo: 50, idGrupoCategoria: 'Futbol', idGrupoCurso: 'Avanzado', idGrupoAnio: 2024, idGrupoIterable: 1,
      idInstructor: 'inst-1', fecha: '2026-10-15', horas: 2, minutos: 0, observacion: '', eliminado: 0,
      asistenciaConfirmadaEn: '2026-10-15T09:00:00',
    };
    const pendiente: ClaseDTO = { ...confirmada, asistenciaConfirmadaEn: null };
    const filas: AtencionDTO[] = [
      { idPerfil: '1', idClase: 50, estaAtendido: true },
      { idPerfil: '2', idClase: 50, estaAtendido: false },
      { idPerfil: '3', idClase: 50, estaAtendido: false },
    ];
    const novedadBtn = (): HTMLButtonElement => q<HTMLButtonElement>('button.btn-novedad')!;
    const aviso = (): string => textoQ('.aviso-registrada');

    for (const rol of ['Instructor', 'Coordinador']) {
      describe(rol, () => {
        it('al abrir la pantalla con la asistencia de hoy ya confirmada: bloquea ambos botones y las casillas y avisa', async () => {
          await montar({ rol, clases: [confirmada], atenciones: filas });
          expect(guardarBtn().disabled).toBeTrue();
          expect(novedadBtn().disabled).toBeTrue();
          expect(casilla('Ana').disabled).toBeTrue();
          expect(aviso()).toContain('La asistencia de hoy (15/10/2026) ya fue registrada');
          expect(q('.aviso-registrada')?.getAttribute('role')).toBe('status');
          expect(textoQ('.contadores-asistencia')).toBe('Asistieron 1, Faltaron 2');   // el resumen sigue visible
          expect(q('.ayuda-asistencia')).toBeNull();                                    // ya no hay nada que marcar
        });

        it('al registrar la asistencia: bloquea ambos botones y las casillas y muestra el mensaje, sin recargar la página', async () => {
          await montar({ rol });
          expect(q('.aviso-registrada')).toBeNull();
          marcar('Ana');
          guardar();
          expect(guardarBtn().disabled).toBeTrue();
          expect(novedadBtn().disabled).toBeTrue();
          expect(casilla('Ana').disabled).toBeTrue();
          expect(aviso()).toContain('La asistencia de hoy (15/10/2026) ya fue registrada');
        });

        it('los botones apuntan al mensaje con aria-describedby', async () => {
          await montar({ rol, clases: [confirmada], atenciones: filas });
          const id = q('.aviso-registrada')!.id;
          expect(id).not.toBe('');
          expect(guardarBtn().getAttribute('aria-describedby')).toBe(id);
          expect(novedadBtn().getAttribute('aria-describedby')).toBe(id);
        });

        it('aunque se invoque, no vuelve a enviar nada', async () => {
          await montar({ rol, clases: [confirmada], atenciones: filas });
          component.registrarAsistencia();
          expect(postClase).not.toHaveBeenCalled();
          expect(confirmarAsistencia).not.toHaveBeenCalled();
          expect(component.puedeRegistrarNovedad).toBeFalse();
        });
      });
    }

    it('clase de hoy sin confirmar (pendiente o histórica): no se bloquea ni se avisa', async () => {
      await montar({ rol: 'Instructor', clases: [pendiente], atenciones: filas });
      expect(guardarBtn().disabled).toBeFalse();
      expect(novedadBtn().disabled).toBeFalse();
      expect(q('.aviso-registrada')).toBeNull();
    });

    it('clase de hoy sin el campo de confirmación (backend anterior): no se bloquea', async () => {
      const { asistenciaConfirmadaEn, ...sinCampo } = confirmada;
      await montar({ rol: 'Instructor', clases: [sinCampo as ClaseDTO], atenciones: filas });
      expect(guardarBtn().disabled).toBeFalse();
      expect(q('.aviso-registrada')).toBeNull();
    });

    it('sin clase de hoy: sin bloqueo ni aviso', async () => {
      await montar({ rol: 'Instructor', clases: [{ ...confirmada, fecha: '2026-10-14' }] });
      expect(guardarBtn().disabled).toBeFalse();
      expect(novedadBtn().disabled).toBeFalse();
      expect(q('.aviso-registrada')).toBeNull();
    });

    it('un guardado fallido no bloquea nada', async () => {
      await montar({ rol: 'Instructor' });
      confirmarAsistencia.and.returnValue(throwError(() => err422('GC-0019', 'Plazo vencido')));
      marcar('Ana');
      guardar();
      expect(guardarBtn().disabled).toBeFalse();
      expect(q('.aviso-registrada')).toBeNull();
    });

    it('si pasa la medianoche el bloqueo del día anterior se levanta: el siguiente clic recarga las marcas del día nuevo', async () => {
      await montar({ rol: 'Instructor', clases: [confirmada], atenciones: filas });
      expect(guardarBtn().disabled).toBeTrue();
      ahoraFijo = octubre(16, 0, 0, 1);
      fixture.detectChanges();
      expect(guardarBtn().disabled).toBeFalse();
      expect(novedadBtn().disabled).toBeFalse();
      expect(q('.aviso-registrada')).toBeNull();
    });

    it('la pista para corregir desde el historial solo aparece donde existe el historial (Coordinador e Instructor)', async () => {
      await montar({ rol: 'Instructor', clases: [confirmada], atenciones: filas });
      expect(aviso()).toContain('historial de clases');
      await montar({ rol: 'Administrador', clases: [confirmada], atenciones: filas });
      expect(aviso()).toContain('ya fue registrada');
      expect(aviso()).not.toContain('historial de clases');
    });
  });

  describe('GC-0024 (día fuera de horario) también al confirmar la asistencia', () => {
    for (const rol of ['Instructor', 'Administrador']) {
      it(`${rol}: el 422 de PUT /clase/{codigo}/asistencia muestra el mensaje del servidor, sin revelar justificación y conservando las marcas`, async () => {
        await montar({ rol });
        marcar('Ana');
        confirmarAsistencia.and.returnValue(throwError(() => err422('GC-0024', 'Solo puedes registrar asistencia en los días de clase del grupo')));
        guardar();
        expect(textoQ('.error-registro')).toBe('Solo puedes registrar asistencia en los días de clase del grupo');
        expect(q('.error-registro')?.getAttribute('role')).toBe('alert');
        expect(q('section.fuera-de-horario')).toBeNull();
        expect(casilla('Ana').checked).toBeTrue();
        expect(guardarBtn().disabled).toBeFalse();
      });
    }
  });

  describe('historial de clases: muestra la justificación cuando la clase la tiene', () => {
    const claseHistorial = (codigo: number, fecha: string, justificacion?: string | null): ClaseDTO => ({
      codigo, idGrupoCategoria: 'Futbol', idGrupoCurso: 'Avanzado', idGrupoAnio: 2024, idGrupoIterable: 1,
      idInstructor: 'inst-1', fecha, horas: 2, minutos: 0, observacion: '', eliminado: 0, justificacion,
    });
    const justificaciones = (): string[] =>
      Array.from(el().querySelectorAll('.clase-justificacion')).map(p => p.textContent!.replace(/\s+/g, ' ').trim().normalize('NFC'));

    beforeEach(async () => {
      await montar({
        clases: [
          claseHistorial(1, '2026-10-13', 'Cancha cerrada por lluvia'),
          claseHistorial(2, '2026-10-08'),
          claseHistorial(3, '2026-10-06', '   '),
          claseHistorial(4, '2026-10-01', null),
        ],
      });
      component.cargarHistorial();
      fixture.detectChanges();
    });

    it('solo las clases con justificación la muestran, con el rótulo "Justificación:"', () => {
      expect(el().querySelectorAll('.clase-item').length).toBe(4);
      expect(justificaciones()).toEqual(['Justificación: Cancha cerrada por lluvia'.normalize('NFC')]);
    });

    it('la justificación está en el mismo bloque de la clase (no suelta), como texto y no solo por color', () => {
      const item = el().querySelector('.clase-item') as HTMLElement;
      expect(item.querySelector('.clase-justificacion')).not.toBeNull();
      expect((item.querySelector('.clase-justificacion strong')?.textContent?.trim() ?? '').normalize('NFC')).toBe('Justificación:'.normalize('NFC'));
    });

    it('una clase sin justificación, vacía o solo con espacios no muestra el rótulo', () => {
      const items = Array.from(el().querySelectorAll('.clase-item'));
      for (const i of [1, 2, 3]) expect(items[i].querySelector('.clase-justificacion')).withContext(`clase ${i}`).toBeNull();
    });

    it('el texto de la justificación no se interpreta como HTML', () => {
      component.clases = [claseHistorial(9, '2026-10-13', '<b>negrita</b> y <script>alert(1)</script>')];
      fixture.detectChanges();
      const p = el().querySelector('.clase-justificacion') as HTMLElement;
      expect(p.querySelector('b')).toBeNull();
      expect(p.textContent).toContain('<b>negrita</b>');
    });
  });

  describe('inscribirAlumno: la fecha de inscripción tampoco está congelada', () => {
    beforeEach(() => montar());

    it('se calcula al momento de la acción, en texto yyyy-MM-dd', () => {
      abrirDialogo.and.returnValue({ afterClosed: () => of({ confirmacionCreacion: true, idAlumno: 9 }) } as any);
      const post = spyOn(component['inscripcionService'], 'postInscripcion').and.returnValue(of(null as any));
      component.inscribirAlumno();
      expect(post.calls.mostRecent().args[0].fechaInscripcion).toBe(formatoLocal(ahoraFijo));
    });
  });

  describe('código muerto retirado', () => {
    beforeEach(() => montar());

    it('ya no existen la selección antigua ni la duración fija de 1 h', () => {
      expect('seleccionados' in component).toBeFalse();
      expect('toggleSelection' in component).toBeFalse();
      expect('isSelected' in component).toBeFalse();
    });
  });
});
