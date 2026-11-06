import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DialogRef } from '@angular/cdk/dialog';
import { VerNotificacionesComponent } from './ver-notificaciones.component';
import { AlertaServiceService } from 'src/app/services/alerta-service.service';
import { AlertaDTO } from 'src/app/Models/DTOs/alerta-dto';

describe('VerNotificacionesComponent', () => {
  let fixture: ComponentFixture<VerNotificacionesComponent>;
  let dialogRef: jasmine.SpyObj<DialogRef<VerNotificacionesComponent>>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(s: string): T => el().querySelector(s) as T;

  async function montar(alertas: AlertaDTO[]): Promise<void> {
    dialogRef = jasmine.createSpyObj('DialogRef', ['close']);
    const servicio = jasmine.createSpyObj('AlertaServiceService', ['retornarAlerta']);
    servicio.retornarAlerta.and.returnValue(alertas);
    await TestBed.configureTestingModule({
      imports: [VerNotificacionesComponent, NoopAnimationsModule],
      providers: [
        { provide: DialogRef, useValue: dialogRef },
        { provide: AlertaServiceService, useValue: servicio },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(VerNotificacionesComponent);
    fixture.detectChanges();
  }

  describe('con notificaciones', () => {
    beforeEach(() => montar([
      { asunto: 'Cambio de horario', descripcion: 'La clase del martes pasa a las 6 p. m.' } as AlertaDTO,
      { asunto: 'Torneo', descripcion: 'Inscripciones abiertas' } as AlertaDTO,
    ]));

    it('la cabecera lleva etiqueta, título h2 de diálogo y el conteo de notificaciones', () => {
      expect(q('.dlg-eyebrow').textContent?.trim()).toBe('Centro de mensajes');
      expect(q('h2[mat-dialog-title].dlg-titulo').textContent?.trim()).toBe('Notificaciones');
      expect(q('.dlg-subtitulo').textContent).toContain('2 notificaciones');
    });

    it('con una sola notificación el conteo va en singular', async () => {
      TestBed.resetTestingModule();
      await montar([{ asunto: 'Torneo', descripcion: 'Abiertas' } as AlertaDTO]);
      expect(q('.dlg-subtitulo').textContent).toContain('1 notificación');
      expect(q('.dlg-subtitulo').textContent).not.toContain('1 notificaciones');
    });

    it('lista cada notificación como tarjeta con icono, asunto y descripción', () => {
      const items = Array.from(el().querySelectorAll('.lista-notificaciones li'));
      expect(items.length).toBe(2);
      expect(items[0].querySelector('.icono-notificacion mat-icon')?.getAttribute('aria-hidden')).toBe('true');
      expect(items[0].querySelector('h3')?.textContent).toContain('Cambio de horario');
      expect(items[0].querySelector('p')?.textContent).toContain('pasa a las 6 p. m.');
    });

    it('no muestra el estado vacío', () => {
      expect(el().querySelector('.sin-notificaciones')).toBeNull();
    });

    it('el botón X (en la cabecera) y el botón Cerrar cierran el diálogo', () => {
      expect(q('.dlg-cabecera button.close-button').getAttribute('aria-label')).toBe('Cerrar diálogo');
      q<HTMLButtonElement>('button.close-button').click();
      q<HTMLButtonElement>('button.aceptar').click();
      expect(dialogRef.close).toHaveBeenCalledTimes(2);
    });
  });

  describe('sin notificaciones', () => {
    beforeEach(() => montar([]));

    it('muestra un estado vacío amable con icono, mensaje y explicación', () => {
      const vacio = q('.sin-notificaciones');
      expect(vacio.querySelector('mat-icon')?.getAttribute('aria-hidden')).toBe('true');
      expect(vacio.textContent).toContain('No tienes notificaciones por ahora');
      expect(vacio.textContent).toContain('aparecerán aquí');
      expect(el().querySelector('.lista-notificaciones')).toBeNull();
    });

    it('el subtítulo dice que está al día', () => {
      expect(q('.dlg-subtitulo').textContent).toContain('al día');
    });
  });
});
