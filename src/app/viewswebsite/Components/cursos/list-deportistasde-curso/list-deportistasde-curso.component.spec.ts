import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { ListDeportistasdeCursoComponent } from './list-deportistasde-curso.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { InscripcionEnEsperaDto } from 'src/app/Models/DTOs/inscripcion-en-espera-dto';
import { ClaseDTO } from 'src/app/Models/DTOs/clase-dto';
import { AtencionDTO } from 'src/app/Models/DTOs/atencion-dto';
import { AlumnoDTO } from 'src/app/Models/DTOs/alumno-dto';

describe('ListDeportistasdeCursoComponent', () => {
  let component: ListDeportistasdeCursoComponent;
  let fixture: ComponentFixture<ListDeportistasdeCursoComponent>;
  let perfilSubject: BehaviorSubject<string>;

  const mockGrupo: GrupoDTO = {
    categoria: 'Futbol',
    curso: 'Avanzado',
    anio: 2024,
    iterable: 1,
    imagenGrupo: 0,
    idInstructor: 'inst-1',
    nombreInstructor: '',
    cupos: 10,
    fechaCreacion: '',
  };

  const mockAlumnoEspera: InscripcionEnEsperaDto = {
    alumnoId: '42',
    nombre: 'Juan Perez',
    correo: 'juan@test.com',
    fechaInscripcion: '2024-01-01',
  };

  const mockClase: ClaseDTO = {
    codigo: 7,
    idGrupoCategoria: 'Futbol',
    idGrupoCurso: 'Avanzado',
    idGrupoAnio: 2024,
    idGrupoIterable: 1,
    idInstructor: 'inst-1',
    fecha: '2024-08-20',
    horas: 1,
    minutos: 0,
    observacion: '',
    eliminado: 0,
  };

  const mockAtencion: AtencionDTO = {
    idPerfil: '42',
    idClase: 7,
    estaAtendido: true,
  };

  const mockAlumno: AlumnoDTO = {
    id: 42,
    codigo: 'U001',
    tipo: 'Estudiante',
    nombre: 'Carlos Ruiz',
    correo: 'cruiz@test.com',
    sexo: 'M',
    tipoid: 'CC',
    imagen: 0,
  };

  beforeEach(async () => {
    perfilSubject = new BehaviorSubject<string>('Coordinador');

    await TestBed.configureTestingModule({
      imports: [ListDeportistasdeCursoComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        DatePipe,
        { provide: PerfilService, useValue: { perfil$: perfilSubject } },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({
              categoria: 'Futbol',
              curso: 'Avanzado',
              anio: '2024',
              iterable: '1',
            })),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ListDeportistasdeCursoComponent, {
        remove: { imports: [SidenavComponent] },
        add: { schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ListDeportistasdeCursoComponent);
    component = fixture.componentInstance;

    // Spy on the real injected instances before ngOnInit fires
    spyOn(component['grupoService'], 'getGrupo').and.returnValue(of(mockGrupo));
    spyOn(component['alumnoService'], 'getAlumnosGrupo').and.returnValue(of([]));
    spyOn(component['inscripcionService'], 'getListaEspera').and.returnValue(of([]));
    spyOn(component['horarioSerive'], 'getHorarios').and.returnValue(of([]));
    spyOn(component['instructorService'], 'getInstructor').and.returnValue(of({ nombre: 'Test' } as any));
    spyOn(component['snackBar'], 'open').and.returnValue(null as any);

    fixture.detectChanges();
  });

  it('should create and initialize listaEspera, rol y displayedColumnsEspera', () => {
    expect(component).toBeTruthy();
    expect(component.listaEspera).toEqual([]);
    expect(component.rol).toBe('Coordinador');
    expect(component.displayedColumnsEspera).toContain('Acciones');
    expect(component['inscripcionService'].getListaEspera).toHaveBeenCalled();
  });

  describe('cargarDatos()', () => {
    it('deja listaEspera vacía cuando getListaEspera falla', () => {
      (component['inscripcionService'].getListaEspera as jasmine.Spy)
        .and.returnValue(throwError(() => new Error('network error')));

      component.cargarDatos();

      expect(component.listaEspera).toEqual([]);
    });
  });

  describe('promover()', () => {
    it('muestra snackbar de éxito y recarga datos cuando promoverAlumno responde correctamente', () => {
      spyOn(component['inscripcionService'], 'promoverAlumno').and.returnValue(of({} as any));

      component.promover(mockAlumnoEspera);

      expect(component['snackBar'].open).toHaveBeenCalledWith(
        jasmine.stringContaining(mockAlumnoEspera.nombre),
        'Cerrar',
        jasmine.objectContaining({ panelClass: ['snack-success'] })
      );
    });

    it('muestra mensaje de conflicto cuando promoverAlumno falla con 409', () => {
      spyOn(component['inscripcionService'], 'promoverAlumno')
        .and.returnValue(throwError(() => ({ status: 409 })));

      component.promover(mockAlumnoEspera);

      expect(component['snackBar'].open).toHaveBeenCalledWith(
        'El alumno ya está inscrito en el grupo',
        'Cerrar',
        jasmine.objectContaining({ panelClass: ['snack-error'] })
      );
    });
  });

  describe('historial de clases', () => {

    it('cargarHistorial(): carga clases y activa historialVisible', () => {
      spyOn(component['claseService'], 'getClase').and.returnValue(of([mockClase]));
      component.cargarHistorial();
      expect(component.clases.length).toBe(1);
      expect(component.historialVisible).toBeTrue();
    });

    it('cargarHistorial(): muestra snackbar de error si getClase() falla', () => {
      spyOn(component['claseService'], 'getClase').and.returnValue(throwError(() => new Error('net')));
      component.cargarHistorial();
      expect(component['snackBar'].open).toHaveBeenCalledWith(
        jasmine.stringContaining('Error'), 'Cerrar', jasmine.any(Object)
      );
    });

    it('toggleClase(): expande la clase y carga sus atenciones', () => {
      spyOn(component['asistenciaService'], 'getAtencionesClase').and.returnValue(of([mockAtencion]));
      component.toggleClase(mockClase);
      expect(component.clasesExpandidas.has(mockClase.codigo)).toBeTrue();
      expect(component['asistenciaService'].getAtencionesClase).toHaveBeenCalledWith(mockClase.codigo);
      expect(component.clasesAtenciones[mockClase.codigo]).toEqual([mockAtencion]);
    });

    it('toggleClase(): colapsa la clase si ya estaba expandida', () => {
      spyOn(component['asistenciaService'], 'getAtencionesClase').and.returnValue(of([]));
      component.clasesExpandidas.add(mockClase.codigo);
      component.clasesAtenciones[mockClase.codigo] = [mockAtencion];
      component.toggleClase(mockClase);
      expect(component.clasesExpandidas.has(mockClase.codigo)).toBeFalse();
      expect(component['asistenciaService'].getAtencionesClase).not.toHaveBeenCalled();
    });

    it('eliminarAtencion(): abre DialogComponent con tipoElemento "asistencia" y los ids correctos', () => {
      component.alumnos.data = [mockAlumno];
      const dialogSpy = spyOn(component['dialog'], 'open').and.returnValue({
        afterClosed: () => of(null),
      } as any);
      component.eliminarAtencion(mockAtencion, mockClase);
      expect(dialogSpy).toHaveBeenCalledWith(
        jasmine.any(Function),
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            tipoElemento: 'asistencia',
            prmPerfId: mockAtencion.idPerfil,
            prmClsCodigo: mockClase.codigo,
          }),
        })
      );
    });

    it('eliminarAtencion(): tras confirmación recarga atenciones y muestra snack de éxito', () => {
      component.alumnos.data = [mockAlumno];
      spyOn(component['dialog'], 'open').and.returnValue({
        afterClosed: () => of({ confirmado: true }),
      } as any);
      spyOn(component['asistenciaService'], 'getAtencionesClase').and.returnValue(of([mockAtencion]));

      component.eliminarAtencion(mockAtencion, mockClase);

      expect(component['asistenciaService'].getAtencionesClase).toHaveBeenCalledWith(mockClase.codigo);
      expect(component.clasesAtenciones[mockClase.codigo]).toEqual([mockAtencion]);
      expect(component['snackBar'].open).toHaveBeenCalledWith(
        jasmine.stringContaining('eliminada'), 'Cerrar', jasmine.any(Object)
      );
    });

    it('eliminarAtencion(): tras errorStatus muestra snack de error', () => {
      component.alumnos.data = [mockAlumno];
      spyOn(component['dialog'], 'open').and.returnValue({
        afterClosed: () => of({ confirmado: false, errorStatus: 404 }),
      } as any);

      component.eliminarAtencion(mockAtencion, mockClase);

      expect(component['snackBar'].open).toHaveBeenCalledWith(
        jasmine.stringContaining('Error'), 'Cerrar', jasmine.any(Object)
      );
    });
  });
});
