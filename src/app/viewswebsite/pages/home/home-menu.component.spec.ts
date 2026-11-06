import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { HomeComponent } from './home.component';
import { HeaderComponent } from '../header/header.component';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { CategoriaService } from 'src/app/services/categoria.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { TokenInterchangeService } from 'src/app/services/token-interchange.service';
import { CategoriaDTO } from 'src/app/Models/DTOs/categoria-dto';

@Component({ selector: 'app-sidenav', standalone: true, template: '<nav class="menu-lateral">menu</nav><ng-content></ng-content>' })
class SidenavStub {}

@Component({ selector: 'app-header', standalone: true, template: '<header class="cabecera-simple">cabecera</header>' })
class HeaderStub {}

/** Renderiza la plantilla REAL de HomeComponent (a diferencia de home.component.spec.ts, que la reemplaza). */
describe('HomeComponent › menú lateral según el rol', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let perfil$: BehaviorSubject<string>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const categoria = (titulo: string): CategoriaDTO => ({ titulo, descripcion: 'd', imagen: 0 } as unknown as CategoriaDTO);

  beforeEach(async () => {
    perfil$ = new BehaviorSubject<string>('Coordinador');
    sessionStorage.setItem('dpt_token', 'token');
    const categorias = jasmine.createSpyObj('CategoriaService', ['getCategorias']);
    categorias.getCategorias.and.returnValue(of([categoria('Seleccionados'), categoria('Recreativo')]));

    await TestBed.configureTestingModule({
      imports: [HomeComponent, NoopAnimationsModule],
      providers: [
        { provide: CategoriaService, useValue: categorias },
        { provide: ImagenService, useValue: jasmine.createSpyObj('ImagenService', ['getimagen']) },
        { provide: PerfilService, useValue: { perfil$ } },
        { provide: TokenInterchangeService, useValue: { tokenReady$: of() } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false, breakpoints: {} }) } },
      ],
    })
      .overrideComponent(HomeComponent, {
        remove: { imports: [HeaderComponent, SidenavComponent] },
        add: { imports: [HeaderStub, SidenavStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  afterEach(() => sessionStorage.removeItem('dpt_token'));

  it('Coordinador: el inicio se muestra dentro del menú lateral (Home, Instructores, Reportes) y sin la cabecera simple', () => {
    expect(el().querySelector('app-sidenav')).not.toBeNull();
    expect(el().querySelector('app-header')).toBeNull();
  });

  it('Coordinador: el contenido del inicio (título y categorías) está DENTRO del menú lateral, una sola vez', () => {
    expect(el().querySelectorAll('h1.title-one:not(.modal-title)').length).toBe(1);
    expect(el().querySelector('app-sidenav h1.title-one:not(.modal-title)')?.textContent).toContain('Deporte para todos');
    expect(el().querySelectorAll('app-sidenav mat-card').length).toBe(2);
    expect(el().querySelector('app-sidenav .btnAgregar')?.textContent).toContain('Nueva categoría curso');
  });

  for (const rol of ['Instructor', 'Alumno']) {
    it(`${rol}: el inicio se muestra dentro del menú lateral (Home, Mis cursos), sin cabecera simple y sin acciones de Coordinador`, () => {
      perfil$.next(rol);
      fixture.detectChanges();
      expect(el().querySelector('app-sidenav')).not.toBeNull();
      expect(el().querySelector('app-header')).toBeNull();
      expect(el().querySelectorAll('h1.title-one:not(.modal-title)').length).toBe(1);
      expect(el().querySelector('app-sidenav h1.title-one:not(.modal-title)')?.textContent).toContain('Deporte para todos');
      expect(el().querySelectorAll('app-sidenav mat-card').length).toBe(2);
      expect(el().querySelector('.btnAgregar')).toBeNull();
      expect(el().querySelector('.btn-menu')).toBeNull();
    });
  }

  it('visitante sin sesión: cabecera de siempre y sin menú lateral', () => {
    perfil$.next('');
    fixture.detectChanges();
    expect(el().querySelector('app-header')).not.toBeNull();
    expect(el().querySelector('app-sidenav')).toBeNull();
  });

  it('al cambiar de rol el diseño cambia sin duplicar el contenido', () => {
    perfil$.next('Instructor');
    fixture.detectChanges();
    perfil$.next('Coordinador');
    fixture.detectChanges();
    expect(el().querySelector('app-sidenav')).not.toBeNull();
    expect(el().querySelector('app-header')).toBeNull();
    expect(el().querySelectorAll('h1.title-one:not(.modal-title)').length).toBe(1);
  });

  describe('diseño del inicio (lineamiento UX-UI)', () => {
    it('la rejilla de tarjetas es una grilla CSS responsive, no un mat-grid-list de alto fijo', () => {
      expect(el().querySelector('mat-grid-list')).toBeNull();
      const rejilla = el().querySelector('.rejilla') as HTMLElement;
      expect(getComputedStyle(rejilla).display).toBe('grid');
    });

    it('ya no muestra el texto de prueba "NOTA:" sino una descripción', () => {
      expect(el().textContent).not.toContain('NOTA:');
      expect(el().querySelector('.descripcion')?.textContent).toContain('Administre las categorías deportivas');
    });

    it('Instructor: el mensaje habla de gestionar la asistencia y los cursos a su cargo', () => {
      perfil$.next('Instructor');
      fixture.detectChanges();
      const texto = el().querySelector('.descripcion')?.textContent ?? '';
      expect(texto).toContain('Gestione la asistencia');
      expect(texto).toContain('cursos a su cargo');
      expect(texto).not.toContain('Administre');
      expect(el().querySelector('.chip-rol')?.textContent).toContain('Rol: Instructor');
    });

    describe('Alumno: consulta sus cursos e inscribe; se muestra su tipo de vínculo', () => {
      afterEach(() => sessionStorage.removeItem('dpt_perfil'));

      for (const tipo of ['Estudiante', 'Docente', 'Administrativo', 'Contratista']) {
        it(`${tipo}: mensaje de consulta e inscripción y rol "${tipo}"`, () => {
          sessionStorage.setItem('dpt_perfil', JSON.stringify({ tipoAlumno: tipo }));
          perfil$.next('Alumno');
          fixture.detectChanges();
          const texto = el().querySelector('.descripcion')?.textContent ?? '';
          expect(texto).toContain('Consulte sus cursos');
          expect(texto).toContain('inscríbase');
          expect(el().querySelector('.chip-rol')?.textContent).toContain(`Rol: ${tipo}`);
          expect(el().textContent).not.toContain('Alumno');
        });
      }
    });

    it('muestra el rol del usuario en una insignia', () => {
      expect(el().querySelector('.chip-rol')?.textContent).toContain('Rol: Coordinador');
    });

    it('cada tarjeta tiene imagen accionable con nombre accesible, descripción y enlace "Ver información"', () => {
      const tarjeta = el().querySelector('mat-card') as HTMLElement;
      const imagen = tarjeta.querySelector('button.img-container') as HTMLButtonElement;
      expect(imagen.getAttribute('aria-label')).toBe('Ver cursos de Seleccionados');
      expect(tarjeta.querySelector('.descripcion-categoria')?.textContent).toContain('d');
      expect(tarjeta.querySelector('.enlace-tarjeta')?.textContent).toContain('Ver información');
    });

    it('ya no incluye el modal de Bootstrap: "Ver información" usa un diálogo de Material', () => {
      expect(el().querySelector('#exampleModal')).toBeNull();
      expect(el().querySelector('.modal')).toBeNull();
    });

    /** Columnas esperadas según el ancho de la ventana: 1 en móvil, 2 hasta 1099px y 3 desde 1100px. */
    const columnasEsperadas = (): number =>
      window.matchMedia('(min-width: 1100px)').matches ? 3 : window.matchMedia('(min-width: 576px)').matches ? 2 : 1;

    it('la rejilla usa 1, 2 o 3 columnas iguales según el ancho de la ventana (3 por fila en escritorio, como el prototipo)', () => {
      const rejilla = el().querySelector('.rejilla') as HTMLElement;
      const columnas = getComputedStyle(rejilla).gridTemplateColumns.split(' ').filter(Boolean).map(parseFloat);
      expect(columnas.length).toBe(columnasEsperadas());
      columnas.forEach(c => expect(Math.abs(c - columnas[0])).toBeLessThan(1));
    });

    it('en una pantalla ancha (contenedor de 1380px) las tarjetas miden unos 444px: ni diminutas ni enormes', () => {
      const rejilla = el().querySelector('.rejilla') as HTMLElement;
      rejilla.style.width = '1380px';
      const ancho = parseFloat(getComputedStyle(rejilla).gridTemplateColumns.split(' ')[0]);
      if (columnasEsperadas() === 3) {
        expect(ancho).toBeGreaterThan(420);
        expect(ancho).toBeLessThan(460);
      } else {
        expect(ancho).toBeGreaterThan(300); // ventana de pruebas más angosta: 2 columnas de ~678px
      }
    });

    it('las tarjetas de la rejilla se alinean al inicio, bajo el título de la sección', () => {
      const rejilla = el().querySelector('.rejilla') as HTMLElement;
      expect(getComputedStyle(rejilla).justifyContent).toMatch(/start|flex-start|normal/);
    });

    it('las tarjetas tienen 12px de radio', () => {
      const tarjeta = el().querySelector('mat-card') as HTMLElement;
      expect(getComputedStyle(tarjeta).borderTopLeftRadius).toBe('12px');
    });

    it('el título de la página usa Titillium Web', () => {
      const h1 = el().querySelector('h1.title-one:not(.modal-title)') as HTMLElement;
      expect(getComputedStyle(h1).fontFamily.toLowerCase()).toContain('titillium web');
    });
  });
});
