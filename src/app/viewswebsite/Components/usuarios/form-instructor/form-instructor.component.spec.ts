import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';

import { FormInstructorComponent } from './form-instructor.component';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { InstructorDTO } from 'src/app/Models/DTOs/instructor-dto';

const original = { id: 'INS01', nombre: 'Carlos López', correo: 'carlos@unicauca.edu.co' };
const actualizado: InstructorDTO = { id: 'INS01', nombre: 'Carlos Pérez', correo: 'carlos@unicauca.edu.co', sexo: 'M' };
const http = (status: number, error?: any): HttpErrorResponse => new HttpErrorResponse({ status, error });

describe('FormInstructorComponent', () => {
  let fixture: ComponentFixture<FormInstructorComponent>;
  let component: FormInstructorComponent;
  let servicio: jasmine.SpyObj<InstructorServisce>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<FormInstructorComponent>>;
  let datos: { id: string; nombre: string; correo: string };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const input = (id: string): HTMLInputElement => el().querySelector(`input#${id}`) as HTMLInputElement;
  const escribirNombre = (valor: string): void => {
    input('nombre').value = valor;
    input('nombre').dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const guardarBtn = (): HTMLButtonElement => el().querySelector('button.btn-guardar') as HTMLButtonElement;
  const alerta = (): string => el().querySelector('.error-servidor')?.textContent?.trim() ?? '';

  beforeEach(async () => {
    datos = { ...original };
    servicio = jasmine.createSpyObj('InstructorServisce', ['actualizarInstructor']);
    servicio.actualizarInstructor.and.returnValue(of(actualizado));
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [FormInstructorComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: InstructorServisce, useValue: servicio },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormInstructorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('estructura y accesibilidad', () => {
    it('precarga el nombre y muestra la identificación como texto de solo lectura', () => {
      expect(input('nombre').value).toBe('Carlos López');
      expect(el().querySelector('input#identificacion')).toBeNull();
      expect(el().querySelector('.identificacion')?.textContent).toContain('INS01');
    });

    it('el correo se muestra DESHABILITADO con su valor actual', () => {
      expect(input('correo').value).toBe('carlos@unicauca.edu.co');
      expect(input('correo').disabled).toBeTrue();
      expect(component.form.controls.correo.disabled).toBeTrue();
    });

    it('cada input tiene su label asociado', () => {
      expect(el().querySelector('label[for="nombre"]')?.textContent?.trim()).toBe('Nombre');
      expect(el().querySelector('label[for="correo"]')?.textContent?.trim()).toBe('Correo');
    });

    it('la ayuda del correo explica que no se puede modificar y está enlazada con aria-describedby', () => {
      const ids = (input('correo').getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
      const texto = ids.map(i => document.getElementById(i)?.textContent?.trim() ?? '').join(' ');
      expect(texto).toContain('El correo no se puede modificar');
    });

    it('el foco inicial está en el primer campo editable y no hay div con (click)', () => {
      expect(input('nombre').hasAttribute('cdkfocusinitial')).toBeTrue();
      expect(el().querySelectorAll('div[ng-reflect-click], div[click]').length).toBe(0);
    });

    it('la X tiene aria-label="Cerrar diálogo"', () => {
      expect(el().querySelector('button.close-button')?.getAttribute('aria-label')).toBe('Cerrar diálogo');
    });
  });

  describe('validación', () => {
    it('nombre vacío o solo espacios es inválido', () => {
      escribirNombre('');
      expect(guardarBtn().disabled).toBeTrue();
      escribirNombre('    ');
      expect(guardarBtn().disabled).toBeTrue();
    });

    it('Guardar está deshabilitado sin cambios y se habilita al cambiar el nombre', () => {
      expect(guardarBtn().disabled).toBeTrue();
      escribirNombre('Carlos Pérez');
      expect(guardarBtn().disabled).toBeFalse();
      escribirNombre('Carlos López');
      expect(guardarBtn().disabled).toBeTrue();
    });
  });

  describe('guardar', () => {
    it('envía { nombre, correo } con el nombre recortado y el correo ORIGINAL', () => {
      escribirNombre('  Carlos Pérez  ');
      guardarBtn().click();
      expect(servicio.actualizarInstructor).toHaveBeenCalledOnceWith('INS01', { nombre: 'Carlos Pérez', correo: 'carlos@unicauca.edu.co' });
    });

    it('aunque se fuerce otro valor en el campo del correo, se envía el original', () => {
      input('correo').value = 'otro@unicauca.edu.co';
      input('correo').dispatchEvent(new Event('input'));
      escribirNombre('Carlos Pérez');
      guardarBtn().click();
      expect(servicio.actualizarInstructor.calls.mostRecent().args[1].correo).toBe('carlos@unicauca.edu.co');
    });

    it('éxito: cierra devolviendo el instructor actualizado', () => {
      escribirNombre('Carlos Pérez');
      guardarBtn().click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith(actualizado);
    });

    it('doble clic envía UNA sola petición y deja Guardar deshabilitado', () => {
      servicio.actualizarInstructor.and.returnValue(new Subject<InstructorDTO>());
      escribirNombre('Carlos Pérez');
      guardarBtn().click();
      guardarBtn().click();
      expect(servicio.actualizarInstructor).toHaveBeenCalledTimes(1);
      fixture.detectChanges();
      expect(guardarBtn().disabled).toBeTrue();
    });

    it('no modifica el objeto original recibido (edita una copia)', () => {
      escribirNombre('Otro Nombre');
      guardarBtn().click();
      expect(datos).toEqual(original);
    });
  });

  describe('errores del servidor', () => {
    beforeEach(() => escribirNombre('Carlos Pérez'));

    it('409 con mensaje: lo muestra, no cierra y conserva lo escrito', () => {
      servicio.actualizarInstructor.and.returnValue(throwError(() => http(409, { mensaje: 'Conflicto con otro instructor' })));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toBe('Conflicto con otro instructor');
      expect(el().querySelector('.error-servidor')?.getAttribute('role')).toBe('alert');
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(input('nombre').value).toBe('Carlos Pérez');
      expect(guardarBtn().disabled).toBeFalse();
    });

    it('409 sin cuerpo: texto de respaldo', () => {
      servicio.actualizarInstructor.and.returnValue(throwError(() => http(409)));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toContain('en uso');
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('400: mensaje genérico de validación, sin cerrar', () => {
      servicio.actualizarInstructor.and.returnValue(throwError(() => http(400)));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toContain('no son válidos');
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(input('nombre').value).toBe('Carlos Pérez');
    });

    it('404: cierra devolviendo la señal de recarga { yaNoExiste: true }', () => {
      servicio.actualizarInstructor.and.returnValue(throwError(() => http(404)));
      guardarBtn().click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith({ yaNoExiste: true });
    });

    it('otros errores (500): mensaje genérico, sin cerrar, y se puede reintentar', () => {
      servicio.actualizarInstructor.and.returnValue(throwError(() => http(500)));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toContain('No se pudo guardar');
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(guardarBtn().disabled).toBeFalse();
      servicio.actualizarInstructor.and.returnValue(of(actualizado));
      guardarBtn().click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith(actualizado);
    });

    it('un nuevo intento limpia el error anterior', () => {
      servicio.actualizarInstructor.and.returnValue(throwError(() => http(500)));
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).not.toBe('');
      servicio.actualizarInstructor.and.returnValue(new Subject<InstructorDTO>());
      guardarBtn().click();
      fixture.detectChanges();
      expect(alerta()).toBe('');
    });
  });

  describe('cerrar sin guardar', () => {
    it('Cancelar cierra sin resultado y sin llamar al servicio', () => {
      escribirNombre('Algo distinto');
      (el().querySelector('button.btn-cancelar') as HTMLButtonElement).click();
      expect(dialogRef.close).toHaveBeenCalledWith();
      expect(servicio.actualizarInstructor).not.toHaveBeenCalled();
    });

    it('la X cierra sin llamar al servicio', () => {
      escribirNombre('Algo distinto');
      (el().querySelector('button.close-button') as HTMLButtonElement).click();
      expect(dialogRef.close).toHaveBeenCalled();
      expect(servicio.actualizarInstructor).not.toHaveBeenCalled();
    });
  });
});
