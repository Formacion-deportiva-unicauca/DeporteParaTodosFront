import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { MatFormField } from '@angular/material/form-field';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';
import { FormCursoDeportiviComponent } from './form-curso-deportivi.component';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { DeporteService } from 'src/app/services/deporte.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { CursoDTO } from 'src/app/Models/DTOs/curso-dto';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';

describe('FormCursoDeportiviComponent › público del curso', () => {
  let fixture: ComponentFixture<FormCursoDeportiviComponent>;
  let component: FormCursoDeportiviComponent;
  let cursoSpy: jasmine.SpyObj<CursodeportivoService>;
  let imagenSpy: jasmine.SpyObj<ImagenService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<FormCursoDeportiviComponent>>;
  let notificacionesSpy: jasmine.SpyObj<NotificacionService>;

  async function montar(data: { tituloCategoria: string; nombrecurso: string }, cursoExistente?: Partial<CursoDTO>) {
    cursoSpy = jasmine.createSpyObj('CursodeportivoService', ['crearCurso', 'updateCurso', 'getCurso']);
    imagenSpy = jasmine.createSpyObj('ImagenService', ['postImagen', 'getimagen']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    notificacionesSpy = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);
    const deporteSpy = jasmine.createSpyObj('DeporteService', ['getDeportes', 'crearDeporte']);
    deporteSpy.getDeportes.and.returnValue(of([{ nombre: 'Natacion' }]));
    cursoSpy.crearCurso.and.returnValue(of({} as CursoDTO));
    cursoSpy.updateCurso.and.returnValue(of({} as CursoDTO));
    imagenSpy.postImagen.and.returnValue(of({ id: 77 } as any));
    if (cursoExistente) {
      cursoSpy.getCurso.and.returnValue(of({
        nombre: 'Natacion avanzada', deporte: 'Natacion', categoriaCurso: 'Recreativo', descripcion: 'Desc',
        idImagen: null, estadoInscripciones: 'ABIERTO', ...cursoExistente,
      } as CursoDTO));
    }

    await TestBed.configureTestingModule({
      imports: [FormCursoDeportiviComponent, NoopAnimationsModule],
      providers: [
        { provide: CursodeportivoService, useValue: cursoSpy },
        { provide: DeporteService, useValue: deporteSpy },
        { provide: ImagenService, useValue: imagenSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: NotificacionService, useValue: notificacionesSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormCursoDeportiviComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function llenar(): void {
    Object.assign(component.curso, { nombre: 'Natacion basica', deporte: 'Natacion', descripcion: 'Curso de prueba' });
  }

  const etiquetas = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('mat-label') as NodeListOf<HTMLElement>)
      .map(e => (e.textContent ?? '').trim());

  describe('al crear', () => {
    beforeEach(async () => montar({ tituloCategoria: 'Recreativo', nombrecurso: '' }));

    it('el campo del deporte se llama "Línea deportiva"', () => {
      expect(etiquetas()).toContain('Línea deportiva');
      expect(etiquetas()).not.toContain('Deporte');
    });

    it('pide "Dirigido a", con toda la comunidad por defecto', () => {
      expect(etiquetas()).toContain('Dirigido a');
      expect(fixture.nativeElement.querySelector('mat-select[name="publico"]')).not.toBeNull();
      expect(component.curso.publico).toBe('MIXTO');
    });

    it('ofrece los tres públicos', () => {
      expect(component.publicos.map(p => p.valor)).toEqual(['MIXTO', 'ESTUDIANTE', 'FUNCIONARIO']);
    });

    it('envía el público elegido al crear un curso sin imagen', () => {
      llenar();
      component.curso.publico = 'FUNCIONARIO';

      component.onSubmit({} as NgForm);

      expect(cursoSpy.crearCurso.calls.mostRecent().args[0].publico).toBe('FUNCIONARIO');
    });

    it('envía el público elegido al crear un curso con imagen', () => {
      llenar();
      component.curso.publico = 'ESTUDIANTE';
      component.selectedFile = new File(['x'], 'foto.png', { type: 'image/png' });

      component.onSubmit({} as NgForm);

      expect(imagenSpy.postImagen).toHaveBeenCalled();
      const enviado = cursoSpy.crearCurso.calls.mostRecent().args[0];
      expect(enviado.publico).toBe('ESTUDIANTE');
      expect(enviado.idImagen).toBe(77);
    });

    it('si no se toca el público, se crea para toda la comunidad', () => {
      llenar();

      component.onSubmit({} as NgForm);

      expect(cursoSpy.crearCurso.calls.mostRecent().args[0].publico).toBe('MIXTO');
    });

    // Fase 3: el estado de inscripciones del curso se deriva de sus grupos; no se elige en el formulario.
    it('no pide "Estado de inscripciones": se calcula a partir de los grupos', () => {
      expect(etiquetas()).not.toContain('Estado de inscripciones');
      expect(fixture.nativeElement.querySelector('mat-select[name="estadoInscripciones"]')).toBeNull();
    });

    it('no envía estadoInscripciones al crear (con y sin imagen)', () => {
      llenar();
      component.onSubmit({} as NgForm);
      expect('estadoInscripciones' in cursoSpy.crearCurso.calls.mostRecent().args[0]).toBeFalse();
      component.selectedFile = new File(['x'], 'foto.png', { type: 'image/png' });
      component.onSubmit({} as NgForm);
      expect('estadoInscripciones' in cursoSpy.crearCurso.calls.mostRecent().args[0]).toBeFalse();
    });

    it('no pide el horario del curso: el horario se define en cada grupo', () => {
      expect(fixture.nativeElement.querySelector('input[name="horario"]')).toBeNull();
      expect(etiquetas()).not.toContain('Horario');
    });

    it('la ayuda de "Dirigido a" crece con su texto para no encimarse con el campo siguiente', () => {
      const campo = fixture.debugElement.queryAll(By.directive(MatFormField))
        .find(d => d.nativeElement.querySelector('mat-select[name="publico"]'));
      expect(campo).toBeDefined();
      expect((campo!.componentInstance as MatFormField).subscriptSizing).toBe('dynamic');
    });

    it('no envía horario al crear un curso sin imagen', () => {
      llenar();
      component.onSubmit({} as NgForm);
      expect('horario' in cursoSpy.crearCurso.calls.mostRecent().args[0]).toBeFalse();
    });

    it('no envía horario al crear un curso con imagen', () => {
      llenar();
      component.selectedFile = new File(['x'], 'foto.png', { type: 'image/png' });
      component.onSubmit({} as NgForm);
      expect('horario' in cursoSpy.crearCurso.calls.mostRecent().args[0]).toBeFalse();
    });
  });

  describe('al editar', () => {
    it('carga el público guardado y lo envía al actualizar sin imagen', async () => {
      await montar({ tituloCategoria: 'Recreativo', nombrecurso: 'Natacion avanzada' }, { publico: 'ESTUDIANTE' });
      expect(component.curso.publico).toBe('ESTUDIANTE');

      component.curso.publico = 'FUNCIONARIO';
      component.onSubmit({} as NgForm);

      const [categoria, nombre, enviado] = cursoSpy.updateCurso.calls.mostRecent().args;
      expect(categoria).toBe('Recreativo');
      expect(nombre).toBe('Natacion avanzada');
      expect(enviado.publico).toBe('FUNCIONARIO');
    });

    it('envía el público al actualizar con una imagen nueva', async () => {
      await montar({ tituloCategoria: 'Recreativo', nombrecurso: 'Natacion avanzada' }, { publico: 'FUNCIONARIO' });
      component.selectedFile = new File(['x'], 'foto.png', { type: 'image/png' });

      component.onSubmit({} as NgForm);

      const enviado = cursoSpy.updateCurso.calls.mostRecent().args[2];
      expect(enviado.publico).toBe('FUNCIONARIO');
      expect(enviado.idImagen).toBe(77);
    });

    it('un curso que llega sin público (backend anterior) se edita como toda la comunidad', async () => {
      await montar({ tituloCategoria: 'Recreativo', nombrecurso: 'Natacion avanzada' }, { publico: undefined });

      expect(component.curso.publico).toBe('MIXTO');
    });

    it('no envía estadoInscripciones al actualizar, aunque el curso lo traiga derivado', async () => {
      await montar({ tituloCategoria: 'Recreativo', nombrecurso: 'Natacion avanzada' }, { estadoInscripciones: 'CERRADO' });
      component.onSubmit({} as NgForm);
      expect('estadoInscripciones' in cursoSpy.updateCurso.calls.mostRecent().args[2]).toBeFalse();
      component.selectedFile = new File(['x'], 'foto.png', { type: 'image/png' });
      component.onSubmit({} as NgForm);
      expect('estadoInscripciones' in cursoSpy.updateCurso.calls.mostRecent().args[2]).toBeFalse();
    });

    it('no envía horario al actualizar, aunque el curso lo traiga', async () => {
      await montar({ tituloCategoria: 'Recreativo', nombrecurso: 'Natacion avanzada' }, { horario: 'Lunes 8 a 10' });
      component.onSubmit({} as NgForm);
      expect('horario' in cursoSpy.updateCurso.calls.mostRecent().args[2]).toBeFalse();
    });

    it('no envía horario al actualizar con una imagen nueva', async () => {
      await montar({ tituloCategoria: 'Recreativo', nombrecurso: 'Natacion avanzada' }, { horario: 'Lunes 8 a 10' });
      component.selectedFile = new File(['x'], 'foto.png', { type: 'image/png' });
      component.onSubmit({} as NgForm);
      expect('horario' in cursoSpy.updateCurso.calls.mostRecent().args[2]).toBeFalse();
    });
  });
});

describe('FormCursoDeportiviComponent › experiencia de usuario', () => {
  let fixture: ComponentFixture<FormCursoDeportiviComponent>;
  let component: FormCursoDeportiviComponent;
  let cursos: jasmine.SpyObj<CursodeportivoService>;
  let imagenes: jasmine.SpyObj<ImagenService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<FormCursoDeportiviComponent>>;
  let avisos: jasmine.SpyObj<NotificacionService>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(s: string): T => el().querySelector(s) as T;
  const guardar = () => q<HTMLButtonElement>('button.aceptar');
  const imagenPrueba = () => new File(['x'], 'curso.png', { type: 'image/png' });

  beforeEach(async () => {
    cursos = jasmine.createSpyObj('CursodeportivoService', ['crearCurso', 'updateCurso', 'getCurso']);
    imagenes = jasmine.createSpyObj('ImagenService', ['postImagen', 'getimagen']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    avisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);
    const deportes = jasmine.createSpyObj('DeporteService', ['getDeportes', 'crearDeporte']);
    deportes.getDeportes.and.returnValue(of([{ nombre: 'Natacion' }]));
    cursos.crearCurso.and.returnValue(of({} as CursoDTO));
    imagenes.postImagen.and.returnValue(of({ id: 77 } as any));
    await TestBed.configureTestingModule({
      imports: [FormCursoDeportiviComponent, NoopAnimationsModule],
      providers: [
        { provide: CursodeportivoService, useValue: cursos },
        { provide: DeporteService, useValue: deportes },
        { provide: ImagenService, useValue: imagenes },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { tituloCategoria: 'Recreativo', nombrecurso: '' } },
        { provide: NotificacionService, useValue: avisos },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FormCursoDeportiviComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  async function llenarYEnviar(conImagen = true): Promise<void> {
    for (const [nombre, valor] of [['nombre', 'Natacion basica'], ['deporte', 'Natacion'], ['descripcion', 'Curso de prueba']]) {
      const campo = q<HTMLInputElement>(`[name="${nombre}"]`);
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
    }
    if (conImagen) {
      component.selectedFile = imagenPrueba();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }
    guardar().click();
    fixture.detectChanges();
  }

  describe('cabecera', () => {
    it('lleva etiqueta superior, título h2 de diálogo y subtítulo con la categoría', () => {
      expect(q('.dlg-eyebrow').textContent?.trim()).toBe('Gestión de cursos');
      expect(q('h2[mat-dialog-title].dlg-titulo').textContent?.trim()).toBe('Agregar curso');
      expect(q('.dlg-subtitulo').textContent).toContain('Recreativo');
    });

    it('el botón X está en la cabecera y avisa que los campos con * son obligatorios', () => {
      expect(q('.dlg-cabecera button.close-button').getAttribute('aria-label')).toBe('Cerrar diálogo');
      expect(q('.dlg-aviso').textContent).toContain('Los campos marcados con * son obligatorios');
    });
  });

  describe('validación', () => {
    it('con el formulario vacío, Guardar no crea nada y explica qué campos faltan', async () => {
      guardar().click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(cursos.crearCurso).not.toHaveBeenCalled();
      const errores = Array.from(el().querySelectorAll('mat-error, .error-campo')).map(e => e.textContent?.trim());
      expect(errores).toContain('El nombre es obligatorio');
      expect(errores).toContain('La línea deportiva es obligatoria');
      expect(errores).toContain('La descripción es obligatoria');
      expect(errores).toContain('Elija una imagen de portada');
    });

    it('la imagen es obligatoria al crear: el servidor la exige', async () => {
      await llenarYEnviar(false);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(cursos.crearCurso).not.toHaveBeenCalled();
      expect(q('.error-campo').textContent).toContain('Elija una imagen de portada');
    });

    it('indica con asterisco que la imagen es obligatoria', () => {
      expect(q('.selector-imagen-titulo').textContent).toContain('Imagen de portada *');
      expect(q('.ayuda-archivo').textContent).toContain('obligatoria');
    });
  });

  describe('guardado', () => {
    it('con datos válidos y una imagen sube la imagen, crea el curso y cierra el diálogo', async () => {
      await llenarYEnviar();
      expect(imagenes.postImagen).toHaveBeenCalled();
      expect(cursos.crearCurso).toHaveBeenCalledTimes(1);
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('mientras guarda, el botón se deshabilita ("Guardando…") y no admite un segundo envío', async () => {
      const pendiente = new Subject<CursoDTO>();
      cursos.crearCurso.and.returnValue(pendiente);
      await llenarYEnviar();
      expect(guardar().disabled).toBeTrue();
      expect(guardar().textContent).toContain('Guardando');
      component.onSubmit({} as NgForm);
      expect(cursos.crearCurso).toHaveBeenCalledTimes(1);
    });

    it('si el servidor falla, avisa dentro del diálogo, no lo cierra y deja reintentar', async () => {
      cursos.crearCurso.and.returnValue(throwError(() => ({ status: 500 })));
      await llenarYEnviar();
      const aviso = q('.error-servidor');
      expect(aviso.textContent).toContain('No se pudo guardar el curso');
      expect(aviso.getAttribute('role')).toBe('alert');
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(guardar().disabled).toBeFalse();
      expect(avisos.error).toHaveBeenCalledOnceWith('No se pudo crear el curso',
        'No se pudo guardar el curso. Revise los datos e intente de nuevo.');
    });

    it('si falla la subida de la imagen lo dice con claridad y no crea el curso', async () => {
      imagenes.postImagen.and.returnValue(throwError(() => ({ status: 413 })));
      await llenarYEnviar();
      expect(q('.error-servidor').textContent).toContain('No se pudo subir la imagen');
      expect(cursos.crearCurso).not.toHaveBeenCalled();
      expect(avisos.error).toHaveBeenCalledWith('No se pudo crear el curso', 'No se pudo subir la imagen. Intente con otro archivo.');
    });
  });

  describe('selector de imagen', () => {
    it('es un botón accesible, en un recuadro punteado, y muestra el nombre del archivo elegido', () => {
      const entrada = q<HTMLInputElement>('input[type="file"]');
      expect(entrada.classList).toContain('archivo-oculto');
      expect(q('label.boton-archivo').getAttribute('for')).toBe(entrada.id);
      expect(getComputedStyle(q('.selector-imagen')).borderTopStyle).toBe('dashed');
      component.selectedFile = imagenPrueba();
      fixture.detectChanges();
      expect(q('.nombre-archivo').textContent).toContain('curso.png');
      expect(q('label.boton-archivo').textContent).toContain('Cambiar imagen');
    });
  });

  describe('botones con los estilos reales de Material', () => {
    it('Crear: texto blanco sobre azul primario; Cancelar: contorno azul sin relleno', () => {
      expect(getComputedStyle(guardar()).color).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(guardar()).backgroundColor).toBe('rgb(0, 0, 102)');
      expect(getComputedStyle(q('button.cancelar')).color).toBe('rgb(0, 0, 102)');
      expect(guardar().textContent).toContain('Crear curso');
    });
  });
});
