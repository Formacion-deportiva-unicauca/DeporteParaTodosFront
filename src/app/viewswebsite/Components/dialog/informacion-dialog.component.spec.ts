import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { InformacionDialogComponent, DatosInformacionDialog } from './informacion-dialog.component';

describe('InformacionDialogComponent (información de una categoría o curso)', () => {
  let fixture: ComponentFixture<InformacionDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<InformacionDialogComponent>>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(s: string): T => el().querySelector(s) as T;

  async function montar(datos: Partial<DatosInformacionDialog> = {}): Promise<void> {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [InformacionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { etiqueta: 'Categoría deportiva', titulo: 'Recreativo', descripcion: 'Actividades lúdicas.', ...datos },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(InformacionDialogComponent);
    fixture.detectChanges();
  }

  describe('contenido', () => {
    beforeEach(() => montar());

    it('la cabecera lleva la etiqueta y el título como h2 de diálogo (nombre accesible)', () => {
      expect(q('.dlg-eyebrow').textContent?.trim()).toBe('Categoría deportiva');
      expect(q('h2[mat-dialog-title].dlg-titulo').textContent?.trim()).toBe('Recreativo');
    });

    it('muestra la descripción', () => {
      expect(q('.info-descripcion').textContent).toContain('Actividades lúdicas.');
    });

    it('el botón X está en la cabecera y tiene nombre accesible', () => {
      expect(q('.dlg-cabecera button.close-button').getAttribute('aria-label')).toBe('Cerrar diálogo');
    });

    it('sin imagen ni datos adicionales no muestra esos bloques', () => {
      expect(el().querySelector('.info-imagen')).toBeNull();
      expect(el().querySelector('.info-datos')).toBeNull();
    });

    it('Cerrar cierra el diálogo sin resultado; no hay acción principal si no se pidió', () => {
      expect(el().querySelector('button.aceptar')).toBeNull();
      q<HTMLButtonElement>('.dlg-pie button.cancelar').click();
      expect(dialogRef.close).toHaveBeenCalled();
    });
  });

  it('sin descripción dice "Sin descripción." en lugar de dejar el diálogo vacío', async () => {
    await montar({ descripcion: '' });
    expect(q('.info-descripcion').textContent).toContain('Sin descripción.');
  });

  it('muestra la imagen cuando viene (decorativa: el título ya dice de qué se trata)', async () => {
    await montar({ imagen: 'data:image/png;base64,AAAA' });
    const img = q('.info-imagen');
    expect(img.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(img.getAttribute('alt')).toBe('');
  });

  it('muestra los datos adicionales como lista de definiciones', async () => {
    await montar({ datos: [{ rotulo: 'Categoría', valor: 'Recreativo' }, { rotulo: 'Dirigido a', valor: 'Toda la comunidad' }] });
    const rotulos = Array.from(el().querySelectorAll('.info-datos dt')).map(d => d.textContent?.trim());
    const valores = Array.from(el().querySelectorAll('.info-datos dd')).map(d => d.textContent?.trim());
    expect(rotulos).toEqual(['Categoría', 'Dirigido a']);
    expect(valores).toEqual(['Recreativo', 'Toda la comunidad']);
  });

  it('con acción principal, muestra el botón y el diálogo se cierra con "accion"', async () => {
    await montar({ textoAccion: 'Ver cursos' });
    const boton = q<HTMLButtonElement>('.dlg-pie button.aceptar');
    expect(boton.textContent).toContain('Ver cursos');
    boton.click();
    expect(dialogRef.close).toHaveBeenCalledWith('accion');
  });

  it('con los estilos reales de Material: acción principal con texto blanco sobre azul y Cerrar con contorno', async () => {
    await montar({ textoAccion: 'Ver cursos' });
    expect(getComputedStyle(q('.dlg-pie button.aceptar')).color).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(q('.dlg-pie button.aceptar')).backgroundColor).toBe('rgb(0, 0, 102)');
    expect(getComputedStyle(q('.dlg-pie button.cancelar')).color).toBe('rgb(0, 0, 102)');
  });
});
