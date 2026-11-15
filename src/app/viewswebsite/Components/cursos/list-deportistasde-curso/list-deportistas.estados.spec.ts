import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { ListDeportistasdeCursoComponent } from './list-deportistasde-curso.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { AlumnoDTO } from 'src/app/Models/DTOs/alumno-dto';

const alumno = (id: number, nombre: string): AlumnoDTO =>
  ({ id, codigo: `U${id}`, tipo: 'Estudiante', nombre, correo: `a${id}@test.com`, sexo: 'M', tipoid: 'CC', imagen: 0, faltas: 0 } as any);

/** Estados de la lista de deportistas de un grupo: cargando, vacío y error. */
describe('ListDeportistasdeCursoComponent › estados de la lista de deportistas', () => {
  let fixture: ComponentFixture<ListDeportistasdeCursoComponent>;
  let component: ListDeportistasdeCursoComponent;
  let el: HTMLElement;
  let perfil$: BehaviorSubject<string>;
  let avisoError: jasmine.Spy;

  const texto = (): string => el.textContent ?? '';
  const filasEsqueleto = (): number => el.querySelectorAll('app-esqueleto[forma="fila"]').length;

  /** Crea la pantalla con la respuesta de deportistas indicada. */
  const crear = (alumnos$: any, rol = 'Coordinador'): void => {
    perfil$.next(rol);
    fixture = TestBed.createComponent(ListDeportistasdeCursoComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    spyOn(component['grupoService'], 'getGrupo').and.returnValue(of({ idInstructor: null, horarios: [] } as any));
    spyOn(component['alumnoService'], 'getAlumnosGrupo').and.returnValue(alumnos$);
    spyOn(component['inscripcionService'], 'getListaEspera').and.returnValue(of([]));
    spyOn(component['horarioSerive'], 'getHorarios').and.returnValue(of([]));
    spyOn(component['instructorService'], 'getInstructor').and.returnValue(of({ nombre: 'Test' } as any));
    spyOn(component['notificaciones'], 'exito').and.returnValue(null as any);
    avisoError = spyOn(component['notificaciones'], 'error').and.returnValue(null as any);
    spyOn(component['novedadClaseService'], 'obtenerNovedadesGrupo').and.returnValue(of([]));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    perfil$ = new BehaviorSubject<string>('Coordinador');
    await TestBed.configureTestingModule({
      imports: [ListDeportistasdeCursoComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        DatePipe,
        { provide: PerfilService, useValue: { perfil$ } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ categoria: 'Futbol', curso: 'Avanzado', anio: '2024', iterable: '1' })) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ListDeportistasdeCursoComponent, {
        remove: { imports: [SidenavComponent] },
        add: { schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();
  });

  it('cargando: filas esqueleto y sin el aviso de "no tiene deportistas"', () => {
    crear(new Subject<AlumnoDTO[]>());
    expect(filasEsqueleto()).toBe(1);
    expect(texto()).not.toContain('aún no tiene deportistas inscritos');
    expect(el.querySelector('.error-lista')).toBeNull();
  });

  it('cargada con deportistas: sin esqueleto ni avisos', () => {
    crear(of([alumno(1, 'Ana'), alumno(2, 'Luis')]));
    expect(filasEsqueleto()).toBe(0);
    expect(component.inscritos).toBe(2);
    expect(texto()).not.toContain('aún no tiene deportistas inscritos');
  });

  it('vacía: "Este grupo aún no tiene deportistas inscritos." y sin esqueleto', () => {
    crear(of([]));
    expect(texto()).toContain('Este grupo aún no tiene deportistas inscritos.');
    expect(filasEsqueleto()).toBe(0);
  });

  it('del esqueleto al vacío: mientras llega la lista no dice que no hay deportistas', () => {
    const lista$ = new Subject<AlumnoDTO[]>();
    crear(lista$);
    expect(texto()).not.toContain('aún no tiene deportistas inscritos');
    lista$.next([]);
    fixture.detectChanges();
    expect(texto()).toContain('Este grupo aún no tiene deportistas inscritos.');
    expect(filasEsqueleto()).toBe(0);
  });

  it('error: mensaje de alerta y aviso, sin confundirse con "no hay deportistas"', () => {
    spyOn(console, 'error');
    crear(throwError(() => ({ status: 500 })));
    expect(el.querySelector('.error-lista[role="alert"]')?.textContent).toContain('No se pudo cargar la lista de deportistas');
    expect(avisoError).toHaveBeenCalledWith('No se pudo cargar la lista de deportistas', 'Revise su conexión e intente de nuevo.');
    expect(texto()).not.toContain('aún no tiene deportistas inscritos');
    expect(filasEsqueleto()).toBe(0);
  });

  it('el Instructor ve los mismos estados', () => {
    crear(new Subject<AlumnoDTO[]>(), 'Instructor');
    expect(filasEsqueleto()).toBe(1);
  });

  it('recargar la lista (p. ej. tras inscribir) vuelve a mostrar el esqueleto y limpia el error', () => {
    spyOn(console, 'error');
    crear(throwError(() => ({ status: 500 })));
    expect(el.querySelector('.error-lista')).not.toBeNull();
    (component['alumnoService'].getAlumnosGrupo as jasmine.Spy).and.returnValue(new Subject<AlumnoDTO[]>());
    component.cargarAlumnos();
    fixture.detectChanges();
    expect(el.querySelector('.error-lista')).toBeNull();
    expect(filasEsqueleto()).toBe(1);
  });
});
