import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { DetalleInstructorComponent } from './detalle-instructor.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { GrupoService } from 'src/app/services/grupo.service';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { TablaGruposInstructorComponent } from '../tabla-grupos-instructor/tabla-grupos-instructor.component';
import { PerfilInstructor } from 'src/app/Models/DTOs/instructor-dto';
import { MiGrupoInstructorDTO } from 'src/app/Models/DTOs/mis-cursos-dto';

const instructor: PerfilInstructor = {
  id: 'INS01', nombre: 'Katerinn Arcos Daza', correo: 'kate@unicauca.edu.co',
  imagen: 0, tipoId: '', sexo: '', rol: null,
};
const grupo: MiGrupoInstructorDTO = {
  categoria: 'Futbol', curso: 'Fútbol Avanzado', anio: 2026, iterable: 1, periodo: 1, cupos: 20,
  estadoCurso: 'ACTIVO', estadoInscripciones: 'ABIERTO', inscritos: 12, enEspera: 2,
  horarios: [{ id: 1, categoria: 'Futbol', curso: 'Fútbol Avanzado', anio: 2026, iterable: 1, dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00', escenario: 'Cancha A' }],
};
const http = (status: number): HttpErrorResponse => new HttpErrorResponse({ status });

describe('DetalleInstructorComponent', () => {
  let fixture: ComponentFixture<DetalleInstructorComponent>;
  let component: DetalleInstructorComponent;
  let perfil$: BehaviorSubject<string>;
  let params$: BehaviorSubject<any>;
  let instructorSpy: jasmine.SpyObj<InstructorServisce>;
  let grupoSpy: jasmine.SpyObj<GrupoService>;
  let router: Router;
  let snackOpen: jasmine.Spy;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const texto = (sel: string): string => el().querySelector(sel)?.textContent?.trim() ?? '';

  /** Crea el componente; `antes` permite reconfigurar los spies antes del primer detectChanges (ngOnInit). */
  const crear = (antes?: () => void): void => {
    fixture = TestBed.createComponent(DetalleInstructorComponent);
    component = fixture.componentInstance;
    snackOpen = spyOn(component['snackBar'], 'open');
    antes?.();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    perfil$ = new BehaviorSubject<string>('Coordinador');
    params$ = new BehaviorSubject<any>(convertToParamMap({ id: 'INS01' }));
    instructorSpy = jasmine.createSpyObj('InstructorServisce', ['getInstructor']);
    grupoSpy = jasmine.createSpyObj('GrupoService', ['getGruposDeInstructor']);
    instructorSpy.getInstructor.and.returnValue(of(instructor));
    grupoSpy.getGruposDeInstructor.and.returnValue(of([grupo]));

    await TestBed.configureTestingModule({
      imports: [DetalleInstructorComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params$ } },
        { provide: PerfilService, useValue: { perfil$ } },
        { provide: InstructorServisce, useValue: instructorSpy },
        { provide: GrupoService, useValue: grupoSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DetalleInstructorComponent, {
        remove: { imports: [SidenavComponent] },
        add: { schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  it('200: muestra el nombre en h1, la información personal y la tabla con el grupo', () => {
    crear();
    expect(instructorSpy.getInstructor).toHaveBeenCalledOnceWith('INS01');
    expect(grupoSpy.getGruposDeInstructor).toHaveBeenCalledOnceWith('INS01');
    expect(texto('h1')).toBe('Katerinn Arcos Daza');
    const info = texto('.personal-info');
    expect(info).toContain('INS01');
    expect(info).toContain('kate@unicauca.edu.co');
    expect(info).toContain('Instructor');
    expect(el().querySelectorAll('tr[mat-row]').length).toBe(1);
    expect(texto('tr[mat-row]')).toContain('Fútbol Avanzado');
  });

  it('tipoId y sexo solo aparecen si llegan con valor', () => {
    crear();
    expect(texto('.personal-info')).not.toContain('Tipo de identificación');
    expect(texto('.personal-info')).not.toContain('Sexo');
    instructorSpy.getInstructor.and.returnValue(of({ ...instructor, tipoId: 'CC', sexo: 'F' }));
    params$.next(convertToParamMap({ id: 'INS01' }));
    fixture.detectChanges();
    expect(texto('.personal-info')).toContain('Tipo de identificación');
    expect(texto('.personal-info')).toContain('CC');
    expect(texto('.personal-info')).toContain('Sexo');
  });

  it('lista vacía: muestra el mensaje propio del instructor y no la tabla', () => {
    crear(() => grupoSpy.getGruposDeInstructor.and.returnValue(of([])));
    expect(texto('.empty-msg')).toBe('Este instructor no tiene grupos a cargo');
    expect(el().querySelector('table[mat-table]')).toBeNull();
  });

  it('404 de getInstructor: "Instructor no encontrado", enlace a la lista y SIN tabla', () => {
    crear(() => instructorSpy.getInstructor.and.returnValue(throwError(() => http(404))));
    expect(el().textContent).toContain('Instructor no encontrado');
    expect(el().querySelector('a[href="/lista-instructores"]')).not.toBeNull();
    expect(el().querySelector('app-tabla-grupos-instructor')).toBeNull();
    expect(el().querySelector('table[mat-table]')).toBeNull();
  });

  it('otro error de getInstructor (500): snackbar genérico y la tabla sigue visible', () => {
    crear(() => instructorSpy.getInstructor.and.returnValue(throwError(() => http(500))));
    expect(snackOpen).toHaveBeenCalledWith(jasmine.any(String), '', jasmine.objectContaining({ panelClass: 'snack-error' }));
    expect(el().textContent).not.toContain('Instructor no encontrado');
    expect(el().querySelectorAll('tr[mat-row]').length).toBe(1);
  });

  it('error al cargar grupos: error en el área de la tabla, distinto del vacío; la info personal sigue', () => {
    crear(() => grupoSpy.getGruposDeInstructor.and.returnValue(throwError(() => http(500))));
    const alerta = el().querySelector('.error-grupos');
    expect(alerta?.getAttribute('role')).toBe('alert');
    expect(alerta?.textContent).toContain('No se pudieron cargar los grupos');
    expect(el().querySelector('.empty-msg')).toBeNull();
    expect(el().querySelector('table[mat-table]')).toBeNull();
    expect(texto('h1')).toBe('Katerinn Arcos Daza');
  });

  it('rol distinto de Coordinador: mensaje corto y NINGUNA llamada a servicios', () => {
    perfil$.next('Instructor');
    crear();
    expect(instructorSpy.getInstructor).not.toHaveBeenCalled();
    expect(grupoSpy.getGruposDeInstructor).not.toHaveBeenCalled();
    expect(texto('.msg-rol')).toContain('exclusiva para el rol Coordinador');
    expect(el().querySelector('table[mat-table]')).toBeNull();
  });

  it('un cambio de perfil a otro rol deja de mostrar el detalle', () => {
    crear();
    perfil$.next('Alumno');
    fixture.detectChanges();
    expect(texto('.msg-rol')).toContain('exclusiva para el rol Coordinador');
    expect(el().querySelector('h1')).toBeNull();
  });

  it('la X: botón con aria-label y navega EXPLÍCITAMENTE a /lista-instructores (sin history.back)', () => {
    spyOn(window.history, 'back');
    crear();
    const x = el().querySelector('button.btn-cerrar') as HTMLButtonElement;
    expect(x.getAttribute('aria-label')).toBe('Cerrar y volver a la lista de instructores');
    expect(x.textContent).toContain('close');
    x.click();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/lista-instructores']);
    expect(window.history.back).not.toHaveBeenCalled();
  });

  it('(verDeportistas) navega a /listaDeportistasCurso con los 4 parámetros', () => {
    crear();
    const tabla = fixture.debugElement.query(By.directive(TablaGruposInstructorComponent));
    (tabla.componentInstance as TablaGruposInstructorComponent).verDeportistas.emit(grupo);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/listaDeportistasCurso', 'Futbol', 'Fútbol Avanzado', 2026, 1]);
  });

  it('cambio de :id no mezcla respuestas: la respuesta tardía del id anterior se descarta', () => {
    const instA = new Subject<PerfilInstructor>();
    const gruposA = new Subject<MiGrupoInstructorDTO[]>();
    instructorSpy.getInstructor.and.callFake((id: string) => id === 'A' ? instA : of({ ...instructor, id: 'B', nombre: 'Instructor B' }));
    grupoSpy.getGruposDeInstructor.and.callFake((id: string) => id === 'A' ? gruposA : of([{ ...grupo, curso: 'Curso de B' }]));
    params$.next(convertToParamMap({ id: 'A' }));
    crear();
    params$.next(convertToParamMap({ id: 'B' }));
    fixture.detectChanges();
    // llegan tarde las respuestas de A
    instA.next({ ...instructor, id: 'A', nombre: 'Instructor A' });
    gruposA.next([{ ...grupo, curso: 'Curso de A' }]);
    fixture.detectChanges();
    expect(texto('h1')).toBe('Instructor B');
    expect(el().textContent).toContain('Curso de B');
    expect(el().textContent).not.toContain('Curso de A');
    expect(el().textContent).not.toContain('Instructor A');
  });

  it('un nuevo :id reinicia el estado (404 anterior no persiste)', () => {
    instructorSpy.getInstructor.and.callFake((id: string) => id === 'X' ? throwError(() => http(404)) : of(instructor));
    params$.next(convertToParamMap({ id: 'X' }));
    crear();
    expect(el().textContent).toContain('Instructor no encontrado');
    params$.next(convertToParamMap({ id: 'INS01' }));
    fixture.detectChanges();
    expect(el().textContent).not.toContain('Instructor no encontrado');
    expect(texto('h1')).toBe('Katerinn Arcos Daza');
  });

  it('perfil$ que re-emite el mismo rol no repite las llamadas', () => {
    crear();
    perfil$.next('Coordinador');
    expect(instructorSpy.getInstructor).toHaveBeenCalledTimes(1);
    expect(grupoSpy.getGruposDeInstructor).toHaveBeenCalledTimes(1);
  });

  it('ruta sin id: no llama a los servicios', () => {
    params$.next(convertToParamMap({}));
    crear();
    expect(instructorSpy.getInstructor).not.toHaveBeenCalled();
    expect(grupoSpy.getGruposDeInstructor).not.toHaveBeenCalled();
  });

  it('accesibilidad: un h1, dos h2 y ningún div con (click)', () => {
    crear();
    expect(el().querySelectorAll('h1').length).toBe(1);
    const h2 = Array.from(el().querySelectorAll('h2')).map(h => h.textContent!.trim());
    expect(h2).toEqual(['Información personal', 'Cursos a cargo']);
    expect(el().querySelectorAll('div[ng-reflect-click], div[click]').length).toBe(0);
  });

  it('se desuscribe al destruirse (no actualiza tras destroy)', () => {
    crear();
    fixture.destroy();
    expect(() => params$.next(convertToParamMap({ id: 'OTRO' }))).not.toThrow();
    expect(instructorSpy.getInstructor).toHaveBeenCalledTimes(1);
  });
});
