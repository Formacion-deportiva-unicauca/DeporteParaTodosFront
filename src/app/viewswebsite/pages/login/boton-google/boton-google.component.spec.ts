import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BotonGoogleComponent } from './boton-google.component';

describe('BotonGoogleComponent', () => {
  let fixture: ComponentFixture<BotonGoogleComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BotonGoogleComponent] }).compileComponents();
    fixture = TestBed.createComponent(BotonGoogleComponent);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  const boton = () => el.querySelector('#btn-google') as HTMLButtonElement;

  it('es un botón de tipo button (nunca envía formularios) con el texto "Ingresar con Google"', () => {
    expect(boton().getAttribute('type')).toBe('button');
    expect(boton().textContent).toContain('Ingresar con Google');
  });

  it('muestra el logo de Google y no el indicador de avance', () => {
    expect(el.querySelector('svg')).not.toBeNull();
    expect(el.querySelector('.spinner')).toBeNull();
  });

  it('emite "pulsado" al hacer clic', () => {
    const pulsado = jasmine.createSpy('pulsado');
    fixture.componentInstance.pulsado.subscribe(pulsado);
    boton().click();
    expect(pulsado).toHaveBeenCalledTimes(1);
  });

  describe('cargando', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('cargando', true);
      fixture.detectChanges();
    });

    it('se deshabilita, anuncia que está ocupado y cambia el texto', () => {
      expect(boton().disabled).toBeTrue();
      expect(boton().getAttribute('aria-busy')).toBe('true');
      expect(boton().textContent).toContain('Redirigiendo a Google');
    });

    it('cambia el logo por el indicador de avance', () => {
      expect(el.querySelector('svg')).toBeNull();
      expect(el.querySelector('.spinner')).not.toBeNull();
    });

    it('no emite "pulsado"', () => {
      const pulsado = jasmine.createSpy('pulsado');
      fixture.componentInstance.pulsado.subscribe(pulsado);
      boton().click();
      expect(pulsado).not.toHaveBeenCalled();
    });
  });
});
