import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { CursosDeportivosComponent } from './cursos-deportivos.component';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { AuthService } from 'src/app/services/auth.service';
import { TokenInterchangeService } from 'src/app/services/token-interchange.service';

const mockCurso = { nombre: 'Natacion', categoria: 'Recreativo', estadoCurso: 'ACTIVO', estadoInscripciones: 'CERRADO', idImagen: null, imagenBase64: null, tipoArchivo: null };

describe('CursosDeportivosComponent', () => {
  let component: CursosDeportivosComponent;
  let fixture: ComponentFixture<CursosDeportivosComponent>;
  let cursoSpy: jasmine.SpyObj<CursodeportivoService>;
  let snackOpen: jasmine.Spy;
  let routerSpy: jasmine.SpyObj<Router>;
  let perfilSubject: BehaviorSubject<string>;

  beforeEach(async () => {
    cursoSpy  = jasmine.createSpyObj('CursodeportivoService', [
      'getCursos', 'getTodosCursosDeCategoria', 'cambiarEstadoCurso',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    perfilSubject = new BehaviorSubject<string>('');

    cursoSpy.getCursos.and.returnValue(of([] as any));
    cursoSpy.getTodosCursosDeCategoria.and.returnValue(of([] as any));

    await TestBed.configureTestingModule({
      imports: [CursosDeportivosComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: Router,       useValue: routerSpy },
        { provide: CursodeportivoService, useValue: cursoSpy },
        { provide: PerfilService, useValue: { perfil$: perfilSubject.asObservable() } },
        { provide: AuthService,  useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'isAuthenticated', 'getProfile']) },
        { provide: TokenInterchangeService, useValue: {} },
        { provide: OAuthService, useValue: { configure: () => {}, setupAutomaticSilentRefresh: () => {}, events: of(), loadDiscoveryDocumentAndTryLogin: () => Promise.resolve(), getIdentityClaims: () => null, hasValidAccessToken: () => false, hasValidIdToken: () => false } },
        { provide: ImagenService, useValue: { getimagen: jasmine.createSpy().and.returnValue(of({})) } },
        { provide: MatDialog,    useValue: { open: jasmine.createSpy().and.returnValue({ afterClosed: () => of(null) }) } },
        { provide: BreakpointObserver, useValue: { observe: jasmine.createSpy().and.returnValue(of({ matches: false })) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'Recreativo' } } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture   = TestBed.createComponent(CursosDeportivosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Espiar el snackBar real que el componente inyecta (evita problemas de módulo vs. spy manual)
    snackOpen = spyOn(component['snackBar'], 'open');
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('loadCursos(): usa getTodosCursosDeCategoria cuando el rol es "Coordinador"', () => {
    cursoSpy.getTodosCursosDeCategoria.and.returnValue(of([{ ...mockCurso }] as any));
    // Reset de llamadas previas del ngOnInit (que ya invocó getCursos con perfil vacío)
    cursoSpy.getCursos.calls.reset();
    cursoSpy.getTodosCursosDeCategoria.calls.reset();
    perfilSubject.next('Coordinador');
    expect(cursoSpy.getTodosCursosDeCategoria).toHaveBeenCalledWith('Recreativo');
    expect(cursoSpy.getCursos).not.toHaveBeenCalled();
  });

  it('loadCursos(): usa getCursos para cualquier otro rol (Alumno, Instructor, vacío)', () => {
    cursoSpy.getCursos.and.returnValue(of([{ ...mockCurso }] as any));
    cursoSpy.getCursos.calls.reset();
    cursoSpy.getTodosCursosDeCategoria.calls.reset();
    perfilSubject.next('Alumno');
    expect(cursoSpy.getCursos).toHaveBeenCalledWith('Recreativo');
    expect(cursoSpy.getTodosCursosDeCategoria).not.toHaveBeenCalled();
  });

  it('gruposCurso(): navega a /list-grupos con categoría y curso', () => {
    component.gruposCurso('Recreativo', 'Natacion');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/list-grupos', 'Recreativo', 'Natacion']);
  });

  it('toggleEstadoCurso(): actualiza estadoCurso y muestra snackbar de éxito', () => {
    const item = { ...mockCurso, estadoCurso: 'ACTIVO' };
    cursoSpy.cambiarEstadoCurso.and.returnValue(of({ ...item, estadoCurso: 'INACTIVO' } as any));
    component.toggleEstadoCurso(item as any);
    expect(item.estadoCurso).toBe('INACTIVO');
    expect(snackOpen).toHaveBeenCalledWith(
      jasmine.stringContaining('deshabilitado'), 'Cerrar', jasmine.any(Object)
    );
  });

  it('toggleEstadoCurso(): muestra snackbar de error si el servicio falla', () => {
    cursoSpy.cambiarEstadoCurso.and.returnValue(throwError(() => ({ status: 500 })));
    component.toggleEstadoCurso({ ...mockCurso } as any);
    expect(snackOpen).toHaveBeenCalledWith(
      jasmine.stringContaining('Error al cambiar'), 'Cerrar', jasmine.any(Object)
    );
  });

  // Fase 3: el estado de inscripciones del curso se deriva de sus grupos; ya no hay botón para cambiarlo a mano.
  it('ya no existe toggleInscripciones (cerrar o abrir se hace por grupo)', () => {
    expect((component as any).toggleInscripciones).toBeUndefined();
  });

  describe('estado de inscripciones derivado', () => {
    const badges = (): string[] =>
      Array.from(fixture.nativeElement.querySelectorAll('.badge-inscripciones') as NodeListOf<HTMLElement>)
        .map(e => (e.textContent ?? '').trim());

    it('cada tarjeta muestra Inscripciones abiertas / cerradas / Sin grupos según el estado derivado', () => {
      component.cursos = [
        { ...mockCurso, nombre: 'A', estadoInscripciones: 'ABIERTO' },
        { ...mockCurso, nombre: 'B', estadoInscripciones: 'CERRADO' },
        { ...mockCurso, nombre: 'C', estadoInscripciones: 'SIN_GRUPOS' },
      ] as any;
      fixture.detectChanges();
      expect(badges()).toEqual(['Inscripciones abiertas', 'Inscripciones cerradas', 'Sin grupos']);
    });
  });

  describe('público del curso', () => {
    const cursosConPublico = [
      { ...mockCurso, nombre: 'ParaEstudiantes', publico: 'ESTUDIANTE' },
      { ...mockCurso, nombre: 'ParaFuncionarios', publico: 'FUNCIONARIO' },
      { ...mockCurso, nombre: 'ParaTodos', publico: 'MIXTO' },
      { ...mockCurso, nombre: 'SinPublico' },
    ];

    const nombresVisibles = (): string[] => component.cursosVisibles.map(c => c.nombre);

    function cargarComo(rol: string): void {
      cursoSpy.getTodosCursosDeCategoria.and.returnValue(of(cursosConPublico.map(c => ({ ...c })) as any));
      cursoSpy.getCursos.and.returnValue(of(cursosConPublico.map(c => ({ ...c })) as any));
      perfilSubject.next(rol);
      fixture.detectChanges();
    }

    const filtro = (): HTMLSelectElement | null => fixture.nativeElement.querySelector('#filtro-publico');
    const chips = (): string[] =>
      Array.from(fixture.nativeElement.querySelectorAll('.badge-publico') as NodeListOf<HTMLElement>)
        .map(e => (e.textContent ?? '').trim());

    it('sin filtro ("Cualquiera") se ven todos los cursos', () => {
      cargarComo('Coordinador');
      expect(component.filtroPublico).toBe('TODOS');
      expect(nombresVisibles()).toEqual(['ParaEstudiantes', 'ParaFuncionarios', 'ParaTodos', 'SinPublico']);
    });

    it('el filtro por Estudiantes muestra solo los cursos para estudiantes', () => {
      cargarComo('Coordinador');
      component.cambiarFiltroPublico('ESTUDIANTE');
      expect(nombresVisibles()).toEqual(['ParaEstudiantes']);
    });

    it('el filtro por Funcionarios muestra solo los cursos para funcionarios', () => {
      cargarComo('Coordinador');
      component.cambiarFiltroPublico('FUNCIONARIO');
      expect(nombresVisibles()).toEqual(['ParaFuncionarios']);
    });

    it('el filtro por toda la comunidad incluye a los cursos sin público', () => {
      cargarComo('Coordinador');
      component.cambiarFiltroPublico('MIXTO');
      expect(nombresVisibles()).toEqual(['ParaTodos', 'SinPublico']);
    });

    it('volver a "Cualquiera" quita el filtro', () => {
      cargarComo('Coordinador');
      component.cambiarFiltroPublico('ESTUDIANTE');
      component.cambiarFiltroPublico('TODOS');
      expect(nombresVisibles().length).toBe(4);
    });

    it('un valor de filtro desconocido se toma como "Cualquiera"', () => {
      cargarComo('Coordinador');
      component.cambiarFiltroPublico('DOCENTES');
      expect(component.filtroPublico).toBe('TODOS');
      expect(nombresVisibles().length).toBe(4);
    });

    it('el Coordinador, el Instructor y el Administrador ven el selector de filtro; el Alumno no', () => {
      for (const rol of ['Coordinador', 'Instructor', 'Administrador']) {
        cargarComo(rol);
        expect(filtro()).withContext(rol).not.toBeNull();
      }
      cargarComo('Alumno');
      expect(filtro()).withContext('Alumno').toBeNull();
    });

    it('cada tarjeta indica a quién va dirigido el curso', () => {
      cargarComo('Coordinador');
      expect(chips()).toEqual([
        'Dirigido a: Estudiantes',
        'Dirigido a: Funcionarios',
        'Dirigido a: Toda la comunidad',
        'Dirigido a: Toda la comunidad',
      ]);
    });

    it('el Alumno también ve a quién va dirigido cada curso', () => {
      cargarComo('Alumno');
      expect(chips().length).toBe(4);
    });

    it('si el filtro no deja ningún curso, lo avisa', () => {
      cursoSpy.getTodosCursosDeCategoria.and.returnValue(of([{ ...mockCurso, nombre: 'Solo', publico: 'MIXTO' }] as any));
      perfilSubject.next('Coordinador');
      component.cambiarFiltroPublico('ESTUDIANTE');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Ningún curso coincide con el filtro');
    });

    it('sin cursos en la categoría no muestra el aviso del filtro', () => {
      cursoSpy.getTodosCursosDeCategoria.and.returnValue(of([] as any));
      perfilSubject.next('Coordinador');
      component.cambiarFiltroPublico('ESTUDIANTE');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Ningún curso coincide con el filtro');
    });
  });
});
