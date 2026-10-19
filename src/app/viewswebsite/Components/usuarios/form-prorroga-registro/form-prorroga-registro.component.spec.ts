import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';

import { DatosFormProrrogaRegistro, FormProrrogaRegistroComponent } from './form-prorroga-registro.component';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { ProrrogaDTO } from 'src/app/Models/DTOs/prorroga-registro-dto';
import { mesesDisponibles } from 'src/app/shared/prorroga-registro.util';

const juan = { id: 'I1', nombre: 'Juan Pérez' };
const ana = { id: 'I2', nombre: 'Ana Gómez' };
const uno: DatosFormProrrogaRegistro = { instructores: [juan] };
const dos: DatosFormProrrogaRegistro = { instructores: [juan, ana] };
const http = (status: number, error?: any): HttpErrorResponse => new HttpErrorResponse({ status, error });

describe('FormProrrogaRegistroComponent', () => {
  let fixture: ComponentFixture<FormProrrogaRegistroComponent>;
  let servicio: jasmine.SpyObj<InstructorServisce>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<FormProrrogaRegistroComponent>>;
  let datos: DatosFormProrrogaRegistro;
  const meses = mesesDisponibles();   // referencia: mismo helper que usa el componente

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const mes = (): HTMLSelectElement => el().querySelector('select#mes') as HTMLSelectElement;
  const dias = (): HTMLInputElement => el().querySelector('input#dias') as HTMLInputElement;
  const guardarBtn = (): HTMLButtonElement => el().querySelector('button.btn-guardar') as HTMLButtonElement;
  const alerta = (): string => el().querySelector('.error-servidor')?.textContent?.trim() ?? '';
  const vigentes = (): string => el().querySelector('.vigentes')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const escribirDias = (valor: string): void => {
    dias().value = valor;
    dias().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const elegirMes = (indice: number): void => {
    mes().value = mes().options[indice].value;
    mes().dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  const abrir = async (d: DatosFormProrrogaRegistro, vig: ProrrogaDTO[] | Subject<ProrrogaDTO[]> = []): Promise<void> => {
    TestBed.resetTestingModule();
    datos = JSON.parse(JSON.stringify(d));
    servicio = jasmine.createSpyObj('InstructorServisce', ['asignarProrrogaRegistro', 'getProrrogasRegistro']);
    servicio.getProrrogasRegistro.and.returnValue(Array.isArray(vig) ? of(vig) : vig);
    servicio.asignarProrrogaRegistro.and.callFake(req => of(req.idsInstructores.map(id => ({ idInstructor: id, dias: req.dias, fechaLimite: req.dias ? '2026-11-10' : null }))));
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [FormProrrogaRegistroComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: InstructorServisce, useValue: servicio },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FormProrrogaRegistroComponent);
    fixture.detectChanges();
  };

  afterEach(() => fixture?.destroy());

  describe('estructura y accesibilidad', () => {
    beforeEach(() => abrir(dos));

    it('lista los instructores elegidos', () => {
      const texto = el().querySelector('.instructores-elegidos')?.textContent ?? '';
      expect(texto).toContain('Juan Pérez');
      expect(texto).toContain('Ana Gómez');
      expect(texto).toContain('2');
    });

    it('selector de mes con label: 12 meses, el actual primero, etiqueta "octubre de 2026"', () => {
      expect(el().querySelector('label[for="mes"]')?.textContent?.trim()).toBe('Mes');
      expect(mes().options.length).toBe(12);
      expect(mes().options[0].textContent?.trim()).toBe(meses[0].etiqueta);
      expect(mes().options[0].textContent?.trim()).toMatch(/^[a-záéíóú]+ de \d{4}$/);
      expect(mes().value).toBe(meses[0].valor);
    });

    it('campo de días con label, entero de 0 a 60, y ayuda "0 quita la prórroga" enlazada con aria-describedby', () => {
      expect(el().querySelector('label[for="dias"]')?.textContent?.trim()).toBe('Días de prórroga');
      expect(dias().type).toBe('number');
      expect(dias().min).toBe('0');
      expect(dias().max).toBe('60');
      const ids = (dias().getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
      const texto = ids.map(i => document.getElementById(i)?.textContent?.trim() ?? '').join(' ');
      expect(texto).toContain('0 quita la prórroga');
    });

    it('explica cómo funciona la prórroga', () => {
      const texto = el().querySelector('.explicacion-prorroga')?.textContent?.replace(/\s+/g, ' ') ?? '';
      expect(texto).toContain('hasta el último día de ese mes, más los días de prórroga');
      expect(texto).toContain('Si el mes ya terminó');
    });

    it('foco inicial, X con aria-label y ningún div con (click)', () => {
      expect(dias().hasAttribute('cdkfocusinitial')).toBeTrue();
      expect(el().querySelector('button.close-button')?.getAttribute('aria-label')).toBe('Cerrar diálogo');
      expect(el().querySelectorAll('div[ng-reflect-click], div[click]').length).toBe(0);
    });
  });

  describe('prórrogas vigentes del mes', () => {
    it('al abrir consulta el mes actual', async () => {
      await abrir(dos);
      expect(servicio.getProrrogasRegistro).toHaveBeenCalledOnceWith(meses[0].anio, meses[0].mes);
    });

    it('al cambiar de mes vuelve a consultar con año y mes numéricos', async () => {
      await abrir(dos);
      elegirMes(1);
      expect(servicio.getProrrogasRegistro).toHaveBeenCalledWith(meses[1].anio, meses[1].mes);
      expect(servicio.getProrrogasRegistro).toHaveBeenCalledTimes(2);
    });

    it('muestra nombre, días y fecha límite de los elegidos; "Sin prórroga" para quien no tiene', async () => {
      await abrir(dos, [{ idInstructor: 'I1', dias: 10, fechaLimite: '2026-11-10' }, { idInstructor: 'OTRO', dias: 5, fechaLimite: '2026-11-05' }]);
      expect(vigentes()).toContain('Juan Pérez: 10 días · hasta 10/11/2026');
      expect(vigentes()).toContain('Ana Gómez: Sin prórroga');
      expect(vigentes()).not.toContain('OTRO');
    });

    it('es una región aria-live="polite"', async () => {
      await abrir(dos);
      expect(el().querySelector('.vigentes')?.getAttribute('aria-live')).toBe('polite');
    });

    it('mientras carga muestra "Cargando prórrogas vigentes…" y luego el resultado', async () => {
      const pendiente = new Subject<ProrrogaDTO[]>();
      await abrir(dos, pendiente);
      expect(vigentes()).toContain('Cargando prórrogas vigentes…');
      pendiente.next([{ idInstructor: 'I1', dias: 3, fechaLimite: '2026-11-03' }]);
      fixture.detectChanges();
      expect(vigentes()).not.toContain('Cargando');
      expect(vigentes()).toContain('Juan Pérez: 3 días · hasta 03/11/2026');
    });

    it('error 422 al consultar: muestra el mensaje del servidor (role="alert"), distinto de "sin prórroga"', async () => {
      await abrir(dos);
      servicio.getProrrogasRegistro.and.returnValue(throwError(() => http(422, { mensaje: 'El mes no puede ser futuro' })));
      elegirMes(1);
      const aviso = el().querySelector('.error-vigentes');
      expect(aviso?.textContent?.trim()).toBe('El mes no puede ser futuro');
      expect(aviso?.getAttribute('role')).toBe('alert');
      expect(vigentes()).not.toContain('Sin prórroga');
    });

    it('otro error al consultar: mensaje genérico, y el formulario sigue utilizable', async () => {
      await abrir(dos);
      servicio.getProrrogasRegistro.and.returnValue(throwError(() => http(500)));
      elegirMes(2);
      expect(el().querySelector('.error-vigentes')?.textContent).toContain('No se pudieron cargar las prórrogas vigentes');
      escribirDias('5');
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('una respuesta tardía de un mes anterior no pisa la del mes actual', async () => {
      const mesA = new Subject<ProrrogaDTO[]>();
      await abrir(dos, mesA);
      servicio.getProrrogasRegistro.and.returnValue(of([{ idInstructor: 'I1', dias: 7, fechaLimite: '2026-10-07' }]));
      elegirMes(1);
      mesA.next([{ idInstructor: 'I1', dias: 99, fechaLimite: '2026-01-01' }]);   // llega tarde
      fixture.detectChanges();
      expect(vigentes()).toContain('7 días');
      expect(vigentes()).not.toContain('99');
    });
  });

  describe('un solo instructor: precarga sus días actuales', () => {
    it('con prórroga vigente, el campo trae sus días', async () => {
      await abrir(uno, [{ idInstructor: 'I1', dias: 10, fechaLimite: '2026-11-10' }]);
      expect(dias().value).toBe('10');
    });

    it('sin prórroga vigente, el campo queda vacío', async () => {
      await abrir(uno, []);
      expect(dias().value).toBe('');
    });

    it('al cambiar de mes precarga los días de ese mes', async () => {
      await abrir(uno, [{ idInstructor: 'I1', dias: 10, fechaLimite: '2026-11-10' }]);
      servicio.getProrrogasRegistro.and.returnValue(of([{ idInstructor: 'I1', dias: 4, fechaLimite: '2026-10-04' }]));
      elegirMes(1);
      expect(dias().value).toBe('4');
    });

    it('no pisa lo que el usuario ya escribió', async () => {
      const pendiente = new Subject<ProrrogaDTO[]>();
      await abrir(uno, pendiente);
      escribirDias('5');
      pendiente.next([{ idInstructor: 'I1', dias: 10, fechaLimite: '2026-11-10' }]);
      fixture.detectChanges();
      expect(dias().value).toBe('5');
    });

    it('con varios instructores NO precarga', async () => {
      await abrir(dos, [{ idInstructor: 'I1', dias: 10, fechaLimite: '2026-11-10' }]);
      expect(dias().value).toBe('');
    });
  });

  describe('validación y Guardar', () => {
    beforeEach(() => abrir(dos));

    it('deshabilitado con los días vacíos', () => {
      expect(guardarBtn().disabled).toBeTrue();
    });

    it('inválidos: negativo, mayor a 60, decimal', () => {
      for (const v of ['-1', '61', '2.5', '100']) {
        escribirDias(v);
        expect(guardarBtn().disabled).withContext(v).toBeTrue();
      }
    });

    it('válidos: 0, 1 y 60 (extremos incluidos)', () => {
      for (const v of ['0', '1', '60']) {
        escribirDias(v);
        expect(guardarBtn().disabled).withContext(v).toBeFalse();
      }
    });

    it('muestra el error en línea cuando los días son inválidos', () => {
      escribirDias('61');
      dias().dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(el().querySelector('mat-error')?.textContent).toContain('entero de 0 a 60');
    });

    it('sin instructores: aviso y Guardar deshabilitado aunque los días sean válidos', async () => {
      await abrir({ instructores: [] });
      escribirDias('10');
      expect(guardarBtn().disabled).toBeTrue();
      expect(el().querySelector('.sin-instructores')?.getAttribute('role')).toBe('alert');
    });

    it('enviar el formulario inválido no llama al servicio', () => {
      (el().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
      expect(servicio.asignarProrrogaRegistro).not.toHaveBeenCalled();
    });
  });

  describe('guardar', () => {
    beforeEach(() => abrir(dos));

    it('envía { idsInstructores, anio, mes, dias } del mes elegido', () => {
      elegirMes(2);
      escribirDias('10');
      guardarBtn().click();
      expect(servicio.asignarProrrogaRegistro).toHaveBeenCalledOnceWith({
        idsInstructores: ['I1', 'I2'], anio: meses[2].anio, mes: meses[2].mes, dias: 10,
      });
    });

    it('dias = 0 se envía tal cual (quita la prórroga)', () => {
      escribirDias('0');
      guardarBtn().click();
      expect(servicio.asignarProrrogaRegistro.calls.mostRecent().args[0].dias).toBe(0);
    });

    it('éxito: cierra devolviendo la respuesta del servidor', () => {
      escribirDias('10');
      guardarBtn().click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith([
        { idInstructor: 'I1', dias: 10, fechaLimite: '2026-11-10' },
        { idInstructor: 'I2', dias: 10, fechaLimite: '2026-11-10' },
      ]);
    });

    it('doble clic envía UNA sola petición y deja Guardar deshabilitado', () => {
      servicio.asignarProrrogaRegistro.and.returnValue(new Subject<ProrrogaDTO[]>());
      escribirDias('10');
      guardarBtn().click();
      guardarBtn().click();
      expect(servicio.asignarProrrogaRegistro).toHaveBeenCalledTimes(1);
      fixture.detectChanges();
      expect(guardarBtn().disabled).toBeTrue();
    });

    it('no modifica el objeto recibido', () => {
      escribirDias('10');
      guardarBtn().click();
      expect(datos).toEqual(dos);
    });
  });

  describe('errores al guardar', () => {
    beforeEach(async () => {
      await abrir(dos);
      elegirMes(1);
      escribirDias('10');
    });

    it('400: mensaje genérico de validación, no cierra y conserva lo escrito', () => {
      servicio.asignarProrrogaRegistro.and.returnValue(throwError(() => http(400)));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toContain('no son válidos');
      expect(el().querySelector('.error-servidor')?.getAttribute('role')).toBe('alert');
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(dias().value).toBe('10');
      expect(mes().value).toBe(meses[1].valor);
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('404: cierra con la señal { yaNoExiste: true } (nada se guardó)', () => {
      servicio.asignarProrrogaRegistro.and.returnValue(throwError(() => http(404)));
      guardarBtn().click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith({ yaNoExiste: true });
    });

    it('422: muestra el mensaje del servidor, no cierra y conserva lo escrito', () => {
      servicio.asignarProrrogaRegistro.and.returnValue(throwError(() => http(422, { mensaje: 'No se puede asignar a un mes futuro' })));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toBe('No se puede asignar a un mes futuro');
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(dias().value).toBe('10');
    });

    it('422 sin cuerpo: texto de respaldo', () => {
      servicio.asignarProrrogaRegistro.and.returnValue(throwError(() => http(422)));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toContain('mes');
    });

    it('otros errores (500, 403 sin cuerpo): mensaje genérico, sin cerrar, y se puede reintentar', () => {
      servicio.asignarProrrogaRegistro.and.returnValue(throwError(() => http(403)));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toContain('No se pudo asignar la prórroga');
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(guardarBtn().disabled).toBeFalse();
      servicio.asignarProrrogaRegistro.and.callFake(req => of(req.idsInstructores.map(id => ({ idInstructor: id, dias: 10, fechaLimite: '2026-11-10' }))));
      guardarBtn().click();
      expect(dialogRef.close).toHaveBeenCalledTimes(1);
    });

    it('un nuevo intento limpia el error anterior', () => {
      servicio.asignarProrrogaRegistro.and.returnValue(throwError(() => http(500)));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).not.toBe('');
      servicio.asignarProrrogaRegistro.and.returnValue(new Subject<ProrrogaDTO[]>());
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toBe('');
    });
  });

  describe('cerrar sin guardar', () => {
    beforeEach(async () => {
      await abrir(dos);
      escribirDias('10');
    });

    it('Cancelar cierra sin resultado y sin llamar a asignar', () => {
      (el().querySelector('button.btn-cancelar') as HTMLButtonElement).click();
      expect(dialogRef.close).toHaveBeenCalledWith();
      expect(servicio.asignarProrrogaRegistro).not.toHaveBeenCalled();
    });

    it('la X cierra sin llamar a asignar', () => {
      (el().querySelector('button.close-button') as HTMLButtonElement).click();
      expect(dialogRef.close).toHaveBeenCalled();
      expect(servicio.asignarProrrogaRegistro).not.toHaveBeenCalled();
    });
  });
});
