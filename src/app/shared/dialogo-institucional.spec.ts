import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OPCIONES_DIALOGO } from './dialogo-institucional';

@Component({ standalone: true, template: '<p>contenido</p>' })
class DialogoPrueba {}

/** Diálogo con la estructura del diseño del prototipo, para comprobar los estilos dentro de un contenedor real de Material. */
@Component({
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <header class="dlg-cabecera">
      <div>
        <span class="dlg-eyebrow">Gestión de grupos</span>
        <h2 mat-dialog-title class="dlg-titulo">Editar grupo</h2>
      </div>
      <button mat-icon-button type="button" class="close-button" matDialogClose aria-label="Cerrar diálogo">
        <mat-icon>close</mat-icon>
      </button>
    </header>
    <mat-dialog-content class="dlg-cuerpo"><p>cuerpo</p></mat-dialog-content>`,
})
class DialogoConCabecera {}

/** Diálogo más alto que cualquier pantalla, con cabecera, cuerpo y pie como hijos directos del componente. */
@Component({
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <header class="dlg-cabecera"><div><h2 mat-dialog-title class="dlg-titulo">Muy alto</h2></div></header>
    <mat-dialog-content class="dlg-cuerpo"><div style="height: 3000px">contenido largo</div></mat-dialog-content>
    <mat-dialog-actions class="dlg-pie"><button mat-button class="aceptar">Guardar</button></mat-dialog-actions>`,
})
class DialogoMuyAlto {}

/** Igual, pero con todo dentro de un formulario (así están los formularios de la app). */
@Component({
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <form class="dlg-form">
      <header class="dlg-cabecera"><div><h2 mat-dialog-title class="dlg-titulo">Muy alto</h2></div></header>
      <mat-dialog-content class="dlg-cuerpo"><div style="height: 3000px">contenido largo</div></mat-dialog-content>
      <mat-dialog-actions class="dlg-pie"><button mat-button class="aceptar" type="submit">Guardar</button></mat-dialog-actions>
    </form>`,
})
class FormularioMuyAlto {}

describe('opciones por defecto de los diálogos', () => {
  it('todos los diálogos reciben la clase "dialogo-institucional" y un ancho máximo de 90vw', () => {
    expect(OPCIONES_DIALOGO.panelClass).toBe('dialogo-institucional');
    expect(OPCIONES_DIALOGO.maxWidth).toBe('90vw');
  });

  it('al abrir un diálogo, su panel lleva la clase que la hoja de estilos usa para ocupar todo el ancho en móvil', () => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule, NoopAnimationsModule],
      providers: [{ provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: OPCIONES_DIALOGO }],
    });
    const dialog = TestBed.inject(MatDialog);
    dialog.open(DialogoPrueba);
    const panel = document.querySelector('.cdk-overlay-pane');
    expect(panel?.classList).toContain('dialogo-institucional');
    dialog.closeAll();
  });

  it('dentro de un diálogo real, el título conserva Titillium Web, 24px y azul primario (Material no lo pisa)', () => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule, NoopAnimationsModule],
      providers: [{ provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: OPCIONES_DIALOGO }],
    });
    const dialog = TestBed.inject(MatDialog);
    dialog.open(DialogoConCabecera);
    const titulo = document.querySelector('.cdk-overlay-container h2.dlg-titulo') as HTMLElement;
    const estilo = getComputedStyle(titulo);
    expect(estilo.fontFamily.toLowerCase()).toContain('titillium web');
    expect(estilo.fontSize).toBe('24px');
    expect(estilo.color).toBe('rgb(0, 0, 102)');
    expect(estilo.fontWeight).toBe('700');
    dialog.closeAll();
  });

  it('el botón de cerrar no se extiende a todo el diálogo: su efecto de hover queda dentro del botón', () => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule, NoopAnimationsModule],
      providers: [{ provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: OPCIONES_DIALOGO }],
    });
    const dialog = TestBed.inject(MatDialog);
    dialog.open(DialogoConCabecera);
    const boton = document.querySelector('.cdk-overlay-container button.close-button') as HTMLElement;
    const cuadro = boton.getBoundingClientRect();
    expect(cuadro.width).toBeLessThanOrEqual(56);

    // Las capas internas de Material (efecto de hover y de clic) se posicionan respecto al botón: deben medir lo mismo que él.
    for (const capa of Array.from(boton.querySelectorAll('.mat-mdc-button-persistent-ripple, .mat-mdc-button-ripple'))) {
      const c = (capa as HTMLElement).getBoundingClientRect();
      expect(c.width).withContext('capa ' + (capa as HTMLElement).className).toBeLessThanOrEqual(56);
      expect(c.height).toBeLessThanOrEqual(56);
    }

    // Un clic en el cuerpo del diálogo nunca debe caer sobre el botón de cerrar.
    const cuerpo = document.querySelector('.cdk-overlay-container .dlg-cuerpo') as HTMLElement;
    const r = cuerpo.getBoundingClientRect();
    const objetivo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    expect(boton.contains(objetivo)).toBeFalse();
    dialog.closeAll();
  });

  describe('un diálogo más alto que la pantalla se desplaza por dentro (en móvil no se podía llegar a los botones)', () => {
    for (const [nombre, componente] of [['con hijos directos', DialogoMuyAlto], ['dentro de un formulario', FormularioMuyAlto]] as const) {
      it(`${nombre}: el diálogo cabe en la ventana, el cuerpo se desplaza y el pie queda a la vista`, () => {
        TestBed.configureTestingModule({
          imports: [MatDialogModule, NoopAnimationsModule],
          providers: [{ provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: OPCIONES_DIALOGO }],
        });
        const dialog = TestBed.inject(MatDialog);
        dialog.open(componente as any);
        // En móvil el cuerpo no tiene un tope fijo de altura (max-height: none): el alto lo limita la propia ventana.
        // Se simula aquí para reproducir esa condición con cualquier ancho de ventana de pruebas.
        (document.querySelector('.cdk-overlay-container .dlg-cuerpo') as HTMLElement).style.setProperty('max-height', 'none', 'important');
        const alto = window.innerHeight;
        const superficie = document.querySelector('.cdk-overlay-container .mat-mdc-dialog-surface') as HTMLElement;
        const cuerpo = document.querySelector('.cdk-overlay-container .dlg-cuerpo') as HTMLElement;
        const pie = document.querySelector('.cdk-overlay-container .dlg-pie') as HTMLElement;

        expect(superficie.getBoundingClientRect().height).withContext('alto del diálogo').toBeLessThanOrEqual(alto + 1);
        expect(cuerpo.scrollHeight).withContext('el cuerpo tiene más contenido que su alto').toBeGreaterThan(cuerpo.clientHeight);
        expect(['auto', 'scroll']).toContain(getComputedStyle(cuerpo).overflowY);
        expect(pie.getBoundingClientRect().bottom).withContext('el pie dentro de la ventana').toBeLessThanOrEqual(alto + 1);

        // Se puede bajar hasta el final del cuerpo
        cuerpo.scrollTop = cuerpo.scrollHeight;
        expect(cuerpo.scrollTop).toBeGreaterThan(0);
        dialog.closeAll();
      });
    }
  });
});
