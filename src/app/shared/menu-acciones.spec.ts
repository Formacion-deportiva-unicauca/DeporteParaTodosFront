import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { IconoEngranajeComponent } from './icono-engranaje/icono-engranaje.component';

@Component({
  standalone: true,
  imports: [MatMenuModule, MatIconModule, MatButtonModule, IconoEngranajeComponent],
  template: `
    <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Acciones"><app-icono-engranaje></app-icono-engranaje></button>
    <mat-menu #menu="matMenu">
      <button mat-menu-item class="m-actualizar"><mat-icon fontSet="material-icons-outlined">edit</mat-icon><span>Actualizar</span></button>
      <button mat-menu-item class="accion-eliminar m-eliminar"><mat-icon fontSet="material-icons-outlined">delete</mat-icon><span>Eliminar</span></button>
    </mat-menu>`,
})
class MenuPruebaComponent {}

/** Menú de acciones (engranaje) según el lineamiento UX-UI: panel redondeado, ítems de 48px, iconos de contorno, error en naranja. */
describe('Menú de acciones (engranaje)', () => {
  let fixture: ComponentFixture<MenuPruebaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MenuPruebaComponent, NoopAnimationsModule] });
    fixture = TestBed.createComponent(MenuPruebaComponent);
    fixture.detectChanges();
    fixture.debugElement.children[0].injector.get(MatMenuTrigger).openMenu();
    fixture.detectChanges();
  });

  const panel = (): HTMLElement => document.querySelector('.mat-mdc-menu-panel') as HTMLElement;
  const item = (clase: string): HTMLElement => document.querySelector(clase) as HTMLElement;

  afterEach(() => fixture.debugElement.children[0].injector.get(MatMenuTrigger).closeMenu());

  it('el panel tiene 12px de radio (como las tarjetas) y al menos 240px de ancho', () => {
    const estilo = getComputedStyle(panel());
    expect(estilo.borderTopLeftRadius).toBe('12px');
    expect(parseFloat(estilo.minWidth)).toBeGreaterThanOrEqual(240);
  });

  it('cada ítem mide al menos 48px de alto (objetivo táctil) y usa el texto de cuerpo de 16px', () => {
    const a = item('.m-actualizar');
    expect(a.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);
    expect(getComputedStyle(a.querySelector('.mat-mdc-menu-item-text') as HTMLElement).fontSize).toBe('16px');
  });

  it('los iconos son de contorno, de 24px y en gris (no en negro)', () => {
    const icono = item('.m-actualizar').querySelector('mat-icon') as HTMLElement;
    expect(icono.classList).toContain('material-icons-outlined');
    expect(getComputedStyle(icono).width).toBe('24px');
    expect(getComputedStyle(icono).color).toBe('rgb(91, 91, 107)');
  });

  it('"Eliminar" usa el rol de error (naranja oscuro), nunca rojo, en texto e icono', () => {
    const e = item('.m-eliminar');
    expect(getComputedStyle(e.querySelector('.mat-mdc-menu-item-text') as HTMLElement).color).toBe('rgb(154, 65, 0)');
    expect(getComputedStyle(e.querySelector('mat-icon') as HTMLElement).color).toBe('rgb(154, 65, 0)');
  });
});
