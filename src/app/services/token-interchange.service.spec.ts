import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { TokenInterchangeService } from './token-interchange.service';
import { PerfilService } from './perfil.service';

const API = 'http://127.0.0.1:8082/api/v2';

const mockPerfilAdmin = {
  id: 1, nombre: 'Admin Test', correo: 'admin@unicauca.edu.co',
  tipoId: 'CC', sexo: 'M', facultad: '', tipoAlumno: 'Coordinador',
  role: 'Coordinador', alumnoCodigo: '',
};
const mockResp = (role = 'Coordinador') => ({
  token: 'dpt-token-xyz',
  perfil: { ...mockPerfilAdmin, role },
});

describe('TokenInterchangeService', () => {
  let service: TokenInterchangeService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let perfilSpy: jasmine.SpyObj<PerfilService>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    perfilSpy = jasmine.createSpyObj('PerfilService', ['setPerfil']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TokenInterchangeService,
        { provide: Router, useValue: routerSpy },
        { provide: PerfilService, useValue: perfilSpy },
      ],
    });
    service = TestBed.inject(TokenInterchangeService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionStorage.removeItem('dpt_token');
    sessionStorage.removeItem('dpt_role');
    sessionStorage.removeItem('dpt_perfil');
  });

  afterEach(() => {
    sessionStorage.removeItem('dpt_token');
    sessionStorage.removeItem('dpt_role');
    sessionStorage.removeItem('dpt_perfil');
    httpMock.verify();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('POST /auth/token envía idToken en header Authorization: Bearer', () => {
    service.exchangeGoogleToken('my-id-token').subscribe();
    const req = httpMock.expectOne(`${API}/auth/token`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-id-token');
    expect(req.request.body).toEqual({});
    req.flush(mockResp());
  });

  it('respuesta 200: guarda dpt_token en sessionStorage y el Observable completa', () => {
    let completed = false;
    service.exchangeGoogleToken('id-tok').subscribe({ complete: () => { completed = true; } });
    httpMock.expectOne(`${API}/auth/token`).flush(mockResp());
    expect(sessionStorage.getItem('dpt_token')).toBe('dpt-token-xyz');
    expect(completed).toBeTrue();
  });

  it('respuesta 200: guarda dpt_role en sessionStorage con el rol del backend', () => {
    service.exchangeGoogleToken('id-tok').subscribe();
    httpMock.expectOne(`${API}/auth/token`).flush(mockResp('Alumno'));
    expect(sessionStorage.getItem('dpt_role')).toBe('Alumno');
  });

  it('respuesta 200: llama a perfilService.setPerfil() con el rol del backend', () => {
    service.exchangeGoogleToken('id-tok').subscribe();
    httpMock.expectOne(`${API}/auth/token`).flush(mockResp('Instructor'));
    expect(perfilSpy.setPerfil).toHaveBeenCalledOnceWith('Instructor');
  });

  it('respuesta 200: guarda dpt_perfil en sessionStorage con el perfil completo', () => {
    service.exchangeGoogleToken('id-tok').subscribe();
    httpMock.expectOne(`${API}/auth/token`).flush(mockResp('Alumno'));
    expect(JSON.parse(sessionStorage.getItem('dpt_perfil')!)).toEqual({
      ...mockPerfilAdmin, role: 'Alumno',
    });
  });

  it('respuesta 404: navega a /completar-perfil y retorna EMPTY (sin error)', () => {
    let errorCalled = false;
    let nextCalled = false;
    service.exchangeGoogleToken('id-tok').subscribe({
      next: () => { nextCalled = true; },
      error: () => { errorCalled = true; },
    });
    httpMock.expectOne(`${API}/auth/token`)
      .flush('Not Found', { status: 404, statusText: 'Not Found' });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/completar-perfil']);
    expect(errorCalled).toBeFalse();
    expect(nextCalled).toBeFalse();
    expect(sessionStorage.getItem('dpt_token')).toBeNull();
    expect(perfilSpy.setPerfil).not.toHaveBeenCalled();
  });

  it('respuesta 500: propaga el error y no navega', () => {
    let errorCaptured: any;
    service.exchangeGoogleToken('id-tok').subscribe({
      next: () => fail('no debería emitir next'),
      error: err => { errorCaptured = err; },
    });
    httpMock.expectOne(`${API}/auth/token`)
      .flush('Error', { status: 500, statusText: 'Server Error' });
    expect(errorCaptured.status).toBe(500);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('dpt_token')).toBeNull();
  });

  it('respuesta 401: propaga el error y no navega', () => {
    let errorCaptured: any;
    service.exchangeGoogleToken('bad-token').subscribe({
      next: () => fail('no debería emitir next'),
      error: err => { errorCaptured = err; },
    });
    httpMock.expectOne(`${API}/auth/token`)
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    expect(errorCaptured.status).toBe(401);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  // ── tokenReady$ ──────────────────────────────────────────────────────────

  it('tokenReady$ emite void tras guardar dpt_token en respuesta 200', () => {
    let emitted = false;
    service.tokenReady$.subscribe(() => { emitted = true; });
    service.exchangeGoogleToken('id-tok').subscribe();
    httpMock.expectOne(`${API}/auth/token`).flush(mockResp());
    expect(emitted).toBeTrue();
  });

  it('tokenReady$ NO emite cuando el backend devuelve 404', () => {
    let emitted = false;
    service.tokenReady$.subscribe(() => { emitted = true; });
    service.exchangeGoogleToken('id-tok').subscribe();
    httpMock.expectOne(`${API}/auth/token`)
      .flush('Not Found', { status: 404, statusText: 'Not Found' });
    expect(emitted).toBeFalse();
  });

  it('tokenReady$ NO emite cuando el backend devuelve 500', () => {
    let emitted = false;
    service.tokenReady$.subscribe(() => { emitted = true; });
    service.exchangeGoogleToken('id-tok').subscribe({ error: () => {} });
    httpMock.expectOne(`${API}/auth/token`)
      .flush('Error', { status: 500, statusText: 'Server Error' });
    expect(emitted).toBeFalse();
  });
});
