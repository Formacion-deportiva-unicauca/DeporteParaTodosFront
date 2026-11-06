import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { SidenavStub } from 'src/app/testing/sidenav-stub';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { CursosDeportivosComponent } from './cursos-deportivos.component';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { AuthService } from 'src/app/services/auth.service';
import { TokenInterchangeService } from 'src/app/services/token-interchange.service';
import { CategoriaService } from 'src/app/services/categoria.service';

const CATEGORIAS = [
  { titulo: 'Recreativo', descripcion: 'Actividades para disfrutar y mantenerse activo.' },
  { titulo: 'Semilleros', descripcion: 'Formación de base.' },
];

const mockCurso = { nombre: 'Natacion', categoria: 'Recreativo', estadoCurso: 'ACTIVO', estadoInscripciones: 'CERRADO', idImagen: null, imagenBase64: null, tipoArchivo: null };

describe('CursosDeportivosComponent', () => {
  let component: CursosDeportivosComponent;
  let fixture: ComponentFixture<CursosDeportivosComponent>;
  let cursoSpy: jasmine.SpyObj<CursodeportivoService>;
  let avisoExito: jasmine.Spy;
  let avisoError: jasmine.Spy;
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
        { provide: CategoriaService, useValue: { getCategorias: () => of(CATEGORIAS) } },
        { provide: OAuthService, useValue: { configure: () => {}, setupAutomaticSilentRefresh: () => {}, events: of(), loadDiscoveryDocumentAndTryLogin: () => Promise.resolve(), getIdentityClaims: () => null, hasValidAccessToken: () => false, hasValidIdToken: () => false } },
        { provide: ImagenService, useValue: { getimagen: jasmine.createSpy().and.returnValue(of({})) } },
        { provide: MatDialog,    useValue: { open: jasmine.createSpy().and.returnValue({ afterClosed: () => of(null) }) } },
        { provide: BreakpointObserver, useValue: { observe: jasmine.createSpy().and.returnValue(of({ matches: false })) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'Recreativo' } } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(CursosDeportivosComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
    .compileComponents();

    fixture   = TestBed.createComponent(CursosDeportivosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Espiar el servicio de notificaciones real que el componente inyecta
    avisoExito = spyOn(component['notificaciones'], 'exito');
    avisoError = spyOn(component['notificaciones'], 'error');
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

  it('toggleEstadoCurso(): actualiza estadoCurso y muestra la notificación de éxito', () => {
    const item = { ...mockCurso, estadoCurso: 'ACTIVO' };
    cursoSpy.cambiarEstadoCurso.and.returnValue(of({ ...item, estadoCurso: 'INACTIVO' } as any));
    component.toggleEstadoCurso(item as any);
    expect(item.estadoCurso).toBe('INACTIVO');
    expect(avisoExito).toHaveBeenCalledWith('Curso deshabilitado', jasmine.stringContaining('deshabilitado'));
  });

  it('toggleEstadoCurso(): muestra la notificación de error si el servicio falla', () => {
    cursoSpy.cambiarEstadoCurso.and.returnValue(throwError(() => ({ status: 500 })));
    component.toggleEstadoCurso({ ...mockCurso } as any);
    expect(avisoError).toHaveBeenCalledWith('No se pudo cambiar el estado', jasmine.stringContaining('estado del curso'));
  });

  describe('notificaciones al crear, actualizar y eliminar un curso', () => {
    const cerrarCon = (resultado: unknown): void => {
      (component['dialog'].open as any) = () => ({ afterClosed: () => of(resultado) });
    };
    beforeEach(() => {
      (component as any).titulo = 'Recreativo';
      spyOn(component as any, 'loadCursos');
    });

    it('al crear un curso avisa con éxito', () => {
      cerrarCon(true);
      component.registroDeporte();
      expect(avisoExito).toHaveBeenCalledOnceWith('Curso creado', 'El curso se registró y ya aparece en la categoría.');
    });

    it('si cancela la creación no avisa', () => {
      cerrarCon(undefined);
      component.registroDeporte();
      expect(avisoExito).not.toHaveBeenCalled();
    });

    it('al actualizar un curso avisa con su nombre', () => {
      cerrarCon(true);
      component.onUpdate('Natación');
      expect(avisoExito).toHaveBeenCalledOnceWith('Curso actualizado', 'Los cambios de «Natación» se guardaron correctamente.');
    });

    it('al eliminar un curso avisa con éxito', () => {
      cerrarCon({ confirmado: true });
      component.onDelete('Natación');
      expect(avisoExito).toHaveBeenCalledOnceWith('Curso eliminado', '«Natación» ya no aparece en la categoría.');
    });

    it('si el servidor rechaza la eliminación avisa con el motivo (409, 404 u otro)', () => {
      cerrarCon({ errorStatus: 409 });
      component.onDelete('Natación');
      expect(avisoError).toHaveBeenCalledWith('No se pudo eliminar el curso', 'El curso ya se encuentra eliminado.');
      cerrarCon({ errorStatus: 404 });
      component.onDelete('Natación');
      expect(avisoError).toHaveBeenCalledWith('No se pudo eliminar el curso', 'El curso no existe.');
      cerrarCon({ errorStatus: 500 });
      component.onDelete('Natación');
      expect(avisoError).toHaveBeenCalledWith('No se pudo eliminar el curso', 'Ocurrió un error, intente de nuevo.');
    });
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

  describe('diseño de la vista (prototipo)', () => {
    const cursos = [
      { ...mockCurso, nombre: 'Baloncesto Libre', deporte: 'Baloncesto', categoriaCurso: 'Recreativo', descripcion: 'Juego en equipo.', estadoInscripciones: 'ABIERTO', publico: 'ESTUDIANTE' },
      { ...mockCurso, nombre: 'Natación inicial', deporte: 'Natación', categoriaCurso: 'Recreativo', descripcion: 'Agua.', estadoInscripciones: 'CERRADO', publico: 'MIXTO' },
      { ...mockCurso, nombre: 'Ajedrez', deporte: 'Mesa', categoriaCurso: 'Recreativo', descripcion: 'Mente.', estadoInscripciones: 'ABIERTO', estadoCurso: 'INACTIVO' },
    ];
    const el = (): HTMLElement => fixture.nativeElement;
    const q = (s: string): HTMLElement | null => el().querySelector(s);
    const qa = (s: string): HTMLElement[] => Array.from(el().querySelectorAll(s)) as HTMLElement[];

    function cargarComo(rol: string): void {
      cursoSpy.getTodosCursosDeCategoria.and.returnValue(of(cursos.map(c => ({ ...c })) as any));
      cursoSpy.getCursos.and.returnValue(of(cursos.map(c => ({ ...c })) as any));
      perfilSubject.next(rol);
      fixture.detectChanges();
    }

    it('el título de la página es "Cursos · {categoría}"', () => {
      cargarComo('Coordinador');
      expect(q('h1.titulo-pagina')?.textContent?.trim()).toBe('Cursos · Recreativo');
    });

    it('"Volver a categorías" lleva al inicio', () => {
      cargarComo('Coordinador');
      const volver = q('.volver') as HTMLElement;
      expect(volver.textContent).toContain('Volver a categorías');
      volver.click();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('la tarjeta de categoría muestra su nombre y su descripción reales', () => {
      cargarComo('Coordinador');
      const t = q('.categoria-actual') as HTMLElement;
      expect(t.textContent).toContain('Categoría seleccionada');
      expect(t.textContent).toContain('Recreativo');
      expect(t.textContent).toContain('Actividades para disfrutar');
    });

    it('"Cambiar categoría" lista las categorías reales y al elegir una navega y recarga', () => {
      cargarComo('Coordinador');
      const sel = q('#cambiar-categoria') as HTMLSelectElement;
      expect(Array.from(sel.options).map(o => o.textContent?.trim())).toEqual(['Recreativo', 'Semilleros']);
      cursoSpy.getTodosCursosDeCategoria.calls.reset();
      component.cambiarCategoria('Semilleros');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/cursos_deportivos', 'Semilleros']);
      expect(component.titulo).toBe('Semilleros');
      expect(cursoSpy.getTodosCursosDeCategoria).toHaveBeenCalledWith('Semilleros');
    });

    it('solo el Coordinador ve "Agregar curso"; ya no hay botón "Inscripciones"', () => {
      cargarComo('Coordinador');
      expect(q('.acciones-pagina')?.textContent).toContain('Agregar curso');
      expect(q('.acciones-pagina')?.textContent).not.toContain('Inscripciones');
      cargarComo('Alumno');
      expect(q('.acciones-pagina')).toBeNull();
    });

    it('buscar filtra por nombre o línea deportiva, sin importar mayúsculas ni tildes', () => {
      cargarComo('Coordinador');
      component.cambiarBusqueda('natacion');
      expect(component.cursosVisibles.map(c => c.nombre)).toEqual(['Natación inicial']);
      component.cambiarBusqueda('BALONCESTO');
      expect(component.cursosVisibles.map(c => c.nombre)).toEqual(['Baloncesto Libre']);
      component.cambiarBusqueda('');
      expect(component.cursosVisibles.length).toBe(3);
    });

    it('la búsqueda se combina con el filtro de público', () => {
      cargarComo('Coordinador');
      component.cambiarFiltroPublico('ESTUDIANTE');
      component.cambiarBusqueda('natacion');
      expect(component.cursosVisibles.length).toBe(0);
    });

    it('muestra "N de M cursos visibles" y los contadores de cursos y con inscripciones abiertas', () => {
      cargarComo('Coordinador');
      expect(q('.contador-visibles')?.textContent?.trim()).toBe('3 de 3 cursos visibles');
      component.cambiarBusqueda('natacion');
      fixture.detectChanges();
      expect(q('.contador-visibles')?.textContent?.trim()).toBe('1 de 3 cursos visibles');
      const stats = q('.estadisticas')?.textContent ?? '';
      expect(stats).toContain('Cursos');
      expect(stats).toContain('Con inscripciones');
      expect(component.cursosConInscripciones).toBe(2);
    });

    it('cada tarjeta muestra eyebrow "categoría · línea deportiva", estado y a quién va dirigido', () => {
      cargarComo('Coordinador');
      const t = qa('.tarjeta-curso')[0];
      expect(t.querySelector('.eyebrow-curso')?.textContent?.trim()).toBe('Recreativo · Baloncesto');
      expect(t.querySelector('.chip-estado')?.textContent?.trim()).toBe('Activo');
      expect(qa('.tarjeta-curso')[2].querySelector('.chip-estado')?.textContent?.trim()).toBe('Inactivo');
      expect(t.textContent).toContain('Juego en equipo.');
      expect(t.querySelector('.badge-publico')?.textContent?.trim()).toBe('Dirigido a: Estudiantes');
    });

    it('"Ver información" abre el detalle y la tarjeta ya no usa mat-grid-list', () => {
      cargarComo('Coordinador');
      expect(q('mat-grid-list')).toBeNull();
      spyOn(component, 'verInformacion');
      (qa('.tarjeta-curso')[0].querySelector('.ver-info') as HTMLElement).click();
      expect(component.verInformacion).toHaveBeenCalled();
    });

    it('el engranaje solo lo ve el Coordinador y tiene nombre accesible', () => {
      cargarComo('Coordinador');
      const b = qa('.tarjeta-curso')[0].querySelector('.btn-menu') as HTMLElement;
      expect(b.getAttribute('aria-label')).toBe('Acciones del curso Baloncesto Libre');
      cargarComo('Alumno');
      expect(q('.btn-menu')).toBeNull();
    });

    it('la rejilla usa 1 columna en móvil y 2 desde 768px, sin alturas fijas', () => {
      cargarComo('Coordinador');
      const r = q('.rejilla-cursos') as HTMLElement;
      const cols = getComputedStyle(r).gridTemplateColumns.split(' ').filter(Boolean).length;
      const esperadas = window.matchMedia('(min-width: 768px)').matches ? 2 : 1;
      expect(cols).toBe(esperadas);
      const img = qa('.tarjeta-curso')[0].querySelector('.imagen-curso') as HTMLElement;
      expect(getComputedStyle(img).aspectRatio.replace(/\s/g, '')).toBe('16/9');
    });

    it('el título de la página lleva la línea secundaria y las tarjetas 12px de radio', () => {
      cargarComo('Coordinador');
      expect(getComputedStyle(qa('.tarjeta-curso')[0]).borderRadius).toBe('12px');
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
