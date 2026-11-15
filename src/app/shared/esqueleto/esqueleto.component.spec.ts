import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EsqueletoComponent } from './esqueleto.component';

describe('EsqueletoComponent', () => {
  let fixture: ComponentFixture<EsqueletoComponent>;
  let el: HTMLElement;

  const crear = (forma: 'tarjeta' | 'fila' | 'imagen', cantidad?: number, etiqueta?: string): void => {
    fixture.componentRef.setInput('forma', forma);
    if (cantidad !== undefined) fixture.componentRef.setInput('cantidad', cantidad);
    if (etiqueta !== undefined) fixture.componentRef.setInput('etiqueta', etiqueta);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EsqueletoComponent] });
    fixture = TestBed.createComponent(EsqueletoComponent);
    el = fixture.nativeElement;
  });

  it('tarjeta: dibuja tantas tarjetas como se piden, con imagen, líneas y botón', () => {
    crear('tarjeta', 3);
    expect(el.querySelectorAll('.esq-tarjeta').length).toBe(3);
    const primera = el.querySelector('.esq-tarjeta')!;
    expect(primera.querySelector('.esq-imagen')).not.toBeNull();
    expect(primera.querySelectorAll('.esq-linea').length).toBeGreaterThanOrEqual(3);
    expect(primera.querySelector('.esq-boton')).not.toBeNull();
    expect(el.querySelector('.esq-fila')).toBeNull();
  });

  it('fila: dibuja filas de lista y no tarjetas', () => {
    crear('fila', 4);
    expect(el.querySelectorAll('.esq-fila').length).toBe(4);
    expect(el.querySelector('.esq-tarjeta')).toBeNull();
  });

  it('imagen: dibuja un único bloque que llena su contenedor', () => {
    crear('imagen', 1);
    expect(el.querySelectorAll('.esq-imagen-completa').length).toBe(1);
  });

  it('cantidad 0 o negativa no dibuja nada', () => {
    crear('tarjeta', 0);
    expect(el.querySelector('.esq-tarjeta')).toBeNull();
    fixture.componentRef.setInput('cantidad', -2);
    fixture.detectChanges();
    expect(el.querySelector('.esq-tarjeta')).toBeNull();
  });

  it('anuncia "Cargando…" a los lectores de pantalla y oculta los bloques decorativos', () => {
    crear('tarjeta', 2);
    const aviso = el.querySelector('[role="status"]')!;
    expect(aviso.textContent?.trim()).toBe('Cargando…');
    el.querySelectorAll('.esq-tarjeta').forEach(t => expect(t.getAttribute('aria-hidden')).toBe('true'));
  });

  it('la etiqueta se puede cambiar según lo que carga', () => {
    crear('tarjeta', 1, 'Cargando cursos…');
    expect(el.querySelector('[role="status"]')!.textContent?.trim()).toBe('Cargando cursos…');
  });

  it('con "prefers-reduced-motion" la animación se desactiva (regla en la hoja de estilos del componente)', () => {
    crear('tarjeta', 1);
    const estilos = Array.from(document.querySelectorAll('style')).map(s => s.textContent ?? '').join('\n');
    expect(estilos).toContain('prefers-reduced-motion');
  });
});
