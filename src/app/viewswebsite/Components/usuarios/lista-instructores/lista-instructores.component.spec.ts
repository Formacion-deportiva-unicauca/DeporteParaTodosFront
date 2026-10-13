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
import { FormPlazoCargaComponent } from '../form-plazo-carga/form-plazo-carga.component';
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
    const botonPlazo = (nombre: string): HTMLButtonElement | null => fila(nombre).querySelector('button.btn-plazo');
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

    describe('botón por fila', () => {
      beforeEach(() => cargar([maria, juan, ana, luis, eva]));

      it('"Asignar plazo" si SIN_PLAZO, con aria-label que incluye el nombre', () => {
        expect(botonPlazo('María García')?.textContent?.trim()).toBe('Asignar plazo');
        expect(botonPlazo('María García')?.getAttribute('aria-label')).toBe('Asignar plazo de carga a María García');
        expect(botonPlazo('María García')?.getAttribute('type')).toBe('button');
      });

      it('"Ampliar plazo" si el plazo está vencido (VENCIDO y GENERADO con plazo cerrado)', () => {
        expect(botonPlazo('Ana Gómez')?.textContent?.trim()).toBe('Ampliar plazo');
        expect(botonPlazo('Luis Ríos')?.textContent?.trim()).toBe('Ampliar plazo');
        expect(botonPlazo('Ana Gómez')?.getAttribute('aria-label')).toBe('Ampliar plazo de carga a Ana Gómez');
      });

      it('"Cambiar plazo" en los demás casos', () => {
        expect(botonPlazo('Juan Pérez')?.textContent?.trim()).toBe('Cambiar plazo');
        expect(botonPlazo('Eva Mora')?.textContent?.trim()).toBe('Cambiar plazo');
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

    describe('asignar plazo (diálogo)', () => {
      let abrir: jasmine.Spy;
      let snack: jasmine.Spy;
      const cierraCon = (resultado: unknown): void => {
        abrir.and.returnValue({ afterClosed: () => of(resultado) } as any);
      };

      beforeEach(() => {
        cargar([maria, juan, ana, luis, eva]);
        abrir = spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);
        snack = spyOn(component['snackBar'], 'open');
        mockInstructorService.getInstructores.calls.reset();
        mockInstructorService.getPlazosCarga.calls.reset();
      });

      it('abre el diálogo con los datos de ESA fila y su plazo', () => {
        botonPlazo('Juan Pérez')!.click();
        expect(abrir).toHaveBeenCalledWith(
          FormPlazoCargaComponent,
          jasmine.objectContaining({
            data: { id: '2002', nombre: 'Juan Pérez', fechaActual: '2026-10-15', estado: 'PENDIENTE', plazoVencido: false, anio: 2026, periodo: 2 },
          }),
        );
      });

      it('Cancelar no cambia nada: ni la fila, ni el aviso, ni snackbar', () => {
        botonPlazo('Juan Pérez')!.click();
        fixture.detectChanges();
        expect(textoReporte('Juan Pérez')).toBe('Pendiente · hasta 15/10/2026');
        expect(aviso()?.textContent).toContain('3 instructores');
        expect(snack).not.toHaveBeenCalled();
      });

      it('éxito: actualiza SOLO esa fila, recalcula el aviso y muestra el snackbar con la fecha', () => {
        cierraCon(plazo('3003', { estadoReporte: 'PENDIENTE', fechaLimite: '2026-11-01' }));
        botonPlazo('Ana Gómez')!.click();
        fixture.detectChanges();
        expect(textoReporte('Ana Gómez')).toBe('Pendiente · hasta 01/11/2026');
        expect(botonPlazo('Ana Gómez')?.textContent?.trim()).toBe('Cambiar plazo');
        expect(textoReporte('María García')).toBe('Sin plazo');
        expect(textoReporte('Juan Pérez')).toBe('Pendiente · hasta 15/10/2026');
        expect(aviso()?.textContent?.trim()).toBe('3 instructores aún no han generado su reporte del periodo 2026-2');   // ya sin vencidos
        expect(snack).toHaveBeenCalledWith('Plazo asignado hasta 01/11/2026', '', jasmine.objectContaining({ panelClass: 'snack-success' }));
        expect(mockInstructorService.getInstructores).not.toHaveBeenCalled();
        expect(mockInstructorService.getPlazosCarga).not.toHaveBeenCalled();
      });

      it('éxito: conserva el filtro vigente', () => {
        const campo = el().querySelector('input#buscar-instructor') as HTMLInputElement;
        campo.value = 'juan';
        campo.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        cierraCon(plazo('2002', { estadoReporte: 'PENDIENTE', fechaLimite: '2026-11-01' }));
        botonPlazo('Juan Pérez')!.click();
        fixture.detectChanges();
        expect(nombres()).toEqual(['Juan Pérez']);
        expect(campo.value).toBe('juan');
        expect(textoReporte('Juan Pérez')).toBe('Pendiente · hasta 01/11/2026');
      });

      it('éxito: conserva el orden vigente', () => {
        const th = Array.from(el().querySelectorAll('th')).find(h => h.textContent!.trim() === 'Nombre') as HTMLElement;
        th.click();
        fixture.detectChanges();
        const antes = nombres();
        expect(antes).toEqual(['Ana Gómez', 'Eva Mora', 'Juan Pérez', 'Luis Ríos', 'María García']);
        cierraCon(plazo('2002', { estadoReporte: 'PENDIENTE', fechaLimite: '2026-11-01' }));
        botonPlazo('Juan Pérez')!.click();
        fixture.detectChanges();
        expect(nombres()).toEqual(antes);
      });

      it('señal "ya no existe": recarga la lista y los plazos, y avisa', () => {
        cierraCon({ yaNoExiste: true });
        botonPlazo('Juan Pérez')!.click();
        expect(mockInstructorService.getInstructores).toHaveBeenCalledTimes(1);
        expect(mockInstructorService.getPlazosCarga).toHaveBeenCalledTimes(1);
        expect(snack).toHaveBeenCalledWith('El instructor ya no existe', '', jasmine.objectContaining({ panelClass: 'snack-error' }));
      });
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
