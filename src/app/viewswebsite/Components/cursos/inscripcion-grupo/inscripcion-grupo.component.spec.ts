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
  let snackOpen: jasmine.Spy;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    grupoSpy      = jasmine.createSpyObj('GrupoService', ['getGrupo']);
    inscripcionSpy = jasmine.createSpyObj('InscripcionesService', ['postInscripcion', 'getDisponibilidad', 'validarInscripcion', 'eliminarInscripcion']);
    horarioSpy    = jasmine.createSpyObj('HorarioService', ['getHorarios']);
    instructorSpy = jasmine.createSpyObj('InstructorServisce', ['getInstructor']);
    routerSpy     = jasmine.createSpyObj('Router', ['navigate']);

    grupoSpy.getGrupo.and.returnValue(of({ ...mockGrupo } as any));
    horarioSpy.getHorarios.and.returnValue(of(mockHorarios as any));
    instructorSpy.getInstructor.and.returnValue(of(mockInstructor as any));
    inscripcionSpy.getDisponibilidad.and.returnValue(of({ cuposTotales: 15, cuposDisponibles: 5, tamanoListaEspera: 0 } as any));
    inscripcionSpy.validarInscripcion.and.returnValue(of(false));

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
    }).compileComponents();

    fixture   = TestBed.createComponent(InscripcionGrupoComponent);
    component = fixture.componentInstance;
    sessionStorage.removeItem('dpt_perfil_id');
    fixture.detectChanges();
    // Espiar el snackBar real inyectado en el componente
    snackOpen = spyOn(component['snackBar'], 'open');
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

  it('cargarGrupo(): muestra snackbar de error si getGrupo falla', () => {
    grupoSpy.getGrupo.and.returnValue(throwError(() => ({ status: 500 })));
    component.ngOnInit();
    expect(snackOpen).toHaveBeenCalledWith(
      jasmine.stringContaining('No se pudo cargar'), 'Cerrar', jasmine.any(Object)
    );
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
    expect(snackOpen).toHaveBeenCalledWith(
      jasmine.stringContaining('No se pudo identificar'), 'Cerrar', jasmine.any(Object)
    );
    expect(inscripcionSpy.postInscripcion).not.toHaveBeenCalled();
  });

  it('inscribirse(): POST /inscripcion exitoso → yaInscrito=true y snackbar de éxito', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.postInscripcion.and.returnValue(of({} as any));
    component.inscribirse();
    expect(inscripcionSpy.postInscripcion).toHaveBeenCalledWith(
      jasmine.objectContaining({ alumnoId: 12345, categoria: 'Recreativo', curso: 'Natacion' })
    );
    expect(component.yaInscrito).toBeTrue();
    expect(snackOpen).toHaveBeenCalledWith(
      jasmine.stringContaining('exitosamente'), 'Cerrar', jasmine.any(Object)
    );
  });

  it('inscribirse(): error 409 sin cuerpo de error → snackbar genérico de error', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.postInscripcion.and.returnValue(throwError(() => ({ status: 409 })));
    component.inscribirse();
    expect(component.yaInscrito).toBeFalse();
    expect(snackOpen).toHaveBeenCalledWith(
      jasmine.stringContaining('Error al inscribirse'), 'Cerrar', jasmine.any(Object)
    );
  });

  it('inscribirse(): error 500 → snackbar genérico de error', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.postInscripcion.and.returnValue(throwError(() => ({ status: 500 })));
    component.inscribirse();
    expect(snackOpen).toHaveBeenCalledWith(
      jasmine.stringContaining('Error al inscribirse'), 'Cerrar', jasmine.any(Object)
    );
  });

  // ── mensajes reales del backend ────────────────────────────────────────────

  it('inscribirse(): error 422 (inscripciones cerradas) → muestra el mensaje real del backend', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.postInscripcion.and.returnValue(
      throwError(() => ({ status: 422, error: { mensaje: 'Las inscripciones para el curso Natacion están cerradas' } }))
    );
    component.inscribirse();
    expect(snackOpen).toHaveBeenCalledWith(
      'Las inscripciones para el curso Natacion están cerradas', 'Cerrar', jasmine.any(Object)
    );
  });

  it('inscribirse(): error 409 con mensaje de cupos agotados → muestra ese mensaje (no texto de "ya inscrito")', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.postInscripcion.and.returnValue(
      throwError(() => ({ status: 409, error: { mensaje: 'Los cupos para este grupo están agotados' } }))
    );
    component.inscribirse();
    expect(snackOpen).toHaveBeenCalledWith(
      'Los cupos para este grupo están agotados', 'Cerrar', jasmine.any(Object)
    );
    expect(snackOpen).not.toHaveBeenCalledWith(
      jasmine.stringContaining('Ya estás inscrito'), jasmine.any(String), jasmine.any(Object)
    );
  });

  it('inscribirse(): error 409 con mensaje de ya inscrito → muestra el mensaje real del backend', () => {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    inscripcionSpy.postInscripcion.and.returnValue(
      throwError(() => ({ status: 409, error: { mensaje: 'Ya estás inscrito en este grupo.' } }))
    );
    component.inscribirse();
    expect(snackOpen).toHaveBeenCalledWith(
      'Ya estás inscrito en este grupo.', 'Cerrar', jasmine.any(Object)
    );
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
    }).compileComponents();

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
