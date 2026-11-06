import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { of, throwError } from 'rxjs';
import { FormHorarioComponent } from './form-horario.component';
import { HorarioService } from 'src/app/services/horario.service';
import { EscenarioService } from 'src/app/services/escenario.service';

/** Plantilla del diálogo de horarios: accesibilidad y mensajes (la lógica de puedeGuardar() está en form-horario.component.spec.ts). */
describe('FormHorarioComponent › plantilla', () => {
  let fixture: ComponentFixture<FormHorarioComponent>;
  let component: FormHorarioComponent;
  let horarios: jasmine.SpyObj<HorarioService>;
  let avisos: jasmine.SpyObj<NotificacionService>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(s: string): T => el().querySelector(s) as T;
  const todos = (s: string): HTMLElement[] => Array.from(el().querySelectorAll(s)) as HTMLElement[];

  const horario = { id: 5, dia: 'LUNES', horaInicio: '08:00', horaFin: '10:00', escenario: 'Coliseo' };

  async function montar(opciones: { fallaHorarios?: boolean; nuevoGrupo?: boolean; sinHorarios?: boolean } = {}): Promise<void> {
    horarios = jasmine.createSpyObj('HorarioService', ['getHorarios', 'crearHorario', 'eliminarHorario']);
    horarios.getHorarios.and.returnValue(opciones.fallaHorarios ? throwError(() => ({ status: 500 })) : of((opciones.sinHorarios ? [] : [horario]) as any));
    const escenarios = jasmine.createSpyObj('EscenarioService', ['getEscenarios']);
    escenarios.getEscenarios.and.returnValue(of([{ nombre: 'Coliseo', disponible: true }]));
    avisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);

    await TestBed.configureTestingModule({
      imports: [FormHorarioComponent, NoopAnimationsModule],
      providers: [
        { provide: HorarioService, useValue: horarios },
        { provide: EscenarioService, useValue: escenarios },
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: { categoria: 'Recreativo', curso: 'Tenis', anio: 2026, iterable: 1, nuevoGrupo: opciones.nuevoGrupo } },
        { provide: NotificacionService, useValue: avisos },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FormHorarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  describe('estructura', () => {
    beforeEach(() => montar());

    it('el título es un h2 de diálogo', () => {
      expect(q('h2[mat-dialog-title]').textContent?.trim()).toBe('Gestionar horarios');
    });

    it('el botón X tiene nombre accesible, usa la clase compartida y no lleva estilo en línea', () => {
      const cerrar = q('button.close-button');
      expect(cerrar.getAttribute('aria-label')).toBe('Cerrar diálogo');
      expect(cerrar.getAttribute('style')).toBeNull();
    });

    it('las acciones usan los botones compartidos: Cerrar (contorno) y Agregar (principal)', () => {
      expect(q('button.cancelar').textContent?.trim()).toBe('Cerrar');
      expect(q('button.aceptar').textContent?.trim()).toBe('Agregar');
    });
  });


  describe('diseño del diálogo (cabecera, cuerpo y pie compartidos)', () => {
    beforeEach(() => montar());

    it('usa la cabecera con eyebrow, el cuerpo con desplazamiento y el pie compartidos', () => {
      expect(q('header.dlg-cabecera .dlg-eyebrow').textContent?.trim()).toBe('Gestión de grupos');
      expect(q('header.dlg-cabecera button.close-button')).not.toBeNull();
      expect(q('mat-dialog-content.dlg-cuerpo')).not.toBeNull();
      expect(q('mat-dialog-actions.dlg-pie')).not.toBeNull();
    });

    it('los horarios registrados se leen en formato de 12 horas, con el día completo', () => {
      expect(q('.horario-text').textContent?.replace(/\s+/g, ' ').trim()).toBe('Lunes · 8:00 a. m. – 10:00 a. m. · Coliseo');
    });

    it('no pide justificación ni muestra el aviso del paso 2 fuera del flujo de un grupo nuevo', () => {
      expect(q('.aviso-sin-horario')).toBeNull();
      expect(q('.dlg-eyebrow').textContent).not.toContain('Paso 2');
    });
  });

  describe('paso 2 de 2 al crear un grupo', () => {
    it('lo dice en la cabecera y ofrece "Omitir por ahora" en lugar de "Cerrar"', async () => {
      await montar({ nuevoGrupo: true, sinHorarios: true });
      expect(q('.dlg-eyebrow').textContent?.trim()).toBe('Paso 2 de 2 · Nuevo grupo');
      expect(q('h2[mat-dialog-title]').textContent?.trim()).toBe('Horarios del grupo');
      expect(q('button.cancelar').textContent?.trim()).toBe('Omitir por ahora');
    });

    it('avisa que sin horario el instructor no podrá registrar asistencia', async () => {
      await montar({ nuevoGrupo: true, sinHorarios: true });
      const aviso = q('.aviso-sin-horario');
      expect(aviso.textContent).toContain('instructor no podrá registrar la asistencia');
      expect(aviso.getAttribute('role')).toBe('status');
    });

    it('al agregar un horario el aviso desaparece y el botón pasa a "Listo"', async () => {
      await montar({ nuevoGrupo: true, sinHorarios: true });
      component.horarios = [horario as any];
      component.cambiosRealizados = true;
      fixture.detectChanges();
      expect(q('.aviso-sin-horario')).toBeNull();
      expect(q('button.cancelar').textContent?.trim()).toBe('Listo');
    });

    it('agregar un horario avisa con una notificación (no con el snackbar antiguo)', async () => {
      await montar({ nuevoGrupo: true, sinHorarios: true });
      horarios.crearHorario.and.returnValue(of({} as any));
      component.dias[0].seleccionado = true;
      component.dias[2].seleccionado = true;
      component.horaInicio = '18:00';
      component.horaFin = '20:00';
      component.escenarioSeleccionado = 'Coliseo';
      component.guardar();
      expect(avisos.exito).toHaveBeenCalledWith('Horarios agregados', jasmine.stringContaining('2'));
    });

    it('un error al agregar se avisa con una notificación de error', async () => {
      await montar();
      horarios.crearHorario.and.returnValue(throwError(() => ({ status: 500 })));
      component.dias[0].seleccionado = true;
      component.horaInicio = '08:00';
      component.horaFin = '10:00';
      component.escenarioSeleccionado = 'Coliseo';
      component.guardar();
      expect(avisos.error).toHaveBeenCalledWith('No se pudo agregar el horario', jasmine.any(String));
    });
  });

  describe('días de la semana', () => {
    beforeEach(() => montar());

    it('son botones agrupados y con nombre accesible, no spans que solo responden al ratón', () => {
      const grupo = q('[role="group"]');
      expect(grupo.getAttribute('aria-label')).toBe('Días de la semana');
      const botones = todos('button.dia-chip');
      expect(botones.length).toBe(7);
      expect(botones[0].getAttribute('type')).toBe('button');
      expect(botones[0].getAttribute('aria-label')).toBe('Lunes');
    });

    it('anuncian si están seleccionados (aria-pressed) y alternan al pulsarlos', () => {
      const lunes = todos('button.dia-chip')[0] as HTMLButtonElement;
      expect(lunes.getAttribute('aria-pressed')).toBe('false');
      lunes.click();
      fixture.detectChanges();
      expect(lunes.getAttribute('aria-pressed')).toBe('true');
      expect(lunes.classList).toContain('dia-activo');
      lunes.click();
      fixture.detectChanges();
      expect(lunes.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('horarios registrados', () => {
    beforeEach(() => montar());

    it('el botón de eliminar dice a qué horario corresponde', () => {
      const eliminar = q('.horario-row button[mat-icon-button]');
      expect(eliminar.getAttribute('aria-label')).toBe('Eliminar el horario del LUNES de 08:00 a 10:00');
    });

    it('la confirmación "¿Eliminar?" ofrece Sí y No con el nombre claro, y se anuncia', () => {
      (q('.horario-row button[mat-icon-button]') as HTMLButtonElement).click();
      fixture.detectChanges();
      const fila = q('.confirmar-row');
      expect(fila.getAttribute('role')).toBe('group');
      expect(fila.getAttribute('aria-label')).toBe('Confirmar eliminación del horario');
      expect(fila.textContent).toContain('¿Eliminar?');
    });
  });

  describe('horas', () => {
    beforeEach(() => montar());

    it('si la hora de fin no es posterior a la de inicio, lo avisa y no deja agregar', () => {
      component.dias[0].seleccionado = true;
      component.horaInicio = '10:00';
      component.horaFin = '09:00';
      component.escenarioSeleccionado = 'Coliseo';
      fixture.detectChanges();
      const aviso = q('.error-horas');
      expect(aviso.textContent).toContain('La hora de fin debe ser posterior a la de inicio');
      expect(aviso.getAttribute('role')).toBe('alert');
      expect(component.puedeGuardar()).toBeFalse();
    });

    it('con horas válidas no muestra el aviso y permite agregar', () => {
      component.dias[0].seleccionado = true;
      component.horaInicio = '08:00';
      component.horaFin = '10:00';
      component.escenarioSeleccionado = 'Coliseo';
      fixture.detectChanges();
      expect(el().querySelector('.error-horas')).toBeNull();
      expect(component.puedeGuardar()).toBeTrue();
    });
  });

  describe('errores', () => {
    it('si no se pueden cargar los horarios, lo dice en lugar de mostrar "Sin horarios registrados"', async () => {
      await montar({ fallaHorarios: true });
      const aviso = q('.error-servidor');
      expect(aviso.textContent).toContain('No se pudieron cargar los horarios');
      expect(aviso.getAttribute('role')).toBe('alert');
      expect(el().textContent).not.toContain('Sin horarios registrados');
    });
  });
});
