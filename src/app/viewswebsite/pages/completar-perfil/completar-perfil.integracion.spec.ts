import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { OAuthService } from 'angular-oauth2-oidc';
import { CompletarPerfilComponent } from './completar-perfil.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { environment } from '../../../../environments/environment';

/**
 * Integración del registro: el componente, PerfilService y TokenInterchangeService reales.
 * Solo se simulan la red (HttpTestingController), el router, OAuth y los avisos.
 */
describe('CompletarPerfilComponent (integración registro → sesión)', () => {
  const API = environment.apiUrl;
  const CLAVES = ['dpt_token', 'dpt_role', 'dpt_perfil_id', 'dpt_perfil'];
  let fixture: ComponentFixture<CompletarPerfilComponent>;
  let component: CompletarPerfilComponent;
  let http: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let avisos: jasmine.SpyObj<NotificacionService>;
  let perfiles: PerfilService;

  beforeEach(async () => {
    CLAVES.forEach(k => sessionStorage.removeItem(k));
    router = jasmine.createSpyObj('Router', ['navigate']);
    avisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);
    const oauth = jasmine.createSpyObj('OAuthService', ['getIdentityClaims', 'logOut', 'getIdToken']);
    oauth.getIdentityClaims.and.returnValue({ name: 'Ana Ruiz', email: 'ana@unicauca.edu.co' });
    oauth.getIdToken.and.returnValue('id-token-google');

    await TestBed.configureTestingModule({
      imports: [CompletarPerfilComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: router },
        { provide: OAuthService, useValue: oauth },
      ],
    })
      .overrideComponent(CompletarPerfilComponent, {
        set: { providers: [{ provide: NotificacionService, useValue: avisos }] },
      })
      .compileComponents();

    http = TestBed.inject(HttpTestingController);
    perfiles = TestBed.inject(PerfilService);
    fixture = TestBed.createComponent(CompletarPerfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Catálogo de facultades que pide el componente al iniciar.
    http.expectOne(r => r.url.includes('/facultades')).flush([]);
    Object.assign(component.perfil, { tipoAlumno: 'Administrativo', tipoId: 'CC', sexo: 'F', id: 123, dependencia: 'Oficina X' });
  });

  afterEach(() => {
    http.verify();
    CLAVES.forEach(k => sessionStorage.removeItem(k));
  });

  const enviar = (): void => component.onSubmit({ invalid: false } as NgForm);

  it('registro y /auth/token correctos: guarda dpt_token y el perfil, fija el rol y navega a /home', () => {
    enviar();
    http.expectOne(`${API}/RegistroPerfilAlumno`).flush({ id: 123 });

    const intercambio = http.expectOne(`${API}/auth/token`);
    expect(intercambio.request.method).toBe('POST');
    expect(intercambio.request.headers.get('Authorization')).toBe('Bearer id-token-google');
    intercambio.flush({ token: 'jwt-del-sistema', perfil: { id: 123, nombre: 'Ana Ruiz', role: 'ALUMNO' } });

    expect(sessionStorage.getItem('dpt_token')).toBe('jwt-del-sistema');
    expect(sessionStorage.getItem('dpt_role')).toBe('ALUMNO');
    expect(sessionStorage.getItem('dpt_perfil_id')).toBe('123');
    expect(perfiles.getPerfil()).toBe('ALUMNO');
    expect(avisos.exito).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/home']);
  });

  it('/auth/token responde 401: no guarda sesión, avisa y lleva al login', () => {
    spyOn(console, 'error');
    enviar();
    http.expectOne(`${API}/RegistroPerfilAlumno`).flush({ id: 123 });
    http.expectOne(`${API}/auth/token`).flush('caducado', { status: 401, statusText: 'Unauthorized' });

    expect(sessionStorage.getItem('dpt_token')).toBeNull();
    expect(avisos.info).toHaveBeenCalledTimes(1);
    expect(avisos.exito).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
  });

  it('el registro responde 422: se queda en el formulario, sin /auth/token y con el botón libre', () => {
    spyOn(console, 'error');
    enviar();
    http.expectOne(`${API}/RegistroPerfilAlumno`)
      .flush({ mensaje: 'El programa X no existe' }, { status: 422, statusText: 'Unprocessable Entity' });

    http.expectNone(`${API}/auth/token`);
    expect(avisos.error).toHaveBeenCalledOnceWith('No se pudo completar el registro', 'El programa X no existe');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.registrando).toBeFalse();
  });

  it('doble clic: solo sale una petición de registro', () => {
    enviar();
    enviar();
    expect(http.match(`${API}/RegistroPerfilAlumno`).length).toBe(1);
  });
});
