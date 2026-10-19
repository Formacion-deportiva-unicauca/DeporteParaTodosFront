import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';

import { ConfirmarSinAsistentesComponent } from './confirmar-sin-asistentes.component';

describe('ConfirmarSinAsistentesComponent', () => {
  let fixture: ComponentFixture<ConfirmarSinAsistentesComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ConfirmarSinAsistentesComponent>>;
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const boton = (clase: string): HTMLButtonElement => el().querySelector(`button.${clase}`) as HTMLButtonElement;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [ConfirmarSinAsistentesComponent, NoopAnimationsModule],
      providers: [{ provide: MatDialogRef, useValue: dialogRef }],
    }).compileComponents();
    fixture = TestBed.createComponent(ConfirmarSinAsistentesComponent);
    fixture.detectChanges();
  });

  it('muestra el mensaje exacto de confirmación', () => {
    expect(el().querySelector('.texto-confirmacion')?.textContent?.replace(/\s+/g, ' ').trim())
      .toBe('Ningún alumno marcado: todos quedarán con falta. ¿Continuar?');
  });

  it('tiene título y los botones "Continuar" y "Volver"', () => {
    expect(el().querySelector('h2')?.textContent?.trim()).toBe('Registrar el día sin asistentes');
    expect(boton('btn-confirmar').textContent?.trim()).toBe('Continuar');
    expect(boton('btn-volver').textContent?.trim()).toBe('Volver');
  });

  it('"Continuar" cierra con true', () => {
    boton('btn-confirmar').click();
    expect(dialogRef.close).toHaveBeenCalledOnceWith(true);
  });

  it('un segundo clic en "Continuar" no vuelve a aceptar', () => {
    boton('btn-confirmar').click();
    boton('btn-confirmar').click();
    expect(dialogRef.close).toHaveBeenCalledTimes(1);
  });

  it('"Volver" cierra con false', () => {
    boton('btn-volver').click();
    expect(dialogRef.close).toHaveBeenCalledOnceWith(false);
  });

  it('la X tiene aria-label="Cerrar diálogo" y cierra sin confirmar', () => {
    const x = boton('close-button');
    expect(x.getAttribute('aria-label')).toBe('Cerrar diálogo');
    x.click();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('"Volver" tiene el foco inicial (la acción segura)', () => {
    expect(boton('btn-volver').hasAttribute('cdkfocusinitial')).toBeTrue();
  });
});
