// Candidato a refactorización: letraDeIterable() es idéntica en ListGruposComponent,
// ListDeportistasde-cursoComponent y ReportesComponent. Mover a un pipe o util compartido
// eliminaría esta duplicación. Ver los otros .spec.ts de esta función.
//
// Estrategia de test: Object.create(prototype) permite llamar métodos de la clase sin
// instanciar a través de Angular DI (que requeriría stubs para 10 dependencias).
// Válido porque letraDeIterable no accede a `this`.

import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { SidenavStub } from 'src/app/testing/sidenav-stub';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { FormHorarioComponent } from '../form-horario/form-horario.component';
import { FormGruposComponent } from '../form-grupos/form-grupos.component';
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
  let grupoSpy: jasmine.SpyObj<GrupoService>;

  beforeEach(async () => {
    grupoSpy = jasmine.createSpyObj('GrupoService', ['getGrupos', 'cambiarCierreInscripciones']);
    grupoSpy.getGrupos.and.returnValue(of([]));
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
        { provide: GrupoService,  useValue: grupoSpy },
        { provide: CursodeportivoService, useValue: { getCurso: jasmine.createSpy().and.returnValue(of({ nombre: 'Test', deporte: 'F', categoriaCurso: 'C', descripcion: 'D', estadoCurso: 'ACTIVO', estadoInscripciones: 'ABIERTO' } as CursoDTO)) } },
        { provide: ImagenService, useValue: { getimagen: jasmine.createSpy().and.returnValue(of({})) } },
        { provide: InstructorServisce, useValue: { getInstructor: jasmine.createSpy().and.returnValue(of({})) } },
        { provide: HorarioService, useValue: { getHorarios: jasmine.createSpy().and.returnValue(of([])) } },
        { provide: NotificacionService, useValue: jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']) },
        { provide: MatDialog,    useValue: { open: jasmine.createSpy().and.returnValue({ afterClosed: () => of(null) }) } },
        { provide: BreakpointObserver, useValue: { observe: jasmine.createSpy().and.returnValue(of({ matches: false })) } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ categoria: 'Recreativo', curso: 'Natacion' })) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(ListGruposComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
    .compileComponents();

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

  // ── Ventana de inscripción del grupo (SCRUM-185) ───────────────────────────

  const grupoBase: GrupoDTO = {
    categoria: 'Recreativo', curso: 'Natacion', anio: 2026, iterable: 1, periodo: 2, cupos: 10, fechaCreacion: '2026-01-01',
  };
  const cerrado: GrupoDTO = { ...grupoBase, inscripcionesAbiertas: false, motivoInscripcion: 'CERRADAS', fechaIncripcionCierre: '2026-06-14' };
  const noAbierto: GrupoDTO = { ...grupoBase, inscripcionesAbiertas: false, motivoInscripcion: 'NO_ABIERTAS', fechaInscripcionApertura: '2026-07-01' };
  const abierto: GrupoDTO = { ...grupoBase, inscripcionesAbiertas: true, motivoInscripcion: 'ABIERTAS' };
  const etiqueta = (): string | null =>
    (fixture.nativeElement as HTMLElement).querySelector('.etiqueta-inscripcion')?.textContent?.trim() ?? null;

  it('etiqueta "Cerraron el dd/MM/yyyy" para CERRADAS (con la fecha de cierre)', () => {
    component.grupos = [cerrado];
    fixture.detectChanges();
    expect(etiqueta()).toBe('Cerraron el 14/06/2026');
  });

  const pista = (): string | null =>
    (fixture.nativeElement as HTMLElement).querySelector('.pista-reabrir')?.textContent?.trim() ?? null;

  it('Coordinador: grupo cerrado por fecha muestra cómo reabrir', () => {
    component.perfil = 'Coordinador';
    component.grupos = [cerrado];
    fixture.detectChanges();
    expect(pista()).toBe('Para reabrir, cambia la fecha de cierre en Actualizar');
  });

  it('la pista de reabrir NO aparece para Alumno ni Instructor, ni con grupo abierto o no abierto aún', () => {
    for (const rol of ['Alumno', 'Instructor']) {
      component.perfil = rol;
      component.grupos = [cerrado];
      fixture.detectChanges();
      expect(pista()).toBeNull();
    }
    component.perfil = 'Coordinador';
    component.grupos = [abierto];
    fixture.detectChanges();
    expect(pista()).toBeNull();
    component.grupos = [noAbierto];
    fixture.detectChanges();
    expect(pista()).toBeNull();
  });

  it('el chip del resumen del curso indica si el curso tiene inscripciones abiertas o cerradas', () => {
    const badge = (): string =>
      (fixture.nativeElement as HTMLElement).querySelector('.resumen-curso .badge-inscripciones')?.textContent?.trim() ?? '';
    component.curso = { ...component.curso!, estadoInscripciones: 'ABIERTO' };
    fixture.detectChanges();
    expect(badge()).toBe('Inscripciones abiertas');
    component.curso = { ...component.curso!, estadoInscripciones: 'CERRADO' };
    fixture.detectChanges();
    expect(badge()).toBe('Inscripciones cerradas');
  });

  // ── Fase 3: cierre manual de inscripciones por grupo (solo Coordinador) ───────────────────────

  const cerradoAMano: GrupoDTO = {
    ...grupoBase, inscripcionesAbiertas: false, motivoInscripcion: 'CERRADAS',
    inscripcionesCerradasManual: true, fechaIncripcionCierre: '2026-12-31',
  };

  it('el chip del curso muestra "Sin grupos" cuando aún no tiene grupos', () => {
    component.curso = { ...component.curso!, estadoInscripciones: 'SIN_GRUPOS' };
    fixture.detectChanges();
    const badge = (fixture.nativeElement as HTMLElement).querySelector('.resumen-curso .badge-inscripciones')?.textContent?.trim();
    expect(badge).toBe('Sin grupos');
  });

  it('accionCierreInscripciones(): "Cerrar inscripciones" si está abierto, "Reabrir inscripciones" si lo cerró el Coordinador', () => {
    expect(component.accionCierreInscripciones(abierto)).toBe('Cerrar inscripciones');
    expect(component.accionCierreInscripciones(cerradoAMano)).toBe('Reabrir inscripciones');
  });

  it('accionCierreInscripciones(): sin acción si el grupo está cerrado por fecha o aún no abre (se cambia con las fechas)', () => {
    expect(component.accionCierreInscripciones(cerrado)).toBeNull();
    expect(component.accionCierreInscripciones(noAbierto)).toBeNull();
  });

  it('toggleCierreInscripciones(): cierra un grupo abierto, actualiza la tarjeta y avisa', () => {
    const exito = component['notificaciones'].exito as jasmine.Spy;
    const error = component['notificaciones'].error as jasmine.Spy;
    const item: GrupoDTO = { ...abierto };
    grupoSpy.cambiarCierreInscripciones.and.returnValue(of({
      ...item, inscripcionesAbiertas: false, motivoInscripcion: 'CERRADAS', inscripcionesCerradasManual: true,
    }));
    component.toggleCierreInscripciones(item);
    expect(grupoSpy.cambiarCierreInscripciones).toHaveBeenCalledWith('Recreativo', 'Natacion', 2026, 1, true);
    expect(item.inscripcionesCerradasManual).toBeTrue();
    expect(item.inscripcionesAbiertas).toBeFalse();
    expect(exito).toHaveBeenCalledWith('Inscripciones cerradas', jasmine.stringContaining('se cerraron'));
  });

  it('toggleCierreInscripciones(): reabre un grupo cerrado por el Coordinador', () => {
    const exito = component['notificaciones'].exito as jasmine.Spy;
    const error = component['notificaciones'].error as jasmine.Spy;
    const item: GrupoDTO = { ...cerradoAMano };
    grupoSpy.cambiarCierreInscripciones.and.returnValue(of({
      ...item, inscripcionesAbiertas: true, motivoInscripcion: 'ABIERTAS', inscripcionesCerradasManual: false,
    }));
    component.toggleCierreInscripciones(item);
    expect(grupoSpy.cambiarCierreInscripciones).toHaveBeenCalledWith('Recreativo', 'Natacion', 2026, 1, false);
    expect(item.inscripcionesCerradasManual).toBeFalse();
    expect(item.inscripcionesAbiertas).toBeTrue();
    expect(exito).toHaveBeenCalledWith('Inscripciones reabiertas', jasmine.stringContaining('se reabrieron'));
  });

  it('toggleCierreInscripciones(): muestra el mensaje del backend si no se puede (422) y no cambia la tarjeta', () => {
    const exito = component['notificaciones'].exito as jasmine.Spy;
    const error = component['notificaciones'].error as jasmine.Spy;
    const item: GrupoDTO = { ...cerradoAMano };
    grupoSpy.cambiarCierreInscripciones.and.returnValue(
      throwError(() => ({ status: 422, error: { mensaje: 'No se pueden reabrir las inscripciones: la fecha de cierre ya pasó' } })));
    component.toggleCierreInscripciones(item);
    expect(item.inscripcionesCerradasManual).toBeTrue();
    expect(error).toHaveBeenCalledWith('No se pudo cambiar el estado', 'No se pueden reabrir las inscripciones: la fecha de cierre ya pasó');
  });

  it('toggleCierreInscripciones(): mensaje genérico si el error no trae mensaje', () => {
    const exito = component['notificaciones'].exito as jasmine.Spy;
    const error = component['notificaciones'].error as jasmine.Spy;
    grupoSpy.cambiarCierreInscripciones.and.returnValue(throwError(() => ({ status: 500 })));
    component.toggleCierreInscripciones({ ...abierto });
    expect(error).toHaveBeenCalledWith('No se pudo cambiar el estado', jasmine.stringContaining('No se pudo cambiar'));
  });

  it('un grupo cerrado a mano no muestra la pista de cambiar la fecha: se reabre desde el menú', () => {
    component.perfil = 'Coordinador';
    component.grupos = [cerradoAMano];
    fixture.detectChanges();
    expect(pista()).toBeNull();
    expect(etiqueta()).toBe('Cerradas por el Coordinador');
  });

  it('etiqueta "Abren el dd/MM/yyyy" para NO_ABIERTAS', () => {
    component.grupos = [noAbierto];
    fixture.detectChanges();
    expect(etiqueta()).toBe('Abren el 01/07/2026');
  });

  it('ninguna etiqueta para ABIERTAS ni cuando el backend no manda el campo', () => {
    component.grupos = [abierto];
    fixture.detectChanges();
    expect(etiqueta()).toBeNull();
    component.grupos = [grupoBase];
    fixture.detectChanges();
    expect(etiqueta()).toBeNull();
  });

  it('Alumno NO navega a inscripcion-grupo con un grupo cerrado o no abierto', () => {
    component.perfil = 'Alumno';
    component.alumnosGrupo('Recreativo', 'Natacion', 2026, 1, cerrado);
    component.alumnosGrupo('Recreativo', 'Natacion', 2026, 1, noAbierto);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('Alumno que pulsa un grupo cerrado o no abierto recibe el aviso con la fecha (no se queda sin respuesta)', () => {
    const exito = component['notificaciones'].exito as jasmine.Spy;
    const error = component['notificaciones'].error as jasmine.Spy;
    component.perfil = 'Alumno';
    component.alumnosGrupo('Recreativo', 'Natacion', 2026, 1, cerrado);
    expect(error).toHaveBeenCalledWith('Inscripción no disponible', 'Las inscripciones de este grupo cerraron el 14/06/2026');
    component.alumnosGrupo('Recreativo', 'Natacion', 2026, 1, noAbierto);
    expect(error).toHaveBeenCalledWith('Inscripción no disponible', 'Las inscripciones de este grupo abren el 01/07/2026');
  });

  it('Alumno con un grupo abierto no recibe ningún aviso', () => {
    const exito = component['notificaciones'].exito as jasmine.Spy;
    const error = component['notificaciones'].error as jasmine.Spy;
    component.perfil = 'Alumno';
    component.alumnosGrupo('Recreativo', 'Natacion', 2026, 1, abierto);
    expect(error).not.toHaveBeenCalled();
  });

  it('Alumno sí navega con un grupo abierto o sin el campo (compatibilidad)', () => {
    component.perfil = 'Alumno';
    component.alumnosGrupo('Recreativo', 'Natacion', 2026, 1, abierto);
    component.alumnosGrupo('Recreativo', 'Natacion', 2026, 1, grupoBase);
    expect(routerSpy.navigate).toHaveBeenCalledTimes(2);
  });

  it('Coordinador e Instructor siguen navegando a la lista de deportistas aunque el grupo esté cerrado', () => {
    for (const rol of ['Coordinador', 'Instructor']) {
      routerSpy.navigate.calls.reset();
      component.perfil = rol;
      component.alumnosGrupo('Recreativo', 'Natacion', 2026, 1, cerrado);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/listaDeportistasCurso', 'Recreativo', 'Natacion', 2026, 1]);
    }
  });

  it('loadGrupos: mantiene curso como null cuando getCurso falla', () => {
    (component['cursodeportivoService'].getCurso as jasmine.Spy)
      .and.returnValue(throwError(() => new Error('error')));
    component.curso = null;
    component['loadGrupos']('Recreativo', 'Natacion');
    expect(component.curso).toBeNull();
  });

  // ── Diseño de la vista (prototipo) ────────────────────────────────────────────────────────────
  describe('diseño de la vista', () => {
    const el = (): HTMLElement => fixture.nativeElement;
    const q = (sel: string): HTMLElement | null => el().querySelector(sel);
    const qa = (sel: string): HTMLElement[] => Array.from(el().querySelectorAll(sel)) as HTMLElement[];
    const grupoA: GrupoDTO = {
      ...grupoBase, nombreInstructor: 'Katerinn Natalia Arcos Daza', inscripcionesAbiertas: true,
      horarios: [{ id: 1, categoria: 'Recreativo', curso: 'Natacion', anio: 2026, iterable: 1, dia: 'Miércoles', horaInicio: '18:00:00', horaFin: '20:00:00', escenario: 'Coliseo universitario', eliminado: 0 }],
    };

    function conGrupos(grupos: GrupoDTO[], rol = 'Coordinador'): void {
      component.perfil = rol;
      component.grupos = grupos;
      component.disponibilidad = { '2026-1': { cuposTotales: 24, cuposDisponibles: 6, tamanoListaEspera: 0 } };
      fixture.detectChanges();
    }

    it('el título es "Grupos · {curso}" y la miga lleva a Inicio', () => {
      conGrupos([grupoA]);
      expect(q('h1.titulo-pagina')?.textContent?.trim()).toBe('Grupos · Natacion');
      expect(q('.migas')?.textContent).toContain('Inicio');
    });

    it('"Volver a cursos" navega a los cursos de la categoría', () => {
      conGrupos([grupoA]);
      (q('.volver') as HTMLElement).click();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/cursos_deportivos', 'Recreativo']);
    });

    it('solo el Coordinador ve "Nuevo grupo"', () => {
      conGrupos([grupoA]);
      expect(q('.barra-superior .btn-principal')?.textContent).toContain('Nuevo grupo');
      conGrupos([grupoA], 'Alumno');
      expect(q('.barra-superior .btn-principal')).toBeNull();
    });

    it('el resumen del curso muestra categoría, nombre, estado y las cifras de grupos, inscritos y cupos', () => {
      conGrupos([grupoA]);
      const r = q('.resumen-curso') as HTMLElement;
      expect(r.textContent).toContain('Recreativo');
      expect(r.querySelector('.chip-estado')?.textContent?.trim()).toBe('Curso activo');
      const cifras = qa('.resumen-curso .cifra').map(c => `${c.querySelector('dd')?.textContent?.trim()} ${c.querySelector('dt')?.textContent?.trim()}`);
      expect(cifras).toEqual(['1 Grupos', '18 Personas inscritas', '6 Cupos disponibles']);
    });

    it('cada grupo muestra periodo, letra, instructor con iniciales y sus horarios en formato de 12 horas', () => {
      conGrupos([grupoA]);
      const t = q('.tarjeta-grupo') as HTMLElement;
      expect(t.querySelector('.eyebrow-grupo')?.textContent?.trim()).toBe('2026-2');
      expect(t.querySelector('.nombre-grupo')?.textContent?.trim()).toBe('Grupo A');
      expect(t.querySelector('.instructor')?.textContent).toContain('Katerinn Natalia Arcos Daza');
      expect(t.querySelector('.avatar')?.textContent?.trim()).toBe('KD');
      const fila = Array.from(t.querySelectorAll('.horario-fila span')).map(e => e.textContent?.trim());
      expect(fila).toEqual(['Miércoles', '6:00 p. m. – 8:00 p. m.', 'Coliseo universitario']);
    });

    it('sin horarios ni instructor lo dice con claridad', () => {
      conGrupos([{ ...grupoA, horarios: [], nombreInstructor: null }]);
      expect(q('.tarjeta-grupo')?.textContent).toContain('Horario por definir');
      expect(q('.tarjeta-grupo')?.textContent).toContain('Sin instructor asignado');
    });

    it('la ocupación se muestra con una barra accesible y los cupos disponibles', () => {
      conGrupos([grupoA]);
      const barra = q('.tarjeta-grupo [role="progressbar"]') as HTMLElement;
      expect(barra.getAttribute('aria-valuenow')).toBe('18');
      expect(barra.getAttribute('aria-valuemax')).toBe('24');
      expect(q('.tarjeta-grupo')?.textContent).toContain('18 de 24 cupos');
      expect(q('.tarjeta-grupo')?.textContent).toContain('6 cupos disponibles');
    });

    it('un grupo lleno lo indica', () => {
      conGrupos([grupoA]);
      component.disponibilidad = { '2026-1': { cuposTotales: 24, cuposDisponibles: 0, tamanoListaEspera: 3 } };
      fixture.detectChanges();
      expect(q('.tarjeta-grupo')?.textContent).toContain('Grupo lleno');
      expect(q('.tarjeta-grupo')?.textContent).toContain('3 en espera');
    });

    it('el grupo cerrado muestra un aviso con el motivo (el texto de ayuda solo para el Coordinador)', () => {
      conGrupos([cerrado]);
      expect(q('.aviso-cierre .etiqueta-inscripcion')?.textContent?.trim()).toBe('Cerraron el 14/06/2026');
      expect(q('.aviso-cierre .pista-reabrir')).not.toBeNull();
      conGrupos([cerrado], 'Instructor');
      expect(q('.aviso-cierre .etiqueta-inscripcion')).not.toBeNull();
      expect(q('.aviso-cierre .pista-reabrir')).toBeNull();
    });

    it('"Ver grupo" abre la lista del grupo para Coordinador e Instructor', () => {
      conGrupos([grupoA]);
      (q('.ver-grupo') as HTMLElement).click();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/listaDeportistasCurso', 'Recreativo', 'Natacion', 2026, 1]);
    });

    it('el Alumno ve "Inscribirme" (deshabilitado si el grupo está cerrado) y no "Ver grupo"', () => {
      conGrupos([grupoA, { ...cerrado, iterable: 2 }], 'Alumno');
      const botones = qa('.btn-inscribirme') as HTMLButtonElement[];
      expect(botones.length).toBe(2);
      expect(botones[0].disabled).toBeFalse();
      expect(botones[1].disabled).toBeTrue();
      expect(q('.ver-grupo')).toBeNull();
    });

    it('el engranaje solo lo ve el Coordinador y tiene nombre accesible', () => {
      conGrupos([grupoA]);
      expect(q('.btn-menu')?.getAttribute('aria-label')).toBe('Acciones del grupo A');
      expect(q('.btn-menu app-icono-engranaje')).not.toBeNull();
      conGrupos([grupoA], 'Instructor');
      expect(q('.btn-menu')).toBeNull();
    });

    it('la rejilla usa 1 columna en móvil, 2 desde 768px y 3 desde 1280px, sin mat-grid-list', () => {
      conGrupos([grupoA]);
      expect(q('mat-grid-list')).toBeNull();
      const cols = getComputedStyle(q('.rejilla-grupos') as HTMLElement).gridTemplateColumns.split(' ').filter(Boolean).length;
      const esperadas = window.matchMedia('(min-width: 1280px)').matches ? 3 : window.matchMedia('(min-width: 768px)').matches ? 2 : 1;
      expect(cols).toBe(esperadas);
    });

    it('un grupo sin horarios (ya cargados) muestra al Coordinador el aviso y un acceso a "Definir horarios"', () => {
      conGrupos([{ ...grupoA, horarios: [] }]);
      const aviso = q('.tarjeta-grupo .aviso-sin-horario') as HTMLElement;
      expect(aviso.textContent).toContain('instructor no podrá registrar asistencia');
      spyOn(component, 'gestionarHorarios');
      (aviso.querySelector('button') as HTMLElement).click();
      expect(component.gestionarHorarios).toHaveBeenCalled();
    });

    it('el aviso de "sin horario" no aparece para el Instructor ni mientras los horarios aún cargan', () => {
      conGrupos([{ ...grupoA, horarios: [] }], 'Instructor');
      expect(q('.aviso-sin-horario')).toBeNull();
      conGrupos([{ ...grupoA, horarios: undefined }]);
      expect(q('.aviso-sin-horario')).toBeNull();
    });

    it('un grupo con horarios no muestra el aviso', () => {
      conGrupos([grupoA]);
      expect(q('.aviso-sin-horario')).toBeNull();
    });

    it('sin grupos lo explica', () => {
      conGrupos([]);
      expect(q('.aviso-vacio')?.textContent).toContain('aún no tiene grupos');
    });
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
  let avisoExito: jasmine.Spy;
  let avisoError: jasmine.Spy;

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
    })
    .overrideComponent(ListGruposComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
    .compileComponents();

    fixture   = TestBed.createComponent(ListGruposComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Spy on the component's actual injected dialog and snackbar instances
    // (needed because MatDialogModule in standalone imports creates its own injector,
    //  so the TestBed-level MatDialog provider is shadowed by the component's own one)
    dialogOpenSpy   = spyOn(component['dialog'], 'open').and.returnValue(mockDialogRef as any);
    avisoExito = spyOn(component['notificaciones'], 'exito').and.returnValue(null as any);
    avisoError = spyOn(component['notificaciones'], 'error').and.returnValue(null as any);
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
    expect(avisoExito).toHaveBeenCalledWith('Grupo eliminado', jasmine.any(String));
  });

  it('errorStatus definido → muestra snackbar de error sin recargar', () => {
    mockDialogRef.afterClosed.and.returnValue(of({ confirmado: false, errorStatus: 409 }));
    spyOn<any>(component, 'loadGrupos');
    component.onDelete(mockItem);
    expect(component['loadGrupos']).not.toHaveBeenCalled();
    expect(avisoError).toHaveBeenCalledWith('No se pudo eliminar el grupo', jasmine.stringContaining('Error'));
  });

  it('con inscritos y lista de espera → el dialog advierte que sus inscripciones se cancelarán', () => {
    component.disponibilidad[component.dispKey(mockItem.anio, mockItem.iterable)] =
      { cuposTotales: 20, cuposDisponibles: 17, tamanoListaEspera: 2 };
    component.onDelete(mockItem);
    const data = dialogOpenSpy.calls.mostRecent().args[1].data;
    expect(data.advertencia).toContain('3 inscritos');
    expect(data.advertencia).toContain('2 en lista de espera');
    expect(data.advertencia).toContain('se cancelarán');
  });

  it('un solo inscrito y nadie en espera → singular y sin mencionar lista de espera', () => {
    component.disponibilidad[component.dispKey(mockItem.anio, mockItem.iterable)] =
      { cuposTotales: 20, cuposDisponibles: 19, tamanoListaEspera: 0 };
    component.onDelete(mockItem);
    const data = dialogOpenSpy.calls.mostRecent().args[1].data;
    expect(data.advertencia).toContain('1 inscrito');
    expect(data.advertencia).not.toContain('inscritos');
    expect(data.advertencia).not.toContain('lista de espera');
  });

  it('solo hay lista de espera → advierte solo de la lista de espera', () => {
    component.disponibilidad[component.dispKey(mockItem.anio, mockItem.iterable)] =
      { cuposTotales: 20, cuposDisponibles: 20, tamanoListaEspera: 1 };
    component.onDelete(mockItem);
    const data = dialogOpenSpy.calls.mostRecent().args[1].data;
    expect(data.advertencia).toContain('1 en lista de espera');
    expect(data.advertencia).not.toContain('inscrito');
  });

  it('grupo sin inscritos ni lista de espera → sin advertencia', () => {
    component.disponibilidad[component.dispKey(mockItem.anio, mockItem.iterable)] =
      { cuposTotales: 20, cuposDisponibles: 20, tamanoListaEspera: 0 };
    component.onDelete(mockItem);
    expect(dialogOpenSpy.calls.mostRecent().args[1].data.advertencia).toBeNull();
  });

  it('disponibilidad aún no cargada → sin advertencia (no bloquea la eliminación)', () => {
    component.disponibilidad = {};
    component.onDelete(mockItem);
    expect(dialogOpenSpy.calls.mostRecent().args[1].data.advertencia).toBeNull();
  });

  it('disponibilidad inconsistente (disponibles > totales) → no muestra cifras negativas', () => {
    component.disponibilidad[component.dispKey(mockItem.anio, mockItem.iterable)] =
      { cuposTotales: 5, cuposDisponibles: 9, tamanoListaEspera: 0 };
    component.onDelete(mockItem);
    expect(dialogOpenSpy.calls.mostRecent().args[1].data.advertencia).toBeNull();
  });

  it('afterClosed null → no recarga ni muestra snackbar', () => {
    mockDialogRef.afterClosed.and.returnValue(of(null));
    spyOn<any>(component, 'loadGrupos');
    component.onDelete(mockItem);
    expect(component['loadGrupos']).not.toHaveBeenCalled();
    expect(avisoExito).not.toHaveBeenCalled();
    expect(avisoError).not.toHaveBeenCalled();
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

describe('ListGruposComponent › nuevo grupo: paso 2 (horarios)', () => {
  let component: ListGruposComponent;
  let fixture: ComponentFixture<ListGruposComponent>;
  let abrir: jasmine.Spy;
  let cierres: any[];
  let avisos: jasmine.SpyObj<NotificacionService>;

  const creado: GrupoDTO = { categoria: 'Recreativo', curso: 'Natacion', anio: 2026, iterable: 2, periodo: 2, cupos: 10, fechaCreacion: '2026-01-01' };

  beforeEach(async () => {
    avisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);
    await TestBed.configureTestingModule({
      imports: [ListGruposComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: PerfilService, useValue: { perfil$: new BehaviorSubject<string>('Coordinador') } },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'isAuthenticated', 'getProfile']) },
        { provide: TokenInterchangeService, useValue: {} },
        { provide: OAuthService, useValue: { configure: () => {}, setupAutomaticSilentRefresh: () => {}, events: of(), loadDiscoveryDocumentAndTryLogin: () => Promise.resolve(), getIdentityClaims: () => null, hasValidAccessToken: () => false, hasValidIdToken: () => false } },
        { provide: GrupoService, useValue: { getGrupos: () => of([]) } },
        { provide: CursodeportivoService, useValue: { getCurso: () => of({ nombre: 'Natacion', estadoCurso: 'ACTIVO' } as CursoDTO) } },
        { provide: ImagenService, useValue: { getimagen: () => of({}) } },
        { provide: InstructorServisce, useValue: { getInstructor: () => of({}) } },
        { provide: HorarioService, useValue: { getHorarios: () => of([]) } },
        { provide: NotificacionService, useValue: avisos },
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false }) } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ categoria: 'Recreativo', curso: 'Natacion' })) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ListGruposComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
      .compileComponents();
    fixture = TestBed.createComponent(ListGruposComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    cierres = [creado, true];
    abrir = spyOn(component['dialog'], 'open').and.callFake(() => ({ afterClosed: () => of(cierres.shift()) }) as any);
    spyOn<any>(component, 'loadGrupos');
  });

  it('tras crear el grupo avisa y abre los horarios del grupo NUEVO como "paso 2" (con su año e iterable)', () => {
    component.nuevoGrupo();
    expect(abrir.calls.argsFor(0)[0]).toBe(FormGruposComponent);
    expect(avisos.exito).toHaveBeenCalledWith('Grupo creado', jasmine.stringContaining('Grupo B'));
    expect(abrir.calls.argsFor(1)[0]).toBe(FormHorarioComponent);
    expect(abrir.calls.argsFor(1)[1]!.data).toEqual({ categoria: 'Recreativo', curso: 'Natacion', anio: 2026, iterable: 2, nuevoGrupo: true });
  });

  it('si se guardan horarios lo confirma y recarga los grupos', () => {
    component.nuevoGrupo();
    expect(avisos.exito).toHaveBeenCalledWith('Horarios guardados', jasmine.any(String));
    expect(component['loadGrupos']).toHaveBeenCalled();
  });

  it('si se omite el paso (X, Esc o "Omitir por ahora") el grupo queda creado y se explica dónde definir el horario', () => {
    cierres = [creado, false];
    component.nuevoGrupo();
    expect(avisos.info).toHaveBeenCalledWith('Grupo sin horario', jasmine.stringContaining('Gestionar horarios'));
    expect(avisos.exito).not.toHaveBeenCalledWith('Horarios guardados', jasmine.anything());
  });

  it('cerrar el formulario del grupo sin crearlo no avisa ni abre los horarios', () => {
    cierres = [undefined];
    component.nuevoGrupo();
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(avisos.exito).not.toHaveBeenCalled();
  });

  it('al actualizar un grupo avisa con éxito y recarga; si cancela no avisa', () => {
    cierres = [true];
    component.onUpdate(2026, 1);
    expect(avisos.exito).toHaveBeenCalledOnceWith('Grupo actualizado', 'Los cambios del grupo se guardaron correctamente.');
    expect(component['loadGrupos']).toHaveBeenCalled();

    avisos.exito.calls.reset();
    cierres = [undefined];
    component.onUpdate(2026, 1);
    expect(avisos.exito).not.toHaveBeenCalled();
  });

  it('si no se pueden cargar los grupos avisa con la notificación de error', () => {
    (component['loadGrupos'] as jasmine.Spy).and.callThrough();
    spyOn(component['grupoService'], 'getGrupos').and.returnValue(throwError(() => ({ status: 500 })));
    spyOn(console, 'error');
    component['loadGrupos']('Recreativo', 'Natacion');
    expect(avisos.error).toHaveBeenCalledOnceWith('No se pudieron cargar los grupos', 'Revise su conexión e intente de nuevo.');
  });
});
