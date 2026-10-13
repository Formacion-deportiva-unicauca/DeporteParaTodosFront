import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NgForm } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';

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
    component.grupo.fechaInscripcionApertura = '2026-03-01';
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

  // ── PARTE 1: identidad original y flujo de guardado ───────────────────────

  it('updateGrupo() usa categoria/curso/anio/iterable ORIGINALES aunque el formulario cambie', () => {
    component.grupo.categoria = 'Otra';
    component.grupo.curso = 'Otro';
    component.grupo.anio = 1999;
    component.grupo.iterable = 9;
    component.categoriaGrupo = 'Mutada';
    component['updateGrupo']();
    const [cat, cur, anio, it, body] = grupoServiceSpy.updateGrupo.calls.mostRecent().args;
    expect([cat, cur, anio, it]).toEqual(['Futbol', 'Avanzado', 2024, 1]);
    expect(body).toEqual(jasmine.objectContaining({ categoria: 'Futbol', curso: 'Avanzado', anio: 2024, iterable: 1 }));
  });

  it('updateGrupo() sin imagen no envía imagenGrupo, no llama a postImagen y cierra con true', () => {
    component.selectedFile = null;
    component['updateGrupo']();
    const body = grupoServiceSpy.updateGrupo.calls.mostRecent().args[4];
    expect('imagenGrupo' in body).toBeFalse();
    expect(imagenServiceSpy.postImagen).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('updateGrupo() con imagen nueva cierra el diálogo con true', () => {
    imagenServiceSpy.postImagen.and.returnValue(of({ id: 5 } as any));
    component.selectedFile = new File(['x'], 'a.jpg');
    component['updateGrupo']();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('error del backend: muestra err.error.mensaje y no cierra', () => {
    grupoServiceSpy.updateGrupo.and.returnValue(throwError(() => ({ error: { mensaje: 'Cupos inválidos' } })));
    component['updateGrupo']();
    expect(component.errorServidor).toBe('Cupos inválidos');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('error del backend sin mensaje: usa el texto genérico de respaldo', () => {
    grupoServiceSpy.updateGrupo.and.returnValue(throwError(() => ({ status: 500 })));
    component['updateGrupo']();
    expect(component.errorServidor).toBe('No se pudo actualizar el grupo');
  });

  it('error al subir la imagen en edición: muestra el error y no llama a updateGrupo', () => {
    imagenServiceSpy.postImagen.and.returnValue(throwError(() => ({ error: { mensaje: 'Imagen muy pesada' } })));
    component.selectedFile = new File(['x'], 'a.jpg');
    grupoServiceSpy.updateGrupo.calls.reset();
    component['updateGrupo']();
    expect(component.errorServidor).toBe('Imagen muy pesada');
    expect(grupoServiceSpy.updateGrupo).not.toHaveBeenCalled();
  });

  // ── crear ──────────────────────────────────────────────────────────────────

  it('crearGrupo() con imagen: postImagen, createGrupo con fechas texto y cierra con true', () => {
    imagenServiceSpy.postImagen.and.returnValue(of({ id: 7 } as any));
    component.selectedFile = new File(['x'], 'a.jpg');
    component.grupo.fechaCreacion = '2026-03-05';
    component.grupo.fechaFinalizacion = '';
    component['crearGrupo']();
    expect(grupoServiceSpy.createGrupo).toHaveBeenCalledWith(jasmine.objectContaining({
      imagenGrupo: 7, anio: null, iterable: null, fechaCreacion: '2026-03-05', fechaFinalizacion: null,
    }));
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('crearGrupo() sin imagen no crea y avisa al usuario', () => {
    component.selectedFile = null;
    component['crearGrupo']();
    expect(grupoServiceSpy.createGrupo).not.toHaveBeenCalled();
    expect(component.errorServidor).toBe('Selecciona una imagen para el grupo');
  });

  it('crearGrupo(): errores de createGrupo y de postImagen se muestran', () => {
    component.selectedFile = new File(['x'], 'a.jpg');
    imagenServiceSpy.postImagen.and.returnValue(of({ id: 7 } as any));
    grupoServiceSpy.createGrupo.and.returnValue(throwError(() => ({ error: { mensaje: 'Duplicado' } })));
    component['crearGrupo']();
    expect(component.errorServidor).toBe('Duplicado');
    imagenServiceSpy.postImagen.and.returnValue(throwError(() => ({})));
    component['crearGrupo']();
    expect(component.errorServidor).toBe('No se pudo subir la imagen');
  });

  it('en modo creación fechaCreacion arranca en la fecha local de hoy (yyyy-MM-dd)', () => {
    component.data = { categoria: 'F', curso: 'A', anio: 0, iterable: 0 };
    component.ngOnInit();
    const h = new Date();
    const esperado = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
    expect(component.grupo.fechaCreacion).toBe(esperado);
  });

  it('onFileSelected() guarda el archivo y onCancel() cierra sin resultado', () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    component.onFileSelected({ target: { files: [file] } } as any);
    expect(component.selectedFile).toBe(file);
    component.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith();
  });

  // ── PARTE 2: fechas ────────────────────────────────────────────────────────

  it('precarga las 4 fechas del grupo (recortando hora si el backend la envía)', () => {
    grupoServiceSpy.getGrupo.and.returnValue(of({
      ...mockGrupo,
      fechaCreacion: '2026-01-10T00:00:00',
      fechaFinalizacion: '2026-06-30',
      fechaInscripcionApertura: '2026-01-01',
      fechaIncripcionCierre: '2026-02-01',
    }));
    component.ngOnInit();
    expect(component.grupo.fechaCreacion).toBe('2026-01-10');
    expect(component.grupo.fechaFinalizacion).toBe('2026-06-30');
    expect(component.grupo.fechaInscripcionApertura).toBe('2026-01-01');
    expect(component.grupo.fechaIncripcionCierre).toBe('2026-02-01');
  });

  it('los calendarios muestran las fechas en dd/MM/yyyy (no mes/día), sin desfase', async () => {
    grupoServiceSpy.getGrupo.and.returnValue(of({
      ...mockGrupo,
      fechaCreacion: '2026-10-15',
      fechaFinalizacion: '2026-12-31',
    }));
    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const valor = (nombre: string): string =>
      ((fixture.nativeElement as HTMLElement).querySelector(`input[name="${nombre}"]`) as HTMLInputElement).value;
    expect(valor('fechaCreacion')).toBe('15/10/2026');
    expect(valor('fechaFinalizacion')).toBe('31/12/2026');
  });

  it('precarga con fechas nulas las deja vacías', () => {
    expect(component.grupo.fechaFinalizacion).toBe('');
  });

  it('el payload de edición envía las 4 fechas como texto yyyy-MM-dd', () => {
    component.grupo.fechaCreacion = '2026-01-10';
    component.grupo.fechaFinalizacion = '2026-06-30';
    component.grupo.fechaInscripcionApertura = '2026-01-01';
    component.grupo.fechaIncripcionCierre = '';
    component['updateGrupo']();
    expect(grupoServiceSpy.updateGrupo.calls.mostRecent().args[4]).toEqual(jasmine.objectContaining({
      fechaCreacion: '2026-01-10', fechaFinalizacion: '2026-06-30',
      fechaInscripcionApertura: '2026-01-01', fechaIncripcionCierre: null,
    }));
  });

  it('regla finalización >= creación: válida (posterior e igual)', () => {
    component.grupo.fechaCreacion = '2026-03-01';
    component.grupo.fechaFinalizacion = '2026-03-02';
    expect(component.errorFinalizacion).toBeNull();
    component.grupo.fechaFinalizacion = '2026-03-01';
    expect(component.errorFinalizacion).toBeNull();
  });

  it('regla finalización >= creación: inválida si es anterior', () => {
    component.grupo.fechaCreacion = '2026-03-01';
    component.grupo.fechaFinalizacion = '2026-02-28';
    expect(component.errorFinalizacion).toContain('finalización');
    expect(component.fechasValidas).toBeFalse();
  });

  it('regla cierre inscripción >= apertura: válida e inválida', () => {
    component.grupo.fechaInscripcionApertura = '2026-03-10';
    component.grupo.fechaIncripcionCierre = '2026-03-10';
    expect(component.errorCierreInscripcion).toBeNull();
    component.grupo.fechaIncripcionCierre = '2026-03-09';
    expect(component.errorCierreInscripcion).toContain('cierre');
    expect(component.fechasValidas).toBeFalse();
  });

  it('si una de las dos fechas está vacía la regla no aplica', () => {
    component.grupo.fechaCreacion = '2026-03-01';
    component.grupo.fechaFinalizacion = '';
    component.grupo.fechaInscripcionApertura = '';
    component.grupo.fechaIncripcionCierre = '2026-01-01';
    expect(component.errorFinalizacion).toBeNull();
    expect(component.errorCierreInscripcion).toBeNull();
    expect(component.fechasValidas).toBeTrue();
  });

  it('onSubmit() con regla incumplida no guarda', () => {
    component.grupo.fechaCreacion = '2026-03-01';
    component.grupo.fechaFinalizacion = '2026-01-01';
    grupoServiceSpy.updateGrupo.calls.reset();
    component.onSubmit({} as NgForm);
    expect(grupoServiceSpy.updateGrupo).not.toHaveBeenCalled();
  });

  it('Guardar se deshabilita y aparece el mensaje en línea cuando hay una regla incumplida', () => {
    const el: HTMLElement = fixture.nativeElement;
    const boton = () => el.querySelector('button.aceptar') as HTMLButtonElement;
    expect(boton().disabled).toBeFalse();
    component.grupo.fechaCreacion = '2026-03-01';
    component.grupo.fechaFinalizacion = '2026-01-01';
    fixture.detectChanges();
    expect(boton().disabled).toBeTrue();
    expect(el.querySelector('#error-finalizacion')?.textContent).toContain('no puede ser anterior');
  });

  it('accesibilidad: 4 inputs con calendario, label de la imagen asociado, sin div con (click)', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('input.mat-datepicker-input').length).toBe(4);
    expect(el.querySelector('label[for="imagen"]')).toBeTruthy();
    expect(el.querySelectorAll('div[ng-reflect-click], div[click]').length).toBe(0);
  });

  // ── Ajuste: etiquetas y no vaciar fechas en edición ───────────────────────

  const etiquetas = (): string[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-label')).map(l => l.textContent!.trim());

  const abrirEdicionConFechas = (f: Partial<GrupoDTO>): void => {
    grupoServiceSpy.getGrupo.and.returnValue(of({ ...mockGrupo, ...f }));
    component.ngOnInit();
    fixture.detectChanges();
  };

  const boton = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector('button.aceptar') as HTMLButtonElement;

  it('usa las etiquetas nuevas de fechas y no las viejas', () => {
    const e = etiquetas();
    expect(e).toContain('Fecha de inicio del grupo');
    expect(e).toContain('Fecha de finalización del grupo');
    expect(e).toContain('Apertura de inscripciones');
    expect(e).toContain('Cierre de inscripciones');
    expect(e).not.toContain('Fecha creación');
    expect(e).not.toContain('Fecha cierre');
  });

  it('los mensajes de error usan los nombres nuevos', () => {
    component.grupo.fechaCreacion = '2026-03-01';
    component.grupo.fechaFinalizacion = '2026-01-01';
    component.grupo.fechaInscripcionApertura = '2026-03-10';
    component.grupo.fechaIncripcionCierre = '2026-03-01';
    expect(component.errorFinalizacion).toBe('La fecha de finalización del grupo no puede ser anterior a la fecha de inicio del grupo');
    expect(component.errorCierreInscripcion).toBe('El cierre de inscripciones no puede ser anterior a la apertura de inscripciones');
  });

  it('edición: vaciar una fecha que tenía valor invalida el formulario, muestra el mensaje y deshabilita Guardar', () => {
    abrirEdicionConFechas({ fechaCreacion: '2026-01-10', fechaFinalizacion: '2026-06-30' });
    expect(component.fechasValidas).toBeTrue();
    component.grupo.fechaFinalizacion = '';
    fixture.detectChanges();
    expect(component.fechasValidas).toBeFalse();
    expect(boton().disabled).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector('#error-vacia-fechaFinalizacion')?.textContent)
      .toContain('Esta fecha no se puede borrar; cámbiala por otra');
    grupoServiceSpy.updateGrupo.calls.reset();
    component.onSubmit({} as NgForm);
    expect(grupoServiceSpy.updateGrupo).not.toHaveBeenCalled();
  });

  it('edición: compara contra el valor ORIGINAL, no contra el último valor del formulario', () => {
    abrirEdicionConFechas({ fechaCreacion: '2026-01-10', fechaFinalizacion: '2026-06-30' });
    component.grupo.fechaFinalizacion = '2026-07-01';
    expect(component.fechasValidas).toBeTrue();
    component.grupo.fechaFinalizacion = '';
    expect(component.fechasValidas).toBeFalse();
  });

  it('edición: una fecha que estaba vacía al abrir puede seguir vacía', () => {
    abrirEdicionConFechas({ fechaCreacion: '2026-01-10', fechaFinalizacion: null, fechaInscripcionApertura: null });
    component.grupo.fechaFinalizacion = '';
    fixture.detectChanges();
    expect(component.fechasValidas).toBeTrue();
    expect(boton().disabled).toBeFalse();
    grupoServiceSpy.updateGrupo.calls.reset();
    component.onSubmit({} as NgForm);
    expect(grupoServiceSpy.updateGrupo).toHaveBeenCalledTimes(1);
  });

  it('creación con campos opcionales vacíos (todo menos la apertura) es válido', () => {
    component.data = { categoria: 'F', curso: 'A', anio: 0, iterable: 0 };
    component.ngOnInit();
    component.grupo.fechaFinalizacion = '';
    component.grupo.fechaInscripcionApertura = '2026-03-01';
    component.grupo.fechaIncripcionCierre = '';
    component.grupo.fechaCreacion = '';
    fixture.detectChanges();
    expect(component.fechasValidas).toBeTrue();
    expect(boton().disabled).toBeFalse();
  });

  it('edición: cambiar una fecha por otra es válido', () => {
    abrirEdicionConFechas({ fechaCreacion: '2026-01-10', fechaFinalizacion: '2026-06-30' });
    component.grupo.fechaCreacion = '2026-01-05';
    fixture.detectChanges();
    expect(component.fechasValidas).toBeTrue();
    expect(boton().disabled).toBeFalse();
  });

  // ── Calendario (DatePicker) ────────────────────────────────────────────────

  it('elegir una fecha en el calendario guarda texto yyyy-MM-dd en hora local (sin desfase de un día)', () => {
    component.alElegirFecha('fechaFinalizacion', new Date(2026, 11, 31)); // 31-dic-2026 local
    expect(component.grupo.fechaFinalizacion).toBe('2026-12-31');
    component.alElegirFecha('fechaCreacion', new Date(2026, 0, 1, 23, 59));
    expect(component.grupo.fechaCreacion).toBe('2026-01-01');
  });

  it('precarga: las fechas del grupo llegan al calendario como Date local, sin desfase', () => {
    grupoServiceSpy.getGrupo.and.returnValue(of({ ...mockGrupo, fechaCreacion: '2026-03-01', fechaFinalizacion: '2026-06-30' }));
    component.ngOnInit();
    const d = component.fechasDate.fechaFinalizacion!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 5, 30]);
    expect(component.fechasDate.fechaInscripcionApertura).toBeNull();
  });

  it('limpiarFecha() vacía el valor; puedeLimpiar() es falso para una fecha original en edición', () => {
    grupoServiceSpy.getGrupo.and.returnValue(of({ ...mockGrupo, fechaCreacion: '2026-03-01', fechaFinalizacion: null }));
    component.ngOnInit();
    expect(component.puedeLimpiar('fechaCreacion')).toBeFalse();
    component.alElegirFecha('fechaFinalizacion', new Date(2026, 5, 30));
    expect(component.puedeLimpiar('fechaFinalizacion')).toBeTrue();
    component.limpiarFecha('fechaFinalizacion');
    expect(component.grupo.fechaFinalizacion).toBe('');
    expect(component.fechasDate.fechaFinalizacion).toBeNull();
    expect(component.puedeLimpiar('fechaFinalizacion')).toBeFalse();
  });

  it('los inputs de fecha son de solo lectura (sin digitación manual)', () => {
    const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('input.mat-datepicker-input');
    inputs.forEach(i => expect((i as HTMLInputElement).readOnly).toBeTrue());
  });

  it('touchUi se activa en pantallas pequeñas y se desuscribe al destruir', () => {
    const bo = TestBed.inject(BreakpointObserver);
    spyOn(bo, 'observe').and.returnValue(of({ matches: true, breakpoints: {} }));
    component.ngOnInit();
    expect(component.touchUi).toBeTrue();
    component.ngOnDestroy();
  });

  // ── Cupos ──────────────────────────────────────────────────────────────────

  it('cupos: 1 o más es válido; 0, negativo, decimal, vacío o null son inválidos', () => {
    for (const ok of [1, 20]) { component.grupo.cupos = ok; expect(component.errorCupos).toBeNull(); }
    for (const mal of [0, -3, 2.5, null, undefined, '' as any]) {
      component.grupo.cupos = mal as any;
      expect(component.errorCupos).toContain('mayor o igual a 1');
      expect(component.formularioValido).toBeFalse();
    }
  });

  it('cupos inválidos: muestra el mensaje, deshabilita Guardar y onSubmit no guarda', () => {
    component.grupo.cupos = 0;
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#error-cupos')?.textContent).toContain('mayor o igual a 1');
    expect((el.querySelector('button.aceptar') as HTMLButtonElement).disabled).toBeTrue();
    grupoServiceSpy.updateGrupo.calls.reset();
    component.onSubmit({} as NgForm);
    expect(grupoServiceSpy.updateGrupo).not.toHaveBeenCalled();
  });

  // ── Apertura obligatoria al crear / pista del cierre ───────────────────────

  const hintDe = (nombre: string): string => {
    const input = (fixture.nativeElement as HTMLElement).querySelector(`input[name="${nombre}"]`) as HTMLInputElement;
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
    return ids.map(id => document.getElementById(id)?.textContent?.trim() ?? '').join(' ');
  };

  it('apertura: ayuda accesible (aria-describedby) "abiertas desde ya"', () => {
    expect(hintDe('fechaInscripcionApertura')).toContain('Si lo dejas vacío, las inscripciones están abiertas desde ya');
  });

  it('cierre: ayuda accesible (aria-describedby) "no se cierra por fecha"', () => {
    expect(hintDe('fechaIncripcionCierre')).toContain('Si lo dejas vacío, el grupo no se cierra por fecha. El último día es inclusivo');
  });

  it('creación sin apertura ya NO se bloquea (apertura null = abierto desde siempre)', () => {
    component.data = { categoria: 'F', curso: 'A', anio: 0, iterable: 0 };
    component.ngOnInit();
    component.grupo.fechaInscripcionApertura = '';
    fixture.detectChanges();
    expect(component.formularioValido).toBeTrue();
    expect(((fixture.nativeElement as HTMLElement).querySelector('button.aceptar') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('el PUT NO incluye inscripcionesAbiertas ni motivoInscripcion aunque el grupo cargado los traiga', () => {
    component.grupo.inscripcionesAbiertas = true;
    component.grupo.motivoInscripcion = 'ABIERTAS';
    component['updateGrupo']();
    const body = grupoServiceSpy.updateGrupo.calls.mostRecent().args[4] as any;
    expect('inscripcionesAbiertas' in body).toBeFalse();
    expect('motivoInscripcion' in body).toBeFalse();
  });

  it('el POST NO incluye inscripcionesAbiertas ni motivoInscripcion', () => {
    imagenServiceSpy.postImagen.and.returnValue(of({ id: 3 } as any));
    component.selectedFile = new File(['x'], 'a.jpg');
    component.grupo.inscripcionesAbiertas = false;
    component.grupo.motivoInscripcion = 'CERRADAS';
    component['crearGrupo']();
    const body = grupoServiceSpy.createGrupo.calls.mostRecent().args[0] as any;
    expect('inscripcionesAbiertas' in body).toBeFalse();
    expect('motivoInscripcion' in body).toBeFalse();
  });
});
