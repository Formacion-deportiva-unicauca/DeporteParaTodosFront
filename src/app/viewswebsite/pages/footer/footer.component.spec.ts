import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent, URL_POLITICA_DATOS } from './footer.component';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FooterComponent] }).compileComponents();
    fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  const texto = () => (el.textContent ?? '').replace(/\s+/g, ' ');

  it('muestra los datos institucionales', () => {
    expect(texto()).toContain('Universidad del Cauca');
    expect(texto()).toContain('NIT. 891500319-2');
    expect(texto()).toContain('Deporte para Todos');
    expect(texto()).toContain('Vicerrectoría de Cultura y Bienestar');
    expect(texto()).toContain('División de Tecnologías de la Información y las Comunicaciones - TIC');
    expect(texto()).toContain('Versión 1.0.0');
  });

  it('muestra el año actual', () => {
    expect(texto()).toContain(String(new Date().getFullYear()));
  });

  it('muestra la acreditación de alta calidad', () => {
    expect(texto()).toContain('Acreditación de Alta Calidad por 8 años Resolución MEN 6218 de 2019 - Vigilada MinEducación');
  });

  it('el correo de bienestar es un enlace mailto', () => {
    const enlace = el.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
    expect(enlace.getAttribute('href')).toBe('mailto:bienestar@unicauca.edu.co');
  });

  it('la política de protección de datos abre el PDF institucional en otra pestaña', () => {
    expect(URL_POLITICA_DATOS).toBe('https://www.unicauca.edu.co/wp-content/uploads/2024/08/Politica-de-Tratamiento-de-Datos.pdf');
    const enlace = Array.from(el.querySelectorAll('a')).find(a => a.textContent?.includes('Política de Protección de Datos Personales')) as HTMLAnchorElement;
    expect(enlace.getAttribute('href')).toBe(URL_POLITICA_DATOS);
    expect(enlace.getAttribute('target')).toBe('_blank');
    expect(enlace.getAttribute('rel')).toContain('noopener');
  });

  it('sin dirección definida, seguridad de la información y soporte técnico no se muestran como enlaces rotos', () => {
    const textos = Array.from(el.querySelectorAll('a')).map(a => a.textContent ?? '');
    expect(textos.some(t => t.includes('Política de Seguridad de la Información'))).toBeFalse();
    expect(textos.some(t => t.includes('Soporte Técnico'))).toBeFalse();
    expect(texto()).toContain('Política de Seguridad de la Información');
    expect(texto()).toContain('Comunícate con nuestro Soporte Técnico');
  });

  it('el texto del pie es compacto: 12px (Caption de la tabla tipográfica de desarrollo)', () => {
    const pie = el.querySelector('.pie') as HTMLElement;
    expect(getComputedStyle(pie).fontSize).toBe('12px');
    const nombre = el.querySelector('.nombre') as HTMLElement;
    expect(getComputedStyle(nombre).fontSize).toBe('14px');
  });

  it('la franja de colores mide 6px, como en la referencia SIVRI (no una banda ancha)', () => {
    const franja = el.querySelector('.franja') as HTMLElement;
    expect(getComputedStyle(franja).height).toBe('6px');
  });

  it('la franja de colores del PDI tiene seis segmentos decorativos', () => {
    const franja = el.querySelector('.franja') as HTMLElement;
    expect(franja.getAttribute('aria-hidden')).toBe('true');
    expect(franja.querySelectorAll('.segmento').length).toBe(6);
  });
});
