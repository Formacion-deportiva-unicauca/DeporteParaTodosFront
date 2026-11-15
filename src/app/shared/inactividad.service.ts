import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, NgZone } from '@angular/core';
import { MatSnackBarRef } from '@angular/material/snack-bar';
import { EstadoSesionService } from './estado-sesion.service';
import { AVISO_PREVIO_MS, INACTIVIDAD_MS, INTERVALO_REVISION_MS, LIMITE_MOUSEMOVE_MS } from './inactividad.constantes';
import { NotificacionComponent } from './notificacion/notificacion.component';
import { NotificacionService } from './notificacion/notificacion.service';
import { SesionVencidaService } from './sesion-vencida.service';

/** Eventos que cuentan como actividad (el movimiento del ratón va aparte, limitado a una vez por segundo). */
const EVENTOS_DE_ACTIVIDAD = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
// capture: scroll no sube por el árbol, y así se detecta el de cualquier elemento; passive: nunca bloquea el desplazamiento.
const OPCIONES_DE_ESCUCHA: AddEventListenerOptions = { passive: true, capture: true };

/**
 * Cierra la sesión por inactividad. Solo funciona mientras la sesión está activa (EstadoSesionService): arranca al iniciar
 * sesión y se detiene al cerrarla o vencerse.
 *
 * No usa un temporizador largo: guarda la hora de la última actividad y la compara cada 15 s y al volver la pestaña a
 * estar visible, así el cierre también ocurre después de suspender el equipo (los temporizadores se pausan, la hora no).
 * Los listeners y el intervalo corren fuera de NgZone: no disparan detección de cambios; solo se entra a la zona para
 * mostrar el aviso o cerrar la sesión.
 */
@Injectable({ providedIn: 'root' })
export class InactividadService {
  /** Hora actual en ms. Se puede reemplazar en las pruebas para simular saltos de reloj. */
  ahora: () => number = () => Date.now();

  private activo = false;
  private ultimaActividad = 0;
  private ultimoMovimiento = 0;
  private intervalo: ReturnType<typeof setInterval> | null = null;
  private avisoPrevio: MatSnackBarRef<NotificacionComponent> | null = null;

  private readonly alHaberActividad = (): void => this.registrarActividad();

  private readonly alMoverElRaton = (): void => {
    const ahora = this.ahora();
    if (ahora - this.ultimoMovimiento < LIMITE_MOUSEMOVE_MS) return;
    this.ultimoMovimiento = ahora;
    this.registrarActividad();
  };

  private readonly alCambiarVisibilidad = (): void => {
    if (this.documento.visibilityState !== 'hidden') this.revisar();
  };

  constructor(
    private estadoSesion: EstadoSesionService,
    private notificaciones: NotificacionService,
    private sesionVencida: SesionVencidaService,
    private zona: NgZone,
    @Inject(DOCUMENT) private documento: Document,
  ) {
    this.estadoSesion.estado$.subscribe(estado => (estado === 'activa' ? this.iniciar() : this.detener()));
  }

  /** La persona pulsó "Seguir conectado": reinicia el contador. */
  seguirConectado(): void {
    this.ultimaActividad = this.ahora();
    this.ocultarAvisoPrevio();
  }

  private iniciar(): void {
    if (this.activo) return;
    this.activo = true;
    this.ultimaActividad = this.ahora();
    this.zona.runOutsideAngular(() => {
      EVENTOS_DE_ACTIVIDAD.forEach(evento => this.documento.addEventListener(evento, this.alHaberActividad, OPCIONES_DE_ESCUCHA));
      this.documento.addEventListener('mousemove', this.alMoverElRaton, OPCIONES_DE_ESCUCHA);
      this.documento.addEventListener('visibilitychange', this.alCambiarVisibilidad);
      this.intervalo = setInterval(() => this.revisar(), INTERVALO_REVISION_MS);
    });
  }

  private detener(): void {
    if (!this.activo) return;
    this.activo = false;
    EVENTOS_DE_ACTIVIDAD.forEach(evento => this.documento.removeEventListener(evento, this.alHaberActividad, OPCIONES_DE_ESCUCHA));
    this.documento.removeEventListener('mousemove', this.alMoverElRaton, OPCIONES_DE_ESCUCHA);
    this.documento.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    if (this.intervalo !== null) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
    this.ocultarAvisoPrevio();
  }

  private registrarActividad(): void {
    this.ultimaActividad = this.ahora();
    // Quien vuelve a actuar ya no está inactivo: el aviso previo sobra.
    if (this.avisoPrevio) this.ocultarAvisoPrevio();
  }

  /** Compara la hora actual con la de la última actividad: avisa a falta de 2 minutos y cierra al cumplirse el tiempo. */
  private revisar(): void {
    if (!this.activo) return;
    const ahora = this.ahora();
    if (ahora < this.ultimaActividad) {
      // El reloj retrocedió (cambio de hora, sincronización): se parte de la hora actual.
      this.ultimaActividad = ahora;
      return;
    }
    const inactivo = ahora - this.ultimaActividad;
    if (inactivo >= INACTIVIDAD_MS) {
      this.detener();
      this.zona.run(() => this.sesionVencida.cerrarPorInactividad());
    } else if (inactivo >= INACTIVIDAD_MS - AVISO_PREVIO_MS) {
      this.mostrarAvisoPrevio();
    }
  }

  private mostrarAvisoPrevio(): void {
    if (this.avisoPrevio) return;
    this.zona.run(() => {
      const aviso = this.notificaciones.conAccion(
        'info',
        'Tu sesión se cerrará por inactividad',
        'Por seguridad, cerraremos tu sesión en menos de 2 minutos si no haces nada.',
        { texto: 'Seguir conectado', alPulsar: () => this.seguirConectado() },
      );
      this.avisoPrevio = aviso;
      // Si otro aviso lo reemplaza, se vuelve a mostrar en la siguiente revisión mientras siga inactivo.
      aviso.afterDismissed().subscribe(() => {
        if (this.avisoPrevio === aviso) this.avisoPrevio = null;
      });
    });
  }

  private ocultarAvisoPrevio(): void {
    const aviso = this.avisoPrevio;
    if (!aviso) return;
    this.avisoPrevio = null;
    this.zona.run(() => aviso.dismiss());
  }
}
