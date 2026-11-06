import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { SidenavStub } from 'src/app/testing/sidenav-stub';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { OAuthService } from 'angular-oauth2-oidc';
import { InscripcionGrupoComponent } from './inscripcion-grupo.component';
import { GrupoService } from 'src/app/services/grupo.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { HorarioService } from 'src/app/services/horario.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { AuthService } from 'src/app/services/auth.service';
import { TokenInterchangeService } from 'src/app/services/token-interchange.service';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { CursoDTO } from 'src/app/Models/DTOs/curso-dto';

const mockGrupo = {
  categoria: 'Recreativo', curso: 'Natacion', anio: 2026, iterable: 1,
  cupos: 15, idInstructor: 'INS-01', nombreInstructor: '', imagenGrupo: null,
  fechaCreacion: '2026-01-01', fechaFinalizacion: null,
  fechaInscripcionApertura: null, fechaIncripcionCierre: null,
};
const mockHorarios = [
  { dia: 'LUNES', horaInicio: '08:00', horaFin: '10:00', escenario: 'Coliseo' },
];
const mockInstructor = { nombre: 'Juan Perez', id: 'INS-01' };
const mockCursoActivo: CursoDTO = {
  nombre: 'Natacion',
  deporte: 'Natacion',
  categoriaCurso: 'Recreativo',
  descripcion: 'Curso de prueba',
  estadoCurso: 'ACTIVO',
  estadoInscripciones: 'ABIERTO',
};

describe('InscripcionGrupoComponent', () => {
  let component: InscripcionGrupoComponent;
  let fixture: ComponentFixture<InscripcionGrupoComponent>;
  let grupoSpy: jasmine.SpyObj<GrupoService>;
  let inscripcionSpy: jasmine.SpyObj<InscripcionesService>;
  let horarioSpy: jasmine.SpyObj<HorarioService>;
  let instructorSpy: jasmine.SpyObj<InstructorServisce>;
  let avisoExito: jasmine.Spy;
  let avisoError: jasmine.Spy;
  let avisoInfo: jasmine.Spy;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    grupoSpy      = jasmine.createSpyObj('GrupoService', ['getGrupo']);
    inscripcionSpy = jasmine.createSpyObj('InscripcionesService', ['postInscripcion', 'getDisponibilidad', 'validarInscripcion', 'eliminarInscripcion', 'getMisCursos']);
    horarioSpy    = jasmine.createSpyObj('HorarioService', ['getHorarios']);
    instructorSpy = jasmine.createSpyObj('InstructorServisce', ['getInstructor']);
    routerSpy     = jasmine.createSpyObj('Router', ['navigate']);

    grupoSpy.getGrupo.and.returnValue(of({ ...mockGrupo } as any));
    horarioSpy.getHorarios.and.returnValue(of(mockHorarios as any));
    instructorSpy.getInstructor.and.returnValue(of(mockInstructor as any));
    inscripcionSpy.getDisponibilidad.and.returnValue(of({ cuposTotales: 15, cuposDisponibles: 5, tamanoListaEspera: 0 } as any));
    inscripcionSpy.validarInscripcion.and.returnValue(of(false));
    inscripcionSpy.getMisCursos.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [InscripcionGrupoComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        DatePipe,
        { provide: GrupoService,          useValue: grupoSpy },
        { provide: InscripcionesService,  useValue: inscripcionSpy },
        { provide: HorarioService,        useValue: horarioSpy },
        { provide: InstructorServisce,    useValue: instructorSpy },
        { provide: CursodeportivoService, useValue: { getCurso: jasmine.createSpy().and.returnValue(of(mockCursoActivo)) } },
        { provide: Router,                useValue: routerSpy },
        { provide: PerfilService,         useValue: { perfil$: of('') } },
        { provide: AuthService,           useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'isAuthenticated', 'getProfile']) },
        { provide: TokenInterchangeService, useValue: {} },
        { provide: OAuthService,          useValue: { configure: () => {}, setupAutomaticSilentRefresh: () => {}, events: of(), loadDiscoveryDocumentAndTryLogin: () => Promise.resolve(), getIdentityClaims: () => null, hasValidAccessToken: () => false, hasValidIdToken: () => false } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({
            categoria: 'Recreativo', curso: 'Natacion', anio: '2026', iterable: '1',
          })) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(InscripcionGrupoComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
    .compileComponents();

    fixture   = TestBed.createComponent(InscripcionGrupoComponent);
    component = fixture.componentInstance;
    sessionStorage.removeItem('dpt_perfil_id');
    fixture.detectChanges();
    // Espiar el servicio de notificaciones real inyectado en el componente
    avisoExito = spyOn(component['notificaciones'], 'exito');
    avisoError = spyOn(component['notificaciones'], 'error');
    avisoInfo = spyOn(component['notificaciones'], 'info');
  });

  afterEach(() => sessionStorage.removeItem('dpt_perfil_id'));

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit(): lee los params de ruta y llama a cargarGrupo()', () => {
    expect(component.categoria).toBe('Recreativo');
    expect(component.curso).toBe('Natacion');
    expect(component.anio).toBe(2026);
    expect(component.iterable).toBe(1);
    expect(grupoSpy.getGrupo).toHaveBeenCalledWith('Recreativo', 'Natacion', 2026, 1);
  });

  it('cargarGrupo(): carga grupo y horarios correctamente', () => {
    expect(component.grupo).toBeTruthy();
    expect(component.grupo!.cupos).toBe(15);
    expect(component.horarios.length).toBe(1);
    expect(component.cargando).toBeFalse();
  });

  it('cargarGrupo(): asigna nombre del instructor', () => {
    expect(instructorSpy.getInstructor).toHaveBeenCalledWith('INS-01');
    expect(component.grupo!.nombreInstructor).toBe('Juan Perez');
  });

  it('cargarGrupo(): muestra la notificación de error si getGrupo falla', () => {
    grupoSpy.getGrupo.and.returnValue(throwError(() => ({ status: 500 })));
    component.ngOnInit();
    expect(avisoError).toHaveBeenCalledWith('No se pudo cargar el grupo', jasmine.any(String));
  });

  it('inscribirse(): si queda en lista de espera avisa con su posición (información, no éxito)', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.postInscripcion.and.returnValue(of({ estado: 'EN_ESPERA' } as any));
    inscripcionSpy.getDisponibilidad.and.returnValue(of({ cuposTotales: 15, cuposDisponibles: 0, tamanoListaEspera: 2 } as any));
    component.disponibilidad = { cuposTotales: 15, cuposDisponibles: 0, tamanoListaEspera: 2 } as any;
    component.inscribirse();
    expect(component.yaEnEspera).toBeTrue();
    expect(avisoInfo).toHaveBeenCalledOnceWith('Quedaste en lista de espera', jasmine.stringContaining('posición es la 3'), 8000);
    expect(avisoExito).not.toHaveBeenCalled();
  });

  it('cancelarInscripcion(): avisa con éxito; si estaba en espera lo dice, y si falla avisa con el error', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.eliminarInscripcion.and.returnValue(of({} as any));
    component.yaEnEspera = false;
    component.cancelarInscripcion();
    expect(avisoExito).toHaveBeenCalledWith('Inscripción cancelada', jasmine.any(String), 8000);

    component.yaEnEspera = true;
    component.cancelarInscripcion();
    expect(avisoExito).toHaveBeenCalledWith('Saliste de la lista de espera', jasmine.any(String), 8000);

    inscripcionSpy.eliminarInscripcion.and.returnValue(throwError(() => ({ status: 500 })));
    component.cancelarInscripcion();
    expect(avisoError).toHaveBeenCalledWith('No se pudo cancelar la inscripción', 'Intenta de nuevo.');
  });

  it('letraDeIterable(): convierte número a letra (1→A, 2→B)', () => {
    expect(component.letraDeIterable(1)).toBe('A');
    expect(component.letraDeIterable(2)).toBe('B');
    expect(component.letraDeIterable(null)).toBe('?');
  });

  it('volver(): navega de regreso a list-grupos', () => {
    component.volver();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/list-grupos', 'Recreativo', 'Natacion']);
  });

  it('inscribirse(): muestra error si no hay dpt_perfil_id en sessionStorage', () => {
    sessionStorage.removeItem('dpt_perfil_id');
    component.inscribirse();
    expect(avisoError).toHaveBeenCalledWith('No se pudo identificar tu perfil', jasmine.any(String));
    expect(inscripcionSpy.postInscripcion).not.toHaveBeenCalled();
  });

  it('inscribirse(): POST /inscripcion exitoso → yaInscrito=true y notificación de éxito', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.postInscripcion.and.returnValue(of({} as any));
    component.inscribirse();
    expect(inscripcionSpy.postInscripcion).toHaveBeenCalledWith(
      jasmine.objectContaining({ alumnoId: 12345, categoria: 'Recreativo', curso: 'Natacion' })
    );
    expect(component.yaInscrito).toBeTrue();
    expect(avisoExito).toHaveBeenCalledWith('Inscripción exitosa', jasmine.any(String), 8000);
  });

  it('inscribirse(): error 422 con mensaje del backend → notificación con ese mensaje', () => {
    sessionStorage.setItem('dpt_perfil_id', '1');
    inscripcionSpy.postInscripcion.and.returnValue(
      throwError(() => ({ status: 422, error: { mensaje: 'Las inscripciones para el curso X estan cerradas' } }))
    );
    component.inscribirse();
    expect(avisoError).toHaveBeenCalledWith('No se pudo completar la inscripción', 'Las inscripciones para el curso X estan cerradas');
  });

  it('inscribirse(): error 409 sin cuerpo de error → notificación genérica de error', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.postInscripcion.and.returnValue(throwError(() => ({ status: 409 })));
    component.inscribirse();
    expect(component.yaInscrito).toBeFalse();
    expect(avisoError).toHaveBeenCalledWith('No se pudo completar la inscripción', 'Intenta de nuevo.');
  });

  it('inscribirse(): error 500 → notificación genérica de error', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.postInscripcion.and.returnValue(throwError(() => ({ status: 500 })));
    component.inscribirse();
    expect(avisoError).toHaveBeenCalledWith('No se pudo completar la inscripción', 'Intenta de nuevo.');
  });

  // ── mensajes reales del backend ────────────────────────────────────────────

  it('inscribirse(): error 422 (inscripciones cerradas) → muestra el mensaje real del backend', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.postInscripcion.and.returnValue(
      throwError(() => ({ status: 422, error: { mensaje: 'Las inscripciones para el curso Natacion están cerradas' } }))
    );
    component.inscribirse();
    expect(avisoError).toHaveBeenCalledWith('No se pudo completar la inscripción', 'Las inscripciones para el curso Natacion están cerradas');
  });

  it('inscribirse(): error 409 con mensaje de cupos agotados → muestra ese mensaje (no texto de "ya inscrito")', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.postInscripcion.and.returnValue(
      throwError(() => ({ status: 409, error: { mensaje: 'Los cupos para este grupo están agotados' } }))
    );
    component.inscribirse();
    expect(avisoError).toHaveBeenCalledWith('No se pudo completar la inscripción', 'Los cupos para este grupo están agotados');
    expect(avisoError).not.toHaveBeenCalledWith(
      'No se pudo completar la inscripción', jasmine.stringContaining('Ya estás inscrito')
    );
  });

  it('inscribirse(): error 409 con mensaje de ya inscrito → muestra el mensaje real del backend', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.postInscripcion.and.returnValue(
      throwError(() => ({ status: 409, error: { mensaje: 'Ya estás inscrito en este grupo.' } }))
    );
    component.inscribirse();
    expect(avisoError).toHaveBeenCalledWith('No se pudo completar la inscripción', 'Ya estás inscrito en este grupo.');
  });

  // ── Ventana de inscripción del grupo (SCRUM-185) ───────────────────────────

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const boton = (): HTMLButtonElement => el().querySelector('button.btn-inscribirse') as HTMLButtonElement;
  const aviso = (): string | null => el().querySelector('.aviso-grupo-cerrado')?.textContent?.trim() ?? null;
  const conGrupo = (extra: any): void => {
    component.grupo = { ...mockGrupo, ...extra } as any;
    fixture.detectChanges();
  };

  it('grupo abierto y curso abierto: botón habilitado y sin aviso de grupo', () => {
    conGrupo({ inscripcionesAbiertas: true, motivoInscripcion: 'ABIERTAS' });
    expect(boton().disabled).toBeFalse();
    expect(aviso()).toBeNull();
  });

  it('inscripcionesAbiertas undefined se trata como true (backend sin el campo)', () => {
    conGrupo({});
    expect(boton().disabled).toBeFalse();
    expect(aviso()).toBeNull();
  });

  it('grupo CERRADAS: botón deshabilitado y aviso con la fecha de cierre', () => {
    conGrupo({ inscripcionesAbiertas: false, motivoInscripcion: 'CERRADAS', fechaIncripcionCierre: '2026-06-14' });
    expect(boton().disabled).toBeTrue();
    expect(aviso()).toBe('Las inscripciones de este grupo cerraron el 14/06/2026');
  });

  it('grupo NO_ABIERTAS: botón deshabilitado y aviso con la fecha de apertura', () => {
    conGrupo({ inscripcionesAbiertas: false, motivoInscripcion: 'NO_ABIERTAS', fechaInscripcionApertura: '2026-07-01' });
    expect(boton().disabled).toBeTrue();
    expect(aviso()).toBe('Las inscripciones de este grupo abren el 01/07/2026');
  });

  it('se inscribe solo si AMBOS lo permiten: grupo abierto pero curso cerrado → deshabilitado', () => {
    component.cursoInfo = { ...mockCursoActivo, estadoInscripciones: 'CERRADO' };
    conGrupo({ inscripcionesAbiertas: true, motivoInscripcion: 'ABIERTAS' });
    expect(boton().disabled).toBeTrue();
    expect(el().querySelector('.aviso-cerrado')).toBeTruthy();
  });

  it('el chip del curso dice "Curso: inscripciones abiertas/cerradas"', () => {
    const badge = (): string => el().querySelector('.estado-info .chip-curso-inscripciones')?.textContent?.trim() ?? '';
    conGrupo({});
    expect(badge()).toBe('Curso: inscripciones abiertas');
    component.cursoInfo = { ...mockCursoActivo, estadoInscripciones: 'CERRADO' };
    fixture.detectChanges();
    expect(badge()).toBe('Curso: inscripciones cerradas');
  });

  it('texto de fechas: desde y hasta', () => {
    conGrupo({ fechaInscripcionApertura: '2026-10-01', fechaIncripcionCierre: '2026-10-31' });
    expect(el().querySelector('#ventana-inscripcion')?.textContent).toContain('Inscripciones desde 01/10/2026 hasta 31/10/2026');
  });

  it('texto de fechas: apertura null', () => {
    conGrupo({ fechaInscripcionApertura: null, fechaIncripcionCierre: '2026-10-31' });
    expect(el().querySelector('#ventana-inscripcion')?.textContent).toContain('Inscripciones abiertas hasta 31/10/2026');
  });

  it('texto de fechas: cierre null (sin guion colgando)', () => {
    conGrupo({ fechaInscripcionApertura: '2026-10-01', fechaIncripcionCierre: null });
    const t = el().querySelector('#ventana-inscripcion')?.textContent ?? '';
    expect(t).toContain('Inscripciones desde 01/10/2026, sin fecha de cierre');
    expect(t).not.toContain('–');
  });

  it('texto de fechas: ambas null', () => {
    conGrupo({ fechaInscripcionApertura: null, fechaIncripcionCierre: null });
    expect(el().querySelector('#ventana-inscripcion')?.textContent).toContain('Sin fecha de cierre');
  });

  it('inscribirse(): 422 GC-0016 muestra err.error.mensaje del backend', () => {
    sessionStorage.setItem('dpt_perfil_id', '7');
    const mensaje = 'La inscripcion no esta disponible en este momento, Las inscripciones de este grupo cerraron el 14/06/2026';
    inscripcionSpy.postInscripcion.and.returnValue(throwError(() => ({
      status: 422,
      error: { codigoError: 'GC-0016', mensaje, codigoHttp: 422, url: '/api/v2/inscripcion', metodo: 'POST' },
    })));
    component.inscribirse();
    expect(avisoError).toHaveBeenCalledWith('No se pudo completar la inscripción', mensaje);
    expect(component.inscribiendo).toBeFalse();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCRUM-179: puedeInscribirse() + getCurso en paralelo
// ─────────────────────────────────────────────────────────────────────────────
describe('InscripcionGrupoComponent › puedeInscribirse + getCurso', () => {
  let component: InscripcionGrupoComponent;
  let fixture: ComponentFixture<InscripcionGrupoComponent>;
  let cursodeportivoSpy: jasmine.SpyObj<CursodeportivoService>;

  beforeEach(async () => {
    cursodeportivoSpy = jasmine.createSpyObj('CursodeportivoService', ['getCurso']);
    cursodeportivoSpy.getCurso.and.returnValue(of(mockCursoActivo));

    await TestBed.configureTestingModule({
      imports: [InscripcionGrupoComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        DatePipe,
        { provide: GrupoService,         useValue: { getGrupo: jasmine.createSpy().and.returnValue(of({ ...mockGrupo } as any)) } },
        { provide: InscripcionesService, useValue: { postInscripcion: jasmine.createSpy(), getDisponibilidad: jasmine.createSpy().and.returnValue(of({ cuposTotales: 15, cuposDisponibles: 5, tamanoListaEspera: 0 } as any)), validarInscripcion: jasmine.createSpy().and.returnValue(of(false)), eliminarInscripcion: jasmine.createSpy() } },
        { provide: HorarioService,       useValue: { getHorarios: jasmine.createSpy().and.returnValue(of([])) } },
        { provide: InstructorServisce,   useValue: { getInstructor: jasmine.createSpy().and.returnValue(of(mockInstructor as any)) } },
        { provide: CursodeportivoService, useValue: cursodeportivoSpy },
        { provide: Router,               useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: PerfilService,        useValue: { perfil$: of('') } },
        { provide: AuthService,          useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'isAuthenticated', 'getProfile']) },
        { provide: TokenInterchangeService, useValue: {} },
        { provide: OAuthService,         useValue: { configure: () => {}, setupAutomaticSilentRefresh: () => {}, events: of(), loadDiscoveryDocumentAndTryLogin: () => Promise.resolve(), getIdentityClaims: () => null, hasValidAccessToken: () => false, hasValidIdToken: () => false } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ categoria: 'Recreativo', curso: 'Natacion', anio: '2026', iterable: '1' })) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(InscripcionGrupoComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
    .compileComponents();

    fixture   = TestBed.createComponent(InscripcionGrupoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('cargarGrupo(): llama a getCurso(categoria, curso) en paralelo con getGrupo', () => {
    expect(cursodeportivoSpy.getCurso).toHaveBeenCalledWith('Recreativo', 'Natacion');
  });

  it('cursoInfo queda asignado tras cargar', () => {
    expect(component.cursoInfo).toEqual(mockCursoActivo);
  });

  it('puedeInscribirse(): false cuando cursoInfo es null (todavía cargando)', () => {
    component.cursoInfo = null;
    expect(component.puedeInscribirse()).toBeFalse();
  });

  it('puedeInscribirse(): true cuando ACTIVO + ABIERTO', () => {
    component.cursoInfo = { ...mockCursoActivo };
    expect(component.puedeInscribirse()).toBeTrue();
  });

  it('puedeInscribirse(): false cuando INACTIVO', () => {
    component.cursoInfo = { ...mockCursoActivo, estadoCurso: 'INACTIVO' };
    expect(component.puedeInscribirse()).toBeFalse();
  });

  it('puedeInscribirse(): false cuando inscripciones CERRADO', () => {
    component.cursoInfo = { ...mockCursoActivo, estadoInscripciones: 'CERRADO' };
    expect(component.puedeInscribirse()).toBeFalse();
  });
});

/** Inscripción al grupo de Estudiante, Docente, Administrativo y Contratista: diseño y estados visibles. */
describe('InscripcionGrupoComponent › diseño y estados de la inscripción', () => {
  let fixture: ComponentFixture<InscripcionGrupoComponent>;
  let component: InscripcionGrupoComponent;
  let inscripciones: jasmine.SpyObj<InscripcionesService>;
  let router: jasmine.SpyObj<Router>;
  let avisos: { exito: jasmine.Spy; error: jasmine.Spy; info: jasmine.Spy };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(sel: string): T => el().querySelector(sel) as T;
  const detectar = (): void => fixture.detectChanges();

  async function montar(opciones: { inscrito?: boolean; enEspera?: boolean; disp?: any; cursos?: any[] } = {}): Promise<void> {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripciones = jasmine.createSpyObj('InscripcionesService', ['postInscripcion', 'getDisponibilidad', 'validarInscripcion', 'eliminarInscripcion', 'getMisCursos']);
    inscripciones.getDisponibilidad.and.returnValue(of(opciones.disp ?? { cuposTotales: 7, cuposDisponibles: 5, tamanoListaEspera: 0 }));
    inscripciones.validarInscripcion.and.returnValue(of(!!opciones.inscrito));
    inscripciones.getMisCursos.and.returnValue(of(opciones.cursos ?? (opciones.enEspera
      ? [{ categoria: 'Recreativo', curso: 'baloncesto masculino', anio: 2026, iterable: 1, estado: 'EN_ESPERA' }] : [])));
    router = jasmine.createSpyObj('Router', ['navigate']);
    const grupo = jasmine.createSpyObj('GrupoService', ['getGrupo']);
    grupo.getGrupo.and.returnValue(of({ anio: 2026, periodo: 2, iterable: 1, idInstructor: 'I1', cupos: 7 } as any));
    const horarios = jasmine.createSpyObj('HorarioService', ['getHorarios']);
    horarios.getHorarios.and.returnValue(of([{ id: 1, dia: 'MIERCOLES', horaInicio: '17:00:00', horaFin: '19:00:00', escenario: 'Coliseo Cubierto Universitario' }] as any));
    const instructor = jasmine.createSpyObj('InstructorServisce', ['getInstructor']);
    instructor.getInstructor.and.returnValue(of({ nombre: 'KATERINN NATALIA ARCOS DAZA' } as any));
    await TestBed.configureTestingModule({
      imports: [InscripcionGrupoComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        DatePipe,
        { provide: GrupoService, useValue: grupo },
        { provide: InscripcionesService, useValue: inscripciones },
        { provide: HorarioService, useValue: horarios },
        { provide: InstructorServisce, useValue: instructor },
        { provide: CursodeportivoService, useValue: { getCurso: () => of({ nombre: 'baloncesto masculino', estadoCurso: 'ACTIVO', estadoInscripciones: 'ABIERTO' } as any) } },
        { provide: Router, useValue: router },
        { provide: PerfilService, useValue: { perfil$: of('') } },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'isAuthenticated', 'getProfile']) },
        { provide: TokenInterchangeService, useValue: {} },
        { provide: OAuthService, useValue: { configure: () => {}, setupAutomaticSilentRefresh: () => {}, events: of(), loadDiscoveryDocumentAndTryLogin: () => Promise.resolve(), getIdentityClaims: () => null, hasValidAccessToken: () => false, hasValidIdToken: () => false } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ categoria: 'Recreativo', curso: 'baloncesto masculino', anio: '2026', iterable: '1' })) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(InscripcionGrupoComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
      .compileComponents();
    fixture = TestBed.createComponent(InscripcionGrupoComponent);
    component = fixture.componentInstance;
    detectar();
    avisos = {
      exito: spyOn(component['notificaciones'], 'exito'),
      error: spyOn(component['notificaciones'], 'error'),
      info: spyOn(component['notificaciones'], 'info'),
    };
  }

  afterEach(() => sessionStorage.removeItem('dpt_perfil_id'));

  it('muestra migas "Inicio › Grupos · curso › Inscripción", el título con línea secundaria y "Volver a grupos"', async () => {
    await montar();
    const migas = q('nav.migas');
    expect(migas.textContent).toContain('Grupos · Baloncesto Masculino');
    expect(migas.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Inscripción');
    expect(q('h1.titulo-pagina').textContent?.trim()).toBe('Inscripción al grupo');
    expect(getComputedStyle(q('h1.titulo-pagina'), '::after').height).toBe('4px');
    q<HTMLButtonElement>('.btn-volver').click();
    expect(router.navigate).toHaveBeenCalledWith(['/list-grupos', 'Recreativo', 'baloncesto masculino']);
  });

  it('la tarjeta presenta el curso como nombre propio, con instructor, horario en 12 h y cupos con barra', async () => {
    await montar();
    expect(q('.nombre-curso').textContent?.trim()).toBe('Baloncesto Masculino');
    expect(q('.codigo-grupo').textContent?.trim()).toBe('2026-2 · Grupo A');
    expect(q('.instructor-nombre').textContent?.trim()).toBe('Katerinn Natalia Arcos Daza');
    expect(q('.avatar').textContent?.trim()).toBe('KN');
    const horario = q('.horario-item').textContent!;
    expect(horario).toContain('Miércoles');
    expect(horario).toContain('5:00 p. m. – 7:00 p. m.');
    expect(q('.cupos-cifra').textContent?.trim()).toBe('5 de 7');
    expect(q('.barra').getAttribute('aria-valuenow')).toBe('29');
  });

  it('sin inscripción: botón principal "Inscribirme en este grupo" de 44 px', async () => {
    await montar();
    const boton = q<HTMLButtonElement>('button.btn-inscribirse');
    expect(boton.textContent).toContain('Inscribirme en este grupo');
    expect(getComputedStyle(boton).textTransform).toBe('uppercase');
    expect(parseFloat(getComputedStyle(boton).height)).toBeGreaterThanOrEqual(44);
    expect(el().querySelector('.resultado')).toBeNull();
  });

  it('grupo lleno: avisa en amarillo (no es un error) con la posición y el botón dice "Unirme a la lista de espera"', async () => {
    await montar({ disp: { cuposTotales: 5, cuposDisponibles: 0, tamanoListaEspera: 2 } });
    const aviso = q('.aviso-espera');
    expect(aviso.textContent).toContain('El grupo está completo');
    expect(aviso.textContent).toContain('posición 3');
    expect(aviso.getAttribute('role')).toBe('status');
    expect(q('.cupos-cifra').classList).toContain('agotado');
    expect(q('button.btn-inscribirse').textContent).toContain('Unirme a la lista de espera');
    expect(q('button.btn-inscribirse').classList).toContain('btn-espera');
  });

  it('al inscribirse queda un panel verde que se mantiene en pantalla, con "Ver mis cursos" y "Cancelar inscripción"', async () => {
    await montar();
    inscripciones.postInscripcion.and.returnValue(of({ estado: 'INSCRITO' } as any));
    component.inscribirse();
    detectar();
    const panel = q('.resultado-exito');
    expect(panel.textContent).toContain('Estás inscrito en este grupo');
    expect(panel.getAttribute('role')).toBe('status');
    expect(getComputedStyle(panel).borderLeftWidth).toBe('6px');
    expect(el().querySelector('button.btn-inscribirse')).toBeNull();
    q<HTMLButtonElement>('.btn-mis-cursos').click();
    expect(router.navigate).toHaveBeenCalledWith(['/info-estudiante']);
    expect(q('.btn-cancelar-inscripcion').textContent).toContain('Cancelar inscripción');
    expect(avisos.exito).toHaveBeenCalledWith('Inscripción exitosa', jasmine.any(String), 8000);
  });

  it('al quedar en lista de espera el panel amarillo muestra la posición y "Salir de la lista de espera"', async () => {
    await montar({ disp: { cuposTotales: 5, cuposDisponibles: 0, tamanoListaEspera: 1 } });
    inscripciones.postInscripcion.and.returnValue(of({ estado: 'EN_ESPERA' } as any));
    component.inscribirse();
    detectar();
    const panel = q('.resultado-espera');
    expect(panel.textContent).toContain('Estás en la lista de espera');
    expect(panel.textContent).toContain('Tu posición es la 2');
    expect(q('.btn-cancelar-inscripcion').textContent).toContain('Salir de la lista de espera');
    expect(avisos.info).toHaveBeenCalledWith('Quedaste en lista de espera', jasmine.any(String), 8000);
  });

  it('con un estado que mostrar el panel se marca para ir primero en móvil; sin estado no', async () => {
    await montar();
    expect(q('.panel-accion').classList).not.toContain('con-estado');
    inscripciones.postInscripcion.and.returnValue(of({ estado: 'INSCRITO' } as any));
    component.inscribirse();
    detectar();
    expect(q('.panel-accion').classList).toContain('con-estado');
  });

  it('al volver a la pantalla estando en lista de espera lo reconoce (antes aparecía como inscrito)', async () => {
    await montar({ inscrito: true, enEspera: true });
    expect(component.yaEnEspera).toBeTrue();
    expect(el().querySelector('.resultado-espera')).not.toBeNull();
    expect(el().querySelector('.resultado-exito')).toBeNull();
  });

  it('al volver estando inscrito (no en espera) muestra el panel verde', async () => {
    await montar({ inscrito: true });
    expect(el().querySelector('.resultado-exito')).not.toBeNull();
  });

  it('cancelar pide confirmación: "Mantener" la descarta y no cancela', async () => {
    await montar({ inscrito: true });
    q<HTMLButtonElement>('.btn-cancelar-inscripcion').click();
    detectar();
    const confirmacion = q('.confirmar-cancelacion');
    expect(confirmacion.getAttribute('role')).toBe('group');
    expect(confirmacion.textContent).toContain('Tu cupo quedará disponible');
    expect(el().querySelector('.btn-cancelar-inscripcion')).toBeNull();
    q<HTMLButtonElement>('.btn-mantener').click();
    detectar();
    expect(el().querySelector('.confirmar-cancelacion')).toBeNull();
    expect(inscripciones.eliminarInscripcion).not.toHaveBeenCalled();
  });

  it('confirmar la cancelación libera el cupo y deja un panel azul que explica lo ocurrido', async () => {
    await montar({ inscrito: true });
    inscripciones.eliminarInscripcion.and.returnValue(of({} as any));
    q<HTMLButtonElement>('.btn-cancelar-inscripcion').click();
    detectar();
    q<HTMLButtonElement>('.btn-confirmar-cancelar').click();
    detectar();
    expect(inscripciones.eliminarInscripcion).toHaveBeenCalled();
    expect(component.yaInscrito).toBeFalse();
    expect(component.confirmandoCancelacion).toBeFalse();
    expect(q('.resultado-info').textContent).toContain('Inscripción cancelada');
    expect(q('button.btn-inscribirse')).not.toBeNull();
  });

  it('en lista de espera la confirmación habla de la posición y el resultado dice que salió de la lista', async () => {
    await montar({ inscrito: true, enEspera: true });
    inscripciones.eliminarInscripcion.and.returnValue(of({} as any));
    q<HTMLButtonElement>('.btn-cancelar-inscripcion').click();
    detectar();
    expect(q('.confirmar-cancelacion').textContent).toContain('Perderás tu posición');
    q<HTMLButtonElement>('.btn-confirmar-cancelar').click();
    detectar();
    expect(q('.resultado-info').textContent).toContain('Saliste de la lista de espera');
  });

  it('"Cancelar" usa el naranja del rol de error, nunca rojo', async () => {
    await montar({ inscrito: true });
    expect(getComputedStyle(q('.btn-cancelar-inscripcion')).color).toBe('rgb(154, 65, 0)');
  });

  it('un grupo con inscripciones cerradas lo explica dentro del panel y deja el botón deshabilitado', async () => {
    await montar();
    component.grupo = { ...(component.grupo as any), inscripcionesAbiertas: false, motivoInscripcion: 'CERRADAS', fechaIncripcionCierre: '2026-06-14' };
    detectar();
    expect(q('button.btn-inscribirse').hasAttribute('disabled')).toBeTrue();
    expect(q('.aviso-cerrado .aviso-grupo-cerrado').textContent?.trim()).toBe('Las inscripciones de este grupo cerraron el 14/06/2026');
  });
});
