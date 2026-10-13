import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DateAdapter, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { FormPlazoCargaComponent } from './form-plazo-carga.component';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { FechaEsAdapter } from 'src/app/shared/fecha-es.adapter';

/**
 * Regresión: dentro de un MatDialog REAL el calendario no abría
 * ("MatDatepicker: No provider found for MAT_DATE_FORMATS"). Los specs con un MatDialogRef simulado no lo veían.
 * Aquí se replica la configuración de la raíz de la app (app.module): MatNativeDateModule + locale + adaptador.
 */
describe('Calendario del plazo de carga dentro de un MatDialog real', () => {
  const errores: string[] = [];
  let consolaOriginal: typeof console.error;

  const abrirDialogo = async (): Promise<MatDialogRef<FormPlazoCargaComponent>> => {
    await TestBed.configureTestingModule({
      imports: [MatDialogModule, BrowserAnimationsModule, MatNativeDateModule],
      providers: [
        { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
        { provide: DateAdapter, useClass: FechaEsAdapter },
        { provide: InstructorServisce, useValue: { asignarPlazoCarga: () => of({}) } },
      ],
    }).compileComponents();
    const ref = TestBed.inject(MatDialog).open(FormPlazoCargaComponent, {
      data: { id: 'I', nombre: 'N', fechaActual: null, estado: 'SIN_PLAZO', plazoVencido: false, anio: 2026, periodo: 2 },
    });
    const app = TestBed.inject(ApplicationRef);
    app.tick();
    await new Promise(r => setTimeout(r, 300));
    app.tick();
    return ref;
  };

  const tick = async (): Promise<void> => {
    TestBed.inject(ApplicationRef).tick();
    await new Promise(r => setTimeout(r, 300));
    TestBed.inject(ApplicationRef).tick();
  };

  beforeEach(() => {
    errores.length = 0;
    consolaOriginal = console.error;
    console.error = (...args: unknown[]) => { errores.push(args.map(String).join(' ')); };
  });

  afterEach(() => {
    console.error = consolaOriginal;
    TestBed.inject(MatDialog).closeAll();
  });

  it('el botón del calendario abre el calendario sin errores', async () => {
    await abrirDialogo();
    (document.querySelector('mat-datepicker-toggle button') as HTMLButtonElement).click();
    await tick();
    expect(document.querySelector('mat-calendar')).not.toBeNull();
    expect(errores).toEqual([]);
  });

  it('con el teclado: Alt+↓ en el campo abre el calendario', async () => {
    await abrirDialogo();
    (document.querySelector('input#fechaLimite') as HTMLInputElement)
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, altKey: true, bubbles: true } as KeyboardEventInit));
    await tick();
    expect(document.querySelector('mat-calendar')).not.toBeNull();
    expect(errores).toEqual([]);
  });

  it('se puede escribir la fecha a mano dentro del diálogo real y se refleja en el texto anunciado', async () => {
    await abrirDialogo();
    const campo = document.querySelector('input#fechaLimite') as HTMLInputElement;
    campo.value = '15/11/2026';
    campo.dispatchEvent(new Event('input'));
    await tick();
    expect(document.querySelector('.fecha-elegida')?.textContent).toContain('15 de noviembre de 2026');
  });

  it('elegir un día en el calendario lo escribe en el campo en dd/MM/yyyy y cierra el calendario', async () => {
    await abrirDialogo();
    (document.querySelector('mat-datepicker-toggle button') as HTMLButtonElement).click();
    await tick();
    const dia = document.querySelector('.mat-calendar-body-cell:not(.mat-calendar-body-disabled)') as HTMLElement;
    dia.click();
    await tick();
    const campo = document.querySelector('input#fechaLimite') as HTMLInputElement;
    expect(campo.value).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    expect(document.querySelector('mat-calendar')).toBeNull();
  });
});
