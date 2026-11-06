import { Injectable, Injector } from '@angular/core';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { NotificacionComponent, TipoNotificacion } from './notificacion.component';

/**
 * Avisos al usuario con el diseño del lineamiento UX-UI: aparecen arriba a la derecha, con icono, título y mensaje.
 * Los éxitos se anuncian con cortesía y se cierran a los 5 s; los errores se anuncian de inmediato y duran 8 s.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  // MatSnackBar se pide al mostrar (no al crear el servicio): así los componentes que inyectan este servicio no
  // necesitan importar MatSnackBarModule hasta que realmente muestran un aviso.
  constructor(private injector: Injector) {}

  /** `duracionMs` (opcional) alarga o acorta el tiempo en pantalla; por defecto 5 s (éxito e información) y 8 s (error). */
  exito(titulo: string, mensaje?: string, duracionMs?: number): MatSnackBarRef<NotificacionComponent> {
    return this.mostrar('exito', titulo, mensaje, duracionMs);
  }

  error(titulo: string, mensaje?: string, duracionMs?: number): MatSnackBarRef<NotificacionComponent> {
    return this.mostrar('error', titulo, mensaje, duracionMs);
  }

  info(titulo: string, mensaje?: string, duracionMs?: number): MatSnackBarRef<NotificacionComponent> {
    return this.mostrar('info', titulo, mensaje, duracionMs);
  }

  private mostrar(tipo: TipoNotificacion, titulo: string, mensaje?: string, duracionMs?: number): MatSnackBarRef<NotificacionComponent> {
    return this.injector.get(MatSnackBar).openFromComponent(NotificacionComponent, {
      data: { tipo, titulo, mensaje },
      duration: duracionMs ?? (tipo === 'error' ? 8000 : 5000),
      politeness: tipo === 'error' ? 'assertive' : 'polite',
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['notificacion-panel', `notificacion-panel--${tipo}`],
    });
  }
}
