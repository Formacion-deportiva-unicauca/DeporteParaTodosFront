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
    it(`${rol}: sigue con la cabecera de siempre, sin menú lateral, y con el contenido una sola vez`, () => {
      perfil$.next(rol);
      fixture.detectChanges();
      expect(el().querySelector('app-header')).not.toBeNull();
      expect(el().querySelector('app-sidenav')).toBeNull();
      expect(el().querySelectorAll('h1.title-one:not(.modal-title)').length).toBe(1);
      expect(el().querySelectorAll('mat-card').length).toBe(2);
      expect(el().querySelector('.btnAgregar')).toBeNull();
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
});
