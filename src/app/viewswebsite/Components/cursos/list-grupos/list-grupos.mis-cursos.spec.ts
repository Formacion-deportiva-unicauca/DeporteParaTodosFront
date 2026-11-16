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

/** Fila de "mis cursos" del Alumno (lo que devuelve GET /inscripcion/misCursos). */
const fila = (iterable: number, estado: 'INSCRITO' | 'EN_ESPERA', extra: object = {}) =>
  ({ categoria: 'Recreativo', curso: 'Natación', anio: 2026, iterable, periodo: 1, estado, nombreInstructor: null, grupoActivo: true, horarios: [], ...extra } as any);

/** Lista de grupos de un curso: qué ve el Alumno según su inscripción en cada grupo (y que los demás roles no cambian). */
describe('ListGruposComponent › estado de inscripción del Alumno', () => {
  let fixture: ComponentFixture<ListGruposComponent>;
  let el: HTMLElement;
  let router: jasmine.SpyObj<Router>;
  let avisos: jasmine.SpyObj<NotificacionService>;
  let perfil$: BehaviorSubject<string>;
  let misCursos: jasmine.Spy;

  const tarjetas = (): HTMLElement[] => Array.from(el.querySelectorAll('mat-card.tarjeta-grupo')) as HTMLElement[];
  const chip = (t: HTMLElement): HTMLElement | null => t.querySelector('.chip-inscripcion');
  const inscribirme = (t: HTMLElement): HTMLButtonElement | null => t.querySelector('.btn-inscribirme');
  const verGrupo = (t: HTMLElement): HTMLButtonElement | null => t.querySelector('.ver-grupo');

  const crear = (): void => {
    fixture = TestBed.createComponent(ListGruposComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    const grupos = jasmine.createSpyObj('GrupoService', ['getGrupos', 'cambiarCierreInscripciones']);
    grupos.getGrupos.and.returnValue(of([grupo(1), grupo(2)]));
    const imagenes = jasmine.createSpyObj('ImagenService', ['getimagen']);
    imagenes.getimagen.and.returnValue(of({} as any));
    router = jasmine.createSpyObj('Router', ['navigate']);
    avisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);
    perfil$ = new BehaviorSubject<string>('Alumno');
    misCursos = jasmine.createSpy('getMisCursos').and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ListGruposComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: router },
        { provide: PerfilService, useValue: { perfil$: perfil$.asObservable() } },
        { provide: GrupoService, useValue: grupos },
        { provide: CursodeportivoService, useValue: { getCurso: () => of({ nombre: 'Natación', deporte: 'F', categoriaCurso: 'Recreativo', descripcion: 'D', estadoCurso: 'ACTIVO', estadoInscripciones: 'ABIERTO', idImagen: null }) } },
        { provide: ImagenService, useValue: imagenes },
        { provide: InstructorServisce, useValue: { getInstructor: () => of({}) } },
        { provide: HorarioService, useValue: { getHorarios: () => of([]) } },
        { provide: InscripcionesService, useValue: { getDisponibilidad: () => of({ cuposTotales: 10, cuposDisponibles: 4, tamanoListaEspera: 0 }), getMisCursos: misCursos } },
        { provide: NotificacionService, useValue: avisos },
        { provide: MatDialog, useValue: { open: jasmine.createSpy() } },
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false }) } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ categoria: 'Recreativo', curso: 'Natación' })) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ListGruposComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
      .compileComponents();
  });

  it('inscrito en un grupo: etiqueta "Inscrito" y "Ver grupo", sin "Inscribirme"; el otro grupo conserva "Inscribirme"', () => {
    misCursos.and.returnValue(of([fila(1, 'INSCRITO')]));
    crear();
    const [grupo1, grupo2] = tarjetas();

    expect(chip(grupo1)!.textContent).toContain('Inscrito');
    expect(chip(grupo1)!.getAttribute('data-estado')).toBe('INSCRITO');
    expect(verGrupo(grupo1)).not.toBeNull();
    expect(inscribirme(grupo1)).toBeNull();

    expect(chip(grupo2)).toBeNull();
    expect(inscribirme(grupo2)).not.toBeNull();
    expect(verGrupo(grupo2)).toBeNull();
  });

  it('en lista de espera: etiqueta "En lista de espera" y "Ver grupo", sin "Inscribirme"', () => {
    misCursos.and.returnValue(of([fila(2, 'EN_ESPERA')]));
    crear();
    const grupo2 = tarjetas()[1];

    expect(chip(grupo2)!.textContent).toContain('En lista de espera');
    expect(chip(grupo2)!.getAttribute('data-estado')).toBe('EN_ESPERA');
    expect(verGrupo(grupo2)).not.toBeNull();
    expect(inscribirme(grupo2)).toBeNull();
  });

  it('sin inscripción: "Inscribirme" como siempre, sin etiqueta ni "Ver grupo"', () => {
    misCursos.and.returnValue(of([]));
    crear();

    tarjetas().forEach(t => {
      expect(inscribirme(t)).not.toBeNull();
      expect(inscribirme(t)!.disabled).toBeFalse();
      expect(chip(t)).toBeNull();
      expect(verGrupo(t)).toBeNull();
    });
  });

  it('cancelado: el backend ya no devuelve la inscripción y el grupo vuelve a ofrecer "Inscribirme"', () => {
    misCursos.and.returnValue(of([fila(1, 'INSCRITO')]));
    crear();
    expect(inscribirme(tarjetas()[0])).toBeNull();

    // Al volver a la pantalla (componente nuevo) la inscripción cancelada ya no viene en misCursos.
    misCursos.and.returnValue(of([]));
    crear();
    expect(inscribirme(tarjetas()[0])).not.toBeNull();
    expect(chip(tarjetas()[0])).toBeNull();
  });

  it('solo cuentan las inscripciones de este curso y de grupos activos', () => {
    misCursos.and.returnValue(of([
      fila(1, 'INSCRITO', { curso: 'Otro curso' }),
      fila(2, 'INSCRITO', { categoria: 'Otra categoría' }),
    ]));
    crear();
    tarjetas().forEach(t => {
      expect(chip(t)).toBeNull();
      expect(inscribirme(t)).not.toBeNull();
    });

    misCursos.and.returnValue(of([fila(1, 'INSCRITO', { grupoActivo: false })]));
    crear();
    expect(chip(tarjetas()[0])).toBeNull();
  });

  it('mientras carga misCursos: "Inscribirme" deshabilitado y sin etiqueta; al llegar se muestra el estado real', () => {
    const respuesta$ = new Subject<any[]>();
    misCursos.and.returnValue(respuesta$);
    crear();

    tarjetas().forEach(t => {
      expect(inscribirme(t)!.disabled).toBeTrue();
      expect(chip(t)).toBeNull();
    });

    respuesta$.next([fila(1, 'INSCRITO')]);
    respuesta$.complete();
    fixture.detectChanges();

    expect(chip(tarjetas()[0])!.textContent).toContain('Inscrito');
    expect(inscribirme(tarjetas()[0])).toBeNull();
    expect(inscribirme(tarjetas()[1])!.disabled).toBeFalse();
  });

  it('si misCursos falla: la pantalla queda como hoy ("Inscribirme" habilitado) y sin aviso de error', () => {
    misCursos.and.returnValue(throwError(() => ({ status: 500 })));
    crear();

    tarjetas().forEach(t => {
      expect(inscribirme(t)!.disabled).toBeFalse();
      expect(chip(t)).toBeNull();
    });
    expect(avisos.error).not.toHaveBeenCalled();
  });

  it('espera a conocer el perfil: sin perfil no pide nada; al ser Alumno lo pide una sola vez', () => {
    perfil$.next('');
    crear();
    expect(misCursos).not.toHaveBeenCalled();

    perfil$.next('Alumno');
    fixture.detectChanges();
    expect(misCursos).toHaveBeenCalledTimes(1);

    perfil$.next('Alumno');
    expect(misCursos).toHaveBeenCalledTimes(1);
  });

  for (const rol of ['Coordinador', 'Instructor', 'Administrador']) {
    it(`rol ${rol}: no pide misCursos y la tarjeta sigue igual ("Ver grupo", sin etiqueta ni "Inscribirme")`, () => {
      perfil$.next(rol);
      crear();

      expect(misCursos).not.toHaveBeenCalled();
      tarjetas().forEach(t => {
        expect(chip(t)).toBeNull();
        expect(inscribirme(t)).toBeNull();
        expect(verGrupo(t)).not.toBeNull();
      });
      verGrupo(tarjetas()[0])!.click();
      expect(router.navigate).toHaveBeenCalledWith(['/listaDeportistasCurso', 'Recreativo', 'Natación', 2026, 1]);
    });
  }

  it('"Ver grupo" del Alumno inscrito navega directo a /inscripcion-grupo, aunque las inscripciones del grupo estén cerradas', () => {
    const cerrado = grupo(1, { inscripcionesAbiertas: false, motivoInscripcion: 'CERRADAS', inscripcionesCerradasManual: true });
    (TestBed.inject(GrupoService) as any).getGrupos.and.returnValue(of([cerrado]));
    misCursos.and.returnValue(of([fila(1, 'INSCRITO')]));
    crear();

    verGrupo(tarjetas()[0])!.click();

    expect(router.navigate).toHaveBeenCalledWith(['/inscripcion-grupo', 'Recreativo', 'Natación', 2026, 1]);
    expect(avisos.error).not.toHaveBeenCalled();
  });

  it('"Inscribirme" en un grupo sin inscripción sigue llevando a /inscripcion-grupo', () => {
    misCursos.and.returnValue(of([fila(1, 'INSCRITO')]));
    crear();

    inscribirme(tarjetas()[1])!.click();

    expect(router.navigate).toHaveBeenCalledWith(['/inscripcion-grupo', 'Recreativo', 'Natación', 2026, 2]);
  });
});
