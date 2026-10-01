// Candidato a refactorización: letraDeIterable() es idéntica en ListGruposComponent,
// ListDeportistasde-cursoComponent y ReportesComponent. Mover a un pipe o util compartido
// eliminaría esta duplicación. Ver los otros .spec.ts de esta función.
//
// Estrategia de test: Object.create(prototype) permite llamar métodos de la clase sin
// instanciar a través de Angular DI (que requeriría stubs para 10 dependencias).
// Válido porque letraDeIterable no accede a `this`.

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { ListGruposComponent } from './list-grupos.component';
import { GrupoService } from 'src/app/services/grupo.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { HorarioService } from 'src/app/services/horario.service';
import { AuthService } from 'src/app/services/auth.service';
import { TokenInterchangeService } from 'src/app/services/token-interchange.service';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { CursoDTO } from 'src/app/Models/DTOs/curso-dto';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { DialogComponent } from '../../dialog/dialog.component';

describe('ListGruposComponent › letraDeIterable', () => {
  let comp: ListGruposComponent;

  beforeEach(() => {
    comp = Object.create(ListGruposComponent.prototype) as ListGruposComponent;
  });

  it('1  → "A"', () => expect(comp.letraDeIterable(1)).toBe('A'));
  it('2  → "B"', () => expect(comp.letraDeIterable(2)).toBe('B'));
  it('3  → "C"', () => expect(comp.letraDeIterable(3)).toBe('C'));
  it('26 → "Z" (límite superior del alfabeto)', () => expect(comp.letraDeIterable(26)).toBe('Z'));
  it('0   → "?" (cero es falsy)', () => expect(comp.letraDeIterable(0)).toBe('?'));
  it('-1  → "?" (negativo < 1)', () => expect(comp.letraDeIterable(-1)).toBe('?'));
  it('null → "?" (null es falsy)', () => expect(comp.letraDeIterable(null)).toBe('?'));
});

describe('ListGruposComponent › alumnosGrupo', () => {
  let component: ListGruposComponent;
  let fixture: ComponentFixture<ListGruposComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let perfilSubject: BehaviorSubject<string>;

  beforeEach(async () => {
    routerSpy     = jasmine.createSpyObj('Router', ['navigate']);
    perfilSubject = new BehaviorSubject<string>('');

    await TestBed.configureTestingModule({
      imports: [ListGruposComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: Router,       useValue: routerSpy },
        { provide: PerfilService, useValue: { perfil$: perfilSubject.asObservable() } },
        { provide: AuthService,  useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'isAuthenticated', 'getProfile']) },
        { provide: TokenInterchangeService, useValue: {} },
        { provide: OAuthService, useValue: { configure: () => {}, setupAutomaticSilentRefresh: () => {}, events: of(), loadDiscoveryDocumentAndTryLogin: () => Promise.resolve(), getIdentityClaims: () => null, hasValidAccessToken: () => false, hasValidIdToken: () => false } },
        { provide: GrupoService,  useValue: { getGrupos: jasmine.createSpy().and.returnValue(of([])) } },
        { provide: CursodeportivoService, useValue: { getCurso: jasmine.createSpy().and.returnValue(of({ nombre: 'Test', deporte: 'F', categoriaCurso: 'C', descripcion: 'D', estadoCurso: 'ACTIVO', estadoInscripciones: 'ABIERTO' } as CursoDTO)) } },
        { provide: ImagenService, useValue: { getimagen: jasmine.createSpy().and.returnValue(of({})) } },
        { provide: InstructorServisce, useValue: { getInstructor: jasmine.createSpy().and.returnValue(of({})) } },
        { provide: HorarioService, useValue: { getHorarios: jasmine.createSpy().and.returnValue(of([])) } },
        { provide: MatSnackBar,  useValue: { open: jasmine.createSpy() } },
        { provide: MatDialog,    useValue: { open: jasmine.createSpy().and.returnValue({ afterClosed: () => of(null) }) } },
        { provide: BreakpointObserver, useValue: { observe: jasmine.createSpy().and.returnValue(of({ matches: false })) } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ categoria: 'Recreativo', curso: 'Natacion' })) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture   = TestBed.createComponent(ListGruposComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('alumnosGrupo(): rol "Alumno" navega a /inscripcion-grupo', () => {
    component.perfil = 'Alumno';
    component.alumnosGrupo('Recreativo', 'Natacion', 2026, 1);
    expect(routerSpy.navigate).toHaveBeenCalledWith(
      ['/inscripcion-grupo', 'Recreativo', 'Natacion', 2026, 1]
    );
  });

  it('alumnosGrupo(): rol "Coordinador" navega a /listaDeportistasCurso', () => {
    component.perfil = 'Coordinador';
    component.alumnosGrupo('Recreativo', 'Natacion', 2026, 2);
    expect(routerSpy.navigate).toHaveBeenCalledWith(
      ['/listaDeportistasCurso', 'Recreativo', 'Natacion', 2026, 2]
    );
  });

  it('loadGrupos: mantiene curso como null cuando getCurso falla', () => {
    (component['cursodeportivoService'].getCurso as jasmine.Spy)
      .and.returnValue(throwError(() => new Error('error')));
    component.curso = null;
    component['loadGrupos']('Recreativo', 'Natacion');
    expect(component.curso).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// onDelete() — flujo completo de eliminación de grupo
// ─────────────────────────────────────────────────────────────────────────────
describe('ListGruposComponent › onDelete', () => {
  let component: ListGruposComponent;
  let fixture: ComponentFixture<ListGruposComponent>;
  let mockDialogRef: { afterClosed: jasmine.Spy };
  let dialogOpenSpy: jasmine.Spy;
  let snackBarOpenSpy: jasmine.Spy;

  const mockItem: GrupoDTO = {
    categoria: 'Acuáticos',
    curso: 'Natación',
    anio: 2026,
    iterable: 1,
    cupos: 20,
    fechaCreacion: '2026-01-01',
    idInstructor: 'INS01',
    nombreInstructor: 'Carlos',
    imagenGrupo: 0,
    fechaFinalizacion: '',
    fechaInscripcionApertura: '',
    fechaIncripcionCierre: '',
  };

  const mockCursoDto: CursoDTO = {
    nombre: 'Natación',
    deporte: 'Natación',
    categoriaCurso: 'Acuáticos',
    descripcion: 'Curso de prueba',
    estadoCurso: 'ACTIVO',
    estadoInscripciones: 'ABIERTO',
  };

  beforeEach(async () => {
    mockDialogRef = { afterClosed: jasmine.createSpy().and.returnValue(of(null)) };

    await TestBed.configureTestingModule({
      imports: [ListGruposComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: PerfilService, useValue: { perfil$: new BehaviorSubject<string>('Coordinador').asObservable() } },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'isAuthenticated', 'getProfile']) },
        { provide: TokenInterchangeService, useValue: {} },
        { provide: OAuthService, useValue: { configure: () => {}, setupAutomaticSilentRefresh: () => {}, events: of(), loadDiscoveryDocumentAndTryLogin: () => Promise.resolve(), getIdentityClaims: () => null, hasValidAccessToken: () => false, hasValidIdToken: () => false } },
        { provide: GrupoService, useValue: { getGrupos: jasmine.createSpy().and.returnValue(of([])), deleteGrupo: jasmine.createSpy().and.returnValue(of({})) } },
        { provide: CursodeportivoService, useValue: { getCurso: jasmine.createSpy().and.returnValue(of(mockCursoDto)) } },
        { provide: ImagenService, useValue: { getimagen: jasmine.createSpy().and.returnValue(of({})) } },
        { provide: InstructorServisce, useValue: { getInstructor: jasmine.createSpy().and.returnValue(of({})) } },
        { provide: HorarioService, useValue: { getHorarios: jasmine.createSpy().and.returnValue(of([])) } },
        { provide: InscripcionesService, useValue: { getDisponibilidad: jasmine.createSpy().and.returnValue(of({})) } },
        { provide: BreakpointObserver, useValue: { observe: jasmine.createSpy().and.returnValue(of({ matches: false })) } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ categoria: 'Acuáticos', curso: 'Natación' })) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture   = TestBed.createComponent(ListGruposComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Spy on the component's actual injected dialog and snackbar instances
    // (needed because MatDialogModule in standalone imports creates its own injector,
    //  so the TestBed-level MatDialog provider is shadowed by the component's own one)
    dialogOpenSpy   = spyOn(component['dialog'], 'open').and.returnValue(mockDialogRef as any);
    snackBarOpenSpy = spyOn(component['snackBar'], 'open');
  });

  it('abre el dialog con tipoElemento="grupo" y los parámetros del item', () => {
    component.onDelete(mockItem);
    expect(dialogOpenSpy).toHaveBeenCalledWith(DialogComponent, jasmine.objectContaining({
      data: jasmine.objectContaining({
        tipoElemento: 'grupo',
        categoria: 'Acuáticos',
        anio: mockItem.anio,
        iterable: mockItem.iterable,
      }),
    }));
  });

  it('confirmado=true → recarga grupos y muestra snackbar de éxito', () => {
    mockDialogRef.afterClosed.and.returnValue(of({ confirmado: true }));
    spyOn<any>(component, 'loadGrupos');
    component.onDelete(mockItem);
    expect(component['loadGrupos']).toHaveBeenCalled();
    expect(snackBarOpenSpy).toHaveBeenCalledWith(
      'Grupo eliminado correctamente', 'Cerrar',
      jasmine.objectContaining({ panelClass: ['snack-success'] })
    );
  });

  it('errorStatus definido → muestra snackbar de error sin recargar', () => {
    mockDialogRef.afterClosed.and.returnValue(of({ confirmado: false, errorStatus: 409 }));
    spyOn<any>(component, 'loadGrupos');
    component.onDelete(mockItem);
    expect(component['loadGrupos']).not.toHaveBeenCalled();
    expect(snackBarOpenSpy).toHaveBeenCalledWith(
      jasmine.stringContaining('Error'), 'Cerrar',
      jasmine.objectContaining({ panelClass: ['snack-error'] })
    );
  });

  it('afterClosed null → no recarga ni muestra snackbar', () => {
    mockDialogRef.afterClosed.and.returnValue(of(null));
    spyOn<any>(component, 'loadGrupos');
    component.onDelete(mockItem);
    expect(component['loadGrupos']).not.toHaveBeenCalled();
    expect(snackBarOpenSpy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// puedeInscribirse() — pruebas con Object.create para evitar 10 dependencias DI
// ─────────────────────────────────────────────────────────────────────────────
describe('ListGruposComponent › puedeInscribirse', () => {
  let comp: ListGruposComponent;

  const cursoActivo: CursoDTO = {
    nombre: 'Test',
    deporte: 'Futbol',
    categoriaCurso: 'Deportes',
    descripcion: 'Curso de prueba',
    estadoCurso: 'ACTIVO',
    estadoInscripciones: 'ABIERTO',
  };

  beforeEach(() => {
    comp = Object.create(ListGruposComponent.prototype) as ListGruposComponent;
    comp.curso = cursoActivo;
    comp.categoria = 'Futbol';
  });

  it('ACTIVO + ABIERTO → true', () => {
    expect(comp.puedeInscribirse()).toBeTrue();
  });

  it('ACTIVO + CERRADO → false', () => {
    comp.curso = { ...cursoActivo, estadoInscripciones: 'CERRADO' };
    expect(comp.puedeInscribirse()).toBeFalse();
  });

  it('INACTIVO + ABIERTO → false', () => {
    comp.curso = { ...cursoActivo, estadoCurso: 'INACTIVO' };
    expect(comp.puedeInscribirse()).toBeFalse();
  });

  it('INACTIVO + CERRADO → false', () => {
    comp.curso = { ...cursoActivo, estadoCurso: 'INACTIVO', estadoInscripciones: 'CERRADO' };
    expect(comp.puedeInscribirse()).toBeFalse();
  });

  it('categoria "seleccionado" → false aunque el curso esté ACTIVO+ABIERTO', () => {
    comp.categoria = 'seleccionado';
    expect(comp.puedeInscribirse()).toBeFalse();
  });
});
