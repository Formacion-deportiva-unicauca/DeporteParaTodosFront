import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { HeaderComponent } from './header.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { AuthService } from 'src/app/services/auth.service';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let navigateSpy: jasmine.Spy;
  let authSpy: jasmine.SpyObj<AuthService>;
  let perfilSubject: BehaviorSubject<string>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['logout']);
    perfilSubject = new BehaviorSubject<string>('');

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        { provide: PerfilService, useValue: { perfil$: perfilSubject.asObservable() } },
      ],
    }).compileComponents();

    navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit(): suscribe perfil$ y asigna el valor a this.perfil', () => {
    perfilSubject.next('Coordinador');
    expect(component.perfil).toBe('Coordinador');
  });

  it('ngOnInit(): perfil queda vacío cuando no hay sesión activa', () => {
    perfilSubject.next('');
    expect(component.perfil).toBe('');
  });

  it('cerrarSesion(): llama a authService.logout() y luego navega a /login', () => {
    const orden: string[] = [];
    authSpy.logout.and.callFake(() => orden.push('logout'));
    navigateSpy.and.callFake(() => { orden.push('navigate'); return Promise.resolve(true); });
    component.cerrarSesion();
    expect(orden).toEqual(['logout', 'navigate']);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  describe('barra del visitante', () => {
    it('muestra la marca institucional y enlaza al inicio', () => {
      const marca = el().querySelector('.marca') as HTMLAnchorElement;
      expect(marca.textContent).toContain('Deporte para Todos');
      expect(marca.getAttribute('href')).toBe('/home');
      expect(marca.querySelector('img')?.getAttribute('alt')).toBe('Universidad del Cauca');
    });

    it('los enlaces institucionales son reales: internos con href y externos en otra pestaña, de forma segura', () => {
      const enlaces = Array.from(el().querySelectorAll('.enlaces a'));
      expect(enlaces.map(a => (a.textContent ?? '').trim()))
        .toEqual(['Inicio', 'Noticias', 'Nosotros', 'Contáctanos', 'Iniciar sesión']);
      const externos = enlaces.filter(a => a.getAttribute('target') === '_blank');
      expect(externos.length).toBe(2);
      externos.forEach(a => expect(a.getAttribute('rel')).toContain('noopener'));
    });

    it('sin sesión ofrece "Iniciar sesión" hacia /login', () => {
      const entrar = Array.from(el().querySelectorAll('.enlaces a'))
        .find(a => a.textContent?.includes('Iniciar sesión')) as HTMLAnchorElement;
      expect(entrar.getAttribute('href')).toBe('/login');
      expect(el().textContent).not.toContain('Cerrar sesión');
    });

    it('con sesión muestra el rol (con el tipo de vínculo, no "Alumno") y "Cerrar sesión" en lugar de "Iniciar sesión"', () => {
      sessionStorage.setItem('dpt_perfil', JSON.stringify({ tipoAlumno: 'Contratista' }));
      perfilSubject.next('Alumno');
      fixture.detectChanges();
      sessionStorage.removeItem('dpt_perfil');
      expect(el().querySelector('.rol')?.textContent).toContain('Rol: Contratista');
      expect(el().textContent).not.toContain('Alumno');
      const textos = Array.from(el().querySelectorAll('.enlaces a, .enlaces button')).map(a => a.textContent ?? '');
      expect(textos.some(t => t.includes('Cerrar sesión'))).toBeTrue();
      expect(textos.some(t => t.includes('Iniciar sesión'))).toBeFalse();
    });
  });

  describe('menú recogible en móvil', () => {
    const boton = () => el().querySelector('.btn-hamburguesa') as HTMLButtonElement;

    it('el botón de menú anuncia su estado y abre y cierra los enlaces', () => {
      expect(boton().getAttribute('aria-expanded')).toBe('false');
      expect(el().querySelector('.enlaces')?.classList).not.toContain('abierto');
      boton().click();
      fixture.detectChanges();
      expect(boton().getAttribute('aria-expanded')).toBe('true');
      expect(el().querySelector('.enlaces')?.classList).toContain('abierto');
      boton().click();
      fixture.detectChanges();
      expect(boton().getAttribute('aria-expanded')).toBe('false');
    });
  });
});
