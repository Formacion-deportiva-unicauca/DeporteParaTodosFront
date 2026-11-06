import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ListaInstructoresComponent } from './lista-instructores.component';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { AuthService } from 'src/app/services/auth.service';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { InstructorDTO } from 'src/app/Models/DTOs/instructor-dto';
import { PlazoCargaDTO } from 'src/app/Models/DTOs/plazo-carga-dto';

const ana: InstructorDTO = { id: '1001', nombre: 'Ana Gómez', correo: 'ana@unicauca.edu.co', sexo: 'F' };
const luis: InstructorDTO = { id: '1002', nombre: 'Luis Pérez', correo: 'luis@unicauca.edu.co', sexo: 'M' };
const plazo = (idInstructor: string, estadoReporte: PlazoCargaDTO['estadoReporte']): PlazoCargaDTO =>
  ({ idInstructor, anio: 2026, periodo: 2, estadoReporte, fechaLimite: '2026-10-29', plazoVencido: false } as PlazoCargaDTO);

/** Vista de instructores del Coordinador según el prototipo y el lineamiento UX-UI. */
describe('ListaInstructoresComponent › diseño de la vista (prototipo)', () => {
  let fixture: ComponentFixture<ListaInstructoresComponent>;
  let component: ListaInstructoresComponent;
  let instructores: jasmine.SpyObj<InstructorServisce>;
  let avisos: jasmine.SpyObj<NotificacionService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let router: Router;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(s: string): T => el().querySelector(s) as T;

  async function montar(rol = 'Coordinador'): Promise<void> {
    instructores = jasmine.createSpyObj('InstructorServisce', ['getInstructores', 'getPlazosCarga']);
    instructores.getInstructores.and.returnValue(of([ana, luis]));
    instructores.getPlazosCarga.and.returnValue(of([plazo('1001', 'GENERADO'), plazo('1002', 'PENDIENTE')]));
    avisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    await TestBed.configureTestingModule({
      imports: [ListaInstructoresComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: InstructorServisce, useValue: instructores },
        { provide: PerfilService, useValue: { perfil$: new BehaviorSubject<string>(rol) } },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'getProfile', 'isAuthenticated', 'verificarUsuario']) },
        { provide: NotificacionService, useValue: avisos },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ListaInstructoresComponent);
    component = fixture.componentInstance;
    // MatDialogModule standalone crea su propia instancia: se espía la inyectada en el componente.
    dialog = component['dialog'] as jasmine.SpyObj<MatDialog>;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }

  describe('Coordinador', () => {
    beforeEach(montar.bind(null, 'Coordinador'));

    it('muestra la ruta de navegación y el título "Instructores" con la línea secundaria', () => {
      const migas = q('nav.migas');
      expect(migas.textContent).toContain('Inicio');
      expect(migas.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Instructores');
      expect(q('h1.titulo-pagina').textContent?.trim()).toBe('Instructores');
      expect(getComputedStyle(q('h1.titulo-pagina'), '::after').height).toBe('4px');
    });

    it('el enlace "Inicio" navega a /home sin recargar la página', () => {
      const navegar = spyOn(router, 'navigate').and.resolveTo(true);
      (q('nav.migas a')).click();
      expect(navegar).toHaveBeenCalledWith(['/home']);
    });

    it('ya no hay el selector de relleno ("Selecciona / Semilleros / Recreativo") que no hacía nada', () => {
      expect(el().querySelector('select')).toBeNull();
    });

    it('el buscador tiene etiqueta, icono de lupa, 52px de alto y 4px de radio', () => {
      const campo = q<HTMLInputElement>('input#buscar-instructor');
      expect(q('label[for="buscar-instructor"]').textContent?.trim()).toBe('Buscar instructor');
      expect(q('.entrada-busqueda mat-icon').textContent?.trim()).toBe('search');
      const estilo = getComputedStyle(campo);
      expect(parseFloat(estilo.height)).toBeGreaterThanOrEqual(48);
      expect(estilo.borderTopLeftRadius).toBe('4px');
    });

    it('"Agregar instructor" es un botón principal en píldora, en mayúsculas y de al menos 44px', () => {
      const boton = q<HTMLButtonElement>('button.btnAgregar');
      const estilo = getComputedStyle(boton);
      expect(boton.textContent).toContain('Agregar instructor');
      expect(estilo.textTransform).toBe('uppercase');
      expect(estilo.backgroundColor).toBe('rgb(0, 0, 102)');
      expect(parseFloat(estilo.height)).toBeGreaterThanOrEqual(44);
      expect(parseFloat(estilo.borderTopLeftRadius)).toBeGreaterThanOrEqual(22);
    });

    it('la cantidad se resalta como cifra y el texto que anuncia el lector sigue siendo "2 instructores"', () => {
      expect(q('.estado-lista .cifra').textContent?.trim()).toBe('2');
      expect(q('.estado-lista').textContent?.trim()).toBe('2 instructores');
      expect(q('.estado-lista').getAttribute('aria-live')).toBe('polite');
    });

    it('el seguimiento de reportes es un aviso informativo con título e icono, no un párrafo suelto', () => {
      const banner = q('.banner-info');
      expect(banner.querySelector('mat-icon')?.textContent?.trim()).toBe('bar_chart');
      expect(banner.querySelector('.banner-titulo')?.textContent?.trim()).toBe('Seguimiento de reportes');
      expect(banner.querySelector('.aviso-reportes')?.textContent?.trim()).toContain('1 instructor aún no ha generado');
    });

    it('el estado del reporte es un chip con icono y texto; cada estado tiene su propio color', () => {
      const chips = Array.from(el().querySelectorAll<HTMLElement>('.chip-reporte'));
      const colores = chips.map(c => getComputedStyle(c).backgroundColor);
      expect(chips.map(c => c.dataset['estado'])).toEqual(['GENERADO', 'PENDIENTE']);
      expect(new Set(colores).size).toBe(2);
      expect(chips.every(c => c.querySelector('mat-icon') && c.querySelector('.texto-reporte')?.textContent?.trim())).toBeTrue();
      expect(parseFloat(getComputedStyle(chips[0]).borderTopLeftRadius)).toBeGreaterThanOrEqual(12);
    });

    it('cada fila ofrece prórroga, editar y eliminar como botones de 44px con nombre accesible y tooltip', () => {
      const fila = el().querySelector('tr[mat-row]') as HTMLElement;
      const botones = Array.from(fila.querySelectorAll<HTMLButtonElement>('.acciones-fila button'));
      expect(botones.map(b => b.getAttribute('aria-label'))).toEqual([
        'Asignar prórroga a Ana Gómez', 'Editar instructor Ana Gómez', 'Eliminar instructor Ana Gómez',
      ]);
      expect(botones.every(b => !!b.title)).toBeTrue();
      botones.forEach(b => {
        const caja = b.getBoundingClientRect();
        expect(caja.width).toBeGreaterThanOrEqual(44);
        expect(caja.height).toBeGreaterThanOrEqual(44);
        expect(b.querySelector('mat-icon')?.classList).toContain('material-icons-outlined');
      });
    });

    it('"Eliminar" usa el naranja de error del lineamiento, nunca rojo', () => {
      const eliminar = q<HTMLButtonElement>('.btn-eliminar-fila');
      expect(getComputedStyle(eliminar).color).toBe('rgb(154, 65, 0)');
    });

    it('"Asignar prórroga" está deshabilitado sin selección y con el estilo de botón secundario', () => {
      const boton = q<HTMLButtonElement>('button.btn-prorroga-masiva');
      expect(boton.disabled).toBeTrue();
      expect(getComputedStyle(boton).textTransform).toBe('uppercase');
      component.alternar('1001', true);
      fixture.detectChanges();
      expect(boton.disabled).toBeFalse();
    });

    it('cada celda lleva su etiqueta (data-label) para verse como tarjeta en móvil', () => {
      const primeraFila = el().querySelector('tr[mat-row]') as HTMLElement;
      const etiquetas = Array.from(primeraFila.querySelectorAll('td')).map(td => td.getAttribute('data-label'));
      expect(etiquetas).toEqual(['Seleccionar', 'Identificación', 'Nombre', 'Correo', 'Reporte', 'Acciones']);
    });

    it('el botón "Seleccionar todos" (móvil) selecciona y quita a los instructores mostrados', () => {
      const boton = q<HTMLButtonElement>('.btn-todos-movil');
      boton.click();
      fixture.detectChanges();
      expect(component.seleccionados.size).toBe(2);
      expect(boton.textContent?.trim()).toBe('Quitar selección de todos');
      boton.click();
      fixture.detectChanges();
      expect(component.seleccionados.size).toBe(0);
    });
  });

  describe('avisos de esta vista', () => {
    beforeEach(montar.bind(null, 'Coordinador'));

    it('al registrar un instructor avisa con éxito y recarga la lista', () => {
      spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of({ confirmacionCreacion: true }) } as any);
      instructores.getInstructores.calls.reset();
      component.registroInstructor();
      expect(avisos.exito).toHaveBeenCalledOnceWith('Instructor registrado', 'El instructor se registró y ya aparece en la lista.');
      expect(instructores.getInstructores).toHaveBeenCalledTimes(1);
    });

    it('si cancela el registro no avisa', () => {
      spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);
      component.registroInstructor();
      expect(avisos.exito).not.toHaveBeenCalled();
    });

    it('si no se puede cargar la lista de instructores avisa con la notificación de error', () => {
      instructores.getInstructores.and.returnValue(throwError(() => ({ status: 500 })));
      component['cargarInstructores']();
      expect(avisos.error).toHaveBeenCalledOnceWith('No se pudieron cargar los instructores', 'Revise su conexión e intente de nuevo.');
    });
  });

  describe('otros roles', () => {
    beforeEach(montar.bind(null, 'Instructor'));

    it('sin Coordinador no hay acciones, selección, reporte ni "Agregar instructor"', () => {
      expect(el().querySelector('button.btnAgregar')).toBeNull();
      expect(el().querySelector('.acciones-fila')).toBeNull();
      expect(el().querySelector('.contador-seleccion')).toBeNull();
      expect(el().querySelector('.barra-seleccion')).toBeNull();
      expect(el().querySelector('.banner-info')).toBeNull();
    });
  });
});
