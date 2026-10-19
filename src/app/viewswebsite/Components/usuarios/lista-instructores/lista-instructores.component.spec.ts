import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ListaInstructoresComponent } from './lista-instructores.component';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { AuthService } from 'src/app/services/auth.service';
import { InstructorDTO } from 'src/app/Models/DTOs/instructor-dto';
import { FormInstructorComponent } from '../form-instructor/form-instructor.component';
import { FormProrrogaRegistroComponent } from '../form-prorroga-registro/form-prorroga-registro.component';
import { PlazoCargaDTO } from 'src/app/Models/DTOs/plazo-carga-dto';

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
    mockInstructorService = jasmine.createSpyObj('InstructorServisce', ['getInstructores', 'deleteInstructor', 'getPlazosCarga', 'asignarPlazoCarga']);
    mockInstructorService.getInstructores.and.returnValue(of([instructorDummy]));
    mockInstructorService.getPlazosCarga.and.returnValue(of([]));
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

  describe('plazos de carga (SCRUM-80, fase A)', () => {
    const maria: InstructorDTO = { id: '1001', nombre: 'María García', correo: 'maria@unicauca.edu.co', sexo: 'F' };
    const juan: InstructorDTO = { id: '2002', nombre: 'Juan Pérez', correo: 'juan.perez@unicauca.edu.co', sexo: 'M' };
    const ana: InstructorDTO = { id: '3003', nombre: 'Ana Gómez', correo: 'ana@correo.com', sexo: 'F' };
    const luis: InstructorDTO = { id: '4004', nombre: 'Luis Ríos', correo: 'luis@correo.com', sexo: 'M' };
    const eva: InstructorDTO = { id: '5005', nombre: 'Eva Mora', correo: 'eva@correo.com', sexo: 'F' };
    const plazo = (id: string, extra: Partial<PlazoCargaDTO> = {}): PlazoCargaDTO => ({
      idInstructor: id, anio: 2026, periodo: 2, fechaLimite: null,
      estadoReporte: 'SIN_PLAZO', plazoVencido: false, clasesConAsistencia: 0, ...extra,
    });
    const plazos: PlazoCargaDTO[] = [
      plazo('1001'),
      plazo('2002', { estadoReporte: 'PENDIENTE', fechaLimite: '2026-10-15' }),
      plazo('3003', { estadoReporte: 'VENCIDO', fechaLimite: '2026-09-30', plazoVencido: true }),
      plazo('4004', { estadoReporte: 'GENERADO', fechaLimite: '2026-09-30', plazoVencido: true }),
      plazo('5005', { estadoReporte: 'GENERADO', fechaLimite: '2026-12-01' }),
    ];
    const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const fila = (nombre: string): HTMLElement =>
      Array.from(el().querySelectorAll('tr[mat-row]')).find(
        tr => tr.querySelector('a.enlace-instructor')?.textContent?.trim() === nombre,
      ) as HTMLElement;
    const textoReporte = (nombre: string): string => fila(nombre).querySelector('.texto-reporte')?.textContent?.trim() ?? '';
    const nombres = (): string[] =>
      Array.from(el().querySelectorAll('tr[mat-row] a.enlace-instructor')).map(a => a.textContent!.trim());
    const aviso = (): HTMLElement | null => el().querySelector('.aviso-reportes');
    const cargar = (lista: InstructorDTO[], respuesta: any = of(plazos)): void => {
      mockInstructorService.getInstructores.and.returnValue(of(lista));
      mockInstructorService.getPlazosCarga.and.returnValue(respuesta);
      component['cargarInstructores']();
      component['cargarPlazos']();
      fixture.detectChanges();
    };

    it('muestra los cuatro estados con su texto exacto (incluido GENERADO con plazo cerrado)', () => {
      cargar([maria, juan, ana, luis, eva]);
      expect(textoReporte('María García')).toBe('Sin plazo');
      expect(textoReporte('Juan Pérez')).toBe('Pendiente · hasta 15/10/2026');
      expect(textoReporte('Ana Gómez')).toBe('Vencido · límite 30/09/2026');
      expect(textoReporte('Luis Ríos')).toBe('Generado · plazo cerrado');
      expect(textoReporte('Eva Mora')).toBe('Generado');
    });

    it('cada estado lleva icono además del texto (nunca solo color)', () => {
      cargar([maria, juan, ana, luis, eva]);
      const iconos = Array.from(el().querySelectorAll('td .celda-reporte mat-icon')).map(i => i.textContent!.trim());
      expect(iconos.length).toBe(5);
      expect(iconos.every(i => i.length > 0)).toBeTrue();
      expect(textoReporte('María García').length).toBeGreaterThan(0);
    });

    it('la cabecera "Reporte" es <th scope="col"> y la columna NO es ordenable ni entra en el filtro', () => {
      cargar([maria, juan, ana, luis, eva]);
      const th = Array.from(el().querySelectorAll('th')).find(h => h.textContent!.trim() === 'Reporte') as HTMLElement;
      expect(th.getAttribute('scope')).toBe('col');
      expect(th.classList.contains('mat-sort-header')).toBeFalse();
      const campo = el().querySelector('input#buscar-instructor') as HTMLInputElement;
      campo.value = 'pendiente';
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(nombres()).toEqual([]);
    });

    it('instructor sin plazo en la respuesta: "—"; plazo de un instructor que no está en la lista: se ignora', () => {
      cargar([maria, juan], of([plazo('2002', { estadoReporte: 'PENDIENTE', fechaLimite: '2026-10-15' }), plazo('9999')]));
      expect(textoReporte('María García')).toBe('—');
      expect(textoReporte('Juan Pérez')).toBe('Pendiente · hasta 15/10/2026');
      expect(nombres()).toEqual(['María García', 'Juan Pérez']);
      expect(aviso()?.textContent).toContain('1 instructor aún no ha generado');   // el 9999 no cuenta
    });

    describe('aviso sobre la tabla', () => {
      it('plural con vencidos, role="status" y aria-live polite', () => {
        cargar([maria, juan, ana, luis, eva]);
        expect(aviso()?.textContent?.trim()).toBe('3 instructores aún no han generado su reporte del periodo 2026-2 (1 con plazo vencido)');
        expect(aviso()?.getAttribute('role')).toBe('status');
        expect(aviso()?.getAttribute('aria-live')).toBe('polite');
      });

      it('singular', () => {
        cargar([maria, luis], of([plazo('1001'), plazo('4004', { estadoReporte: 'GENERADO' })]));
        expect(aviso()?.textContent?.trim()).toBe('1 instructor aún no ha generado su reporte del periodo 2026-2');
      });

      it('cero: oculto cuando todos generaron su reporte', () => {
        cargar([luis, eva], of([plazo('4004', { estadoReporte: 'GENERADO' }), plazo('5005', { estadoReporte: 'GENERADO' })]));
        expect(aviso()).toBeNull();
      });

      it('oculto mientras carga y visible cuando llegan los plazos', () => {
        const pendiente = new Subject<PlazoCargaDTO[]>();
        cargar([maria, juan], pendiente);
        expect(aviso()).toBeNull();
        pendiente.next([plazo('1001'), plazo('2002', { estadoReporte: 'PENDIENTE', fechaLimite: '2026-10-15' })]);
        fixture.detectChanges();
        expect(aviso()?.textContent).toContain('2 instructores aún no han generado');
      });

      it('mientras carga, las celdas muestran "Cargando…" (distinto de "—" y del error)', () => {
        cargar([maria], new Subject<PlazoCargaDTO[]>());
        expect(textoReporte('María García')).toBe('Cargando…');
        expect(el().querySelector('.error-plazos')).toBeNull();
      });
    });

    describe('si los plazos fallan', () => {
      beforeEach(() => cargar([maria, juan], throwError(() => new HttpErrorResponse({ status: 500 }))));

      it('la lista se ve igual, con "—" en la columna', () => {
        expect(nombres()).toEqual(['María García', 'Juan Pérez']);
        expect(textoReporte('María García')).toBe('—');
        expect(textoReporte('Juan Pérez')).toBe('—');
      });

      it('aparece el aviso de error propio (role="alert"), sin aviso de conteo ni botones de plazo', () => {
        const error = el().querySelector('.error-plazos');
        expect(error?.textContent?.trim()).toBe('No se pudo cargar el estado de los reportes');
        expect(error?.getAttribute('role')).toBe('alert');
        expect(aviso()).toBeNull();
        expect(el().querySelectorAll('button.btn-plazo').length).toBe(0);
      });
    });

    describe('guarda de rol', () => {
      it('otro rol NO llama al endpoint de plazos y no muestra la columna "Reporte"', () => {
        perfil$.next('Instructor');
        mockInstructorService.getPlazosCarga.calls.reset();
        const otro = TestBed.createComponent(ListaInstructoresComponent);
        otro.detectChanges();
        expect(mockInstructorService.getPlazosCarga).not.toHaveBeenCalled();
        const cabeceras = Array.from((otro.nativeElement as HTMLElement).querySelectorAll('th')).map(h => h.textContent!.trim());
        expect(cabeceras).not.toContain('Reporte');
        expect((otro.nativeElement as HTMLElement).querySelector('.aviso-reportes')).toBeNull();
      });

      it('el Coordinador sí pide los plazos', () => {
        const otro = TestBed.createComponent(ListaInstructoresComponent);
        mockInstructorService.getPlazosCarga.calls.reset();
        otro.detectChanges();
        expect(mockInstructorService.getPlazosCarga).toHaveBeenCalledTimes(1);
      });
    });

  });

  describe('prórroga de registro (SCRUM-80 rediseñado)', () => {
    const maria: InstructorDTO = { id: '1001', nombre: 'María García', correo: 'maria@unicauca.edu.co', sexo: 'F' };
    const juan: InstructorDTO = { id: '2002', nombre: 'Juan Pérez', correo: 'juan.perez@unicauca.edu.co', sexo: 'M' };
    const ana: InstructorDTO = { id: '3003', nombre: 'Ana Gómez', correo: 'ana@correo.com', sexo: 'F' };
    const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const fila = (nombre: string): HTMLElement =>
      Array.from(el().querySelectorAll('tr[mat-row]')).find(
        tr => tr.querySelector('a.enlace-instructor')?.textContent?.trim() === nombre,
      ) as HTMLElement;
    const casilla = (nombre: string): HTMLInputElement => fila(nombre).querySelector('mat-checkbox input') as HTMLInputElement;
    const casillaTodos = (): HTMLInputElement => el().querySelector('th mat-checkbox input') as HTMLInputElement;
    const nombres = (): string[] =>
      Array.from(el().querySelectorAll('tr[mat-row] a.enlace-instructor')).map(a => a.textContent!.trim());
    const contador = (): string => el().querySelector('.contador-seleccion')?.textContent?.trim() ?? '';
    const botonMasivo = (): HTMLButtonElement | null => el().querySelector('button.btn-prorroga-masiva');
    const botonFila = (nombre: string): HTMLButtonElement | null => fila(nombre).querySelector('button.btn-prorroga-fila');
    const marcar = (input: HTMLInputElement): void => {
      input.click();
      fixture.detectChanges();
    };
    const buscar = (texto: string): void => {
      const campo = el().querySelector('input#buscar-instructor') as HTMLInputElement;
      campo.value = texto;
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const cargar = (lista: InstructorDTO[]): void => {
      mockInstructorService.getInstructores.and.returnValue(of(lista));
      component['cargarInstructores']();
      fixture.detectChanges();
    };
    let abrir: jasmine.Spy;
    let snack: jasmine.Spy;
    const cierraCon = (resultado: unknown): void => {
      abrir.and.returnValue({ afterClosed: () => of(resultado) } as any);
    };

    beforeEach(() => {
      cargar([maria, juan, ana]);
      abrir = spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);
      snack = spyOn(component['snackBar'], 'open');
      mockInstructorService.getInstructores.calls.reset();
    });

    describe('casillas y contador', () => {
      it('cada fila tiene su casilla con aria-label "Seleccionar a {nombre}" y la cabecera una para todos', () => {
        expect(casilla('María García').getAttribute('aria-label')).toBe('Seleccionar a María García');
        expect(casilla('Juan Pérez').getAttribute('aria-label')).toBe('Seleccionar a Juan Pérez');
        expect(casillaTodos().getAttribute('aria-label')).toBe('Seleccionar todos los instructores mostrados');
      });

      it('la columna de selección tiene <th scope="col">', () => {
        expect(el().querySelector('th mat-checkbox')?.closest('th')?.getAttribute('scope')).toBe('col');
      });

      it('el contador es una región aria-live="polite" con singular y plural', () => {
        expect(el().querySelector('.contador-seleccion')?.getAttribute('aria-live')).toBe('polite');
        expect(contador()).toBe('Ningún instructor seleccionado');
        marcar(casilla('Juan Pérez'));
        expect(contador()).toBe('1 instructor seleccionado');
        marcar(casilla('Ana Gómez'));
        expect(contador()).toBe('2 instructores seleccionados');
      });

      it('"Asignar prórroga" está deshabilitado sin selección y habilitado con 1 o más', () => {
        expect(botonMasivo()!.disabled).toBeTrue();
        marcar(casilla('Juan Pérez'));
        expect(botonMasivo()!.disabled).toBeFalse();
        marcar(casilla('Juan Pérez'));
        expect(botonMasivo()!.disabled).toBeTrue();
      });

      it('otros roles NO ven casillas, contador ni botones de prórroga', () => {
        perfil$.next('Instructor');
        fixture.detectChanges();
        expect(el().querySelectorAll('mat-checkbox').length).toBe(0);
        expect(el().querySelector('.contador-seleccion')).toBeNull();
        expect(botonMasivo()).toBeNull();
        expect(el().querySelectorAll('button.btn-prorroga-fila').length).toBe(0);
      });
    });

    describe('seleccionar todos (sobre lo filtrado)', () => {
      it('sin filtro marca todos y la casilla de cabecera queda marcada; al desmarcar limpia todos', () => {
        marcar(casillaTodos());
        expect(contador()).toBe('3 instructores seleccionados');
        expect(casillaTodos().checked).toBeTrue();
        expect(casillaTodos().indeterminate).toBeFalse();
        marcar(casillaTodos());
        expect(contador()).toBe('Ningún instructor seleccionado');
      });

      it('con filtro marca SOLO lo filtrado', () => {
        buscar('garcia');
        marcar(casillaTodos());
        expect(contador()).toBe('1 instructor seleccionado');
        buscar('');
        expect(casilla('María García').checked).toBeTrue();
        expect(casilla('Juan Pérez').checked).toBeFalse();
        expect(casilla('Ana Gómez').checked).toBeFalse();
      });

      it('estado indeterminado cuando solo parte de lo mostrado está seleccionada', () => {
        marcar(casilla('Juan Pérez'));
        expect(casillaTodos().indeterminate).toBeTrue();
        expect(casillaTodos().checked).toBeFalse();
      });

      it('desmarcar "todos" con filtro quita solo lo filtrado y conserva el resto', () => {
        marcar(casilla('Juan Pérez'));
        buscar('garcia');
        marcar(casillaTodos());           // selecciona a María
        marcar(casillaTodos());           // quita a María
        expect(contador()).toBe('1 instructor seleccionado');
        buscar('');
        expect(casilla('Juan Pérez').checked).toBeTrue();
      });
    });

    describe('la selección sobrevive a filtros y orden', () => {
      it('un instructor seleccionado y oculto por el filtro sigue contando y vuelve marcado', () => {
        marcar(casilla('Juan Pérez'));
        buscar('maria');
        expect(nombres()).toEqual(['María García']);
        expect(contador()).toBe('1 instructor seleccionado');
        buscar('');
        expect(casilla('Juan Pérez').checked).toBeTrue();
      });

      it('al ordenar la selección se conserva por id', () => {
        marcar(casilla('Juan Pérez'));
        const th = Array.from(el().querySelectorAll('th')).find(h => h.textContent!.trim() === 'Nombre') as HTMLElement;
        th.click();
        fixture.detectChanges();
        expect(nombres()).toEqual(['Ana Gómez', 'Juan Pérez', 'María García']);
        expect(casilla('Juan Pérez').checked).toBeTrue();
        expect(contador()).toBe('1 instructor seleccionado');
      });

      it('"Limpiar selección" la vacía', () => {
        marcar(casilla('Juan Pérez'));
        marcar(casilla('Ana Gómez'));
        (el().querySelector('button.btn-limpiar-seleccion') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(contador()).toBe('Ningún instructor seleccionado');
        expect(casilla('Juan Pérez').checked).toBeFalse();
        expect(el().querySelector('button.btn-limpiar-seleccion')).toBeNull();
      });

      it('al recargar la lista se descartan los seleccionados que ya no existen', () => {
        marcar(casilla('Juan Pérez'));
        marcar(casilla('Ana Gómez'));
        cargar([maria, ana]);
        expect(contador()).toBe('1 instructor seleccionado');
      });
    });

    describe('abrir el diálogo', () => {
      it('"Asignar prórroga" abre el diálogo con los seleccionados (id y nombre, en el orden de la lista)', () => {
        marcar(casilla('Ana Gómez'));
        marcar(casilla('Juan Pérez'));
        botonMasivo()!.click();
        expect(abrir).toHaveBeenCalledWith(
          FormProrrogaRegistroComponent,
          jasmine.objectContaining({
            data: { instructores: [{ id: '2002', nombre: 'Juan Pérez' }, { id: '3003', nombre: 'Ana Gómez' }] },
          }),
        );
      });

      it('el botón de la fila abre el diálogo solo con ese instructor, con aria-label que incluye el nombre', () => {
        const boton = botonFila('Juan Pérez')!;
        expect(boton.getAttribute('aria-label')).toBe('Asignar prórroga a Juan Pérez');
        expect(boton.getAttribute('type')).toBe('button');
        boton.click();
        expect(abrir).toHaveBeenCalledWith(
          FormProrrogaRegistroComponent,
          jasmine.objectContaining({ data: { instructores: [{ id: '2002', nombre: 'Juan Pérez' }] } }),
        );
      });

      it('el botón de la fila no depende de la selección', () => {
        marcar(casilla('Ana Gómez'));
        botonFila('Juan Pérez')!.click();
        expect((abrir.calls.mostRecent().args[1] as any).data.instructores.length).toBe(1);
      });
    });

    describe('al cerrar el diálogo', () => {
      const respuesta = (ids: string[], dias: number) =>
        ids.map(id => ({ idInstructor: id, dias, fechaLimite: dias ? '2026-11-10' : null }));

      it('éxito con varios: snackbar "Prórroga asignada a 2 instructores", selección limpia y sin recargar la lista', () => {
        marcar(casilla('Juan Pérez'));
        marcar(casilla('Ana Gómez'));
        cierraCon(respuesta(['2002', '3003'], 10));
        botonMasivo()!.click();
        fixture.detectChanges();
        expect(snack).toHaveBeenCalledWith('Prórroga asignada a 2 instructores', '', jasmine.objectContaining({ panelClass: 'snack-success' }));
        expect(contador()).toBe('Ningún instructor seleccionado');
        expect(mockInstructorService.getInstructores).not.toHaveBeenCalled();
      });

      it('éxito con uno: singular', () => {
        cierraCon(respuesta(['2002'], 5));
        botonFila('Juan Pérez')!.click();
        expect(snack).toHaveBeenCalledWith('Prórroga asignada a 1 instructor', '', jasmine.any(Object));
      });

      it('dias = 0: "Prórroga quitada"', () => {
        cierraCon(respuesta(['2002', '3003'], 0));
        botonFila('Juan Pérez')!.click();
        expect(snack).toHaveBeenCalledWith('Prórroga quitada', '', jasmine.any(Object));
      });

      it('Cancelar: no hay snackbar y la selección se conserva', () => {
        marcar(casilla('Juan Pérez'));
        botonMasivo()!.click();
        fixture.detectChanges();
        expect(snack).not.toHaveBeenCalled();
        expect(contador()).toBe('1 instructor seleccionado');
      });

      it('señal "ya no existe": recarga la lista, avisa y descarta a los que ya no están', () => {
        marcar(casilla('Juan Pérez'));
        marcar(casilla('Ana Gómez'));
        mockInstructorService.getInstructores.and.returnValue(of([maria, ana]));
        cierraCon({ yaNoExiste: true });
        botonMasivo()!.click();
        fixture.detectChanges();
        expect(mockInstructorService.getInstructores).toHaveBeenCalledTimes(1);
        expect(snack).toHaveBeenCalledWith('El instructor ya no existe', '', jasmine.objectContaining({ panelClass: 'snack-error' }));
        expect(contador()).toBe('1 instructor seleccionado');
      });
    });

    it('el punto de entrada del diálogo viejo de plazo ya no existe en la lista', () => {
      mockInstructorService.getPlazosCarga.and.returnValue(of([
        { idInstructor: '2002', anio: 2026, periodo: 2, fechaLimite: '2026-10-15', estadoReporte: 'PENDIENTE', plazoVencido: false, clasesConAsistencia: 0 },
      ]));
      component['cargarPlazos']();
      fixture.detectChanges();
      expect(el().querySelectorAll('button.btn-plazo').length).toBe(0);
      expect(fila('Juan Pérez').querySelector('.texto-reporte')?.textContent).toContain('Pendiente');   // la columna Reporte sigue
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
