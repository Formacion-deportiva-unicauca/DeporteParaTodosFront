import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { EstadoSesionService } from './estado-sesion.service';
import { NotificacionService } from './notificacion/notificacion.service';
import { PerfilService } from '../services/perfil.service';
import { vigenciaDelToken } from './token-sesion';

export const AVISO_SESION_VENCIDA = { titulo: 'Tu sesión venció', mensaje: 'Inicia sesión de nuevo.' } as const;

export const AVISO_INACTIVIDAD = { titulo: 'Tu sesión se cerró por inactividad', mensaje: 'Inicia sesión de nuevo.' } as const;

/** Claves de sessionStorage que forman la sesión de la aplicación (no toca la sesión de Google). */
const CLAVES_SESION = ['dpt_token', 'dpt_role', 'dpt_perfil_id', 'dpt_perfil', 'dpt_bienvenida'];

/**
 * Qué hacer cuando la sesión de la aplicación (dpt_token) venció: limpiarla, avisar una sola vez y llevar al login.
 * No cierra la sesión de Google ni cambia su renovación: solo la sesión propia de la aplicación.
 */
@Injectable({ providedIn: 'root' })
export class SesionVencidaService {
  /** Ya se avisó en esta sesión; se reinicia con un nuevo inicio de sesión. */
  private avisado = false;

  constructor(
    private router: Router,
    private notificaciones: NotificacionService,
    private perfilService: PerfilService,
    private estadoSesion: EstadoSesionService,
    private location: Location,
  ) {
    this.estadoSesion.estado$.subscribe(estado => {
      if (estado === 'activa') this.avisado = false;
    });
  }

  /**
   * Una petición hecha con `tokenUsado` respondió 401. Solo se actúa si ese token sigue siendo el de la sesión actual
   * (si ya se limpió, o si hay otro inicio de sesión, la respuesta es de una sesión anterior) y si no se avisó ya.
   */
  alRecibir401(tokenUsado: string): void {
    if (sessionStorage.getItem('dpt_token') !== tokenUsado || this.avisado) return;
    this.avisado = true;
    this.limpiarSesion();
    this.estadoSesion.visitante();
    this.avisarDespues(true);
  }

  /**
   * La sesión se cerró por inactividad (lo decide InactividadService): misma limpieza que al vencerse y el mismo control de
   * "un solo aviso", así no pueden salir a la vez el aviso de sesión vencida y el de inactividad.
   */
  cerrarPorInactividad(): void {
    if (this.avisado) return;
    this.avisado = true;
    this.limpiarSesion();
    this.estadoSesion.visitante();
    this.avisarDespues(true, AVISO_INACTIVIDAD);
  }

  /**
   * Al arrancar: si hay un dpt_token vencido, ilegible o a punto de vencer, se descarta, se arranca como visitante y se
   * avisa una vez. Además lleva al login, igual que en el caso del 401, salvo que:
   * - Google acabe de redirigir (id_token en la URL): ahí la sesión sigue "resolviéndose" y no se debe interrumpir.
   * - ya se esté en la ruta de login.
   * Sin token (un visitante) no hace nada.
   */
  revisarAlArrancar(): void {
    const token = sessionStorage.getItem('dpt_token');
    if (!token || vigenciaDelToken(token) === 'vigente') return;
    this.avisado = true;
    this.limpiarSesion();
    const irAlLogin = this.estadoSesion.actual !== 'resolviendo' && !this.estaEnLogin();
    this.avisarDespues(irAlLogin);
  }

  /** Al arrancar el router aún no resolvió la primera navegación: se mira la URL del navegador. */
  private estaEnLogin(): boolean {
    const ruta = this.location.path();
    return ruta === '/login' || ruta.startsWith('/login?') || ruta.startsWith('/login#');
  }

  private limpiarSesion(): void {
    try {
      CLAVES_SESION.forEach(clave => sessionStorage.removeItem(clave));
    } catch {
      // Sin acceso al almacenamiento no hay nada que limpiar.
    }
    this.perfilService.setPerfil('');
  }

  /**
   * El aviso y la navegación salen en el turno siguiente: la pantalla que hizo la petición muestra primero su propio
   * error de carga y, si el aviso saliera antes, ese error lo taparía (solo se ve un aviso a la vez).
   */
  private avisarDespues(irAlLogin: boolean, aviso: { titulo: string; mensaje: string } = AVISO_SESION_VENCIDA): void {
    setTimeout(() => {
      this.notificaciones.error(aviso.titulo, aviso.mensaje);
      if (irAlLogin) void this.router.navigate(['/login']);
    });
  }
}
