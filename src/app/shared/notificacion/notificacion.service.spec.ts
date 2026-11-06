import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificacionComponent } from './notificacion.component';
import { NotificacionService } from './notificacion.service';

describe('NotificacionService', () => {
  let servicio: NotificacionService;
  let snack: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    snack = jasmine.createSpyObj('MatSnackBar', ['openFromComponent']);
    TestBed.configureTestingModule({ providers: [{ provide: MatSnackBar, useValue: snack }] });
    servicio = TestBed.inject(NotificacionService);
  });

  const config = () => snack.openFromComponent.calls.mostRecent().args[1] as any;

  it('exito() abre la notificación con tipo "exito", título y mensaje', () => {
    servicio.exito('Categoría creada', 'Ya aparece en el panel.');
    expect(snack.openFromComponent).toHaveBeenCalledWith(NotificacionComponent, jasmine.anything());
    expect(config().data).toEqual({ tipo: 'exito', titulo: 'Categoría creada', mensaje: 'Ya aparece en el panel.' });
  });

  it('aparece arriba a la derecha, con la clase del panel y una clase por tipo', () => {
    servicio.exito('Listo');
    expect(config().verticalPosition).toBe('top');
    expect(config().horizontalPosition).toBe('end');
    expect(config().panelClass).toEqual(['notificacion-panel', 'notificacion-panel--exito']);
  });

  it('un éxito se anuncia con cortesía (polite) y se cierra solo a los 5 segundos', () => {
    servicio.exito('Listo');
    expect(config().politeness).toBe('polite');
    expect(config().duration).toBe(5000);
  });

  it('la duración se puede alargar para los resultados que la persona vino a ver (por ejemplo, una inscripción)', () => {
    servicio.exito('Inscripción exitosa', 'Tu cupo está confirmado.', 8000);
    expect(config().duration).toBe(8000);
    servicio.info('Quedaste en lista de espera', undefined, 7000);
    expect(config().duration).toBe(7000);
    servicio.error('No se pudo', undefined, 12000);
    expect(config().duration).toBe(12000);
  });

  it('un error se anuncia de inmediato (assertive) y dura más, 8 segundos, para poder leerlo', () => {
    servicio.error('No se pudo guardar', 'Intente de nuevo.');
    expect(config().data.tipo).toBe('error');
    expect(config().politeness).toBe('assertive');
    expect(config().duration).toBe(8000);
    expect(config().panelClass).toContain('notificacion-panel--error');
  });

  it('info() usa el tipo "info"', () => {
    servicio.info('Dato');
    expect(config().data.tipo).toBe('info');
    expect(config().politeness).toBe('polite');
  });

  it('el mensaje es opcional', () => {
    servicio.exito('Solo título');
    expect(config().data.mensaje).toBeUndefined();
  });
});
