import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from 'src/app/services/auth.service';
import { URL_POLITICA_DATOS } from '../footer/footer.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let el: HTMLElement;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'reiniciarLogin']);
    auth.login.and.returnValue(Promise.resolve());
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  const texto = () => (el.textContent ?? '').replace(/\s+/g, ' ');
  const boton = () => el.querySelector('#btn-google') as HTMLButtonElement;

  it('muestra el encabezado institucional', () => {
    expect(texto()).toContain('Vicerrectoría de Cultura y Bienestar');
    expect(texto()).toContain('Sistema de Gestión Deportiva Institucional · Deporte para Todos');
    expect(el.querySelector('header img')).not.toBeNull();
  });

  it('tiene un único h1 "Inicio de sesión"', () => {
    const h1 = el.querySelectorAll('h1');
    expect(h1.length).toBe(1);
    expect(h1[0].textContent?.trim()).toBe('Inicio de sesión');
  });

  it('indica que se use el correo institucional', () => {
    expect(texto()).toContain('@unicauca.edu.co');
  });

  it('solo ofrece ingreso con Google: no hay campos de usuario ni contraseña', () => {
    expect(el.querySelector('input')).toBeNull();
    expect(el.querySelector('form')).toBeNull();
  });

  it('el aviso de datos personales enlaza a la política institucional', () => {
    const enlace = el.querySelector('.aviso-datos a') as HTMLAnchorElement;
    expect(enlace.getAttribute('href')).toBe(URL_POLITICA_DATOS);
    expect(enlace.getAttribute('target')).toBe('_blank');
    expect(enlace.getAttribute('rel')).toContain('noopener');
  });

  it('incluye el pie institucional', () => {
    expect(el.querySelector('app-footer')).not.toBeNull();
  });

  describe('foto', () => {
    it('es decorativa, viene de los assets y está a la izquierda del formulario', () => {
      const foto = el.querySelector('img.foto-login') as HTMLImageElement;
      expect(foto.getAttribute('src')).toContain('assets/imagesSystem/login-deportistas.jpg');
      expect(foto.getAttribute('alt')).toBe('');
      const contenido = el.querySelector('.principal') as HTMLElement;
      expect(contenido.firstElementChild?.classList).toContain('foto');
    });

    it('su contenedor conserva la proporción 3:2 de la imagen para no recortar a las personas', () => {
      const contenedor = el.querySelector('.foto') as HTMLElement;
      expect(getComputedStyle(contenedor).aspectRatio.replace(/\s/g, '')).toBe('3/2');
    });

    it('el encabezado institucional va dentro de la columna del formulario', () => {
      expect(el.querySelector('.panel header')).not.toBeNull();
    });
  });

  describe('botón de Google', () => {
    it('inicia sesión con AuthService al hacer clic', () => {
      expect(boton().textContent).toContain('Ingresar con Google');
      boton().click();
      expect(auth.login).toHaveBeenCalledTimes(1);
    });

    it('mientras redirige se deshabilita, muestra el avance y ya no responde a más clics', () => {
      boton().click();
      fixture.detectChanges();
      expect(boton().disabled).toBeTrue();
      expect(boton().getAttribute('aria-busy')).toBe('true');
      expect(boton().textContent).toContain('Redirigiendo a Google');
      boton().click();
      fixture.componentInstance.login();
      expect(auth.login).toHaveBeenCalledTimes(1);
    });

    it('si no se puede iniciar el flujo, avisa y vuelve a habilitar el botón', fakeAsync(() => {
      auth.login.and.returnValue(Promise.reject(new Error('sin red')));
      boton().click();
      tick();
      fixture.detectChanges();
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo conectar con Google');
      expect(boton().disabled).toBeFalse();
      expect(auth.reiniciarLogin).toHaveBeenCalled();
    }));

    it('si la página no cambia en 10 s, vuelve a habilitar el botón', fakeAsync(() => {
      boton().click();
      fixture.detectChanges();
      expect(boton().disabled).toBeTrue();
      tick(10000);
      fixture.detectChanges();
      expect(boton().disabled).toBeFalse();
      expect(auth.reiniciarLogin).toHaveBeenCalled();
    }));

    it('al volver con "atrás" desde Google (página restaurada del caché) se reinicia', () => {
      boton().click();
      fixture.detectChanges();
      expect(boton().disabled).toBeTrue();
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      fixture.detectChanges();
      expect(boton().disabled).toBeFalse();
      expect(auth.reiniciarLogin).toHaveBeenCalled();
    });

    it('una carga normal de la página (no restaurada) no reinicia nada', () => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
      expect(auth.reiniciarLogin).not.toHaveBeenCalled();
    });
  });
});
