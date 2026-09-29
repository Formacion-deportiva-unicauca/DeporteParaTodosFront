import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NgForm } from '@angular/forms';
import { of } from 'rxjs';

import { FormGruposComponent } from './form-grupos.component';
import { GrupoService } from 'src/app/services/grupo.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';

describe('FormGruposComponent', () => {
  let component: FormGruposComponent;
  let fixture: ComponentFixture<FormGruposComponent>;
  let grupoServiceSpy: jasmine.SpyObj<GrupoService>;
  let imagenServiceSpy: jasmine.SpyObj<ImagenService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<FormGruposComponent>>;
  let instructorServiceSpy: jasmine.SpyObj<InstructorServisce>;

  const mockGrupo: GrupoDTO = {
    categoria: 'Futbol', curso: 'Avanzado', anio: 2024, iterable: 1,
    imagenGrupo: null, idInstructor: 'inst-1', nombreInstructor: 'Juan',
    cupos: 20, fechaCreacion: '2024-01-01',
  };

  beforeEach(async () => {
    grupoServiceSpy = jasmine.createSpyObj('GrupoService', ['getGrupo', 'createGrupo', 'updateGrupo']);
    imagenServiceSpy = jasmine.createSpyObj('ImagenService', ['postImagen', 'getimagen']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    instructorServiceSpy = jasmine.createSpyObj('InstructorServisce', ['getInstructores', 'getInstructor']);

    grupoServiceSpy.getGrupo.and.callFake(() => of({ ...mockGrupo }));
    grupoServiceSpy.createGrupo.and.returnValue(of(mockGrupo));
    grupoServiceSpy.updateGrupo.and.returnValue(of(mockGrupo));
    instructorServiceSpy.getInstructores.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [FormGruposComponent, NoopAnimationsModule],
      providers: [
        DatePipe,
        { provide: MAT_DIALOG_DATA, useValue: { categoria: 'Futbol', curso: 'Avanzado', anio: 2024, iterable: 1 } },
        { provide: GrupoService, useValue: grupoServiceSpy },
        { provide: ImagenService, useValue: imagenServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: InstructorServisce, useValue: instructorServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).overrideComponent(FormGruposComponent, {
      add: { schemas: [NO_ERRORS_SCHEMA] },
    }).compileComponents();

    fixture = TestBed.createComponent(FormGruposComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit → isEditing=true, loadGrupo, getInstructores
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.isEditing).toBeTrue();
  });

  // ── onSubmit() ─────────────────────────────────────────────────────────────

  it('onSubmit() en modo edición llama a updateGrupo() y NO a crearGrupo()', () => {
    const updateSpy = spyOn<any>(component, 'updateGrupo');
    const crearSpy  = spyOn<any>(component, 'crearGrupo');
    component.isEditing = true;
    component.onSubmit({} as NgForm);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('onSubmit() en modo creación llama a crearGrupo() y NO a updateGrupo()', () => {
    const updateSpy = spyOn<any>(component, 'updateGrupo');
    const crearSpy  = spyOn<any>(component, 'crearGrupo');
    component.isEditing = false;
    component.onSubmit({} as NgForm);
    expect(crearSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  // ── updateGrupo() ──────────────────────────────────────────────────────────

  it('updateGrupo() sin imagen llama a grupoService.updateGrupo() con los params correctos', () => {
    component.selectedFile = null;
    component['updateGrupo']();
    expect(grupoServiceSpy.updateGrupo).toHaveBeenCalledOnceWith(
      'Futbol', 'Avanzado', mockGrupo.anio!, mockGrupo.iterable!,
      jasmine.objectContaining({ idInstructor: 'inst-1', cupos: 20 })
    );
  });

  it('updateGrupo() con idInstructor=null ("Sin definir") envía null al backend', () => {
    component.selectedFile = null;
    component.grupo.idInstructor = null;
    component['updateGrupo']();
    expect(grupoServiceSpy.updateGrupo).toHaveBeenCalledOnceWith(
      jasmine.any(String), jasmine.any(String),
      jasmine.any(Number), jasmine.any(Number),
      jasmine.objectContaining({ idInstructor: null })
    );
  });

  it('updateGrupo() con imagen nueva llama a postImagen() y luego a grupoService.updateGrupo() con el id de imagen', () => {
    const fakeFile = new File(['content'], 'foto.jpg', { type: 'image/jpeg' });
    imagenServiceSpy.postImagen.and.returnValue(
      of({ id: 99, datosBase64: '', tipoArchivo: 'image/jpeg' } as any)
    );
    component.selectedFile = fakeFile;
    component['updateGrupo']();
    expect(imagenServiceSpy.postImagen).toHaveBeenCalledWith(fakeFile);
    expect(grupoServiceSpy.updateGrupo).toHaveBeenCalledOnceWith(
      jasmine.any(String), jasmine.any(String),
      jasmine.any(Number), jasmine.any(Number),
      jasmine.objectContaining({ imagenGrupo: 99 })
    );
  });
});
