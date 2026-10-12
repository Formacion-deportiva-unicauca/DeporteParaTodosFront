import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OAuthService } from 'angular-oauth2-oidc';

import { FormCursoDeportiviComponent } from '../cursos/form-curso-deportivo/form-curso-deportivi.component';
import { FormGruposComponent } from '../cursos/form-grupos/form-grupos.component';
import { NuevoCursoCategoriaComponent } from '../cursos/nuevo-curso-categoria/nuevo-curso-categoria.component';
import { FormAlertaComponent } from '../usuarios/form-alerta/form-alerta.component';
import { FormInscripcionesComponent } from '../usuarios/form-inscripciones/form-inscripciones.component';
import { DialogComponent } from './dialog.component';

/**
 * Accesibilidad: el botón X (solo icono) de cada diálogo debe tener nombre accesible.
 * DialogComponent ya lo tenía; se incluye como referencia.
 */
const dialogos: [string, Type<unknown>][] = [
  ['DialogComponent', DialogComponent],
  ['FormCursoDeportiviComponent', FormCursoDeportiviComponent],
  ['FormGruposComponent', FormGruposComponent],
  ['NuevoCursoCategoriaComponent', NuevoCursoCategoriaComponent],
  ['FormAlertaComponent', FormAlertaComponent],
  ['FormInscripcionesComponent', FormInscripcionesComponent],
];

// Los cinco que tenían estilo en línea (DialogComponent usa su propia hoja de estilos).
const formularios = dialogos.filter(([nombre]) => nombre !== 'DialogComponent');

async function renderizar(componente: Type<unknown>): Promise<ComponentFixture<unknown>> {
  await TestBed.configureTestingModule({
    imports: [componente, HttpClientTestingModule, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      {
        provide: MAT_DIALOG_DATA,
        useValue: { categoria: 'C', curso: 'X', anio: 0, iterable: 0, rol: 'Alumno', elemento: 'e', nombreElemento: 'n', tipoElemento: 'categoria' },
      },
      { provide: MatDialogRef, useValue: { close: () => {}, afterClosed: () => of(null) } },
      {
        provide: OAuthService,
        useValue: {
          configure: () => {}, setupAutomaticSilentRefresh: () => {}, events: of(),
          loadDiscoveryDocumentAndTryLogin: () => Promise.resolve(), getIdentityClaims: () => null,
          hasValidAccessToken: () => false, hasValidIdToken: () => false,
        },
      },
    ],
  })
    // Solo para el test: FormAlertaComponent usa matInput sin importar MatInputModule y no renderiza sin él
    // (defecto previo, fuera del alcance de este cambio).
    .overrideComponent(componente, { add: { imports: [MatInputModule] } })
    .compileComponents();
  const fixture = TestBed.createComponent(componente);
  fixture.detectChanges();
  return fixture;
}

const botonX = (fixture: ComponentFixture<unknown>): HTMLButtonElement | null =>
  (fixture.nativeElement as HTMLElement).querySelector('button.close-button');

describe('Botón X (cerrar) de los diálogos', () => {
  dialogos.forEach(([nombre, componente]) => {
    describe(nombre, () => {
      let fixture: ComponentFixture<unknown>;

      beforeEach(async () => {
        fixture = await renderizar(componente);
      });

      it('tiene aria-label="Cerrar diálogo"', () => {
        expect(botonX(fixture)).not.toBeNull();
        expect(botonX(fixture)!.getAttribute('aria-label')).toBe('Cerrar diálogo');
      });

      it('conserva el icono close', () => {
        expect(botonX(fixture)!.textContent).toContain('close');
      });
    });
  });

  formularios.forEach(([nombre, componente]) => {
    it(`${nombre}: el float del botón X va en la hoja de estilos, no en estilo en línea`, async () => {
      const fixture = await renderizar(componente);
      const x = botonX(fixture)!;
      expect(x.getAttribute('style')).toBeNull();
      expect(getComputedStyle(x).float).toBe('right');
    });
  });
});
