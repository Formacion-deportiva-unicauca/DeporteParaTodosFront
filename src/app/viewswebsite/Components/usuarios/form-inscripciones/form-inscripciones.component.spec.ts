import { TestBed, ComponentFixture } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormInscripcionesComponent } from './form-inscripciones.component';
import { AlumnoService } from 'src/app/services/alumno.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { CatalogoService } from 'src/app/services/catalogo.service';
import { PerfilDTO } from 'src/app/Models/DTOs/perfil-tdo';

const mockPerfil: PerfilDTO = {
  id: 99, nombre: 'María López', correo: 'maria@unicauca.edu.co',
  tipoId: 'CC', sexo: 'F', facultad: 'Ingenieria',
  tipoAlumno: 'Regular', role: 'Alumno', alumnoCodigo: 'MA1001',
};

const alumnoMock = {
  id: 5, nombre: 'Carlos', correo: 'carlos@mail.com', tipo: 'Estudiante',
  codigo: 'C100', sexo: 'M', tipoid: 'CC', imagen: 0,
};

async function setupTestBed(data: any = null) {
  const alumnoSpy = jasmine.createSpyObj('AlumnoService', ['buscarPorCorreo', 'actualizarAlumno']);
  const perfilSpy = jasmine.createSpyObj('PerfilService', ['registrarPerfil', 'registrarInstructor']);
  const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
  const catalogoSpy = jasmine.createSpyObj('CatalogoService', ['getFacultades', 'getProgramas']);
  catalogoSpy.getFacultades.and.returnValue(of(['Facultad de Ingeniería Civil']));
  catalogoSpy.getProgramas.and.returnValue(of(['Ingeniería Civil']));

  await TestBed.configureTestingModule({
    imports: [FormInscripcionesComponent, NoopAnimationsModule],
    providers: [
      { provide: AlumnoService,  useValue: alumnoSpy },
      { provide: PerfilService,  useValue: perfilSpy },
      { provide: MatDialogRef,   useValue: dialogRefSpy },
      { provide: CatalogoService, useValue: catalogoSpy },
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
    ],
  }).compileComponents();

  const fixture: ComponentFixture<FormInscripcionesComponent> = TestBed.createComponent(FormInscripcionesComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  return { fixture, component, alumnoSpy, perfilSpy, dialogRefSpy, catalogoSpy };
}

// ── Modo por defecto (creación normal) ────────────────────────────────────

describe('FormInscripcionesComponent › modo creación', () => {
  let component: FormInscripcionesComponent;

  beforeEach(async () => {
    ({ component } = await setupTestBed(null));
  });

  it('se crea correctamente sin dialogData', () => {
    expect(component).toBeTruthy();
    expect(component.isEditing).toBeFalse();
    expect(component.isInscribirMode).toBeFalse();
  });

  it('showRegisterForm es siempre true fuera del modo inscribir', () => {
    expect(component.showRegisterForm).toBeTrue();
  });
});

// ── Modo "editar" ─────────────────────────────────────────────────────────

describe('FormInscripcionesComponent › modo editar', () => {
  let component: FormInscripcionesComponent;
  let alumnoSpy: jasmine.SpyObj<AlumnoService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<FormInscripcionesComponent>>;

  beforeEach(async () => {
    ({ component, alumnoSpy, dialogRefSpy } = await setupTestBed({ modo: 'editar', alumno: alumnoMock }));
  });

  it('ngOnInit: isEditing=true y prefill de datos del alumno', () => {
    expect(component.isEditing).toBeTrue();
    expect(component.perfil.nombre).toBe('Carlos');
    expect(component.perfil.correo).toBe('carlos@mail.com');
    expect(component.perfil.tipoAlumno).toBe('Estudiante');
  });

  it('onSubmit: llama actualizarAlumno y cierra con { actualizado: true }', () => {
    alumnoSpy.actualizarAlumno.and.returnValue(of({ id: 5 }));
    component.onSubmit({} as any);
    expect(alumnoSpy.actualizarAlumno).toHaveBeenCalledWith(
      5, jasmine.objectContaining({ nombre: 'Carlos', correo: 'carlos@mail.com' })
    );
    expect(dialogRefSpy.close).toHaveBeenCalledWith({ actualizado: true });
  });
});

// ── Modo "editar" del Instructor: el correo no se puede cambiar ───────────

describe('FormInscripcionesComponent › modo editar con correo bloqueado', () => {
  it('con bloquearCorreo el campo correo está deshabilitado y el envío conserva el correo actual', async () => {
    const { fixture, component, alumnoSpy } = await setupTestBed({ modo: 'editar', alumno: alumnoMock, bloquearCorreo: true });
    await fixture.whenStable();
    fixture.detectChanges();
    const correo = (fixture.nativeElement as HTMLElement).querySelector('input[name="correo"]') as HTMLInputElement;
    expect(correo.disabled).toBeTrue();
    alumnoSpy.actualizarAlumno.and.returnValue(of({ id: 5 }));
    component.onSubmit({} as any);
    expect(alumnoSpy.actualizarAlumno).toHaveBeenCalledWith(5, jasmine.objectContaining({ correo: 'carlos@mail.com' }));
  });

  it('sin bloquearCorreo (Coordinador) el campo correo se puede editar', async () => {
    const { fixture } = await setupTestBed({ modo: 'editar', alumno: alumnoMock });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(((fixture.nativeElement as HTMLElement).querySelector('input[name="correo"]') as HTMLInputElement).disabled).toBeFalse();
  });
});

// ── Modo "editar": el servidor rechaza el cambio ──────────────────────────

describe('FormInscripcionesComponent › modo editar con error del servidor', () => {
  let fixture: ComponentFixture<FormInscripcionesComponent>;
  let component: FormInscripcionesComponent;
  let alumnoSpy: jasmine.SpyObj<AlumnoService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<FormInscripcionesComponent>>;
  const alerta = (): string | null =>
    (fixture.nativeElement as HTMLElement).querySelector('.error-edicion')?.textContent?.replace(/\s+/g, ' ').trim() ?? null;

  beforeEach(async () => {
    ({ fixture, component, alumnoSpy, dialogRefSpy } = await setupTestBed({ modo: 'editar', alumno: alumnoMock }));
  });

  it('403: muestra que no tiene permiso, deja el diálogo abierto y conserva lo escrito', () => {
    alumnoSpy.actualizarAlumno.and.returnValue(throwError(() => ({ status: 403 })));
    component.perfil.nombre = 'Nuevo nombre';
    component.onSubmit({} as any);
    fixture.detectChanges();
    expect(alerta()).toContain('No tiene permiso para editar a este deportista');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
    expect(component.perfil.nombre).toBe('Nuevo nombre');
  });

  it('el aviso es un alert accesible', () => {
    alumnoSpy.actualizarAlumno.and.returnValue(throwError(() => ({ status: 403 })));
    component.onSubmit({} as any);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.error-edicion')?.getAttribute('role')).toBe('alert');
  });

  it('422 con mensaje del servidor: lo muestra', () => {
    alumnoSpy.actualizarAlumno.and.returnValue(throwError(() => ({ status: 422, error: { mensaje: 'El correo no se puede cambiar' } })));
    component.onSubmit({} as any);
    fixture.detectChanges();
    expect(alerta()).toContain('El correo no se puede cambiar');
  });

  it('otros errores: mensaje genérico', () => {
    alumnoSpy.actualizarAlumno.and.returnValue(throwError(() => ({ status: 500 })));
    component.onSubmit({} as any);
    fixture.detectChanges();
    expect(alerta()).toContain('No se pudo actualizar al deportista');
  });

  it('un nuevo intento correcto limpia el aviso y cierra', () => {
    alumnoSpy.actualizarAlumno.and.returnValues(throwError(() => ({ status: 403 })), of({ id: 5 }));
    component.onSubmit({} as any);
    component.onSubmit({} as any);
    fixture.detectChanges();
    expect(alerta()).toBeNull();
    expect(dialogRefSpy.close).toHaveBeenCalledWith({ actualizado: true });
  });
});

// ── Desplazamiento del formulario: el contenido largo debe poder recorrerse con scroll ──

describe('FormInscripcionesComponent › scroll del formulario', () => {
  const contenido = (fixture: ComponentFixture<FormInscripcionesComponent>): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector('mat-dialog-content') as HTMLElement;

  async function conFormularioCompleto(data: any) {
    const r = await setupTestBed(data);
    // Modo inscribir con un correo no encontrado: se muestra el formulario completo de registro (el más largo).
    if (data?.modo === 'inscribir') r.component.estado = 'no_encontrado';
    r.fixture.detectChanges();
    return r;
  }

  for (const [nombre, data] of [
    ['inscribir (formulario completo de registro)', { modo: 'inscribir' }],
    ['registro de usuario', null],
    ['editar', { modo: 'editar', alumno: alumnoMock }],
  ] as [string, any][]) {
    it(`${nombre}: el contenido tiene una altura máxima menor que la pantalla y desplazamiento vertical`, async () => {
      const { fixture } = await conFormularioCompleto(data);
      const estilo = getComputedStyle(contenido(fixture));
      expect(estilo.maxHeight).withContext('max-height').not.toBe('none');
      expect(parseFloat(estilo.maxHeight)).withContext('max-height en px').toBeLessThanOrEqual(window.innerHeight * 0.9);
      expect(['auto', 'scroll']).withContext('overflow-y').toContain(estilo.overflowY);
    });
  }

  it('si el formulario es más alto que ese límite, queda desplazable (se puede llegar a los botones)', async () => {
    const { fixture } = await conFormularioCompleto({ modo: 'inscribir' });
    const el = contenido(fixture);
    el.style.maxHeight = '150px';        // simula una pantalla baja
    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight);
    el.scrollTop = el.scrollHeight;
    expect(el.scrollTop).toBeGreaterThan(0);
  });
});

// ── Modo "inscribir" ──────────────────────────────────────────────────────

describe('FormInscripcionesComponent › modo inscribir', () => {
  let component: FormInscripcionesComponent;
  let alumnoSpy: jasmine.SpyObj<AlumnoService>;
  let perfilSpy: jasmine.SpyObj<PerfilService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<FormInscripcionesComponent>>;

  beforeEach(async () => {
    ({ component, alumnoSpy, perfilSpy, dialogRefSpy } = await setupTestBed({ modo: 'inscribir' }));
  });

  it('ngOnInit: isInscribirMode=true, estado="busqueda"', () => {
    expect(component.isInscribirMode).toBeTrue();
    expect(component.estado).toBe('busqueda');
  });

  it('showRegisterForm: false en estado "busqueda"', () => {
    component.estado = 'busqueda';
    expect(component.showRegisterForm).toBeFalse();
  });

  it('showRegisterForm: false en estado "encontrado"', () => {
    component.estado = 'encontrado';
    expect(component.showRegisterForm).toBeFalse();
  });

  it('showRegisterForm: false en estado "rol_invalido"', () => {
    component.estado = 'rol_invalido';
    expect(component.showRegisterForm).toBeFalse();
  });

  it('showRegisterForm: true en estado "no_encontrado"', () => {
    component.estado = 'no_encontrado';
    expect(component.showRegisterForm).toBeTrue();
  });

  it('buscarAlumno: role "Alumno" → estado "encontrado" y perfilEncontrado asignado', () => {
    alumnoSpy.buscarPorCorreo.and.returnValue(of({ ...mockPerfil }));
    component.correoBusqueda = 'maria@unicauca.edu.co';
    component.buscarAlumno();
    expect(component.estado).toBe('encontrado');
    expect(component.perfilEncontrado?.nombre).toBe('María López');
    expect(component.buscando).toBeFalse();
  });

  it('buscarAlumno: role "Coordinador" → estado "rol_invalido", perfilEncontrado nulo', () => {
    alumnoSpy.buscarPorCorreo.and.returnValue(of({ ...mockPerfil, role: 'Coordinador' }));
    component.correoBusqueda = 'admin@unicauca.edu.co';
    component.buscarAlumno();
    expect(component.estado).toBe('rol_invalido');
    expect(component.perfilEncontrado).toBeNull();
  });

  it('buscarAlumno: HTTP 404 → estado "no_encontrado" y correo pre-rellenado', () => {
    alumnoSpy.buscarPorCorreo.and.returnValue(throwError(() => ({ status: 404 })));
    component.correoBusqueda = 'nuevo@unicauca.edu.co';
    component.buscarAlumno();
    expect(component.estado).toBe('no_encontrado');
    expect(component.perfil.correo).toBe('nuevo@unicauca.edu.co');
  });

  it('buscarAlumno: correo vacío no llama al servicio', () => {
    component.correoBusqueda = '   ';
    component.buscarAlumno();
    expect(alumnoSpy.buscarPorCorreo).not.toHaveBeenCalled();
  });

  it('inscribirEncontrado: cierra dialog con { confirmacionCreacion: true, idAlumno }', () => {
    component.perfilEncontrado = { ...mockPerfil };
    component.inscribirEncontrado();
    expect(dialogRefSpy.close).toHaveBeenCalledWith({ confirmacionCreacion: true, idAlumno: 99 });
  });

  it('onSubmit en no_encontrado: registra perfil y cierra con confirmacionCreacion + idAlumno', () => {
    perfilSpy.registrarPerfil.and.returnValue(of({ ...mockPerfil, id: 55 } as any));
    component.estado = 'no_encontrado';
    component.perfil.nombre = 'Nuevo Alumno';
    component.perfil.correo = 'nuevo@unicauca.edu.co';
    component.onSubmit({} as any);
    expect(perfilSpy.registrarPerfil).toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith({ confirmacionCreacion: true, idAlumno: 55 });
  });
});

// ── Datos según el tipo de vínculo (registro) ──────────────────────────────

describe('FormInscripcionesComponent › vínculo del deportista', () => {
  let component: FormInscripcionesComponent;
  let fixture: ComponentFixture<FormInscripcionesComponent>;
  let perfilSpy: jasmine.SpyObj<PerfilService>;
  let catalogoSpy: jasmine.SpyObj<CatalogoService>;
  const FAC = 'Facultad de Ingeniería Civil';

  const campo = (nombre: string): Element | null => fixture.nativeElement.querySelector(`[name="${nombre}"]`);
  const elegir = (tipo: string): void => {
    component.perfil.tipoAlumno = tipo;
    component.onTipoChange();
    fixture.detectChanges();
  };
  const enviado = (): PerfilDTO => perfilSpy.registrarPerfil.calls.mostRecent().args[0];

  beforeEach(async () => {
    ({ component, fixture, perfilSpy, catalogoSpy } = await setupTestBed(null) as any);
    perfilSpy.registrarPerfil.and.returnValue(of({ ...mockPerfil, id: 55 } as any));
  });

  it('ofrece los cuatro tipos de vínculo', () => {
    expect(component.tiposAlumno).toEqual(['Estudiante', 'Docente', 'Administrativo', 'Contratista']);
  });

  it('carga las facultades al iniciar', () => {
    expect(catalogoSpy.getFacultades).toHaveBeenCalled();
    expect(component.facultades).toEqual([FAC]);
  });

  it('Estudiante (por defecto): pide código, facultad y programa', () => {
    expect(campo('codigo')).not.toBeNull();
    expect(campo('facultad')).not.toBeNull();
    expect(campo('programa')).not.toBeNull();
    expect(campo('dependencia')).toBeNull();
  });

  it('Docente: sin código, con facultad y programa', () => {
    elegir('Docente');
    expect(campo('codigo')).toBeNull();
    expect(campo('facultad')).not.toBeNull();
    expect(campo('dependencia')).toBeNull();
  });

  it('Administrativo y Contratista: solo dependencia', () => {
    ['Administrativo', 'Contratista'].forEach(tipo => {
      elegir(tipo);
      expect(campo('dependencia')).not.toBeNull();
      expect(campo('codigo')).toBeNull();
      expect(campo('facultad')).toBeNull();
    });
  });

  it('al elegir una facultad carga sus programas y reinicia el programa', () => {
    component.perfil.programa = 'Otro';
    component.onFacultadChange(FAC);
    expect(catalogoSpy.getProgramas).toHaveBeenCalledWith(FAC);
    expect(component.programas).toEqual(['Ingeniería Civil']);
    expect(component.perfil.programa).toBe('');
  });

  it('una facultad sin programas cargados lo avisa', () => {
    catalogoSpy.getProgramas.and.returnValue(of([]));
    component.onFacultadChange('Facultad de Artes');
    expect(component.sinProgramas).toBeTrue();
  });

  it('al cambiar de tipo se limpian los datos que ya no corresponden', () => {
    Object.assign(component.perfil, { alumnoCodigo: '104612', facultad: FAC, programa: 'Ingeniería Civil' });
    elegir('Administrativo');
    expect(component.perfil.alumnoCodigo).toBe('');
    expect(component.perfil.facultad).toBe('');
    expect(component.perfil.programa).toBe('');
  });

  it('registra un Docente con facultad y programa, sin código', () => {
    elegir('Docente');
    Object.assign(component.perfil, { alumnoCodigo: '999', facultad: FAC, programa: 'Ingeniería Civil' });
    component.onSubmit({} as any);
    expect(enviado().alumnoCodigo).toBe('');
    expect(enviado().facultad).toBe(FAC);
    expect(enviado().programa).toBe('Ingeniería Civil');
  });

  it('registra un Administrativo con su dependencia y sin facultad', () => {
    elegir('Administrativo');
    Object.assign(component.perfil, { dependencia: 'Oficina de Planeación', facultad: FAC });
    component.onSubmit({} as any);
    expect(enviado().dependencia).toBe('Oficina de Planeación');
    expect(enviado().facultad).toBe('');
    expect(enviado().programa).toBe('');
  });

  it('un 422 del backend se muestra dentro del diálogo y no lo cierra', () => {
    perfilSpy.registrarPerfil.and.returnValue(throwError(() => ({ status: 422, error: { mensaje: 'La dependencia es obligatoria' } })));
    component.onSubmit({} as any);
    fixture.detectChanges();
    expect(component.errorRegistro).toBe('La dependencia es obligatoria');
    expect(fixture.nativeElement.querySelector('.error-edicion')?.textContent).toContain('La dependencia es obligatoria');
  });

  it('un error sin mensaje muestra un texto genérico', () => {
    perfilSpy.registrarPerfil.and.returnValue(throwError(() => ({ status: 500 })));
    component.onSubmit({} as any);
    expect(component.errorRegistro).toContain('No se pudo registrar');
  });
});

describe('FormInscripcionesComponent › vínculo del instructor y edición', () => {
  it('el registro de un Instructor no cambia: conserva el código y no envía facultad, programa ni dependencia', async () => {
    const { component, fixture, perfilSpy } = await setupTestBed({ rol: 'Instructor' });
    perfilSpy.registrarInstructor.and.returnValue(of({ ...mockPerfil, id: 7 } as any));
    expect(fixture.nativeElement.querySelector('[name="codigo"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[name="facultad"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[name="dependencia"]')).toBeNull();
    component.perfil.alumnoCodigo = '123';
    component.onSubmit({} as any);
    const payload: PerfilDTO = perfilSpy.registrarInstructor.calls.mostRecent().args[0];
    expect(payload.alumnoCodigo).toBe('123');
    expect(payload.tipoAlumno).toBe('Docente');
    expect([payload.facultad, payload.programa, payload.dependencia]).toEqual(['', '', '']);
  });

  it('al editar se puede elegir Contratista y no aparecen campos de vínculo', async () => {
    const { component, fixture } = await setupTestBed({ modo: 'editar', alumno: alumnoMock });
    expect(component.tiposAlumno).toContain('Contratista');
    ['codigo', 'facultad', 'programa', 'dependencia'].forEach(n =>
      expect(fixture.nativeElement.querySelector(`[name="${n}"]`)).toBeNull());
  });
});
