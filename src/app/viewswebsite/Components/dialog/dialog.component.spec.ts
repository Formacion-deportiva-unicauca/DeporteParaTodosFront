import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DialogComponent } from './dialog.component';
import { CategoriaService } from 'src/app/services/categoria.service';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { AsistenciaService } from 'src/app/services/asistencia.service';

describe('DialogComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;
  let mockCategoriaService: jasmine.SpyObj<CategoriaService>;
  let mockCursoService: jasmine.SpyObj<CursodeportivoService>;
  let mockInscripcionService: jasmine.SpyObj<InscripcionesService>;
  let mockAsistenciaService: jasmine.SpyObj<AsistenciaService>;
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
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [DialogComponent, NoopAnimationsModule],
      providers: [
        { provide: CategoriaService, useValue: mockCategoriaService },
        { provide: CursodeportivoService, useValue: mockCursoService },
        { provide: InscripcionesService, useValue: mockInscripcionService },
        { provide: AsistenciaService, useValue: mockAsistenciaService },
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
});
