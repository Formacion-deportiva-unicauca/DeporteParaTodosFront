import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';
import { Router } from '@angular/router';
import { InformacionEstudianteComponent } from './informacion-estudiante.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { AuthService } from 'src/app/services/auth.service';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { MiCursoDTO } from 'src/app/Models/DTOs/mis-cursos-dto';

@Component({ selector: 'app-sidenav', standalone: true, template: '<ng-content></ng-content>' })
class SidenavStub {}

const dia = (): string => {
  const d = new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(new Date());
  return d.charAt(0).toUpperCase() + d.slice(1);
};
const otroDia = (): string => (dia() === 'Lunes' ? 'Martes' : 'Lunes');

const curso = (over: Partial<MiCursoDTO> = {}): MiCursoDTO => ({
  categoria: 'Semillero', curso: 'natacion', anio: 2026, iterable: 2, periodo: 2, estado: 'INSCRITO',
  nombreInstructor: 'Katerinn Arcos', grupoActivo: true,
  horarios: [{ id: 1, categoria: 'Semillero', curso: 'natacion', anio: 2026, iterable: 2, dia: otroDia(), horaInicio: '16:00:00', horaFin: '18:00:00', escenario: 'Piscina' }],
  ...over,
});

/** Mis cursos de los roles con vínculo (Estudiante, Docente, Administrativo, Contratista), según el lineamiento UX-UI. */
describe('InformacionEstudianteComponent › diseño de la vista', () => {
  let fixture: ComponentFixture<InformacionEstudianteComponent>;
  let component: InformacionEstudianteComponent;
  let router: Router;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(s: string): T => el().querySelector(s) as T;

  async function montar(rol: string, cursos: MiCursoDTO[], perfil: object = { id: '123698745', nombre: 'Ana María Ruiz', tipoAlumno: 'Administrativo', dependencia: 'Dependencia de prueba' }): Promise<void> {
    sessionStorage.setItem('dpt_perfil', JSON.stringify(perfil));
    await TestBed.configureTestingModule({
      imports: [InformacionEstudianteComponent, NoopAnimationsModule],
      providers: [
        { provide: PerfilService, useValue: { perfil$: new BehaviorSubject<string>(rol).asObservable() } },
        { provide: InscripcionesService, useValue: { getMisCursos: () => of(cursos) } },
        { provide: InstructorServisce, useValue: { getInstructores: () => of([{ id: '10023965391', nombre: 'Katerinn Arcos', correo: 'k@u.co', sexo: 'F' }]) } },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'getProfile', 'isAuthenticated', 'verificarUsuario']) },
      ],
    })
      .overrideComponent(InformacionEstudianteComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
      .compileComponents();
    fixture = TestBed.createComponent(InformacionEstudianteComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }

  afterEach(() => sessionStorage.removeItem('dpt_perfil'));

  it('muestra migas "Inicio › Mis cursos" y el título con la línea secundaria; "Inicio" navega a /home', async () => {
    await montar('Alumno', [curso()]);
    expect(q('nav.migas [aria-current="page"]').textContent?.trim()).toBe('Mis cursos');
    expect(q('h1.titulo-pagina').textContent?.trim()).toBe('Mis cursos');
    expect(getComputedStyle(q('h1.titulo-pagina'), '::after').height).toBe('4px');
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);
    q<HTMLAnchorElement>('nav.migas a').click();
    expect(navegar).toHaveBeenCalledWith(['/home']);
  });

  it('la tarjeta de datos muestra avatar con iniciales, nombre, código, vínculo y dependencia (sin la palabra "Alumno")', async () => {
    await montar('Alumno', [curso()]);
    expect(q('.avatar').textContent?.trim()).toBe('AM');
    expect(q('.nombre').textContent?.trim()).toBe('Ana María Ruiz');
    const datos = q('.datos').textContent!;
    expect(datos).toContain('123698745');
    expect(datos).toContain('Administrativo');
    expect(datos).toContain('Dependencia de prueba');
    expect(q('.tarjeta-perfil').textContent).not.toContain('Alumno');
  });

  it('para Estudiante o Docente muestra facultad y programa en lugar de dependencia', async () => {
    await montar('Alumno', [curso()], { id: '1', nombre: 'Luis Vega', tipoAlumno: 'Estudiante', facultad: 'Ingeniería Civil', programa: 'Ingeniería Civil' });
    expect(q('.datos').textContent).toContain('Facultad');
    expect(q('.datos').textContent).toContain('Programa');
    expect(q('.datos').textContent).not.toContain('Dependencia');
  });

  it('"Mis notificaciones" es un botón secundario de 44 px que abre el diálogo de notificaciones', async () => {
    await montar('Alumno', [curso()]);
    const boton = q<HTMLButtonElement>('.barra-titulo .btn-secundario');
    expect(boton.textContent).toContain('Mis notificaciones');
    expect(getComputedStyle(boton).textTransform).toBe('uppercase');
    expect(parseFloat(getComputedStyle(boton).height)).toBeGreaterThanOrEqual(44);
    const abrir = spyOn(component['dialog'] as MatDialog, 'open');
    boton.click();
    expect(abrir).toHaveBeenCalled();
  });

  it('el resumen cuenta inscritos, lista de espera y clases de hoy', async () => {
    const hoy = curso({ horarios: [{ ...curso().horarios[0], dia: dia() }] });
    await montar('Alumno', [hoy, curso({ curso: 'tenis', estado: 'EN_ESPERA' }), curso({ curso: 'viejo', grupoActivo: false })]);
    const cifras = Array.from(el().querySelectorAll('.cifra')).map(c => [c.querySelector('dt')!.textContent!.trim(), c.querySelector('dd')!.textContent!.trim()]);
    expect(cifras).toEqual([['Cursos inscritos', '1'], ['En lista de espera', '1'], ['Clases hoy', '1']]);
  });

  it('si hay clase hoy lo anuncia arriba; si no, no muestra el aviso', async () => {
    await montar('Alumno', [curso({ horarios: [{ ...curso().horarios[0], dia: dia() }] })]);
    expect(q('.banner-hoy').textContent).toContain('tienes 1 clase');
    expect(q('.banner-hoy').getAttribute('role')).toBe('status');
    TestBed.resetTestingModule();
    await montar('Alumno', [curso()]);
    expect(el().querySelector('.banner-hoy')).toBeNull();
  });

  it('"Ver grupo" lleva al detalle del grupo, donde se puede cancelar la inscripción', async () => {
    await montar('Alumno', [curso()]);
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);
    q<HTMLButtonElement>('button.btn-grupo').click();
    expect(navegar).toHaveBeenCalledWith(['/inscripcion-grupo', 'Semillero', 'natacion', 2026, 2]);
  });

  it('sin cursos, "Explorar cursos" lleva al inicio', async () => {
    await montar('Alumno', []);
    expect(el().querySelector('.cifras')).toBeNull();
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);
    q<HTMLButtonElement>('.vacio .btn-principal').click();
    expect(navegar).toHaveBeenCalledWith(['/home']);
  });

  it('otro rol ve un aviso informativo (no una frase suelta), sin tarjetas ni botón de notificaciones', async () => {
    await montar('Coordinador', []);
    expect(q('.msg-rol').textContent).toContain('exclusiva para el rol Alumno');
    expect(el().querySelector('.tarjeta-perfil')).toBeNull();
    expect(el().querySelector('app-tarjetas-cursos-alumno')).toBeNull();
    expect(el().querySelector('.barra-titulo .btn-secundario')).toBeNull();
  });
});
