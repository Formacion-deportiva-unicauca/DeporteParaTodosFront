import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { SidenavStub } from 'src/app/testing/sidenav-stub';
import { ListGruposComponent } from './list-grupos.component';
import { GrupoService } from 'src/app/services/grupo.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { HorarioService } from 'src/app/services/horario.service';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';

const grupo = (iterable: number, extra: object = {}) =>
  ({ anio: 2026, periodo: 1, iterable, estadoGrupo: 'ACTIVO', idInstructor: null, inscripcionesAbiertas: true, ...extra } as any);

const franja = (dia: string, horaInicio: string, horaFin: string) => ({ id: 1, dia, horaInicio, horaFin, escenario: 'Cancha', eliminado: 0 });

/** Inscripción del Alumno en otro curso (Yoga, grupo A, 2026-1, lunes 18:00-19:30). */
const yoga = (extra: object = {}) => ({
  categoria: 'Recreativo', curso: 'Yoga', anio: 2026, iterable: 1, periodo: 1, estado: 'INSCRITO', nombreInstructor: null,
  grupoActivo: true, fechaFinalizacion: null,
  horarios: [{ id: 9, categoria: 'Recreativo', curso: 'Yoga', anio: 2026, iterable: 1, dia: 'LUNES', horaInicio: '18:00', horaFin: '19:30', escenario: null }],
  ...extra,
} as any);

const TEXTO = 'Se cruza con Yoga, grupo A, lunes 18:00-19:30';

/** Lista de grupos: aviso de cruce de horarios y "Inscribirme" deshabilitado para el Alumno (el backend sigue decidiendo). */
describe('ListGruposComponent › cruce de horarios', () => {
  let fixture: ComponentFixture<ListGruposComponent>;
  let el: HTMLElement;
  let perfil$: BehaviorSubject<string>;
  let misCursos: jasmine.Spy;
  let getHorarios: jasmine.Spy;
  let grupos: jasmine.SpyObj<GrupoService>;

  const tarjetas = (): HTMLElement[] => Array.from(el.querySelectorAll('mat-card.tarjeta-grupo')) as HTMLElement[];
  const inscribirme = (t: HTMLElement): HTMLButtonElement | null => t.querySelector('.btn-inscribirme');
  const aviso = (t: HTMLElement): HTMLElement | null => t.querySelector('.aviso-cruce');

  const crear = (): void => {
    fixture = TestBed.createComponent(ListGruposComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    grupos = jasmine.createSpyObj('GrupoService', ['getGrupos', 'cambiarCierreInscripciones']);
    // Grupo 1 (lunes 18:00-20:00) se cruza con Yoga; grupo 2 (martes) no.
    grupos.getGrupos.and.returnValue(of([grupo(1), grupo(2)]));
    getHorarios = jasmine.createSpy('getHorarios').and.callFake((_c: string, _n: string, _a: number, iterable: number) =>
      of(iterable === 1 ? [franja('LUNES', '18:00', '20:00')] : [franja('MARTES', '18:00', '20:00')]));
    const imagenes = jasmine.createSpyObj('ImagenService', ['getimagen']);
    imagenes.getimagen.and.returnValue(of({} as any));
    perfil$ = new BehaviorSubject<string>('Alumno');
    misCursos = jasmine.createSpy('getMisCursos').and.returnValue(of([yoga()]));

    await TestBed.configureTestingModule({
      imports: [ListGruposComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: PerfilService, useValue: { perfil$: perfil$.asObservable() } },
        { provide: GrupoService, useValue: grupos },
        { provide: CursodeportivoService, useValue: { getCurso: () => of({ nombre: 'Natación', deporte: 'F', categoriaCurso: 'Recreativo', descripcion: 'D', estadoCurso: 'ACTIVO', estadoInscripciones: 'ABIERTO', idImagen: null }) } },
        { provide: ImagenService, useValue: imagenes },
        { provide: InstructorServisce, useValue: { getInstructor: () => of({}) } },
        { provide: HorarioService, useValue: { getHorarios } },
        { provide: InscripcionesService, useValue: { getDisponibilidad: () => of({ cuposTotales: 10, cuposDisponibles: 4, tamanoListaEspera: 0 }), getMisCursos: misCursos } },
        { provide: NotificacionService, useValue: jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']) },
        { provide: MatDialog, useValue: { open: jasmine.createSpy() } },
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false }) } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ categoria: 'Recreativo', curso: 'Natación' })) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ListGruposComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
      .compileComponents();
  });

  it('con cruce: "Inscribirme" deshabilitado y el aviso visible (role=status) con el texto del backend', () => {
    crear();
    const [g1, g2] = tarjetas();

    expect(inscribirme(g1)!.disabled).toBeTrue();
    expect(aviso(g1)!.getAttribute('role')).toBe('status');
    expect(aviso(g1)!.textContent).toContain('cruce de horario');
    expect(aviso(g1)!.textContent).toContain(TEXTO);
    // El motivo queda asociado al botón (no solo un tooltip).
    const id = inscribirme(g1)!.getAttribute('aria-describedby')!;
    expect(g1.querySelector('#' + id)!.textContent).toContain(TEXTO);

    // El otro grupo (martes) no se cruza: sigue habilitado y sin aviso.
    expect(inscribirme(g2)!.disabled).toBeFalse();
    expect(aviso(g2)).toBeNull();
    expect(inscribirme(g2)!.getAttribute('aria-describedby')).toBeNull();
  });

  it('pide misCursos y los horarios una sola vez (sin peticiones repetidas por el cálculo)', () => {
    crear();
    fixture.detectChanges();
    expect(misCursos).toHaveBeenCalledTimes(1);
    expect(getHorarios).toHaveBeenCalledTimes(2);
  });

  it('sin cruce (borde exacto: Yoga termina a las 19:30 y el grupo empieza a las 19:30): habilitado y sin aviso', () => {
    getHorarios.and.callFake(() => of([franja('LUNES', '19:30', '21:00')]));
    crear();
    tarjetas().forEach(t => {
      expect(inscribirme(t)!.disabled).toBeFalse();
      expect(aviso(t)).toBeNull();
    });
  });

  it('mientras cargan sus cursos: botón deshabilitado como antes, sin aviso', () => {
    const cursos$ = new Subject<any[]>();
    misCursos.and.returnValue(cursos$);
    crear();
    const [g1] = tarjetas();
    expect(inscribirme(g1)!.disabled).toBeTrue();
    expect(inscribirme(g1)!.getAttribute('aria-busy')).toBe('true');
    expect(aviso(g1)).toBeNull();

    cursos$.next([yoga()]);
    fixture.detectChanges();
    expect(aviso(tarjetas()[0])!.textContent).toContain(TEXTO);
  });

  it('mientras cargan los horarios del grupo: sin aviso y el botón como siempre (habilitado)', () => {
    const horarios$ = new Subject<any[]>();
    getHorarios.and.returnValue(horarios$);
    crear();
    tarjetas().forEach(t => {
      expect(inscribirme(t)!.disabled).toBeFalse();
      expect(aviso(t)).toBeNull();
    });

    horarios$.next([franja('LUNES', '18:00', '20:00')]);
    fixture.detectChanges();
    expect(aviso(tarjetas()[0])).not.toBeNull();
  });

  it('si misCursos falla: la pantalla queda como antes (habilitado, sin aviso)', () => {
    misCursos.and.returnValue(throwError(() => ({ status: 500 })));
    crear();
    tarjetas().forEach(t => {
      expect(inscribirme(t)!.disabled).toBeFalse();
      expect(aviso(t)).toBeNull();
    });
  });

  it('la lista de espera en el otro curso no cuenta; un grupo ya terminado, un grupo eliminado y otro periodo tampoco', () => {
    for (const extra of [{ estado: 'EN_ESPERA' }, { fechaFinalizacion: '2000-01-01' }, { grupoActivo: false }, { periodo: 2 }, { anio: 2025 }]) {
      misCursos.and.returnValue(of([yoga(extra)]));
      crear();
      const [g1] = tarjetas();
      expect(aviso(g1)).withContext(JSON.stringify(extra)).toBeNull();
      expect(inscribirme(g1)!.disabled).withContext(JSON.stringify(extra)).toBeFalse();
      fixture.destroy();
    }
  });

  it('un grupo que termina hoy en Bogotá sigue contando; fechaFinalizacion ausente (undefined) también', () => {
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
    for (const fechaFinalizacion of [hoy, undefined]) {
      misCursos.and.returnValue(of([yoga({ fechaFinalizacion })]));
      crear();
      expect(aviso(tarjetas()[0])).withContext(String(fechaFinalizacion)).not.toBeNull();
      fixture.destroy();
    }
  });

  it('sin periodo en el grupo: no calcula, no avisa y no bloquea', () => {
    grupos.getGrupos.and.returnValue(of([grupo(1, { periodo: null })]));
    crear();
    const [g1] = tarjetas();
    expect(aviso(g1)).toBeNull();
    expect(inscribirme(g1)!.disabled).toBeFalse();
  });

  it('ya inscrito o en espera en ESTE grupo: no hay aviso de cruce (queda la etiqueta y "Ver grupo")', () => {
    for (const estado of ['INSCRITO', 'EN_ESPERA']) {
      const propio = yoga({ curso: 'Natación', iterable: 1, estado, horarios: [
        { id: 3, categoria: 'Recreativo', curso: 'Natación', anio: 2026, iterable: 1, dia: 'LUNES', horaInicio: '18:00', horaFin: '20:00', escenario: null }] });
      misCursos.and.returnValue(of([yoga(), propio]));
      crear();
      const [g1] = tarjetas();
      expect(aviso(g1)).withContext(estado).toBeNull();
      expect(g1.querySelector('.chip-inscripcion')).withContext(estado).not.toBeNull();
      expect(g1.querySelector('.ver-grupo')).withContext(estado).not.toBeNull();
      fixture.destroy();
    }
  });

  for (const rol of ['Coordinador', 'Instructor', 'Administrador']) {
    it(`rol ${rol}: sin aviso, sin peticiones nuevas y "Ver grupo" como siempre`, () => {
      perfil$.next(rol);
      crear();
      expect(misCursos).not.toHaveBeenCalled();
      tarjetas().forEach(t => {
        expect(aviso(t)).toBeNull();
        expect(inscribirme(t)).toBeNull();
        expect(t.querySelector('.ver-grupo')).not.toBeNull();
      });
    });
  }
});
