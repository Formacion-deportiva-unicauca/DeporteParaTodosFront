import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ListaInstructoresComponent } from './lista-instructores.component';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { AuthService } from 'src/app/services/auth.service';
import { InstructorDTO } from 'src/app/Models/DTOs/instructor-dto';
import { FormInstructorComponent } from '../form-instructor/form-instructor.component';

const instructorDummy: InstructorDTO = {
  id: 'INS01',
  nombre: 'Carlos López',
  correo: 'carlos@unicauca.edu.co',
  sexo: 'M',
};

describe('ListaInstructoresComponent', () => {
  let component: ListaInstructoresComponent;
  let fixture: ComponentFixture<ListaInstructoresComponent>;
  let mockInstructorService: jasmine.SpyObj<InstructorServisce>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<any>>;
  let perfil$: BehaviorSubject<string>;

  beforeEach(async () => {
    mockInstructorService = jasmine.createSpyObj('InstructorServisce', ['getInstructores', 'deleteInstructor']);
    mockInstructorService.getInstructores.and.returnValue(of([instructorDummy]));
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    mockDialogRef.afterClosed.and.returnValue(of(null));
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockDialog.open.and.returnValue(mockDialogRef as any);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    perfil$ = new BehaviorSubject<string>('Coordinador');

    await TestBed.configureTestingModule({
      imports: [ListaInstructoresComponent, NoopAnimationsModule],
      providers: [
        { provide: InstructorServisce, useValue: mockInstructorService },
        provideRouter([]),
        { provide: PerfilService, useValue: { perfil$ } },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'getProfile', 'isAuthenticated', 'verificarUsuario']) },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaInstructoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit: carga instructores y suscribe perfil$', () => {
    expect(mockInstructorService.getInstructores).toHaveBeenCalled();
    expect(component.instructores.length).toBe(1);
    expect(component.perfil).toBe('Coordinador');
  });

  describe('detalle del instructor (SCRUM-77/78)', () => {
    const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

    it('el nombre es un enlace real con el href correcto', () => {
      const a = el().querySelector('td a.enlace-instructor') as HTMLAnchorElement;
      expect(a).not.toBeNull();
      expect(a.textContent?.trim()).toBe('Carlos López');
      expect(a.getAttribute('href')).toBe('/lista-instructores/INS01');
    });

    it('la fila NO es clicable (sin (click) en las filas)', () => {
      const fila = el().querySelector('tr[mat-row]') as HTMLElement;
      expect(fila.getAttribute('ng-reflect-click')).toBeNull();
      expect(fila.getAttribute('role')).not.toBe('button');
    });

    it('"Agregar instructor +" visible para Coordinador', () => {
      expect(el().querySelector('button.btnAgregar')).not.toBeNull();
    });

    it('"Agregar instructor +" oculto para Instructor y Alumno', () => {
      for (const rol of ['Instructor', 'Alumno']) {
        perfil$.next(rol);
        fixture.detectChanges();
        expect(el().querySelector('button.btnAgregar')).toBeNull();
      }
    });
  });

  describe('buscador y ordenamiento', () => {
    const maria: InstructorDTO = { id: '1001', nombre: 'María García', correo: 'maria@unicauca.edu.co', sexo: 'F' };
    const juan: InstructorDTO = { id: '2002', nombre: 'Juan Pérez', correo: 'juan.perez@unicauca.edu.co', sexo: 'M' };
    const ana: InstructorDTO = { id: '3003', nombre: 'Ana Gómez', correo: 'ana@correo.com', sexo: 'F' };
    const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const nombres = (): string[] =>
      Array.from(el().querySelectorAll('tr[mat-row] a.enlace-instructor')).map(a => a.textContent!.trim());
    const campo = (): HTMLInputElement => el().querySelector('input#buscar-instructor') as HTMLInputElement;
    const estado = (): string => el().querySelector('[aria-live="polite"]')?.textContent?.trim() ?? '';
    const cargar = (lista: InstructorDTO[]): void => {
      mockInstructorService.getInstructores.and.returnValue(of(lista));
      component['cargarInstructores']();
      fixture.detectChanges();
    };
    const buscar = (texto: string): void => {
      campo().value = texto;
      campo().dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };

    beforeEach(() => cargar([maria, juan, ana]));

    it('el campo tiene label asociado y ayuda enlazada con aria-describedby', () => {
      const label = el().querySelector('label[for="buscar-instructor"]');
      expect(label?.textContent?.trim()).toBe('Buscar instructor');
      expect(campo()).not.toBeNull();
      const ayuda = document.getElementById(campo().getAttribute('aria-describedby')!);
      expect(ayuda?.textContent?.trim()).toBe('Por identificación, nombre o correo');
    });

    it('busca por identificación', () => {
      buscar('2002');
      expect(nombres()).toEqual(['Juan Pérez']);
    });

    it('busca por nombre', () => {
      buscar('Ana');
      expect(nombres()).toEqual(['Ana Gómez']);
    });

    it('busca por correo', () => {
      buscar('correo.com');
      expect(nombres()).toEqual(['Ana Gómez']);
    });

    it('no distingue mayúsculas', () => {
      buscar('JUAN.PEREZ');
      expect(nombres()).toEqual(['Juan Pérez']);
    });

    it('"garcia" encuentra "García" (sin tildes) y "PÉREZ" encuentra "perez"', () => {
      buscar('garcia');
      expect(nombres()).toEqual(['María García']);
      buscar('PÉREZ');
      expect(nombres()).toEqual(['Juan Pérez']);
    });

    it('coincidencia por subcadena', () => {
      buscar('un');   // "Juan" y "unicauca" en correos: los tres correos de unicauca no, solo maria y juan
      expect(nombres()).toEqual(['María García', 'Juan Pérez']);
    });

    it('sin coincidencias: mensaje en la región aria-live, botón "Limpiar búsqueda" y sin filas', () => {
      buscar('zzz');
      expect(nombres()).toEqual([]);
      expect(estado()).toBe('Ningún instructor coincide con la búsqueda');
      const boton = el().querySelector('button.btn-limpiar-busqueda') as HTMLButtonElement;
      expect(boton.textContent?.trim()).toBe('Limpiar búsqueda');
    });

    it('limpiar restaura la lista completa y vacía el campo', async () => {
      buscar('zzz');
      (el().querySelector('button.btn-limpiar-busqueda') as HTMLButtonElement).click();
      fixture.detectChanges();
      await fixture.whenStable();   // [ngModel] escribe el valor del input en un microtask
      expect(nombres()).toEqual(['María García', 'Juan Pérez', 'Ana Gómez']);
      expect(campo().value).toBe('');
      expect(el().querySelector('button.btn-limpiar-busqueda')).toBeNull();
    });

    it('texto de estado en región aria-live="polite" con la cantidad', () => {
      expect(estado()).toBe('3 instructores');
      buscar('maria');
      expect(estado()).toBe('1 instructor');
    });

    it('sin ningún instructor: mensaje de lista vacía y sin botón de limpiar', () => {
      cargar([]);
      expect(estado()).toBe('No hay instructores registrados');
      expect(el().querySelector('button.btn-limpiar-busqueda')).toBeNull();
    });

    it('ordena por nombre ascendente y descendente (sin tildes, "Ana" antes que "María")', () => {
      const th = (t: string): HTMLElement =>
        Array.from(el().querySelectorAll('th')).find(h => h.textContent!.trim() === t) as HTMLElement;
      th('Nombre').click();
      fixture.detectChanges();
      expect(nombres()).toEqual(['Ana Gómez', 'Juan Pérez', 'María García']);
      th('Nombre').click();
      fixture.detectChanges();
      expect(nombres()).toEqual(['María García', 'Juan Pérez', 'Ana Gómez']);
    });

    it('ordena por identificación y por correo', () => {
      const th = (t: string): HTMLElement =>
        Array.from(el().querySelectorAll('th')).find(h => h.textContent!.trim() === t) as HTMLElement;
      th('Identificación').click();
      th('Identificación').click();
      fixture.detectChanges();
      expect(nombres()).toEqual(['Ana Gómez', 'Juan Pérez', 'María García']);
      th('Correo').click();
      fixture.detectChanges();
      expect(nombres()).toEqual(['Ana Gómez', 'Juan Pérez', 'María García']);
    });

    it('el acceso de ordenamiento ignora columnas desconocidas (Acciones)', () => {
      expect(component.dataSource.sortingDataAccessor(maria, 'Acciones')).toBe('');
    });

    it('las tres cabeceras ordenables se alcanzan con teclado (botones con tabindex=0)', () => {
      const enfocables = el().querySelectorAll('th .mat-sort-header-container[tabindex="0"]');
      expect(enfocables.length).toBe(3);
    });

    it('eliminar recarga la lista y conserva el filtro vigente', () => {
      buscar('garcia');
      spyOn(component['dialog'], 'open').and.returnValue(mockDialogRef as any);
      spyOn(component['snackBar'], 'open');
      mockDialogRef.afterClosed.and.returnValue(of({ confirmado: true }));
      mockInstructorService.getInstructores.calls.reset();
      component.onDelete(maria);
      fixture.detectChanges();
      expect(mockInstructorService.getInstructores).toHaveBeenCalledTimes(1);
      expect(campo().value).toBe('garcia');
      expect(nombres()).toEqual(['María García']);
    });
  });

  describe('editar instructor (SCRUM-79)', () => {
    const maria: InstructorDTO = { id: '1001', nombre: 'María García', correo: 'maria@unicauca.edu.co', sexo: 'F' };
    const juan: InstructorDTO = { id: '2002', nombre: 'Juan Pérez', correo: 'juan.perez@unicauca.edu.co', sexo: 'M' };
    const ana: InstructorDTO = { id: '3003', nombre: 'Ana Gómez', correo: 'ana@correo.com', sexo: 'F' };
    const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const nombres = (): string[] =>
      Array.from(el().querySelectorAll('tr[mat-row] a.enlace-instructor')).map(a => a.textContent!.trim());
    const botonEditar = (nombre: string): HTMLButtonElement =>
      el().querySelector(`button[aria-label="Editar instructor ${nombre}"]`) as HTMLButtonElement;
    let abrir: jasmine.Spy;
    let snack: jasmine.Spy;
    const cierraCon = (resultado: unknown): void => {
      abrir.and.returnValue({ afterClosed: () => of(resultado) } as any);
    };

    beforeEach(() => {
      mockInstructorService.getInstructores.and.returnValue(of([maria, juan, ana]));
      component['cargarInstructores']();
      fixture.detectChanges();
      abrir = spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);
      snack = spyOn(component['snackBar'], 'open');
      mockInstructorService.getInstructores.calls.reset();
    });

    it('cada fila tiene un botón de editar con aria-label "Editar instructor {nombre}"', () => {
      expect(el().querySelectorAll('tr[mat-row] button[aria-label^="Editar instructor "]').length).toBe(3);
      expect(botonEditar('María García').textContent).toContain('edit');
      expect(botonEditar('María García').getAttribute('type')).toBe('button');
    });

    it('el icono abre el diálogo con los datos de ESA fila', () => {
      botonEditar('Juan Pérez').click();
      expect(abrir).toHaveBeenCalledWith(
        FormInstructorComponent,
        jasmine.objectContaining({ data: { id: '2002', nombre: 'Juan Pérez', correo: 'juan.perez@unicauca.edu.co' } }),
      );
    });

    it('Cancelar (sin resultado) no cambia la tabla, no recarga ni muestra snackbar', () => {
      botonEditar('Juan Pérez').click();
      fixture.detectChanges();
      expect(nombres()).toEqual(['María García', 'Juan Pérez', 'Ana Gómez']);
      expect(mockInstructorService.getInstructores).not.toHaveBeenCalled();
      expect(snack).not.toHaveBeenCalled();
    });

    it('éxito: actualiza la fila, conserva el filtro vigente y muestra "Instructor actualizado"', () => {
      const campo = el().querySelector('input#buscar-instructor') as HTMLInputElement;
      campo.value = 'garcia';
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(nombres()).toEqual(['María García']);
      cierraCon({ ...maria, nombre: 'María García Ruiz' });
      botonEditar('María García').click();
      fixture.detectChanges();
      expect(nombres()).toEqual(['María García Ruiz']);
      expect(campo.value).toBe('garcia');
      expect(snack).toHaveBeenCalledWith('Instructor actualizado', '', jasmine.objectContaining({ panelClass: 'snack-success' }));
    });

    it('éxito: conserva el orden vigente', () => {
      const th = Array.from(el().querySelectorAll('th')).find(h => h.textContent!.trim() === 'Nombre') as HTMLElement;
      th.click();
      fixture.detectChanges();
      expect(nombres()).toEqual(['Ana Gómez', 'Juan Pérez', 'María García']);
      cierraCon({ ...ana, nombre: 'Zoe Gómez' });
      botonEditar('Ana Gómez').click();
      fixture.detectChanges();
      expect(nombres()).toEqual(['Juan Pérez', 'María García', 'Zoe Gómez']);
    });

    it('señal "ya no existe": recarga la lista y avisa', () => {
      cierraCon({ yaNoExiste: true });
      botonEditar('Juan Pérez').click();
      expect(mockInstructorService.getInstructores).toHaveBeenCalledTimes(1);
      expect(snack).toHaveBeenCalledWith('El instructor ya no existe', '', jasmine.objectContaining({ panelClass: 'snack-error' }));
    });

    it('el icono de editar solo existe para el Coordinador', () => {
      perfil$.next('Instructor');
      fixture.detectChanges();
      expect(el().querySelectorAll('button[aria-label^="Editar instructor "]').length).toBe(0);
      perfil$.next('Coordinador');
      fixture.detectChanges();
      expect(el().querySelectorAll('button[aria-label^="Editar instructor "]').length).toBe(3);
    });
  });

  describe('onDelete', () => {
    let dialogOpenSpy: jasmine.Spy;
    let snackBarOpenSpy: jasmine.Spy;

    beforeEach(() => {
      // spyOn sobre la instancia real inyectada — MatDialogModule standalone crea
      // su propia instancia que no usa el mock del root injector.
      dialogOpenSpy = spyOn(component['dialog'], 'open').and.returnValue(mockDialogRef as any);
      snackBarOpenSpy = spyOn(component['snackBar'], 'open');
    });

    it('abre DialogComponent con tipoElemento="instructor" e instructorId', () => {
      component.onDelete(instructorDummy);
      expect(dialogOpenSpy).toHaveBeenCalledWith(
        jasmine.any(Function),
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            tipoElemento: 'instructor',
            instructorId: 'INS01',
          }),
        })
      );
    });

    it('confirmado: true → recarga instructores y muestra snack-success', () => {
      mockDialogRef.afterClosed.and.returnValue(of({ confirmado: true }));
      component.onDelete(instructorDummy);
      expect(mockInstructorService.getInstructores).toHaveBeenCalledTimes(2);
      expect(snackBarOpenSpy).toHaveBeenCalledWith(
        'Instructor eliminado', '',
        jasmine.objectContaining({ panelClass: 'snack-success' })
      );
    });

    it('confirmado: false errorStatus 409 → snack-error con mensaje de ya eliminado', () => {
      mockDialogRef.afterClosed.and.returnValue(of({ confirmado: false, errorStatus: 409 }));
      component.onDelete(instructorDummy);
      expect(snackBarOpenSpy).toHaveBeenCalledWith(
        'El instructor ya se encuentra eliminado', '',
        jasmine.objectContaining({ panelClass: 'snack-error' })
      );
    });

    it('confirmado: false errorStatus 500 → snack-error genérico', () => {
      mockDialogRef.afterClosed.and.returnValue(of({ confirmado: false, errorStatus: 500 }));
      component.onDelete(instructorDummy);
      expect(snackBarOpenSpy).toHaveBeenCalledWith(
        'Error al eliminar el instructor', '',
        jasmine.objectContaining({ panelClass: 'snack-error' })
      );
    });

    it('resultado null → no llama a snackBar ni recarga instructores', () => {
      mockDialogRef.afterClosed.and.returnValue(of(null));
      component.onDelete(instructorDummy);
      expect(snackBarOpenSpy).not.toHaveBeenCalled();
      expect(mockInstructorService.getInstructores).toHaveBeenCalledTimes(1);
    });
  });
});
