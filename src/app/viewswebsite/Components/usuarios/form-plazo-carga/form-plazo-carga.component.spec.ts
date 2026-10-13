import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';

import { DatosFormPlazoCarga, FormPlazoCargaComponent } from './form-plazo-carga.component';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { PlazoCargaDTO } from 'src/app/Models/DTOs/plazo-carga-dto';

const sinPlazo: DatosFormPlazoCarga = {
  id: 'INS01', nombre: 'Carlos López', fechaActual: null, estado: 'SIN_PLAZO', plazoVencido: false, anio: 2026, periodo: 2,
};
const conPlazo: DatosFormPlazoCarga = { ...sinPlazo, fechaActual: '2026-10-15', estado: 'PENDIENTE' };
const respuesta: PlazoCargaDTO = {
  idInstructor: 'INS01', anio: 2026, periodo: 2, fechaLimite: '2026-11-01',
  estadoReporte: 'PENDIENTE', plazoVencido: false, clasesConAsistencia: 0,
};
const http = (status: number, error?: any): HttpErrorResponse => new HttpErrorResponse({ status, error });

describe('FormPlazoCargaComponent', () => {
  let fixture: ComponentFixture<FormPlazoCargaComponent>;
  let component: FormPlazoCargaComponent;
  let servicio: jasmine.SpyObj<InstructorServisce>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<FormPlazoCargaComponent>>;
  let pantallaChica = false;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const fecha = (): HTMLInputElement => el().querySelector('input#fechaLimite') as HTMLInputElement;
  /** Elige una fecha como lo hace el calendario: un Date local (año, mes 1-12, día). */
  const elegir = (anio: number, mes: number, dia: number): void => {
    component.alElegirFecha(new Date(anio, mes - 1, dia));
    fixture.detectChanges();
  };
  const valor = (): string => component.fechaTexto;
  const escribirTexto = (texto: string): void => {
    fecha().value = texto;
    fecha().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const salirDelCampo = (): void => {
    fecha().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const guardarBtn = (): HTMLButtonElement => el().querySelector('button.btn-guardar') as HTMLButtonElement;
  const alerta = (): string => el().querySelector('.error-servidor')?.textContent?.trim() ?? '';

  const abrir = async (datos: DatosFormPlazoCarga): Promise<void> => {
    TestBed.resetTestingModule();
    servicio = jasmine.createSpyObj('InstructorServisce', ['asignarPlazoCarga']);
    servicio.asignarPlazoCarga.and.returnValue(of(respuesta));
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [FormPlazoCargaComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: InstructorServisce, useValue: servicio },
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: pantallaChica, breakpoints: {} }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FormPlazoCargaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  afterEach(() => {
    pantallaChica = false;
    fixture?.destroy();
  });

  describe('calendario y accesibilidad', () => {
    beforeEach(() => abrir(conPlazo));

    it('el campo permite escribir (dd/mm/aaaa) y tiene el calendario de Material', () => {
      expect(fecha().readOnly).toBeFalse();
      expect(fecha().getAttribute('placeholder')).toBe('dd/mm/aaaa');
      expect(fecha().classList.contains('mat-datepicker-input')).toBeTrue();
      expect(el().querySelector('input[type="date"]')).toBeNull();
    });

    it('label asociado "Fecha límite de carga" y la fecha actual precargada en dd/MM/yyyy', () => {
      expect(el().querySelector('label[for="fechaLimite"]')?.textContent?.trim()).toBe('Fecha límite de carga');
      expect(fecha().value).toBe('15/10/2026');
      expect(valor()).toBe('2026-10-15');
    });

    it('el botón del calendario tiene nombre accesible', () => {
      const boton = el().querySelector('mat-datepicker-toggle button') as HTMLButtonElement;
      expect(boton.getAttribute('aria-label')).toBe('Abrir calendario de fecha límite de carga');
    });

    it('el botón del calendario lo abre, y hacer clic en el campo NO (permite escribir)', () => {
      fecha().click();
      fixture.detectChanges();
      expect(document.querySelector('mat-calendar')).toBeNull();
      (el().querySelector('mat-datepicker-toggle button') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(document.querySelector('mat-calendar')).not.toBeNull();
    });

    it('la ayuda está enlazada con aria-describedby', () => {
      const ids = (fecha().getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
      const texto = ids.map(i => document.getElementById(i)?.textContent?.trim() ?? '').join(' ');
      expect(texto).toContain(
        'Hasta esta fecha, inclusive, el instructor puede cargar atenciones. Después solo el Coordinador puede ampliar el plazo.',
      );
    });

    it('anuncia la fecha elegida en texto largo, en una región aria-live="polite"', () => {
      const region = el().querySelector('.fecha-elegida') as HTMLElement;
      expect(region.getAttribute('aria-live')).toBe('polite');
      expect(region.textContent).toContain('octubre');
      elegir(2026, 11, 1);
      expect(region.textContent).toContain('noviembre');
      expect(region.textContent).toContain('2026');
    });

    it('muestra el instructor, el periodo y el estado actual de solo lectura', () => {
      expect(el().textContent).toContain('Carlos López');
      expect(el().textContent).toContain('2026-2');
      expect(el().querySelector('.estado-actual')?.textContent).toContain('Pendiente · hasta 15/10/2026');
      expect(el().querySelector('.estado-actual input')).toBeNull();
    });

    it('foco inicial en la fecha, X con aria-label y ningún div con (click)', () => {
      expect(fecha().hasAttribute('cdkfocusinitial')).toBeTrue();
      expect(el().querySelector('button.close-button')?.getAttribute('aria-label')).toBe('Cerrar diálogo');
      expect(el().querySelectorAll('div[ng-reflect-click], div[click]').length).toBe(0);
    });
  });

  describe('pantallas pequeñas', () => {
    it('el calendario se abre a pantalla completa (touchUi) en pantallas chicas', async () => {
      pantallaChica = true;
      await abrir(conPlazo);
      expect(component.touchUi).toBeTrue();
    });

    it('en pantallas grandes se abre como ventana emergente', async () => {
      await abrir(conPlazo);
      expect(component.touchUi).toBeFalse();
    });
  });

  describe('sin plazo previo', () => {
    beforeEach(() => abrir(sinPlazo));

    it('muestra "Sin plazo", el campo vacío y un texto que lo indica', () => {
      expect(el().querySelector('.estado-actual')?.textContent).toContain('Sin plazo');
      expect(fecha().value).toBe('');
      expect(el().querySelector('.fecha-elegida')?.textContent).toContain('Aún no has elegido una fecha');
    });

    it('Guardar está deshabilitado con la fecha vacía y se habilita al elegir una', () => {
      expect(guardarBtn().disabled).toBeTrue();
      elegir(2026, 11, 1);
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('elegir una fecha guarda texto yyyy-MM-dd en hora local, sin desfase (31 de diciembre)', () => {
      elegir(2026, 12, 31);
      expect(valor()).toBe('2026-12-31');
      elegir(2027, 1, 1);
      expect(valor()).toBe('2027-01-01');
    });

    it('NO valida contra el reloj del navegador: una fecha pasada se puede enviar (lo valida el backend)', () => {
      elegir(2000, 1, 1);
      expect(guardarBtn().disabled).toBeFalse();
      guardarBtn().click();
      expect(servicio.asignarPlazoCarga).toHaveBeenCalledOnceWith('INS01', '2000-01-01');
    });

    it('escribir 01/11/2026 es el 1 de NOVIEMBRE (2026-11-01), no el 11 de enero', () => {
      escribirTexto('01/11/2026');
      expect(valor()).toBe('2026-11-01');
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('escribir 31/12/2026 guarda 2026-12-31 y la región aria-live anuncia la fecha', () => {
      escribirTexto('31/12/2026');
      expect(valor()).toBe('2026-12-31');
      expect(el().querySelector('.fecha-elegida')?.textContent).toContain('31 de diciembre');
    });

    it('escribir un día inexistente (31/02/2026): error de formato en línea y Guardar deshabilitado', () => {
      escribirTexto('31/02/2026');
      salirDelCampo();
      expect(valor()).toBe('');
      expect(guardarBtn().disabled).toBeTrue();
      expect(el().querySelector('mat-error')?.textContent).toContain('Escribe la fecha como dd/mm/aaaa');
    });

    it('escribir texto que no es una fecha (abc, 2026-11-01): inválido y no se envía', () => {
      for (const t of ['abc', '2026-11-01']) {
        escribirTexto(t);
        salirDelCampo();
        expect(guardarBtn().disabled).withContext(t).toBeTrue();
      }
      expect(servicio.asignarPlazoCarga).not.toHaveBeenCalled();
    });

    it('un error de formato se corrige escribiendo una fecha válida', () => {
      escribirTexto('31/02/2026');
      salirDelCampo();
      escribirTexto('28/02/2027');
      expect(valor()).toBe('2027-02-28');
      expect(guardarBtn().disabled).toBeFalse();
      expect(el().querySelector('mat-error')).toBeNull();
    });

    it('escribir y luego borrar deja el campo vacío: Guardar deshabilitado, sin error de formato', () => {
      escribirTexto('15/11/2026');
      escribirTexto('');
      expect(valor()).toBe('');
      expect(guardarBtn().disabled).toBeTrue();
      expect(el().querySelector('mat-error')?.textContent ?? '').not.toContain('dd/mm/aaaa');
    });

    it('enviar una fecha escrita a mano manda texto yyyy-MM-dd', () => {
      escribirTexto('15/11/2026');
      guardarBtn().click();
      expect(servicio.asignarPlazoCarga).toHaveBeenCalledOnceWith('INS01', '2026-11-15');
    });

    it('si el calendario devuelve null (se borra la fecha), Guardar se deshabilita', () => {
      elegir(2026, 11, 1);
      component.alElegirFecha(null);
      fixture.detectChanges();
      expect(valor()).toBe('');
      expect(guardarBtn().disabled).toBeTrue();
    });
  });

  describe('guardar', () => {
    beforeEach(() => abrir(conPlazo));

    it('Guardar está deshabilitado sin cambios (aunque se vuelva a elegir la misma fecha)', () => {
      expect(guardarBtn().disabled).toBeTrue();
      elegir(2026, 10, 15);
      expect(guardarBtn().disabled).toBeTrue();
    });

    it('envía el id y la fecha como texto yyyy-MM-dd y cierra con el elemento actualizado', () => {
      elegir(2026, 11, 1);
      guardarBtn().click();
      expect(servicio.asignarPlazoCarga).toHaveBeenCalledOnceWith('INS01', '2026-11-01');
      expect(dialogRef.close).toHaveBeenCalledOnceWith(respuesta);
    });

    it('doble clic envía UNA sola petición y deja Guardar deshabilitado', () => {
      servicio.asignarPlazoCarga.and.returnValue(new Subject<PlazoCargaDTO>());
      elegir(2026, 11, 1);
      guardarBtn().click();
      guardarBtn().click();
      expect(servicio.asignarPlazoCarga).toHaveBeenCalledTimes(1);
      fixture.detectChanges();
      expect(guardarBtn().disabled).toBeTrue();
    });

    it('no modifica el objeto recibido (edita una copia)', () => {
      elegir(2026, 11, 1);
      guardarBtn().click();
      expect(component.data).toEqual(conPlazo);
    });
  });

  describe('errores', () => {
    beforeEach(async () => {
      await abrir(conPlazo);
      elegir(2026, 11, 1);
    });

    it('422: muestra err.error.mensaje, no cierra y conserva la fecha', () => {
      servicio.asignarPlazoCarga.and.returnValue(throwError(() => http(422, { mensaje: 'La fecha no puede ser anterior a hoy' })));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toBe('La fecha no puede ser anterior a hoy');
      expect(el().querySelector('.error-servidor')?.getAttribute('role')).toBe('alert');
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(valor()).toBe('2026-11-01');
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('422 sin cuerpo: texto de respaldo', () => {
      servicio.asignarPlazoCarga.and.returnValue(throwError(() => http(422)));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toContain('fecha');
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('400: mensaje genérico de validación, sin cerrar', () => {
      servicio.asignarPlazoCarga.and.returnValue(throwError(() => http(400)));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toContain('no es válida');
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('404: cierra con la señal { yaNoExiste: true }', () => {
      servicio.asignarPlazoCarga.and.returnValue(throwError(() => http(404)));
      guardarBtn().click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith({ yaNoExiste: true });
    });

    it('otros errores (500, 403 sin cuerpo): mensaje genérico, sin cerrar, y se puede reintentar', () => {
      servicio.asignarPlazoCarga.and.returnValue(throwError(() => http(403)));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toContain('No se pudo asignar el plazo');
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(guardarBtn().disabled).toBeFalse();
      servicio.asignarPlazoCarga.and.returnValue(of(respuesta));
      guardarBtn().click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith(respuesta);
    });

    it('un nuevo intento limpia el error anterior', () => {
      servicio.asignarPlazoCarga.and.returnValue(throwError(() => http(500)));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).not.toBe('');
      servicio.asignarPlazoCarga.and.returnValue(new Subject<PlazoCargaDTO>());
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toBe('');
    });
  });

  describe('cerrar sin guardar', () => {
    beforeEach(async () => {
      await abrir(conPlazo);
      elegir(2026, 11, 1);
    });

    it('Cancelar cierra sin resultado y sin llamar al servicio', () => {
      (el().querySelector('button.btn-cancelar') as HTMLButtonElement).click();
      expect(dialogRef.close).toHaveBeenCalledWith();
      expect(servicio.asignarPlazoCarga).not.toHaveBeenCalled();
    });

    it('la X cierra sin llamar al servicio', () => {
      (el().querySelector('button.close-button') as HTMLButtonElement).click();
      expect(dialogRef.close).toHaveBeenCalled();
      expect(servicio.asignarPlazoCarga).not.toHaveBeenCalled();
    });
  });
});
