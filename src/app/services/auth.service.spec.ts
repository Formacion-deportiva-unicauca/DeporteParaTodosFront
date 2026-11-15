import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EMPTY, Subject, of, throwError } from 'rxjs';
import { EstadoSesionService } from '../shared/estado-sesion.service';
import { crearJwtQueVenceEn } from '../testing/jwt-prueba';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { NotificacionService } from '../shared/notificacion/notificacion.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { TokenInterchangeService } from './token-interchange.service';
import { PerfilService } from './perfil.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let oauthSpy: any;
  let tokenSpy: jasmine.SpyObj<TokenInterchangeService>;
  let perfilSpy: jasmine.SpyObj<PerfilService>;
  let eventsSubject: Subject<any>;
  let avisos: jasmine.SpyObj<NotificacionService>;
  let estado: EstadoSesionService;

  beforeEach(() => {
    eventsSubject = new Subject<any>();

    // OAuthService se mockea como objeto plano para poder controlar
    // 'events' como Subject y evitar llamadas reales a Google OIDC.
    oauthSpy = {
      configure: jasmine.createSpy('configure'),
      setupAutomaticSilentRefresh: jasmine.createSpy('setupAutomaticSilentRefresh'),
      events: eventsSubject.asObservable(),
      loadDiscoveryDocumentAndTryLogin: jasmine.createSpy('loadDiscoveryDocumentAndTryLogin')
        .and.returnValue(Promise.resolve()),
      getIdentityClaims: jasmine.createSpy('getIdentityClaims').and.returnValue(null),
      getIdToken: jasmine.createSpy('getIdToken').and.returnValue(null),
      logOut: jasmine.createSpy('logOut'),
      initLoginFlow: jasmine.createSpy('initLoginFlow'),
      hasValidAccessToken: jasmine.createSpy('hasValidAccessToken').and.returnValue(false),
      hasValidIdToken: jasmine.createSpy('hasValidIdToken').and.returnValue(false),
      loadUserProfile: jasmine.createSpy('loadUserProfile').and.returnValue(Promise.resolve({})),
    };

    tokenSpy = jasmine.createSpyObj('TokenInterchangeService', ['exchangeGoogleToken']);
    tokenSpy.exchangeGoogleToken.and.returnValue(of(void 0));

    perfilSpy = jasmine.createSpyObj('PerfilService', ['setPerfil']);
    avisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: OAuthService, useValue: oauthSpy },
        { provide: TokenInterchangeService, useValue: tokenSpy },
        { provide: PerfilService, useValue: perfilSpy },
        { provide: NotificacionService, useValue: avisos },
      ],
    });
    estado = TestBed.inject(EstadoSesionService);
    service = TestBed.inject(AuthService);
    sessionStorage.removeItem('dpt_token');
    sessionStorage.removeItem('dpt_role');
  });

  afterEach(() => {
    sessionStorage.removeItem('dpt_token');
    sessionStorage.removeItem('dpt_role');
    eventsSubject.complete();
  });

  // ── Creación e initLogin ─────────────────────────────────────────────────

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('initLogin() configura OAuthService con el issuer de Google y los scopes correctos', () => {
    expect(oauthSpy.configure).toHaveBeenCalledTimes(1);
    const config = oauthSpy.configure.calls.mostRecent().args[0];
    expect(config.issuer).toBe('https://accounts.google.com');
    expect(config.scope).toBe('openid profile email');
  });

  it('initLogin() llama a setupAutomaticSilentRefresh y loadDiscoveryDocumentAndTryLogin', () => {
    expect(oauthSpy.setupAutomaticSilentRefresh).toHaveBeenCalledTimes(1);
    expect(oauthSpy.loadDiscoveryDocumentAndTryLogin).toHaveBeenCalledTimes(1);
  });

  it('initLogin() then(): no escribe en consola los datos del usuario (claims) aunque haya sesión', fakeAsync(() => {
    const claims = { name: 'Ana', email: 'ana@u.co' };
    oauthSpy.getIdentityClaims.and.returnValue(claims);
    spyOn(console, 'log');
    // Reiniciar el servicio dentro de fakeAsync para poder hacer tick()
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: OAuthService, useValue: oauthSpy },
        { provide: TokenInterchangeService, useValue: tokenSpy },
        { provide: PerfilService, useValue: perfilSpy },
      ],
    });
    TestBed.inject(AuthService);
    tick(); // flush Promise.resolve() del loadDiscoveryDocumentAndTryLogin
    expect(oauthSpy.getIdentityClaims).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  }));

  // ── Suscripción a token_received ─────────────────────────────────────────

  it('token_received: llama a exchangeGoogleToken con el idToken del usuario', () => {
    oauthSpy.getIdToken.and.returnValue('google-id-token-abc');
    eventsSubject.next({ type: 'token_received' });
    expect(tokenSpy.exchangeGoogleToken).toHaveBeenCalledWith('google-id-token-abc');
  });

  it('token_received: no llama a exchangeGoogleToken si idToken es null', () => {
    oauthSpy.getIdToken.and.returnValue(null);
    eventsSubject.next({ type: 'token_received' });
    expect(tokenSpy.exchangeGoogleToken).not.toHaveBeenCalled();
  });

  it('take(1): solo dispara el intercambio una vez aunque token_received se emita varias veces', () => {
    oauthSpy.getIdToken.and.returnValue('tok-xyz');
    eventsSubject.next({ type: 'token_received' });
    eventsSubject.next({ type: 'token_received' });
    eventsSubject.next({ type: 'token_received' });
    expect(tokenSpy.exchangeGoogleToken).toHaveBeenCalledTimes(1);
  });

  it('otros eventos OAuth (discovery_document_loaded, silently_refreshed) no disparan el intercambio', () => {
    eventsSubject.next({ type: 'discovery_document_loaded' });
    eventsSubject.next({ type: 'silently_refreshed' });
    eventsSubject.next({ type: 'token_expires' });
    expect(tokenSpy.exchangeGoogleToken).not.toHaveBeenCalled();
  });

  // ── logout ───────────────────────────────────────────────────────────────

  it('logout() llama a oauthService.logOut()', () => {
    service.logout();
    expect(oauthSpy.logOut).toHaveBeenCalledTimes(1);
  });

  it('logout() elimina dpt_token de sessionStorage', () => {
    sessionStorage.setItem('dpt_token', 'tok-a-b-c');
    service.logout();
    expect(sessionStorage.getItem('dpt_token')).toBeNull();
  });

  it('logout() elimina dpt_role de sessionStorage', () => {
    sessionStorage.setItem('dpt_role', 'Administrador');
    service.logout();
    expect(sessionStorage.getItem('dpt_role')).toBeNull();
  });

  it('logout() elimina dpt_perfil y dpt_perfil_id de sessionStorage', () => {
    sessionStorage.setItem('dpt_perfil', '{"id":"1","nombre":"X"}');
    sessionStorage.setItem('dpt_perfil_id', '1');
    service.logout();
    expect(sessionStorage.getItem('dpt_perfil')).toBeNull();
    expect(sessionStorage.getItem('dpt_perfil_id')).toBeNull();
  });

  // ── initLogin then(): restauración de rol ────────────────────────────────

  it('initLogin() then(): restaura rol desde dpt_role en sessionStorage si existe', fakeAsync(() => {
    sessionStorage.setItem('dpt_role', 'Instructor');
    TestBed.resetTestingModule();
    eventsSubject = new Subject<any>();
    oauthSpy.events = eventsSubject.asObservable();
    oauthSpy.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.resolve());
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: OAuthService, useValue: oauthSpy },
        { provide: TokenInterchangeService, useValue: tokenSpy },
        { provide: PerfilService, useValue: perfilSpy },
      ],
    });
    TestBed.inject(AuthService);
    tick();
    expect(perfilSpy.setPerfil).toHaveBeenCalledWith('Instructor');
  }));

  it('initLogin() then(): no llama a setPerfil si dpt_role no está en sessionStorage', fakeAsync(() => {
    sessionStorage.removeItem('dpt_role');
    TestBed.resetTestingModule();
    eventsSubject = new Subject<any>();
    oauthSpy.events = eventsSubject.asObservable();
    oauthSpy.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.resolve());
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: OAuthService, useValue: oauthSpy },
        { provide: TokenInterchangeService, useValue: tokenSpy },
        { provide: PerfilService, useValue: perfilSpy },
      ],
    });
    TestBed.inject(AuthService);
    tick();
    expect(perfilSpy.setPerfil).not.toHaveBeenCalled();
  }));

  // ── login ────────────────────────────────────────────────────────────────

  it('login() llama a oauthService.initLoginFlow()', async () => {
    await service.login();
    expect(oauthSpy.initLoginFlow).toHaveBeenCalledTimes(1);
  });

  describe('login() robusto (evita el botón "pegado" o el doble flujo de OAuth)', () => {
    function crearServicio(descubrimiento: Promise<unknown>): AuthService {
      TestBed.resetTestingModule();
      eventsSubject = new Subject<any>();
      oauthSpy.events = eventsSubject.asObservable();
      oauthSpy.initLoginFlow.calls.reset();
      oauthSpy.loadDiscoveryDocument = jasmine.createSpy('loadDiscoveryDocument').and.returnValue(Promise.resolve());
      oauthSpy.loadDiscoveryDocumentAndTryLogin.and.returnValue(descubrimiento);
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: OAuthService, useValue: oauthSpy },
          { provide: TokenInterchangeService, useValue: tokenSpy },
          { provide: PerfilService, useValue: perfilSpy },
        ],
      });
      return TestBed.inject(AuthService);
    }

    it('espera a que cargue el documento de descubrimiento antes de iniciar el flujo', fakeAsync(() => {
      let resolver!: () => void;
      const servicio = crearServicio(new Promise<void>(r => (resolver = r)));
      void servicio.login();
      tick();
      expect(oauthSpy.initLoginFlow).not.toHaveBeenCalled();
      resolver();
      tick();
      expect(oauthSpy.initLoginFlow).toHaveBeenCalledTimes(1);
    }));

    it('varios clics seguidos inician un único flujo', fakeAsync(() => {
      const servicio = crearServicio(Promise.resolve());
      void servicio.login();
      void servicio.login();
      void servicio.login();
      tick();
      expect(oauthSpy.initLoginFlow).toHaveBeenCalledTimes(1);
    }));

    it('si el documento de descubrimiento no cargó, lo reintenta antes de iniciar el flujo', fakeAsync(() => {
      spyOn(console, 'error');
      const servicio = crearServicio(Promise.reject(new Error('sin red')));
      tick();
      void servicio.login();
      tick();
      expect(oauthSpy.loadDiscoveryDocument).toHaveBeenCalledTimes(1);
      expect(oauthSpy.initLoginFlow).toHaveBeenCalledTimes(1);
    }));

    it('si el reintento también falla, login() rechaza y permite volver a intentar', fakeAsync(() => {
      spyOn(console, 'error');
      const servicio = crearServicio(Promise.reject(new Error('sin red')));
      tick();
      oauthSpy.loadDiscoveryDocument.and.returnValue(Promise.reject(new Error('sigue sin red')));
      let rechazado = false;
      servicio.login().catch(() => (rechazado = true));
      tick();
      expect(rechazado).toBeTrue();
      expect(oauthSpy.initLoginFlow).not.toHaveBeenCalled();

      oauthSpy.loadDiscoveryDocument.and.returnValue(Promise.resolve());
      void servicio.login();
      tick();
      expect(oauthSpy.initLoginFlow).toHaveBeenCalledTimes(1);
    }));

    it('reiniciarLogin() permite iniciar otro flujo (p. ej. al volver con "atrás" desde Google)', fakeAsync(() => {
      const servicio = crearServicio(Promise.resolve());
      void servicio.login();
      tick();
      servicio.reiniciarLogin();
      void servicio.login();
      tick();
      expect(oauthSpy.initLoginFlow).toHaveBeenCalledTimes(2);
    }));
  });

  // ── getProfile / isAuthenticated / getUserProfile ────────────────────────

  it('getProfile() retorna el resultado de getIdentityClaims()', () => {
    const claims = { name: 'Carlos', email: 'carlos@u.co' };
    oauthSpy.getIdentityClaims.and.returnValue(claims);
    expect(service.getProfile()).toEqual(claims);
  });

  it('isAuthenticated() retorna true cuando accessToken e idToken son válidos', () => {
    oauthSpy.hasValidAccessToken.and.returnValue(true);
    oauthSpy.hasValidIdToken.and.returnValue(true);
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('isAuthenticated() retorna false si falta accessToken', () => {
    oauthSpy.hasValidAccessToken.and.returnValue(false);
    oauthSpy.hasValidIdToken.and.returnValue(true);
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('isAuthenticated() retorna false si falta idToken', () => {
    oauthSpy.hasValidAccessToken.and.returnValue(true);
    oauthSpy.hasValidIdToken.and.returnValue(false);
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('getUserProfile() retorna un Observable que emite el perfil de loadUserProfile()', (done) => {
    const profile = { sub: '12345', name: 'Ana' };
    oauthSpy.loadUserProfile.and.returnValue(Promise.resolve(profile));
    service.getUserProfile().subscribe(result => {
      expect(result).toEqual(profile);
      done();
    });
  });

  // ── error callback en exchangeGoogleToken ────────────────────────────────

  it('token_received: llama a console.error si exchangeGoogleToken falla', () => {
    const err = new Error('backend down');
    tokenSpy.exchangeGoogleToken.and.returnValue(throwError(() => err));
    spyOn(console, 'error');
    oauthSpy.getIdToken.and.returnValue('id-tok-xyz');
    eventsSubject.next({ type: 'token_received' });
    expect(console.error).toHaveBeenCalledWith(
      'Error en intercambio de token con el backend:', err
    );
  });

  // ── revisión del dpt_token al arrancar ───────────────────────────────────

  describe('dpt_token al arrancar', () => {
    let router: jasmine.SpyObj<Router>;
    let ruta: string;

    const arrancarConToken = (token: string | null): { estado: EstadoSesionService } => {
      TestBed.resetTestingModule();
      if (token) {
        sessionStorage.setItem('dpt_token', token);
        sessionStorage.setItem('dpt_role', 'Alumno');
      }
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: OAuthService, useValue: oauthSpy },
          { provide: TokenInterchangeService, useValue: tokenSpy },
          { provide: PerfilService, useValue: perfilSpy },
          { provide: NotificacionService, useValue: avisos },
          { provide: Router, useValue: router },
          { provide: Location, useValue: { path: () => ruta } },
        ],
      });
      const estadoNuevo = TestBed.inject(EstadoSesionService);
      TestBed.inject(AuthService);
      return { estado: estadoNuevo };
    };

    beforeEach(() => {
      router = jasmine.createSpyObj('Router', ['navigate']);
      ruta = '/home';
    });

    afterEach(() => {
      ['dpt_token', 'dpt_role', 'dpt_perfil_id', 'dpt_perfil'].forEach(k => sessionStorage.removeItem(k));
      history.replaceState(null, '', window.location.pathname + window.location.search);
    });

    it('token vencido: limpia la sesión, arranca como visitante, avisa una vez y navega al login', fakeAsync(() => {
      const { estado: e } = arrancarConToken(crearJwtQueVenceEn(-3600));
      tick();
      expect(sessionStorage.getItem('dpt_token')).toBeNull();
      expect(sessionStorage.getItem('dpt_role')).toBeNull();
      expect(e.actual).toBe('visitante');
      expect(avisos.error).toHaveBeenCalledOnceWith('Tu sesión venció', 'Inicia sesión de nuevo.');
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    }));

    it('token malformado: lo descarta, avisa y navega al login', fakeAsync(() => {
      arrancarConToken('esto-no-es-un-jwt');
      tick();
      expect(sessionStorage.getItem('dpt_token')).toBeNull();
      expect(avisos.error).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    }));

    it('token a punto de vencer (menos de 30 s): se descarta y navega al login', fakeAsync(() => {
      arrancarConToken(crearJwtQueVenceEn(10));
      tick();
      expect(sessionStorage.getItem('dpt_token')).toBeNull();
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    }));

    it('visitante sin token: no navega ni avisa', fakeAsync(() => {
      arrancarConToken(null);
      tick();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(avisos.error).not.toHaveBeenCalled();
    }));

    it('redirect de Google en curso (id_token en la URL): no navega y se mantiene "resolviendo"', fakeAsync(() => {
      history.replaceState(null, '', '#id_token=abc&state=1');
      const { estado: e } = arrancarConToken(crearJwtQueVenceEn(-3600));
      // Recién arrancado, con Google redirigiendo: el token viejo se descartó pero la sesión sigue "resolviéndose".
      expect(sessionStorage.getItem('dpt_token')).toBeNull();
      expect(e.actual).toBe('resolviendo');
      tick();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(avisos.error).toHaveBeenCalledTimes(1);
    }));

    it('ya se está en el login: no vuelve a navegar', fakeAsync(() => {
      ruta = '/login';
      arrancarConToken(crearJwtQueVenceEn(-3600));
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(1);
      expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('token vigente: conserva la sesión (token, rol y estado) sin avisar ni navegar', fakeAsync(() => {
      const token = crearJwtQueVenceEn(3600);
      const { estado: e } = arrancarConToken(token);
      tick();
      expect(sessionStorage.getItem('dpt_token')).toBe(token);
      expect(e.actual).toBe('activa');
      expect(perfilSpy.setPerfil).toHaveBeenCalledWith('Alumno');
      expect(avisos.error).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    }));
  });

  // ── estado de la sesión y avisos ─────────────────────────────────────────

  describe('estado de la sesión y avisos', () => {
    const lanzarIntercambio = (): void => {
      oauthSpy.getIdToken.and.returnValue('id-tok-xyz');
      eventsSubject.next({ type: 'token_received' });
    };

    beforeEach(() => sessionStorage.removeItem('dpt_bienvenida'));
    afterEach(() => sessionStorage.removeItem('dpt_bienvenida'));

    it('fallo del intercambio: avisa con un error claro y vuelve al estado de visitante', () => {
      estado.resolviendo();
      tokenSpy.exchangeGoogleToken.and.returnValue(throwError(() => ({ status: 500 })));
      spyOn(console, 'error');
      lanzarIntercambio();
      expect(avisos.error).toHaveBeenCalledOnceWith(
        'No se pudo iniciar la sesión',
        'No pudimos validar tu cuenta con el servidor. Intenta ingresar de nuevo.',
      );
      expect(avisos.exito).not.toHaveBeenCalled();
      expect(estado.actual).toBe('visitante');
    });

    it('intercambio correcto: avisa que la sesión se inició', () => {
      lanzarIntercambio();
      expect(avisos.exito).toHaveBeenCalledOnceWith('Sesión iniciada', 'Bienvenido/a a Deporte para Todos.', 3500);
      expect(avisos.error).not.toHaveBeenCalled();
    });

    it('el aviso de éxito sale una sola vez por sesión del navegador', () => {
      lanzarIntercambio();
      // Otra carga de la aplicación en la misma pestaña (la marca sigue en sessionStorage).
      TestBed.resetTestingModule();
      const eventos = new Subject<any>();
      const nuevosAvisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: OAuthService, useValue: { ...oauthSpy, events: eventos.asObservable() } },
          { provide: TokenInterchangeService, useValue: tokenSpy },
          { provide: PerfilService, useValue: perfilSpy },
          { provide: NotificacionService, useValue: nuevosAvisos },
        ],
      });
      TestBed.inject(AuthService);
      eventos.next({ type: 'token_received' });
      expect(nuevosAvisos.exito).not.toHaveBeenCalled();
    });

    it('logout() permite volver a dar la bienvenida y deja el estado en visitante', () => {
      lanzarIntercambio();
      expect(sessionStorage.getItem('dpt_bienvenida')).toBe('1');
      estado.activa();
      service.logout();
      expect(sessionStorage.getItem('dpt_bienvenida')).toBeNull();
      expect(estado.actual).toBe('visitante');
    });

    it('el intercambio termina sin sesión (usuario sin perfil): pasa a visitante sin avisos', () => {
      estado.resolviendo();
      tokenSpy.exchangeGoogleToken.and.returnValue(EMPTY);
      lanzarIntercambio();
      expect(estado.actual).toBe('visitante');
      expect(avisos.error).not.toHaveBeenCalled();
      expect(avisos.exito).not.toHaveBeenCalled();
    });

    it('Google no devolvió un login válido y no hay intercambio: deja de "resolver" y es visitante', fakeAsync(() => {
      TestBed.resetTestingModule();
      const nuevoEstado = new EstadoSesionService();
      nuevoEstado.resolviendo();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: OAuthService, useValue: oauthSpy },
          { provide: TokenInterchangeService, useValue: tokenSpy },
          { provide: PerfilService, useValue: perfilSpy },
          { provide: NotificacionService, useValue: avisos },
          { provide: EstadoSesionService, useValue: nuevoEstado },
        ],
      });
      TestBed.inject(AuthService);
      tick();
      expect(nuevoEstado.actual).toBe('visitante');
    }));

    it('mientras el intercambio sigue en curso, la sesión sigue "resolviéndose"', fakeAsync(() => {
      TestBed.resetTestingModule();
      const nuevoEstado = new EstadoSesionService();
      nuevoEstado.resolviendo();
      const eventos = new Subject<any>();
      const pendiente = new Subject<void>();
      tokenSpy.exchangeGoogleToken.and.returnValue(pendiente.asObservable());
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: OAuthService, useValue: { ...oauthSpy, events: eventos.asObservable() } },
          { provide: TokenInterchangeService, useValue: tokenSpy },
          { provide: PerfilService, useValue: perfilSpy },
          { provide: NotificacionService, useValue: avisos },
          { provide: EstadoSesionService, useValue: nuevoEstado },
        ],
      });
      TestBed.inject(AuthService);
      oauthSpy.getIdToken.and.returnValue('id-tok-xyz');
      eventos.next({ type: 'token_received' });
      tick();
      expect(tokenSpy.exchangeGoogleToken).toHaveBeenCalled();
      expect(nuevoEstado.actual).toBe('resolviendo');
    }));
  });
});
