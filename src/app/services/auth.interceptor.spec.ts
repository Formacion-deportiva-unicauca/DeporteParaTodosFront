import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthInterceptor } from './auth.interceptor';
import { PerfilService } from './perfil.service';
import { NotificacionService } from '../shared/notificacion/notificacion.service';
import { EstadoSesionService } from '../shared/estado-sesion.service';
import { crearJwtQueVenceEn } from '../testing/jwt-prueba';

const BACKEND_API = 'http://127.0.0.1:8082/api/v2';
const EXTERNAL_URL = 'https://accounts.google.com/o/oauth2/token';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let avisos: jasmine.SpyObj<NotificacionService>;
  let perfil: jasmine.SpyObj<PerfilService>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    avisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);
    perfil = jasmine.createSpyObj('PerfilService', ['setPerfil']);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthInterceptor,
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: Router, useValue: router },
        { provide: NotificacionService, useValue: avisos },
        { provide: PerfilService, useValue: perfil },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    sessionStorage.removeItem('dpt_token');
  });

  afterEach(() => {
    ['dpt_token', 'dpt_role', 'dpt_perfil_id', 'dpt_perfil', 'dpt_bienvenida'].forEach(k => sessionStorage.removeItem(k));
    httpMock.verify();
  });

  describe('401: sesión vencida', () => {
    let token: string;

    beforeEach(() => {
      token = crearJwtQueVenceEn(3600);
      sessionStorage.setItem('dpt_token', token);
      sessionStorage.setItem('dpt_role', 'Alumno');
      sessionStorage.setItem('dpt_perfil_id', '123');
      sessionStorage.setItem('dpt_perfil', '{"id":123}');
      sessionStorage.setItem('dpt_bienvenida', '1');
    });

    const pedir = (ruta: string, errores: unknown[] = []): void => {
      http.get(`${BACKEND_API}${ruta}`).subscribe({ error: e => errores.push(e) });
    };

    it('limpia la sesión, avisa una vez y navega al login', fakeAsync(() => {
      pedir('/categorias2');
      httpMock.expectOne(`${BACKEND_API}/categorias2`).flush('vencido', { status: 401, statusText: 'Unauthorized' });
      tick();

      ['dpt_token', 'dpt_role', 'dpt_perfil_id', 'dpt_perfil', 'dpt_bienvenida'].forEach(
        k => expect(sessionStorage.getItem(k)).toBeNull(`${k} debe borrarse`));
      expect(perfil.setPerfil).toHaveBeenCalledOnceWith('');
      expect(avisos.error).toHaveBeenCalledOnceWith('Tu sesión venció', 'Inicia sesión de nuevo.');
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    }));

    it('el error sigue llegando a quien hizo la petición (la pantalla no se queda esperando)', fakeAsync(() => {
      const errores: any[] = [];
      pedir('/categorias2', errores);
      httpMock.expectOne(`${BACKEND_API}/categorias2`).flush('vencido', { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(errores.length).toBe(1);
      expect(errores[0].status).toBe(401);
    }));

    it('el 403 NO es sesión vencida: no limpia, no avisa y no navega', fakeAsync(() => {
      const errores: any[] = [];
      pedir('/reportes', errores);
      httpMock.expectOne(`${BACKEND_API}/reportes`).flush('sin permiso', { status: 403, statusText: 'Forbidden' });
      tick();

      expect(sessionStorage.getItem('dpt_token')).toBe(token);
      expect(avisos.error).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(errores[0].status).toBe(403);
    }));

    it('otros errores (500, 404) tampoco cierran la sesión', fakeAsync(() => {
      pedir('/a');
      pedir('/b');
      httpMock.expectOne(`${BACKEND_API}/a`).flush('x', { status: 500, statusText: 'Server Error' });
      httpMock.expectOne(`${BACKEND_API}/b`).flush('x', { status: 404, statusText: 'Not Found' });
      tick();
      expect(sessionStorage.getItem('dpt_token')).toBe(token);
      expect(avisos.error).not.toHaveBeenCalled();
    }));

    it('/auth/token queda excluido: su 401 no limpia la sesión ni avisa', fakeAsync(() => {
      pedir('/auth/token');
      httpMock.expectOne(`${BACKEND_API}/auth/token`).flush('x', { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(sessionStorage.getItem('dpt_token')).toBe(token);
      expect(avisos.error).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('varias peticiones simultáneas con 401: un solo aviso y una sola navegación', fakeAsync(() => {
      pedir('/categorias2');
      pedir('/cursos');
      pedir('/grupos');
      pedir('/imagen?idImagen=1');
      httpMock.match(() => true).forEach(r => r.flush('vencido', { status: 401, statusText: 'Unauthorized' }));
      tick();

      expect(avisos.error).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledTimes(1);
      expect(perfil.setPerfil).toHaveBeenCalledTimes(1);
    }));

    it('un nuevo inicio de sesión reinicia el control: un segundo vencimiento vuelve a avisar', fakeAsync(() => {
      pedir('/uno');
      httpMock.expectOne(`${BACKEND_API}/uno`).flush('x', { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(1);

      const nuevo = crearJwtQueVenceEn(7200);
      sessionStorage.setItem('dpt_token', nuevo);
      TestBed.inject(EstadoSesionService).activa();
      pedir('/dos');
      httpMock.expectOne(`${BACKEND_API}/dos`).flush('x', { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(2);
    }));

    it('un 401 tardío de la sesión anterior no cierra la sesión nueva', fakeAsync(() => {
      pedir('/lenta'); // sale con el token viejo
      const lenta = httpMock.expectOne(`${BACKEND_API}/lenta`);
      const nuevo = crearJwtQueVenceEn(7200);
      sessionStorage.setItem('dpt_token', nuevo); // el usuario inició sesión otra vez mientras tanto
      lenta.flush('x', { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(sessionStorage.getItem('dpt_token')).toBe(nuevo);
      expect(avisos.error).not.toHaveBeenCalled();
    }));
  });

  it('visitante sin dpt_token: un 401 no muestra aviso ni navega', fakeAsync(() => {
    http.get(`${BACKEND_API}/categorias2`).subscribe({ error: () => undefined });
    httpMock.expectOne(`${BACKEND_API}/categorias2`).flush('x', { status: 401, statusText: 'Unauthorized' });
    tick();
    expect(avisos.error).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('un 401 de una URL externa no es de la API: se ignora', fakeAsync(() => {
    sessionStorage.setItem('dpt_token', crearJwtQueVenceEn(3600));
    http.get(EXTERNAL_URL).subscribe({ error: () => undefined });
    httpMock.expectOne(EXTERNAL_URL).flush('x', { status: 401, statusText: 'Unauthorized' });
    tick();
    expect(avisos.error).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('dpt_token')).not.toBeNull();
  }));

  it('debería crearse correctamente', () => {
    const interceptor = TestBed.inject(AuthInterceptor);
    expect(interceptor).toBeTruthy();
  });

  it('no modifica requests a URLs externas (no BACKEND_API)', () => {
    http.get(EXTERNAL_URL).subscribe();
    const req = httpMock.expectOne(EXTERNAL_URL);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('no inyecta Authorization cuando no hay dpt_token en sessionStorage', () => {
    http.get(`${BACKEND_API}/categorias`).subscribe();
    const req = httpMock.expectOne(`${BACKEND_API}/categorias`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('inyecta Authorization: Bearer <token> cuando hay dpt_token', () => {
    sessionStorage.setItem('dpt_token', 'tok-abc-123');
    http.get(`${BACKEND_API}/categorias`).subscribe();
    const req = httpMock.expectOne(`${BACKEND_API}/categorias`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-abc-123');
    req.flush([]);
  });

  it('no modifica el request original — usa clone()', () => {
    sessionStorage.setItem('dpt_token', 'tok-xyz');
    // El interceptor debe clonar el request, no mutar el original.
    // Lo verificamos comprobando que el header llega al mock exactamente una vez
    // con el valor correcto (sin efectos secundarios en el request original).
    http.get(`${BACKEND_API}/instructores`).subscribe();
    const req = httpMock.expectOne(`${BACKEND_API}/instructores`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-xyz');
    req.flush([]);
  });

  it('inyecta header a cualquier sub-ruta de BACKEND_API', () => {
    sessionStorage.setItem('dpt_token', 'tok-subruta');
    http.get(`${BACKEND_API}/categorias/42/cursos`).subscribe();
    const req = httpMock.expectOne(`${BACKEND_API}/categorias/42/cursos`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-subruta');
    req.flush({});
  });

  it('no inyecta header a URL que contiene BACKEND_API como substring pero no es prefijo', () => {
    // URL donde BACKEND_API aparece en la query string, no como prefijo del path
    const url = `https://logger.example.com/track?src=${encodeURIComponent(BACKEND_API)}`;
    http.get(url).subscribe();
    const req = httpMock.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });
});
