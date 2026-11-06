import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { SidenavComponent } from './sidenav.component';
import { AuthService } from 'src/app/services/auth.service';
import { PerfilService } from 'src/app/services/perfil.service';

describe('SidenavComponent', () => {
  let component: SidenavComponent;
  let fixture: ComponentFixture<SidenavComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let navigateSpy: jasmine.Spy;
  let perfilSubject: BehaviorSubject<string>;
  let observeSpy: jasmine.Spy;
  let movil: boolean;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const textos = (selector: string): string[] =>
    Array.from(el().querySelectorAll(selector)).map(e => (e.textContent ?? '').trim());
  const hrefs = (): string[] =>
    Array.from(el().querySelectorAll('.nav-item')).map(a => a.getAttribute('href') ?? '');

  async function crear(esMovil = false): Promise<void> {
    movil = esMovil;
    authSpy = jasmine.createSpyObj('AuthService', ['logout', 'getProfile']);
    authSpy.getProfile.and.returnValue({ name: 'María García', email: 'maria.garcia@unicauca.edu.co' });
    perfilSubject = new BehaviorSubject<string>('Coordinador');
    observeSpy = jasmine.createSpy('observe').and.callFake(
      () => of({ matches: movil, breakpoints: {} } as BreakpointState));

    await TestBed.configureTestingModule({
      imports: [SidenavComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        { provide: PerfilService, useValue: { perfil$: perfilSubject.asObservable() } },
        { provide: BreakpointObserver, useValue: { observe: observeSpy } },
      ],
    }).compileComponents();

    navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(SidenavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('escritorio', () => {
    beforeEach(() => crear(false));

    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('ngOnInit() suscribe perfil$ y asigna el valor a this.perfil', () => {
      perfilSubject.next('Estudiante');
      expect(component.perfil).toBe('Estudiante');
    });

    it('cerrarSesion() llama a authService.logout() y navega a ["/login"], en ese orden', () => {
      const orden: string[] = [];
      authSpy.logout.and.callFake(() => orden.push('logout'));
      navigateSpy.and.callFake(() => { orden.push('navigate'); return Promise.resolve(true); });
      component.cerrarSesion();
      expect(orden).toEqual(['logout', 'navigate']);
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    describe('barra superior', () => {
      it('muestra la marca "Deporte para Todos / Vicerrectoría de Cultura y Bienestar" y enlaza al inicio', () => {
        const marca = el().querySelector('.marca') as HTMLAnchorElement;
        expect(marca.textContent).toContain('Deporte para Todos');
        expect(marca.textContent).toContain('Vicerrectoría de Cultura y Bienestar');
        expect(marca.getAttribute('href')).toBe('/home');
      });

      it('en escritorio muestra los enlaces institucionales y no el botón de menú', () => {
        expect(textos('.enlaces a')).toEqual(['Inicio', 'Noticias', 'Nosotros', 'Contáctanos']);
        expect(el().querySelector('.btn-hamburguesa')).toBeNull();
      });

      it('Nosotros y Contáctanos abren la página de la Vicerrectoría en otra pestaña, de forma segura', () => {
        const externos = Array.from(el().querySelectorAll('.enlaces a[target="_blank"]'));
        expect(externos.length).toBe(2);
        externos.forEach(a => {
          expect(a.getAttribute('href')).toContain('vicecultura.unicauca.edu.co');
          expect(a.getAttribute('rel')).toContain('noopener');
        });
      });

      it('los enlaces internos son enlaces reales (no recargan la página)', () => {
        expect(el().querySelector('.enlaces a[href="/home"]')).not.toBeNull();
      });

      it('muestra las iniciales, el nombre y el rol del usuario', () => {
        expect(el().querySelector('.avatar')?.textContent?.trim()).toBe('MG');
        expect(el().querySelector('.usuario-nombre')?.textContent).toContain('María García');
        expect(el().querySelector('.usuario-rol')?.textContent).toContain('Rol: Coordinador');
      });

      it('sin nombre disponible, el avatar muestra una inicial neutra y no falla', () => {
        authSpy.getProfile.and.returnValue(null as unknown as Record<string, any>);
        perfilSubject.next('Instructor');
        fixture.detectChanges();
        expect(el().querySelector('.avatar')?.textContent?.trim()).toBe('?');
      });

      it('el menú del usuario ofrece "Cerrar sesión"', () => {
        (el().querySelector('.usuario') as HTMLButtonElement).click();
        fixture.detectChanges();
        const opciones = Array.from(document.querySelectorAll('.cdk-overlay-container .mat-mdc-menu-item'))
          .map(o => (o.textContent ?? '').trim());
        expect(opciones.some(o => o.includes('Cerrar sesión'))).toBeTrue();
      });
    });

    describe('menú lateral por rol', () => {
      it('Coordinador: Home, Instructores, Inscripciones y Reportes, como enlaces reales', () => {
        expect(textos('.nav-item span')).toEqual(['Home', 'Instructores', 'Inscripciones', 'Reportes']);
        expect(hrefs()).toEqual(['/home', '/lista-instructores', '/gestion-inscripciones', '/reportes']);
      });

      it('Instructor: Home y Mis cursos (/info-instructor)', () => {
        perfilSubject.next('Instructor');
        fixture.detectChanges();
        expect(textos('.nav-item span')).toEqual(['Home', 'Mis cursos']);
        expect(hrefs()).toEqual(['/home', '/info-instructor']);
      });

      it('Alumno: Home y Mis cursos (/info-estudiante)', () => {
        perfilSubject.next('Alumno');
        fixture.detectChanges();
        expect(textos('.nav-item span')).toEqual(['Home', 'Mis cursos']);
        expect(hrefs()).toEqual(['/home', '/info-estudiante']);
      });

      it('no muestra "Mis cursos" para un rol inválido como "Estudiante"', () => {
        perfilSubject.next('Estudiante');
        fixture.detectChanges();
        expect(textos('.nav-item span').some(t => t.includes('Mis cursos'))).toBeFalse();
      });

      it('no dice "Mi información" para el rol Instructor', () => {
        perfilSubject.next('Instructor');
        fixture.detectChanges();
        expect(textos('.nav-item span').some(t => t.includes('Mi información'))).toBeFalse();
      });

      it('muestra el título del panel según el rol', () => {
        expect(el().querySelector('.titulo-panel')?.textContent?.trim()).toBe('Panel de coordinación');
        perfilSubject.next('Instructor');
        fixture.detectChanges();
        expect(el().querySelector('.titulo-panel')?.textContent?.trim()).toBe('Panel del instructor');
      });

      describe('rol Alumno: se muestra el tipo de vínculo, nunca "Alumno"', () => {
        afterEach(() => sessionStorage.removeItem('dpt_perfil'));

        for (const tipo of ['Estudiante', 'Docente', 'Administrativo', 'Contratista']) {
          it(`${tipo}: el rol y el título del panel usan "${tipo}"`, () => {
            sessionStorage.setItem('dpt_perfil', JSON.stringify({ tipoAlumno: tipo }));
            perfilSubject.next('Alumno');
            fixture.detectChanges();
            expect(el().querySelector('.usuario-rol')?.textContent).toContain(`Rol: ${tipo}`);
            expect(el().querySelector('.titulo-panel')?.textContent?.trim()).toBe(`Panel del ${tipo.toLowerCase()}`);
            expect(el().textContent).not.toContain('Alumno');
          });
        }

        it('sin tipo de vínculo conocido usa "Usuario"', () => {
          perfilSubject.next('Alumno');
          fixture.detectChanges();
          expect(el().querySelector('.usuario-rol')?.textContent).toContain('Rol: Usuario');
          expect(el().textContent).not.toContain('Alumno');
        });
      });
    });
  });

  describe('móvil y tableta', () => {
    beforeEach(() => crear(true));

    it('el menú se recoge por debajo de 992px (no solo en teléfonos)', () => {
      expect(observeSpy).toHaveBeenCalledWith('(max-width: 991.98px)');
    });

    it('muestra el botón de menú con nombre accesible y oculta los enlaces de la barra', () => {
      const boton = el().querySelector('.btn-hamburguesa') as HTMLButtonElement;
      expect(boton).not.toBeNull();
      expect(boton.getAttribute('aria-label')).toBe('Abrir menú de navegación');
      expect(el().querySelector('.enlaces')).toBeNull();
    });

    it('el panel se usa como diálogo superpuesto', () => {
      expect(el().querySelector('mat-sidenav')?.getAttribute('role')).toBe('dialog');
    });
  });

  describe('escritorio: rol del panel', () => {
    beforeEach(() => crear(false));

    it('el panel lateral es navegación fija', () => {
      expect(el().querySelector('mat-sidenav')?.getAttribute('role')).toBe('navigation');
    });
  });
});
