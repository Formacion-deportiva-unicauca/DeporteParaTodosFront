import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { SidenavComponent } from './sidenav.component';
import { AuthService } from 'src/app/services/auth.service';
import { PerfilService } from 'src/app/services/perfil.service';

describe('SidenavComponent — cerrarSesion', () => {
  let component: SidenavComponent;
  let fixture: ComponentFixture<SidenavComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let perfilSubject: BehaviorSubject<string>;

  const bpStateFalse: BreakpointState = { matches: false, breakpoints: {} };

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['logout']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    perfilSubject = new BehaviorSubject<string>('Coordinador');

    await TestBed.configureTestingModule({
      imports: [SidenavComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: PerfilService,
          useValue: { perfil$: perfilSubject.asObservable() },
        },
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of(bpStateFalse) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SidenavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() suscribe perfil$ y asigna el valor a this.perfil', () => {
    perfilSubject.next('Estudiante');
    expect(component.perfil).toBe('Estudiante');
  });

  it('cerrarSesion() llama a authService.logout()', () => {
    component.cerrarSesion();
    expect(authSpy.logout).toHaveBeenCalledTimes(1);
  });

  it('cerrarSesion() navega a ["/login"]', () => {
    component.cerrarSesion();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('cerrarSesion() llama a logout antes de navegar (orden correcto)', () => {
    const callOrder: string[] = [];
    authSpy.logout.and.callFake(() => callOrder.push('logout'));
    routerSpy.navigate.and.callFake(() => { callOrder.push('navigate'); return Promise.resolve(true); });
    component.cerrarSesion();
    expect(callOrder).toEqual(['logout', 'navigate']);
  });

  describe('enlace "Mis cursos" para rol Alumno', () => {
    it('muestra el enlace cuando perfil es "Alumno"', () => {
      perfilSubject.next('Alumno');
      fixture.detectChanges();
      const textos = Array.from(
        fixture.nativeElement.querySelectorAll('.nav-item span')
      ).map((el: any) => el.textContent.trim());
      expect(textos.some(t => t.includes('Mis cursos'))).toBeTrue();
    });

    it('no muestra el enlace cuando perfil es "Estudiante" (valor de rol inválido)', () => {
      perfilSubject.next('Estudiante');
      fixture.detectChanges();
      const textos = Array.from(
        fixture.nativeElement.querySelectorAll('.nav-item span')
      ).map((el: any) => el.textContent.trim());
      expect(textos.some(t => t.includes('Mis cursos'))).toBeFalse();
    });
  });

  describe('enlace "Mis cursos" para rol Instructor', () => {
    it('muestra el enlace con texto "Mis cursos" cuando perfil es "Instructor"', () => {
      perfilSubject.next('Instructor');
      fixture.detectChanges();
      const textos = Array.from(
        fixture.nativeElement.querySelectorAll('.nav-item span')
      ).map((el: any) => el.textContent.trim());
      expect(textos.some(t => t === 'Mis cursos')).toBeTrue();
    });

    it('no dice "Mi información" para rol Instructor', () => {
      perfilSubject.next('Instructor');
      fixture.detectChanges();
      const textos = Array.from(
        fixture.nativeElement.querySelectorAll('.nav-item span')
      ).map((el: any) => el.textContent.trim());
      expect(textos.some(t => t.includes('Mi información'))).toBeFalse();
    });
  });
});
