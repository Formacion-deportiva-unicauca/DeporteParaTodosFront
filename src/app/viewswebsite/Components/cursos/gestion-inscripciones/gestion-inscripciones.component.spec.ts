import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { GestionInscripcionesComponent } from './gestion-inscripciones.component';

describe('GestionInscripcionesComponent', () => {
  let fixture: ComponentFixture<GestionInscripcionesComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<GestionInscripcionesComponent>>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(s: string): T => el().querySelector(s) as T;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [GestionInscripcionesComponent, NoopAnimationsModule],
      providers: [{ provide: MatDialogRef, useValue: dialogRef }],
    }).compileComponents();
    fixture = TestBed.createComponent(GestionInscripcionesComponent);
    fixture.detectChanges();
  });

  it('el título es un h2 de diálogo con el estilo compartido', () => {
    expect(q('h2[mat-dialog-title].title-two').textContent?.trim()).toBe('Configurar inscripciones');
  });

  it('Cancelar cierra el diálogo (antes no hacía nada y el usuario quedaba atrapado)', () => {
    q<HTMLButtonElement>('button.cancelar').click();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('el botón X cierra el diálogo y tiene nombre accesible', () => {
    const x = q<HTMLButtonElement>('button.close-button');
    expect(x.getAttribute('aria-label')).toBe('Cerrar diálogo');
    x.click();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('las acciones siguen la convención: Cancelar a la izquierda (contorno) y Guardar a la derecha (principal)', () => {
    const botones = Array.from(el().querySelectorAll('.form-buttons button')).map(b => b.textContent?.trim());
    expect(botones).toEqual(['Cancelar', 'Guardar']);
  });

  it('el diálogo ya no se posiciona con position: fixed (es un diálogo de Material)', () => {
    const contenedor = q('.dialog-content');
    expect(getComputedStyle(contenedor).position).not.toBe('fixed');
  });

  it('Guardar cierra el diálogo', () => {
    q<HTMLButtonElement>('button.aceptar').click();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
