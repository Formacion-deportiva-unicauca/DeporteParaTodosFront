import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar, MatSnackBarModule, MatSnackBarRef } from '@angular/material/snack-bar';
import { NotificacionService } from './notificacion.service';
import { NotificacionComponent } from './notificacion.component';

/** La notificación se prueba abierta de verdad (con el contenedor de Material), porque su aspecto depende de él. */
describe('NotificacionComponent (diseño y accesibilidad)', () => {
  let servicio: NotificacionService;
  let referencia: MatSnackBarRef<NotificacionComponent>;

  /** El contenido de la notificación se dibuja en la siguiente detección de cambios. */
  const detectar = () => TestBed.inject(ApplicationRef).tick();
  const panel = () => document.querySelector('.cdk-overlay-container .notificacion') as HTMLElement;
  const q = <T extends HTMLElement>(s: string): T => panel().querySelector(s) as T;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NoopAnimationsModule, MatSnackBarModule] });
    servicio = TestBed.inject(NotificacionService);
  });

  afterEach(() => {
    TestBed.inject(MatSnackBar).dismiss();
    document.querySelector('.cdk-overlay-container')?.replaceChildren();
  });

  describe('contenido', () => {
    it('muestra título y mensaje', () => {
      referencia = servicio.exito('Categoría creada', 'Ya aparece en el panel de coordinación.');
      detectar();
      expect(q('.notificacion-titulo').textContent?.trim()).toBe('Categoría creada');
      expect(q('.notificacion-mensaje').textContent).toContain('Ya aparece en el panel');
    });

    it('sin mensaje solo muestra el título', () => {
      referencia = servicio.exito('Listo');
      detectar();
      expect(panel().querySelector('.notificacion-mensaje')).toBeNull();
    });

    it('cada tipo lleva su icono, decorativo para lectores de pantalla (el significado va en el texto)', () => {
      for (const [tipo, icono] of [['exito', 'check_circle'], ['error', 'error_outline'], ['info', 'info']] as const) {
        servicio[tipo](`Título ${tipo}`);
        detectar();
        const mat = q('.notificacion-icono mat-icon');
        expect(mat.textContent?.trim()).toBe(icono);
        expect(q('.notificacion-icono').getAttribute('aria-hidden')).toBe('true');
        TestBed.inject(MatSnackBar).dismiss();
        document.querySelector('.cdk-overlay-container')?.replaceChildren();
      }
    });

    it('el botón de cerrar tiene nombre accesible y descarta la notificación', () => {
      referencia = servicio.exito('Listo');
      detectar();
      const cerrar = q<HTMLButtonElement>('button.notificacion-cerrar');
      expect(cerrar.getAttribute('aria-label')).toBe('Cerrar notificación');
      const descartar = spyOn(referencia, 'dismiss').and.callThrough();
      cerrar.click();
      expect(descartar).toHaveBeenCalled();
    });
  });

  describe('aviso con acción', () => {
    let pulsado: jasmine.Spy;

    beforeEach(() => {
      pulsado = jasmine.createSpy('alPulsar');
      referencia = servicio.conAccion('info', 'Tu sesión se cerrará por inactividad', 'En menos de 2 minutos.',
        { texto: 'Seguir conectado', alPulsar: pulsado });
      detectar();
    });

    it('muestra el botón con su texto y no la "x" de cerrar (se resuelve con el botón)', () => {
      expect(q<HTMLButtonElement>('button.notificacion-accion').textContent?.trim()).toBe('Seguir conectado');
      expect(panel().querySelector('button.notificacion-cerrar')).toBeNull();
    });

    it('al pulsar el botón ejecuta la acción y cierra el aviso', () => {
      const descartar = spyOn(referencia, 'dismiss').and.callThrough();
      q<HTMLButtonElement>('button.notificacion-accion').click();
      expect(pulsado).toHaveBeenCalledTimes(1);
      expect(descartar).toHaveBeenCalled();
    });

    it('el botón es una píldora de 44px de alto, en mayúsculas, con el color primario', () => {
      const estilo = getComputedStyle(q<HTMLButtonElement>('button.notificacion-accion'));
      expect(parseFloat(estilo.minHeight)).toBeGreaterThanOrEqual(44);
      expect(estilo.textTransform).toBe('uppercase');
      expect(parseFloat(estilo.borderRadius)).toBeGreaterThanOrEqual(22);
    });

    it('los avisos sin acción no llevan botón de acción y conservan la "x"', () => {
      referencia.dismiss();
      document.querySelector('.cdk-overlay-container')?.replaceChildren(); // el cierre anima: se quita el aviso anterior
      referencia = servicio.exito('Listo');
      detectar();
      expect(panel().querySelector('button.notificacion-accion')).toBeNull();
      expect(panel().querySelector('button.notificacion-cerrar')).not.toBeNull();
    });
  });

  describe('estilos según el lineamiento UX-UI', () => {
    it('es una tarjeta blanca con radio de 4px (Snackbars: forma "extra pequeño")', () => {
      referencia = servicio.exito('Listo');
      detectar();
      const superficie = document.querySelector('.notificacion-panel .mdc-snackbar__surface') as HTMLElement;
      const estilo = getComputedStyle(superficie);
      expect(estilo.backgroundColor).toBe('rgb(255, 255, 255)');
      expect(estilo.borderTopLeftRadius).toBe('4px');
    });

    it('éxito: borde e icono en el verde de accesibilidad (#249300)', () => {
      servicio.exito('Listo');
      detectar();
      expect(getComputedStyle(panel()).borderLeftColor).toBe('rgb(36, 147, 0)');
      expect(getComputedStyle(q('.notificacion-icono mat-icon')).color).toBe('rgb(36, 147, 0)');
    });

    it('error: borde en el naranja de error (#ED7D31), icono y fondo del icono del rol Error; nunca rojo', () => {
      servicio.error('No se pudo');
      detectar();
      expect(getComputedStyle(panel()).borderLeftColor).toBe('rgb(237, 125, 49)');
      expect(getComputedStyle(q('.notificacion-icono mat-icon')).color).toBe('rgb(154, 65, 0)');
      expect(getComputedStyle(q('.notificacion-icono')).backgroundColor).toBe('rgb(255, 219, 202)');
    });

    it('se aprecia: borde grueso de 8px, fondo tintado según el tipo y título de 18px', () => {
      servicio.exito('Listo', 'Todo bien');
      detectar();
      expect(getComputedStyle(panel()).borderLeftWidth).toBe('8px');
      expect(getComputedStyle(panel()).backgroundColor).toBe('rgb(241, 250, 238)');
      expect(getComputedStyle(q('.notificacion-titulo')).fontSize).toBe('18px');
    });

    it('info: borde en el color terciario (#1D72D3)', () => {
      servicio.info('Dato');
      detectar();
      expect(getComputedStyle(panel()).borderLeftColor).toBe('rgb(29, 114, 211)');
    });

    it('el título usa Titillium Web en azul primario y el mensaje Open Sans de al menos 14px', () => {
      servicio.exito('Listo', 'Mensaje');
      detectar();
      const titulo = getComputedStyle(q('.notificacion-titulo'));
      expect(titulo.fontFamily.toLowerCase()).toContain('titillium web');
      expect(titulo.color).toBe('rgb(0, 0, 102)');
      const mensaje = getComputedStyle(q('.notificacion-mensaje'));
      expect(mensaje.fontFamily.toLowerCase()).toContain('open sans');
      expect(parseFloat(mensaje.fontSize)).toBeGreaterThanOrEqual(14);
      expect(mensaje.color).toBe('rgb(69, 68, 68)');
    });

    it('queda debajo de la barra superior (64px) para no tapar el menú de usuario', () => {
      servicio.exito('Listo');
      detectar();
      const contenedor = document.querySelector('.notificacion-panel') as HTMLElement;
      expect(parseFloat(getComputedStyle(contenedor).marginTop)).toBeGreaterThanOrEqual(64);
    });

    it('el botón de cerrar mide al menos 44px (objetivo táctil)', () => {
      servicio.exito('Listo');
      detectar();
      const cerrar = getComputedStyle(q('button.notificacion-cerrar'));
      expect(parseFloat(cerrar.width)).toBeGreaterThanOrEqual(44);
      expect(parseFloat(cerrar.height)).toBeGreaterThanOrEqual(44);
    });
  });
});
