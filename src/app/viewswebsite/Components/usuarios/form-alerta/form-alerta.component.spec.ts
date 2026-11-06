import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { FormAlertaComponent } from './form-alerta.component';
import { AlertaServiceService } from 'src/app/services/alerta-service.service';

describe('FormAlertaComponent (nueva notificación)', () => {
  let fixture: ComponentFixture<FormAlertaComponent>;
  let alertas: jasmine.SpyObj<AlertaServiceService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<FormAlertaComponent>>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(s: string): T => el().querySelector(s) as T;
  const guardar = () => q<HTMLButtonElement>('button.aceptar');

  beforeEach(async () => {
    alertas = jasmine.createSpyObj('AlertaServiceService', ['guardarAlerta']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [FormAlertaComponent, NoopAnimationsModule],
      providers: [
        { provide: AlertaServiceService, useValue: alertas },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FormAlertaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  async function escribir(selector: string, valor: string): Promise<void> {
    const campo = q<HTMLInputElement | HTMLTextAreaElement>(selector);
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function llenar(): Promise<void> {
    await escribir('input[name="titulo"]', 'Cambio de horario');
    await escribir('textarea[name="descripcion"]', 'La clase del martes pasa a las 6 p. m.');
  }

  describe('cabecera', () => {
    it('lleva etiqueta superior, título h2 de diálogo y subtítulo', () => {
      expect(q('.dlg-eyebrow').textContent?.trim()).toBe('Notificaciones');
      expect(q('h2[mat-dialog-title].dlg-titulo').textContent?.trim()).toBe('Nueva notificación');
      expect(q('.dlg-subtitulo').textContent).toContain('Escriba');
    });

    it('el botón X está en la cabecera y tiene nombre accesible', () => {
      expect(q('.dlg-cabecera button.close-button').getAttribute('aria-label')).toBe('Cerrar diálogo');
    });

    it('avisa que los campos con * son obligatorios', () => {
      expect(q('.dlg-aviso').textContent).toContain('Los campos marcados con * son obligatorios');
    });
  });

  describe('validación', () => {
    it('con el formulario vacío no guarda y explica qué falta', async () => {
      guardar().click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(alertas.guardarAlerta).not.toHaveBeenCalled();
      const errores = Array.from(el().querySelectorAll('mat-error')).map(e => e.textContent?.trim());
      expect(errores).toContain('El asunto es obligatorio');
      expect(errores).toContain('El mensaje es obligatorio');
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('contadores', () => {
    it('el asunto admite 100 caracteres y el mensaje 500, con contador', async () => {
      expect(q('input[name="titulo"]').getAttribute('maxlength')).toBe('100');
      expect(q('textarea[name="descripcion"]').getAttribute('maxlength')).toBe('500');
      expect(el().textContent).toContain('0/100');
      expect(el().textContent).toContain('0/500');
      await escribir('input[name="titulo"]', 'Cambio de horario');
      expect(el().textContent).toContain('17/100');
    });
  });

  describe('vista previa en vivo', () => {
    it('antes de escribir muestra textos de ejemplo', () => {
      const previa = q('.notificacion-previa');
      expect(previa.querySelector('h3')?.textContent).toContain('Asunto de la notificación');
      expect(previa.textContent).toContain('aparecerá en este espacio');
    });

    it('refleja lo que el usuario escribe', async () => {
      await llenar();
      const previa = q('.notificacion-previa');
      expect(previa.querySelector('h3')?.textContent).toContain('Cambio de horario');
      expect(previa.textContent).toContain('pasa a las 6 p. m.');
    });

    it('es una región con nombre para lectores de pantalla', () => {
      expect(q('.notificacion-previa-region').getAttribute('aria-label')).toBe('Vista previa de la notificación');
    });
  });

  describe('guardado', () => {
    it('guarda asunto y mensaje, y cierra el diálogo', async () => {
      await llenar();
      guardar().click();
      expect(alertas.guardarAlerta).toHaveBeenCalledWith({
        asunto: 'Cambio de horario', descripcion: 'La clase del martes pasa a las 6 p. m.' });
      expect(dialogRef.close).toHaveBeenCalled();
    });

    it('Cancelar cierra sin guardar', () => {
      q<HTMLButtonElement>('button.cancelar').click();
      expect(dialogRef.close).toHaveBeenCalled();
      expect(alertas.guardarAlerta).not.toHaveBeenCalled();
    });
  });

  describe('botones con los estilos reales de Material', () => {
    it('Crear: texto blanco sobre azul primario; Cancelar: contorno azul sin relleno', () => {
      expect(getComputedStyle(guardar()).color).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(guardar()).backgroundColor).toBe('rgb(0, 0, 102)');
      expect(getComputedStyle(q('button.cancelar')).color).toBe('rgb(0, 0, 102)');
      expect(guardar().textContent).toContain('Crear notificación');
    });
  });
});
