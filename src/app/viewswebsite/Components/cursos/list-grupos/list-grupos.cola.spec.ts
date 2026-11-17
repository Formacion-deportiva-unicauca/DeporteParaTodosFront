import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
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

const fila = (iterable: number, estado: 'INSCRITO' | 'EN_ESPERA', extra: object = {}) =>
  ({ categoria: 'Recreativo', curso: 'Natación', anio: 2026, iterable, periodo: 1, estado, nombreInstructor: null, grupoActivo: true, horarios: [], ...extra } as any);

/**
 * Lista de grupos: con cupo libre pero lista de espera, quien llega queda al final de la lista (lo decide el backend).
 * La tarjeta lo anticipa solo si la disponibilidad ya trae la cola (tamanoListaEspera); si no, no afirma nada.
 */
describe('ListGruposComponent › lista de espera con cupo libre', () => {
  let fixture: ComponentFixture<ListGruposComponent>;
  let el: HTMLElement;
  let router: jasmine.SpyObj<Router>;
  let perfil$: BehaviorSubject<string>;
  let misCursos: jasmine.Spy;
  let disponibilidad: jasmine.Spy;
  let grupos: jasmine.SpyObj<GrupoService>;

  const tarjetas = (): HTMLElement[] => Array.from(el.querySelectorAll('mat-card.tarjeta-grupo')) as HTMLElement[];
  const boton = (t: HTMLElement): HTMLButtonElement | null => t.querySelector('.btn-inscribirme');
  const aviso = (t: HTMLElement): HTMLElement | null => t.querySelector('.aviso-cola');

  const crear = (): void => {
    fixture = TestBed.createComponent(ListGruposComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    grupos = jasmine.createSpyObj('GrupoService', ['getGrupos', 'cambiarCierreInscripciones']);
    grupos.getGrupos.and.returnValue(of([grupo(1), grupo(2)]));
    const imagenes = jasmine.createSpyObj('ImagenService', ['getimagen']);
    imagenes.getimagen.and.returnValue(of({} as any));
    router = jasmine.createSpyObj('Router', ['navigate']);
    perfil$ = new BehaviorSubject<string>('Alumno');
    misCursos = jasmine.createSpy('getMisCursos').and.returnValue(of([]));
    // Grupo 1: cupo libre y 2 en cola. Grupo 2: cupo libre y sin cola.
    disponibilidad = jasmine.createSpy('getDisponibilidad').and.callFake((_c: string, _n: string, _a: number, iterable: number) =>
      of(iterable === 1 ? { cuposTotales: 10, cuposDisponibles: 4, tamanoListaEspera: 2 } : { cuposTotales: 10, cuposDisponibles: 4, tamanoListaEspera: 0 }));

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
        { provide: InscripcionesService, useValue: { getDisponibilidad: disponibilidad, getMisCursos: misCursos } },
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

  it('cupo libre con cola: "Unirme a la lista de espera" y un aviso breve (role=status) asociado al botón; sin cola, "Inscribirme"', () => {
    crear();
    const [conCola, sinCola] = tarjetas();

    expect(boton(conCola)!.textContent).toContain('Unirme a la lista de espera');
    expect(boton(conCola)!.disabled).toBeFalse();
    expect(aviso(conCola)!.getAttribute('role')).toBe('status');
    expect(aviso(conCola)!.textContent).toContain('Este grupo tiene lista de espera');
    expect(aviso(conCola)!.textContent).toContain('al final de la lista');
    const id = boton(conCola)!.getAttribute('aria-describedby')!;
    expect(conCola.querySelector('#' + id)!.textContent).toContain('al final de la lista');
    expect(conCola.textContent).toContain('4 cupos disponibles');

    expect(boton(sinCola)!.textContent).toContain('Inscribirme');
    expect(boton(sinCola)!.textContent).not.toContain('lista de espera');
    expect(aviso(sinCola)).toBeNull();
  });

  it('el botón sigue llevando a la pantalla de inscripción', () => {
    crear();
    boton(tarjetas()[0])!.click();
    expect(router.navigate).toHaveBeenCalledWith(['/inscripcion-grupo', 'Recreativo', 'Natación', 2026, 1]);
  });

  it('grupo lleno (sin cupos) con cola: queda como antes, "Inscribirme" y sin el aviso nuevo', () => {
    disponibilidad.and.callFake(() => of({ cuposTotales: 10, cuposDisponibles: 0, tamanoListaEspera: 3 }));
    crear();
    tarjetas().forEach(t => {
      expect(boton(t)!.textContent).toContain('Inscribirme');
      expect(aviso(t)).toBeNull();
      expect(t.textContent).toContain('Grupo lleno');
    });
  });

  it('mientras la disponibilidad no carga: no se afirma nada (botón normal, sin aviso)', () => {
    disponibilidad.and.returnValue(new Subject());
    crear();
    tarjetas().forEach(t => {
      expect(boton(t)!.textContent).toContain('Inscribirme');
      expect(aviso(t)).toBeNull();
    });
  });

  it('mientras cargan sus cursos: sin aviso (botón deshabilitado como antes)', () => {
    misCursos.and.returnValue(new Subject());
    crear();
    expect(aviso(tarjetas()[0])).toBeNull();
    expect(boton(tarjetas()[0])!.disabled).toBeTrue();
  });

  it('ya inscrito o en lista de espera en ese grupo: sin aviso (queda la etiqueta de su estado)', () => {
    for (const estado of ['INSCRITO', 'EN_ESPERA'] as const) {
      misCursos.and.returnValue(of([fila(1, estado)]));
      crear();
      expect(aviso(tarjetas()[0])).withContext(estado).toBeNull();
      expect(tarjetas()[0].querySelector('.chip-inscripcion')).withContext(estado).not.toBeNull();
      fixture.destroy();
    }
  });

  it('inscripciones cerradas del grupo: sin aviso y botón deshabilitado como antes', () => {
    grupos.getGrupos.and.returnValue(of([grupo(1, { inscripcionesAbiertas: false, motivoInscripcion: 'CERRADAS' })]));
    crear();
    expect(aviso(tarjetas()[0])).toBeNull();
    expect(boton(tarjetas()[0])!.disabled).toBeTrue();
  });

  it('con cruce de horarios manda el aviso de cruce (rojo y botón deshabilitado), sin el de cola', () => {
    const yoga = fila(1, 'INSCRITO', { curso: 'Yoga', fechaFinalizacion: null,
      horarios: [{ id: 9, categoria: 'Recreativo', curso: 'Yoga', anio: 2026, iterable: 1, dia: 'LUNES', horaInicio: '18:00', horaFin: '19:30', escenario: null }] });
    misCursos.and.returnValue(of([yoga]));
    TestBed.overrideProvider(HorarioService, { useValue: { getHorarios: () => of([franja('LUNES', '18:00', '20:00')]) } });
    crear();
    const g1 = tarjetas()[0];
    expect(g1.querySelector('.aviso-cruce')).not.toBeNull();
    expect(aviso(g1)).toBeNull();
    expect(boton(g1)!.disabled).toBeTrue();
  });

  for (const rol of ['Coordinador', 'Instructor', 'Administrador']) {
    it(`rol ${rol}: sin aviso ni cambios (sigue "Ver grupo")`, () => {
      perfil$.next(rol);
      crear();
      tarjetas().forEach(t => {
        expect(aviso(t)).toBeNull();
        expect(boton(t)).toBeNull();
        expect(t.querySelector('.ver-grupo')).not.toBeNull();
      });
    });
  }
});
