import { Injectable } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { Observable, from, filter, take } from 'rxjs';
import { TokenInterchangeService } from './token-interchange.service';
import { PerfilService } from './perfil.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(
    private oauthService: OAuthService,
    private tokenInterchangeService: TokenInterchangeService,
    private perfilService: PerfilService,
  ) {
    this.initLogin();
  }

  initLogin() {
    const config: AuthConfig = {
      issuer: 'https://accounts.google.com',
      strictDiscoveryDocumentValidation: false,
      clientId: '744420107810-h8mprfrme2cav6226hdl960gl40qaebp.apps.googleusercontent.com',
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
        this.tokenInterchangeService.exchangeGoogleToken(idToken).subscribe({
          error: err => console.error('Error en intercambio de token con el backend:', err),
        });
      }
    });

    this.oauthService.loadDiscoveryDocumentAndTryLogin()
      .then(() => {
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
      })
      .catch(err => console.error('Error al iniciar la sesión de OAuth:', err));
  }

  login() {
    this.oauthService.initLoginFlow();
  }

  logout() {
    void this.oauthService.logOut();
    sessionStorage.removeItem('dpt_token');
    sessionStorage.removeItem('dpt_role');
    sessionStorage.removeItem('dpt_perfil_id');
    sessionStorage.removeItem('dpt_perfil');
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


