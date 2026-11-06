import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DialogComponent } from './dialog.component';
import { CategoriaService } from 'src/app/services/categoria.service';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { AsistenciaService } from 'src/app/services/asistencia.service';
import { GrupoService } from 'src/app/services/grupo.service';
import { InstructorServisce } from 'src/app/services/instructor.service';

describe('DialogComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;
  let mockCategoriaService: jasmine.SpyObj<CategoriaService>;
  let mockCursoService: jasmine.SpyObj<CursodeportivoService>;
  let mockInscripcionService: jasmine.SpyObj<InscripcionesService>;
  let mockAsistenciaService: jasmine.SpyObj<AsistenciaService>;
  let mockGrupoService: jasmine.SpyObj<GrupoService>;
  let mockInstructorService: jasmine.SpyObj<InstructorServisce>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DialogComponent>>;

  const dialogData = {
    elemento: 'elemento-test',
    nombreElemento: 'Elemento Test',
    tipoElemento: 'categoria',
    categoria: 'CategoriaTest',
    alumnoId: 42,
    anio: 2024,
    iterable: 1,
  };

  beforeEach(async () => {
    mockCategoriaService = jasmine.createSpyObj('CategoriaService', ['deleteCategoria']);
    mockCursoService = jasmine.createSpyObj('CursodeportivoService', ['deleteCurso']);
    mockInscripcionService = jasmine.createSpyObj('InscripcionesService', ['eliminarInscripcion']);
    mockAsistenciaService = jasmine.createSpyObj('AsistenciaService', ['eliminarAsistencia']);
    mockGrupoService = jasmine.createSpyObj('GrupoService', ['deleteGrupo']);
    mockInstructorService = jasmine.createSpyObj('InstructorServisce', ['deleteInstructor']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [DialogComponent, NoopAnimationsModule],
      providers: [
        { provide: CategoriaService, useValue: mockCategoriaService },
        { provide: CursodeportivoService, useValue: mockCursoService },
        { provide: InscripcionesService, useValue: mockInscripcionService },
        { provide: AsistenciaService, useValue: mockAsistenciaService },
        { provide: GrupoService, useValue: mockGrupoService },
        { provide: InstructorServisce, useValue: mockInstructorService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { ...dialogData } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('tipoElemento = "categoria"', () => {
    beforeEach(() => { component.data.tipoElemento = 'categoria'; });

    it('llama a deleteCategoria y cierra el dialog con confirmado: true', () => {
      mockCategoriaService.deleteCategoria.and.returnValue(of(null as any));

      component.confirmarEliminar();

      expect(mockCategoriaService.deleteCategoria).toHaveBeenCalledWith(component.data.nombreElemento);
      expect(mockDialogRef.close).toHaveBeenCalledWith({ confirmado: true, id: component.data.nombreElemento });
    });

    it('cierra el dialog con confirmado: false cuando deleteCategoria falla', () => {
      mockCategoriaService.deleteCategoria.and.returnValue(throwError(() => ({ status: 404 })));

      component.confirmarEliminar();

      expect(mockDialogRef.close).toHaveBeenCalledWith({ confirmado: false, errorStatus: 404 });
    });
  });

  describe('tipoElemento = "curso"', () => {
    beforeEach(() => { component.data.tipoElemento = 'curso'; });

    it('llama a deleteCurso y cierra el dialog con confirmado: true', () => {
      mockCursoService.deleteCurso.and.returnValue(of(null as any));

      component.confirmarEliminar();

      expect(mockCursoService.deleteCurso).toHaveBeenCalledWith(
        component.data.categoria!,
        component.data.nombreElemento
      );
      expect(mockDialogRef.close).toHaveBeenCalledWith({ confirmado: true, id: component.data.nombreElemento });
    });

    it('cierra el dialog con confirmado: false cuando deleteCurso falla (ej. 409 Conflict)', () => {
      mockCursoService.deleteCurso.and.returnValue(throwError(() => ({ status: 409 })));

      component.confirmarEliminar();

      expect(mockDialogRef.close).toHaveBeenCalledWith({ confirmado: false, errorStatus: 409 });
    });
  });

  describe('tipoElemento = "inscripcion"', () => {
    beforeEach(() => { component.data.tipoElemento = 'inscripcion'; });

    it('llama a eliminarInscripcion y cierra el dialog con confirmado: true', () => {
      mockInscripcionService.eliminarInscripcion.and.returnValue(of({} as any));

      component.confirmarEliminar();

      expect(mockInscripcionService.eliminarInscripcion).toHaveBeenCalledWith({
        alumnoId: component.data.alumnoId!,
        categoria: component.data.categoria!,
        curso: component.data.nombreElemento,
        anio: component.data.anio!,
        iterable: component.data.iterable!,
      } as any);
      expect(mockDialogRef.close).toHaveBeenCalledWith({ confirmado: true });
    });

    it('cierra el dialog con confirmado: false cuando eliminarInscripcion falla', () => {
      mockInscripcionService.eliminarInscripcion.and.returnValue(throwError(() => ({ status: 500 })));

      component.confirmarEliminar();

      expect(mockDialogRef.close).toHaveBeenCalledWith({ confirmado: false, errorStatus: 500 });
    });
  });

  describe('tipoElemento = "asistencia"', () => {
    beforeEach(() => {
      component.data.tipoElemento = 'asistencia';
      (component.data as any).prmPerfId = 'PERF-01';
      (component.data as any).prmClsCodigo = 7;
    });

    it('llama a eliminarAsistencia y cierra el dialog con confirmado: true', () => {
      mockAsistenciaService.eliminarAsistencia.and.returnValue(of({} as any));

      component.confirmarEliminar();

      expect(mockAsistenciaService.eliminarAsistencia).toHaveBeenCalledWith('PERF-01', 7);
      expect(mockDialogRef.close).toHaveBeenCalledWith({ confirmado: true });
    });

    it('cierra el dialog con confirmado: false cuando eliminarAsistencia falla', () => {
      mockAsistenciaService.eliminarAsistencia.and.returnValue(throwError(() => ({ status: 404 })));

      component.confirmarEliminar();

      expect(mockDialogRef.close).toHaveBeenCalledWith({ confirmado: false, errorStatus: 404 });
    });
  });

  describe('tipoElemento = "grupo"', () => {
    beforeEach(() => {
      component.data.tipoElemento = 'grupo';
      component.data.categoria = 'Acuáticos';
      (component.data as any).curso = 'Natación';
      component.data.anio = 2026;
      component.data.iterable = 1;
    });

    it('llama a deleteGrupo con los 4 params y cierra con confirmado: true', () => {
      mockGrupoService.deleteGrupo.and.returnValue(of({} as any));

      component.confirmarEliminar();

      expect(mockGrupoService.deleteGrupo).toHaveBeenCalledWith('Acuáticos', 'Natación', 2026, 1);
      expect(mockDialogRef.close).toHaveBeenCalledWith({ confirmado: true });
    });

    it('cierra con confirmado: false cuando deleteGrupo falla (ej. 409)', () => {
      mockGrupoService.deleteGrupo.and.returnValue(throwError(() => ({ status: 409 })));

      component.confirmarEliminar();

      expect(mockDialogRef.close).toHaveBeenCalledWith({ confirmado: false, errorStatus: 409 });
    });
  });

  describe('tipoElemento = "instructor"', () => {
    beforeEach(() => {
      component.data.tipoElemento = 'instructor';
      (component.data as any).instructorId = 'INS01';
    });

    it('llama a deleteInstructor con instructorId y cierra con confirmado: true', () => {
      mockInstructorService.deleteInstructor.and.returnValue(of(undefined as any));

      component.confirmarEliminar();

      expect(mockInstructorService.deleteInstructor).toHaveBeenCalledWith('INS01');
      expect(mockDialogRef.close).toHaveBeenCalledWith({ confirmado: true });
    });

    it('cierra con confirmado: false cuando deleteInstructor falla (ej. 409)', () => {
      mockInstructorService.deleteInstructor.and.returnValue(throwError(() => ({ status: 409 })));

      component.confirmarEliminar();

      expect(mockDialogRef.close).toHaveBeenCalledWith({ confirmado: false, errorStatus: 409 });
    });
  });

  describe('advertencia', () => {
    it('muestra la advertencia cuando viene en data', () => {
      component.data.advertencia = 'Este grupo tiene 3 inscritos. Sus inscripciones se cancelarán.';
      fixture.detectChanges();

      const aviso = fixture.nativeElement.querySelector('.aviso-eliminacion');
      expect(aviso?.textContent).toContain('3 inscritos');
      expect(aviso?.getAttribute('role')).toBe('alert');
    });

    it('no muestra el bloque de advertencia cuando no hay', () => {
      component.data.advertencia = null;
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.aviso-eliminacion')).toBeNull();
    });
  });

  describe('experiencia de confirmación de borrado', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const textoPlano = () => (el().textContent ?? '').replace(/\s+/g, ' ');

    it('el título es un h2 de diálogo (nombre accesible) que dice "Confirmar eliminación"', () => {
      const titulo = el().querySelector('h2[mat-dialog-title]');
      expect(titulo?.textContent?.trim()).toBe('Confirmar eliminación');
    });

    it('el mensaje nombra lo que se va a eliminar y avisa que no se puede deshacer', () => {
      expect(textoPlano()).toContain("¿Está seguro que desea eliminar elemento-test con el identificador 'Elemento Test'?");
      expect(textoPlano()).toContain('Esta acción no se puede deshacer');
    });

    it('lleva un icono de advertencia decorativo', () => {
      const icono = el().querySelector('.icono-advertencia mat-icon');
      expect(icono?.getAttribute('aria-hidden')).toBe('true');
    });

    it('el botón principal dice "Eliminar" (no "Aceptar") y usa el rol Error', () => {
      const eliminar = el().querySelector('button.btn-eliminar') as HTMLButtonElement;
      expect(eliminar.textContent?.trim()).toBe('Eliminar');
      expect(textoPlano()).not.toContain('Aceptar');
    });

    it('"Eliminar" ejecuta la eliminación', () => {
      spyOn(component, 'confirmarEliminar');
      (el().querySelector('button.btn-eliminar') as HTMLButtonElement).click();
      expect(component.confirmarEliminar).toHaveBeenCalled();
    });

    it('"Cancelar" tiene el foco inicial, para que Enter no elimine por accidente', () => {
      const cancelar = el().querySelector('button.btn-cancelar') as HTMLButtonElement;
      expect(cancelar.textContent?.trim()).toBe('Cancelar');
      expect(cancelar.hasAttribute('cdkfocusinitial')).toBeTrue();
      expect(el().querySelector('button.btn-eliminar')?.hasAttribute('cdkfocusinitial')).toBeFalse();
    });

    it('el botón de cerrar tiene nombre accesible', () => {
      expect(el().querySelector('.close-button')?.getAttribute('aria-label')).toBe('Cerrar diálogo');
    });

    it('con los estilos reales de Material, "Eliminar" conserva el texto blanco y "Cancelar" el azul primario', () => {
      const eliminar = getComputedStyle(el().querySelector('button.btn-eliminar') as HTMLElement);
      expect(eliminar.color).toBe('rgb(255, 255, 255)');
      expect(eliminar.backgroundColor).toBe('rgb(154, 65, 0)');
      const cancelar = getComputedStyle(el().querySelector('button.btn-cancelar') as HTMLElement);
      expect(cancelar.color).toBe('rgb(0, 0, 102)');
      expect(cancelar.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    });
  });
});
