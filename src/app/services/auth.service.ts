import { Injectable } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { Observable, from, filter, take } from 'rxjs';
import { TokenInterchangeService } from './token-interchange.service';
import { PerfilService } from './perfil.service';
import { EstadoSesionService } from '../shared/estado-sesion.service';
import { NotificacionService } from '../shared/notificacion/notificacion.service';
import { SesionVencidaService } from '../shared/sesion-vencida.service';
import { environment } from '../../environments/environment';

/** Marca de que ya se dio la bienvenida en esta sesión del navegador: el aviso de éxito sale una sola vez. */
const CLAVE_BIENVENIDA = 'dpt_bienvenida';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Carga del documento de descubrimiento de Google (siempre se resuelve, aunque falle).
  private descubrimiento: Promise<void> = Promise.resolve();
  private descubrimientoCargado = false;
  // Evita lanzar varios flujos de OAuth a la vez (se pisarían el state/nonce y el login fallaría).
  private loginEnCurso = false;
  // El intercambio con /auth/token ya empezó: hasta que termine, la sesión sigue "resolviéndose".
  private intercambioEnCurso = false;

  constructor(
    private oauthService: OAuthService,
    private tokenInterchangeService: TokenInterchangeService,
    private perfilService: PerfilService,
    private estadoSesion: EstadoSesionService,
    private notificaciones: NotificacionService,
    private sesionVencida: SesionVencidaService,
  ) {
    // Antes de arrancar el login: si quedó un dpt_token vencido en la pestaña, se descarta y se avisa una vez.
    this.sesionVencida.revisarAlArrancar();
    this.initLogin();
  }

  initLogin() {
    const config: AuthConfig = {
      issuer: 'https://accounts.google.com',
      strictDiscoveryDocumentValidation: false,
      clientId: environment.googleClientId,
      redirectUri: window.location.origin + '/home',
      scope: 'openid profile email',
      customQueryParams: { prompt: 'select_account' },
    }

    this.oauthService.configure(config);
    this.oauthService.setupAutomaticSilentRefresh();

    // Intercambio de token con el backend inmediatamente después del login de Google.
    // token_received se emite solo cuando hay un login real (o silent refresh),
    // nunca en cargas de página sin sesión activa.
    // take(1): el intercambio se hace una vez por sesión; cuando SCRUM-159 requiera
    // manejar renovaciones del dpt_token, se quitará el take(1) y se filtrará
    // también por token_refreshed.
    this.oauthService.events.pipe(
      filter(e => e.type === 'token_received'),
      take(1),
    ).subscribe(() => {
      const idToken = this.oauthService.getIdToken();
      if (idToken) {
        this.intercambioEnCurso = true;
        this.tokenInterchangeService.exchangeGoogleToken(idToken).subscribe({
          next: () => this.avisarSesionIniciada(),
          error: err => {
            console.error('Error en intercambio de token con el backend:', err);
            this.intercambioEnCurso = false;
            this.estadoSesion.visitante();
            this.notificaciones.error(
              'No se pudo iniciar la sesión',
              'No pudimos validar tu cuenta con el servidor. Intenta ingresar de nuevo.',
            );
          },
          // Termina sin sesión cuando el usuario no existe (404): el servicio lo envía a completar su perfil.
          complete: () => {
            this.intercambioEnCurso = false;
            if (this.estadoSesion.actual === 'resolviendo') {
              this.estadoSesion.visitante();
            }
          },
        });
      }
    });

    this.descubrimiento = this.oauthService.loadDiscoveryDocumentAndTryLogin()
      .then(() => {
        this.descubrimientoCargado = true;
        const claims: any = this.oauthService.getIdentityClaims();
        if (claims) {
          console.log('Usuario autenticado:', claims);
        } else {
          console.log('No hay usuario autenticado');
        }
        const role = sessionStorage.getItem('dpt_role');
        if (role) {
          this.perfilService.setPerfil(role);
        }
        this.cerrarResolucionSinIntercambio();
      })
      .catch(err => {
        console.error('Error al iniciar la sesión de OAuth:', err);
        this.cerrarResolucionSinIntercambio();
      });
  }

  /** Si Google no devolvió un login válido y no hay intercambio en marcha, no hay nada que esperar: es un visitante. */
  private cerrarResolucionSinIntercambio(): void {
    if (this.estadoSesion.actual === 'resolviendo' && !this.intercambioEnCurso) {
      this.estadoSesion.visitante();
    }
  }

  /** Aviso breve de inicio de sesión; solo una vez por sesión del navegador. */
  private avisarSesionIniciada(): void {
    try {
      if (sessionStorage.getItem(CLAVE_BIENVENIDA)) return;
      sessionStorage.setItem(CLAVE_BIENVENIDA, '1');
    } catch {
      // Sin almacenamiento no se puede recordar: se avisa igualmente.
    }
    this.notificaciones.exito('Sesión iniciada', 'Bienvenido/a a Deporte para Todos.', 3500);
  }

  /**
   * Inicia el login con Google. Espera a que cargue el documento de descubrimiento (si falló, lo reintenta) y
   * garantiza un único flujo: la librería encola un flujo por cada llamada hecha antes de esa carga y no los cancela.
   * Rechaza si no se pudo contactar con Google; entonces se puede volver a intentar.
   */
  async login(): Promise<void> {
    if (this.loginEnCurso) {
      return;
    }
    this.loginEnCurso = true;
    try {
      await this.descubrimiento;
      if (!this.descubrimientoCargado) {
        await this.oauthService.loadDiscoveryDocument();
        this.descubrimientoCargado = true;
      }
      this.oauthService.initLoginFlow();
    } catch (err) {
      this.loginEnCurso = false;
      throw err;
    }
  }

  /** Permite iniciar otro flujo, p. ej. cuando el usuario vuelve con "atrás" desde la página de Google. */
  reiniciarLogin(): void {
    this.loginEnCurso = false;
  }

  logout() {
    void this.oauthService.logOut();
    sessionStorage.removeItem('dpt_token');
    sessionStorage.removeItem('dpt_role');
    sessionStorage.removeItem('dpt_perfil_id');
    sessionStorage.removeItem('dpt_perfil');
    sessionStorage.removeItem(CLAVE_BIENVENIDA);
    this.estadoSesion.visitante();
  }

  getProfile() {
    return this.oauthService.getIdentityClaims();
  }

  isAuthenticated(): boolean {
    return this.oauthService.hasValidAccessToken() && this.oauthService.hasValidIdToken();
  }

  getUserProfile(): Observable<any> {
    return from(this.oauthService.loadUserProfile());
  }
}


