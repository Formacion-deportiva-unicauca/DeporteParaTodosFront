import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';
import { NuevoCursoCategoriaComponent } from './nuevo-curso-categoria.component';
import { CategoriaService } from 'src/app/services/categoria.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { CategoriaDTO } from 'src/app/Models/DTOs/categoria-dto';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';

describe('NuevoCursoCategoriaComponent', () => {
  let fixture: ComponentFixture<NuevoCursoCategoriaComponent>;
  let component: NuevoCursoCategoriaComponent;
  let categorias: jasmine.SpyObj<CategoriaService>;
  let imagenes: jasmine.SpyObj<ImagenService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<NuevoCursoCategoriaComponent>>;
  let notificaciones: jasmine.SpyObj<NotificacionService>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(selector: string): T => el().querySelector(selector) as T;
  const botonGuardar = () => q<HTMLButtonElement>('button.aceptar');
  const imagenPrueba = () => new File(['x'], 'portada.png', { type: 'image/png' });

  async function crear(data: { titulo: string } | null = null): Promise<void> {
    categorias = jasmine.createSpyObj('CategoriaService', ['createCategoria', 'updateCategoria', 'getCategoria']);
    imagenes = jasmine.createSpyObj('ImagenService', ['postImagen', 'getimagen']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    notificaciones = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);
    categorias.createCategoria.and.returnValue(of({ titulo: 'x', descripcion: 'y' }));
    categorias.updateCategoria.and.returnValue(of({ titulo: 'x', descripcion: 'y' }));
    categorias.getCategoria.and.returnValue(of({ titulo: 'Recreativo', descripcion: 'Actividades', imagenId: 3 } as CategoriaDTO));
    imagenes.postImagen.and.returnValue(of({ id: 7 } as any));
    imagenes.getimagen.and.returnValue(of({ datosBase64: 'AAAA', tipoArchivo: 'image/png' } as any));

    await TestBed.configureTestingModule({
      imports: [NuevoCursoCategoriaComponent, NoopAnimationsModule],
      providers: [
        { provide: CategoriaService, useValue: categorias },
        { provide: ImagenService, useValue: imagenes },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: NotificacionService, useValue: notificaciones },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NuevoCursoCategoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Escribe en un campo como lo haría el usuario. */
  async function escribir(selector: string, valor: string): Promise<void> {
    const campo = q<HTMLInputElement | HTMLTextAreaElement>(selector);
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function llenarFormulario(conImagen = true): Promise<void> {
    await escribir('input[name="titulo"]', 'Competitivo');
    await escribir('textarea[name="descripcion"]', 'Torneos universitarios');
    if (conImagen) {
      component.selectedFile = imagenPrueba();
      fixture.detectChanges();
    }
  }

  describe('registrar categoría', () => {
    beforeEach(() => crear());

    describe('cabecera', () => {
      it('el título es un h2 de diálogo con etiqueta superior y subtítulo, como en el prototipo', () => {
        expect(q('.dlg-eyebrow').textContent?.trim()).toBe('Gestión de categorías');
        expect(q('h2[mat-dialog-title].dlg-titulo').textContent?.trim()).toBe('Agregar categoría deportiva');
        expect(q('.dlg-subtitulo').textContent).toContain('Complete la información');
      });

      it('el botón X está en la cabecera y tiene nombre accesible', () => {
        const x = q('.dlg-cabecera button.close-button');
        expect(x.getAttribute('aria-label')).toBe('Cerrar diálogo');
      });

      it('avisa que los campos con * son obligatorios', () => {
        expect(q('.dlg-aviso').textContent).toContain('Los campos marcados con * son obligatorios');
      });
    });

    describe('validación', () => {
      it('con el formulario vacío, Guardar no llama al servidor y explica qué falta', async () => {
        botonGuardar().click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(categorias.createCategoria).not.toHaveBeenCalled();
        const errores = Array.from(el().querySelectorAll('mat-error, .error-campo')).map(e => e.textContent?.trim());
        expect(errores).toContain('El nombre es obligatorio');
        expect(errores).toContain('La descripción es obligatoria');
        expect(errores).toContain('Elija una imagen de portada');
      });

      it('la imagen es obligatoria al crear: sin ella no se envía aunque los textos estén completos', async () => {
        await llenarFormulario(false);
        botonGuardar().click();
        fixture.detectChanges();
        expect(categorias.createCategoria).not.toHaveBeenCalled();
        expect(q('.error-campo').textContent).toContain('Elija una imagen de portada');
      });

      it('si solo falta la imagen (queda fuera de la vista), desplaza el diálogo hasta el error', async () => {
        const desplazar = spyOn(Element.prototype, 'scrollIntoView');
        await llenarFormulario(false);
        botonGuardar().click();
        fixture.detectChanges();
        await new Promise(r => setTimeout(r));
        expect(desplazar).toHaveBeenCalled();
        const destino = desplazar.calls.mostRecent().object as HTMLElement;
        expect(destino.classList.contains('error-campo') || destino.classList.contains('mat-form-field-invalid')).toBeTrue();
      });

      it('indica con asterisco que la imagen es obligatoria', () => {
        expect(q('.selector-imagen-titulo').textContent).toContain('Imagen de portada *');
        expect(q('.ayuda-archivo').textContent).toContain('obligatoria');
      });
    });

    describe('contadores', () => {
      it('el nombre admite 100 caracteres (límite del servidor) y la descripción 1000, con contador', async () => {
        expect(q('input[name="titulo"]').getAttribute('maxlength')).toBe('100');
        expect(q('textarea[name="descripcion"]').getAttribute('maxlength')).toBe('1000');
        expect(el().textContent).toContain('0/100');
        expect(el().textContent).toContain('0/1000');
        await escribir('input[name="titulo"]', 'Competitivo');
        expect(el().textContent).toContain('11/100');
      });
    });

    describe('vista previa en vivo', () => {
      it('antes de escribir muestra textos de ejemplo y un recuadro para la imagen', () => {
        const previa = q('.tarjeta-previa');
        expect(previa.querySelector('h3')?.textContent).toContain('Nombre de la categoría');
        expect(previa.textContent).toContain('aparecerá en este espacio');
        expect(previa.querySelector('.previa-sin-imagen')).not.toBeNull();
      });

      it('refleja el nombre y la descripción a medida que el usuario escribe', async () => {
        await llenarFormulario(false);
        const previa = q('.tarjeta-previa');
        expect(previa.querySelector('h3')?.textContent).toContain('Competitivo');
        expect(previa.textContent).toContain('Torneos universitarios');
      });

      it('muestra la imagen elegida', () => {
        component.imagenPreview = 'data:image/png;base64,AAAA';
        fixture.detectChanges();
        expect(q('.tarjeta-previa img').getAttribute('src')).toBe('data:image/png;base64,AAAA');
        expect(el().querySelector('.previa-sin-imagen')).toBeNull();
      });

      it('es decorativa para lectores de pantalla (región con nombre, no duplica el formulario)', () => {
        expect(q('.categoria-previa').getAttribute('aria-label')).toBe('Vista previa de la categoría');
      });
    });

    describe('guardado', () => {
      it('con datos válidos sube la imagen, crea la categoría y cierra el diálogo con éxito', async () => {
        await llenarFormulario();
        botonGuardar().click();
        expect(imagenes.postImagen).toHaveBeenCalled();
        expect(categorias.createCategoria).toHaveBeenCalledWith({ titulo: 'Competitivo', descripcion: 'Torneos universitarios', imagenId: 7 });
        expect(dialogRef.close).toHaveBeenCalledWith(true);
      });

      it('mientras guarda, el botón se deshabilita ("Guardando…") y no admite un segundo envío', async () => {
        const pendiente = new Subject<CategoriaDTO>();
        categorias.createCategoria.and.returnValue(pendiente);
        await llenarFormulario();
        botonGuardar().click();
        fixture.detectChanges();
        expect(botonGuardar().disabled).toBeTrue();
        expect(botonGuardar().textContent).toContain('Guardando');
        component.onSubmit({ invalid: false, control: { markAllAsTouched() {} } } as any);
        expect(categorias.createCategoria).toHaveBeenCalledTimes(1);
      });

      it('si el servidor falla, avisa en el diálogo, no lo cierra y deja volver a intentar', async () => {
        categorias.createCategoria.and.returnValue(throwError(() => ({ status: 500 })));
        await llenarFormulario();
        botonGuardar().click();
        fixture.detectChanges();
        const aviso = q('.error-servidor');
        expect(aviso.textContent).toContain('No se pudo guardar la categoría');
        expect(aviso.getAttribute('role')).toBe('alert');
        expect(dialogRef.close).not.toHaveBeenCalled();
        expect(botonGuardar().disabled).toBeFalse();
      });

      it('el aviso de error aparece arriba, justo tras el aviso de obligatorios, para verse sin desplazarse', async () => {
        categorias.createCategoria.and.returnValue(throwError(() => ({ status: 500 })));
        await llenarFormulario();
        botonGuardar().click();
        fixture.detectChanges();
        const aviso = q('.error-servidor');
        const titulo = q('.selector-imagen-titulo');
        expect(aviso.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      });

      it('si el servidor falla, además muestra una notificación de error con el motivo', async () => {
        categorias.createCategoria.and.returnValue(throwError(() => ({ status: 500 })));
        await llenarFormulario();
        botonGuardar().click();
        expect(notificaciones.error).toHaveBeenCalledWith(
          'No se pudo crear la categoría', 'No se pudo guardar la categoría. Intente de nuevo.');
      });

      it('al crear con éxito no muestra aquí el aviso: lo muestra quien abrió el diálogo, ya con la lista actualizada', async () => {
        await llenarFormulario();
        botonGuardar().click();
        expect(notificaciones.exito).not.toHaveBeenCalled();
        expect(notificaciones.error).not.toHaveBeenCalled();
      });

      it('si falla la subida de la imagen lo dice con claridad y no crea la categoría', async () => {
        imagenes.postImagen.and.returnValue(throwError(() => ({ status: 413 })));
        await llenarFormulario();
        botonGuardar().click();
        fixture.detectChanges();
        expect(q('.error-servidor').textContent).toContain('No se pudo subir la imagen');
        expect(categorias.createCategoria).not.toHaveBeenCalled();
        expect(notificaciones.error).toHaveBeenCalledWith('No se pudo crear la categoría', jasmine.stringMatching('No se pudo subir la imagen'));
      });
    });

    describe('validación de la imagen elegida', () => {
      const elegir = (archivo: File) =>
        component.onFileSelected({ target: { files: [archivo], value: 'ruta' } } as unknown as Event);

      it('rechaza un archivo que no es imagen y lo explica, sin quedarse con él', () => {
        elegir(new File(['x'], 'informe.pdf', { type: 'application/pdf' }));
        fixture.detectChanges();
        expect(component.selectedFile).toBeNull();
        const aviso = q('.error-campo');
        expect(aviso.textContent).toContain('no es una imagen válida');
        expect(aviso.getAttribute('role')).toBe('alert');
      });

      it('rechaza una imagen de más de 5 MB e indica cuánto pesa', () => {
        const grande = new File([new Uint8Array(6 * 1024 * 1024)], 'grande.png', { type: 'image/png' });
        elegir(grande);
        fixture.detectChanges();
        expect(component.selectedFile).toBeNull();
        expect(q('.error-campo').textContent).toContain('6,0 MB');
      });

      it('acepta una imagen válida y quita el aviso anterior', () => {
        elegir(new File(['x'], 'informe.pdf', { type: 'application/pdf' }));
        elegir(imagenPrueba());
        fixture.detectChanges();
        expect(component.selectedFile?.name).toBe('portada.png');
        expect(el().querySelector('.error-campo')).toBeNull();
      });

      it('el texto de apoyo dice los formatos y el tamaño máximo, y el selector solo ofrece esos formatos', () => {
        expect(q('.ayuda-archivo').textContent).toContain('JPG, PNG o WebP');
        expect(q('.ayuda-archivo').textContent).toContain('máximo 5 MB');
        expect(q('input[type="file"]').getAttribute('accept')).toBe('image/jpeg,image/png,image/webp');
      });
    });

    describe('selector de imagen', () => {
      it('muestra un botón accesible en lugar del input nativo', () => {
        const entrada = q<HTMLInputElement>('input[type="file"]');
        expect(entrada.classList).toContain('archivo-oculto');
        const etiqueta = q<HTMLLabelElement>('label.boton-archivo');
        expect(etiqueta.getAttribute('for')).toBe(entrada.id);
        expect(etiqueta.textContent).toContain('Seleccionar imagen');
      });

      it('al elegir un archivo muestra su nombre y el botón pasa a "Cambiar imagen"', () => {
        component.selectedFile = imagenPrueba();
        fixture.detectChanges();
        expect(q('.nombre-archivo').textContent).toContain('portada.png');
        expect(q('label.boton-archivo').textContent).toContain('Cambiar imagen');
      });

      it('el recuadro es punteado y el texto de apoyo indica formatos de imagen', () => {
        expect(getComputedStyle(q('.selector-imagen')).borderTopStyle).toBe('dashed');
        expect(q('.ayuda-archivo').textContent).toContain('JPG');
      });
    });
  });

  describe('editar categoría', () => {
    beforeEach(() => crear({ titulo: 'Recreativo' }));

    it('la cabecera dice "Editar categoría deportiva" y el nombre no se puede cambiar', () => {
      expect(q('h2[mat-dialog-title]').textContent?.trim()).toBe('Editar categoría deportiva');
      expect(q<HTMLInputElement>('input[name="titulo"]').disabled).toBeTrue();
    });

    it('al editar la imagen es opcional: se conserva la actual', () => {
      expect(q('.ayuda-archivo').textContent).toContain('se conserva la actual');
      expect(q('.selector-imagen-titulo').textContent).not.toContain('*');
    });

    it('al guardar sin elegir otra imagen conserva la actual', async () => {
      await escribir('textarea[name="descripcion"]', 'Nueva descripción');
      botonGuardar().click();
      expect(categorias.updateCategoria).toHaveBeenCalledWith('Recreativo', {
        titulo: 'Recreativo', descripcion: 'Nueva descripción', imagenId: 3 });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('la vista previa muestra la imagen actual de la categoría', () => {
      expect(q('.tarjeta-previa img').getAttribute('src')).toContain('data:image/png;base64,AAAA');
    });
  });

  describe('botones con los estilos reales de Material', () => {
    beforeEach(() => crear());

    it('Guardar: texto blanco sobre azul primario, no azul sobre azul', () => {
      const estilo = getComputedStyle(botonGuardar());
      expect(estilo.color).toBe('rgb(255, 255, 255)');
      expect(estilo.backgroundColor).toBe('rgb(0, 0, 102)');
    });

    it('Cancelar: contorno y texto azul primario sin relleno', () => {
      const estilo = getComputedStyle(q<HTMLButtonElement>('button.cancelar'));
      expect(estilo.color).toBe('rgb(0, 0, 102)');
      expect(estilo.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    });

    it('el botón X usa los estilos de Material (sin el cuadro gris nativo)', () => {
      expect(getComputedStyle(q('button.close-button')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    });
  });

  it('Cancelar cierra el diálogo sin resultado', async () => {
    await crear();
    q<HTMLButtonElement>('button.cancelar').click();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
