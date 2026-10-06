import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { InformacionEstudianteComponent } from './informacion-estudiante.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { AuthService } from 'src/app/services/auth.service';
import { MiCursoDTO } from 'src/app/Models/DTOs/mis-cursos-dto';

const mockCurso: MiCursoDTO = {
  categoria: 'Futbol',
  curso: 'Avanzado',
  anio: 2024,
  iterable: 1,
  periodo: 1,
  estado: 'INSCRITO',
  nombreInstructor: 'Carlos Pérez',
  grupoActivo: true,
  horarios: [
    { id: 1, categoria: 'Futbol', curso: 'Avanzado', anio: 2024, iterable: 1,
      dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00', escenario: 'Cancha 1' },
  ],
};

describe('InformacionEstudianteComponent', () => {
  let component: InformacionEstudianteComponent;
  let fixture: ComponentFixture<InformacionEstudianteComponent>;
  let perfilSubject: BehaviorSubject<string>;
  let mockInscripcionesService: jasmine.SpyObj<InscripcionesService>;
  let mockInstructorService: jasmine.SpyObj<InstructorServisce>;
  let snackBarOpenSpy: jasmine.Spy;

  beforeEach(async () => {
    perfilSubject = new BehaviorSubject<string>('Alumno');
    mockInscripcionesService = jasmine.createSpyObj('InscripcionesService', ['getMisCursos']);
    mockInscripcionesService.getMisCursos.and.returnValue(of([]));

    mockInstructorService = jasmine.createSpyObj('InstructorServisce', ['getInstructores']);
    mockInstructorService.getInstructores.and.returnValue(
      of([{ id: '1061700114', nombre: 'Carlos Pérez', correo: 'a@b.co', sexo: 'M' }])
    );

    sessionStorage.setItem(
      'dpt_perfil',
      JSON.stringify({ id: '1061813673', nombre: 'Juan Sebastian Pisso', role: 'Alumno' })
    );

    await TestBed.configureTestingModule({
      imports: [InformacionEstudianteComponent, NoopAnimationsModule],
      providers: [
        { provide: PerfilService, useValue: { perfil$: perfilSubject.asObservable() } },
        { provide: InscripcionesService, useValue: mockInscripcionesService },
        { provide: InstructorServisce, useValue: mockInstructorService },
        {
          provide: AuthService,
          useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'getProfile', 'isAuthenticated', 'verificarUsuario']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InformacionEstudianteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    snackBarOpenSpy = spyOn(component['snackBar'], 'open');
  });

  afterEach(() => sessionStorage.removeItem('dpt_perfil'));

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('cuando perfil es Alumno', () => {
    it('llama a getMisCursos() en ngOnInit', () => {
      expect(mockInscripcionesService.getMisCursos).toHaveBeenCalled();
    });

    it('courses.data está vacío cuando el endpoint retorna []', () => {
      expect(component.courses.data.length).toBe(0);
    });

    it('courses.data contiene las filas cuando getMisCursos retorna datos', () => {
      mockInscripcionesService.getMisCursos.and.returnValue(of([mockCurso]));
      component.ngOnInit();
      fixture.detectChanges();
      expect(component.courses.data.length).toBe(1);
    });

    it('cargando es false tras respuesta exitosa', () => {
      expect(component.cargando).toBeFalse();
    });

    it('muestra snackbar de error y cargando=false cuando getMisCursos falla', () => {
      mockInscripcionesService.getMisCursos.and.returnValue(throwError(() => ({ status: 500 })));
      component.cargarCursos();
      expect(component.cargando).toBeFalse();
      expect(snackBarOpenSpy).toHaveBeenCalledWith(
        jasmine.any(String), '', jasmine.objectContaining({ panelClass: 'snack-error' })
      );
    });
  });

  describe('cuando perfil NO es Alumno', () => {
    it('no llama a getMisCursos cuando el rol es Coordinador', () => {
      mockInscripcionesService.getMisCursos.calls.reset();
      perfilSubject.next('Coordinador');
      expect(mockInscripcionesService.getMisCursos).not.toHaveBeenCalled();
    });

    it('no llama a getMisCursos cuando el rol es Instructor', () => {
      mockInscripcionesService.getMisCursos.calls.reset();
      perfilSubject.next('Instructor');
      expect(mockInscripcionesService.getMisCursos).not.toHaveBeenCalled();
    });
  });

  describe('formatGrupo()', () => {
    it('formatea como "anio-periodo · Grupo <letra>"', () => {
      expect(component.formatGrupo(mockCurso)).toBe('2024-1 · Grupo A');
    });

    it('usa "?" para iterable fuera de rango (0)', () => {
      expect(component.formatGrupo({ ...mockCurso, iterable: 0 })).toBe('2024-1 · Grupo ?');
    });
  });

  describe('formatHorario()', () => {
    it('retorna "Horario por definir" cuando horarios es []', () => {
      expect(component.formatHorario({ ...mockCurso, horarios: [] })).toBe('Horario por definir');
    });

    it('incluye dia, horaInicio - horaFin y escenario cuando escenario no es null', () => {
      expect(component.formatHorario(mockCurso)).toBe('Lunes 08:00 - 10:00 Cancha 1');
    });

    it('omite escenario si es null', () => {
      const c = { ...mockCurso, horarios: [{ ...mockCurso.horarios[0], escenario: null }] };
      expect(component.formatHorario(c)).toBe('Lunes 08:00 - 10:00');
    });
  });

  describe('formatEstado()', () => {
    it('"INSCRITO" → "Inscrito"', () => {
      expect(component.formatEstado('INSCRITO')).toBe('Inscrito');
    });

    it('"EN_ESPERA" → "En lista de espera"', () => {
      expect(component.formatEstado('EN_ESPERA')).toBe('En lista de espera');
    });
  });

  describe('Tu información (datos del alumno de la sesión)', () => {
    it('carga el nombre y el código desde dpt_perfil al entrar a la vista', () => {
      expect(component.nombreAlumno).toBe('Juan Sebastian Pisso');
      expect(component.codigoAlumno).toBe('1061813673');
    });

    it('muestra nombre, código y el rol en el bloque "Tu información"', () => {
      const texto = (fixture.nativeElement as HTMLElement).querySelector('.info-text')!.textContent!;
      expect(texto).toContain('Juan Sebastian Pisso');
      expect(texto).toContain('1061813673');
      expect(texto).toContain('Alumno');
    });

    it('vuelve a leer dpt_perfil cuando el rol regresa a Alumno', () => {
      sessionStorage.setItem(
        'dpt_perfil',
        JSON.stringify({ id: '999', nombre: 'Otro Usuario', role: 'Alumno' })
      );
      perfilSubject.next('Coordinador');
      perfilSubject.next('Alumno');
      expect(component.nombreAlumno).toBe('Otro Usuario');
      expect(component.codigoAlumno).toBe('999');
    });

    it('sin dpt_perfil muestra "No disponible" y no falla', () => {
      sessionStorage.removeItem('dpt_perfil');
      component.cargarInfoAlumno();
      fixture.detectChanges();
      expect(component.nombreAlumno).toBeNull();
      expect(component.codigoAlumno).toBeNull();
      const texto = (fixture.nativeElement as HTMLElement).querySelector('.info-text')!.textContent!;
      expect(texto).toContain('No disponible');
    });

    it('con dpt_perfil corrupto la descarta y deja los datos vacíos', () => {
      sessionStorage.setItem('dpt_perfil', '{no-json');
      component.cargarInfoAlumno();
      expect(sessionStorage.getItem('dpt_perfil')).toBeNull();
      expect(component.nombreAlumno).toBeNull();
    });
  });

  describe('grupoActivo = false', () => {
    it('el DTO refleja grupoActivo=false en courses.data', () => {
      const inactivo = { ...mockCurso, grupoActivo: false };
      mockInscripcionesService.getMisCursos.and.returnValue(of([inactivo]));
      component.ngOnInit();
      fixture.detectChanges();
      expect(component.courses.data[0].grupoActivo).toBeFalse();
    });
  });

  describe('datos del instructor', () => {
    function mockearInstructores(lista: { id: string; nombre: string }[]): void {
      mockInstructorService.getInstructores.and.returnValue(
        of(lista.map(i => ({ ...i, correo: 'a@b.co', sexo: 'M' })))
      );
      component['codigosInstructor'] = null;
    }

    it('muestra el nombre completo y el código resueltos desde getInstructores()', () => {
      mockInscripcionesService.getMisCursos.and.returnValue(of([mockCurso]));
      component.cargarCursos();
      expect(component.courses.data[0].instructorNombre).toBe('Carlos Pérez');
      expect(component.courses.data[0].instructorCodigo).toBe('1061700114');
    });

    it('resuelve el código aunque el nombre venga con distinta capitalización o sin tilde', () => {
      mockearInstructores([{ id: '1061700114', nombre: 'CARLOS PEREZ' }]);
      mockInscripcionesService.getMisCursos.and.returnValue(of([{ ...mockCurso, nombreInstructor: 'carlos pérez' }]));
      component.cargarCursos();
      expect(component.courses.data[0].instructorCodigo).toBe('1061700114');
    });

    it('deja instructorCodigo en null cuando el instructor no está en el listado', () => {
      mockInscripcionesService.getMisCursos.and.returnValue(of([{ ...mockCurso, nombreInstructor: 'OTRO INSTRUCTOR' }]));
      component.cargarCursos();
      expect(component.courses.data[0].instructorNombre).toBe('OTRO INSTRUCTOR');
      expect(component.courses.data[0].instructorCodigo).toBeNull();
    });

    it('deja instructorNombre y instructorCodigo en null cuando el grupo no tiene instructor', () => {
      mockInscripcionesService.getMisCursos.and.returnValue(of([{ ...mockCurso, nombreInstructor: null }]));
      component.cargarCursos();
      expect(component.courses.data[0].instructorNombre).toBeNull();
      expect(component.courses.data[0].instructorCodigo).toBeNull();
    });

    it('carga los cursos aunque getInstructores() falle', () => {
      mockInstructorService.getInstructores.and.returnValue(throwError(() => ({ status: 404 })));
      component['codigosInstructor'] = null;
      mockInscripcionesService.getMisCursos.and.returnValue(of([mockCurso]));
      component.cargarCursos();
      expect(component.courses.data.length).toBe(1);
      expect(component.courses.data[0].instructorCodigo).toBeNull();
    });

    it('solo llama a getInstructores() una vez gracias a la caché', () => {
      mockInscripcionesService.getMisCursos.calls.reset();
      component.cargarCursos();
      component.cargarCursos();
      expect(mockInstructorService.getInstructores).toHaveBeenCalledTimes(1);
      expect(mockInscripcionesService.getMisCursos).toHaveBeenCalledTimes(2);
    });
  });
});
