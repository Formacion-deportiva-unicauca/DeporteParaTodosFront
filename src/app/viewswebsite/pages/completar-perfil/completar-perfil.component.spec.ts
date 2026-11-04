import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OAuthService } from 'angular-oauth2-oidc';
import { Subject, of, throwError } from 'rxjs';
import { CompletarPerfilComponent } from './completar-perfil.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { CatalogoService } from 'src/app/services/catalogo.service';
import { PerfilDTO } from 'src/app/Models/DTOs/perfil-tdo';

const perfilDummy: PerfilDTO = {
  id: 0,
  nombre: 'Ana Ruiz',
  correo: 'ana@unicauca.edu.co',
  tipoId: 'CC',
  sexo: 'F',
  facultad: '',
  tipoAlumno: 'Estudiante',
  role: '',
  alumnoCodigo: 'A123',
};

describe('CompletarPerfilComponent', () => {
  let component: CompletarPerfilComponent;
  let fixture: ComponentFixture<CompletarPerfilComponent>;
  let oauthSpy: jasmine.SpyObj<OAuthService>;
  let perfilSpy: jasmine.SpyObj<PerfilService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackSpy: jasmine.SpyObj<MatSnackBar>;
  let catalogoSpy: jasmine.SpyObj<CatalogoService>;

  beforeEach(async () => {
    oauthSpy = jasmine.createSpyObj('OAuthService', ['getIdentityClaims', 'logOut']);
    perfilSpy = jasmine.createSpyObj('PerfilService', ['registrarPerfil']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    snackSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    catalogoSpy = jasmine.createSpyObj('CatalogoService', ['getFacultades', 'getProgramas']);
    catalogoSpy.getFacultades.and.returnValue(of(['Facultad de Artes', 'Facultad de Ingeniería Civil']));
    catalogoSpy.getProgramas.and.returnValue(of(['Ingeniería Civil']));

    await TestBed.configureTestingModule({
      imports: [CompletarPerfilComponent, NoopAnimationsModule],
      providers: [
        { provide: OAuthService, useValue: oauthSpy },
        { provide: PerfilService, useValue: perfilSpy },
        { provide: Router, useValue: routerSpy },
        { provide: CatalogoService, useValue: catalogoSpy },
      ],
    })
    // MatSnackBar se resuelve desde el MatSnackBarModule del propio standalone component;
    // overrideComponent garantiza que el mock reemplaza esa instancia.
    .overrideComponent(CompletarPerfilComponent, {
      set: { providers: [{ provide: MatSnackBar, useValue: snackSpy }] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompletarPerfilComponent);
    component = fixture.componentInstance;
  });

  it('debería crearse correctamente', () => {
    oauthSpy.getIdentityClaims.and.returnValue(null as any);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('ngOnInit() pre-rellena nombre y correo desde claims de Google', () => {
    oauthSpy.getIdentityClaims.and.returnValue({ name: 'Ana Ruiz', email: 'ana@unicauca.edu.co' });
    fixture.detectChanges();
    expect(component.perfil.nombre).toBe('Ana Ruiz');
    expect(component.perfil.correo).toBe('ana@unicauca.edu.co');
  });

  it('ngOnInit() no lanza error cuando claims es null', () => {
    oauthSpy.getIdentityClaims.and.returnValue(null as any);
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(component.perfil.nombre).toBe('');
    expect(component.perfil.correo).toBe('');
  });

  it('onSubmit() no llama a registrarPerfil si el form es inválido', () => {
    oauthSpy.getIdentityClaims.and.returnValue(null as any);
    fixture.detectChanges();
    const formMock = { invalid: true } as NgForm;
    component.onSubmit(formMock);
    expect(perfilSpy.registrarPerfil).not.toHaveBeenCalled();
  });

  it('onSubmit() llama a registrarPerfil con role: "" independientemente del rol elegido', () => {
    oauthSpy.getIdentityClaims.and.returnValue({ name: 'Ana', email: 'ana@u.co' });
    fixture.detectChanges();
    perfilSpy.registrarPerfil.and.returnValue(of(perfilDummy));
    component.perfil.tipoAlumno = 'Docente';
    const formMock = { invalid: false } as NgForm;
    component.onSubmit(formMock);
    const callArg: PerfilDTO = perfilSpy.registrarPerfil.calls.mostRecent().args[0];
    expect(callArg.role).toBe('');
    expect(callArg.facultad).toBe('');
  });

  it('onSubmit() éxito: muestra snackbar de éxito y navega a /home', () => {
    oauthSpy.getIdentityClaims.and.returnValue({ name: 'Ana', email: 'ana@u.co' });
    fixture.detectChanges();
    perfilSpy.registrarPerfil.and.returnValue(of(perfilDummy));
    const formMock = { invalid: false } as NgForm;
    component.onSubmit(formMock);
    expect(snackSpy.open).toHaveBeenCalledWith(
      'Registro exitoso, bienvenido/a',
      'Cerrar',
      jasmine.objectContaining({ duration: 4000 }),
    );
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('onSubmit() error: muestra snackbar de error', () => {
    oauthSpy.getIdentityClaims.and.returnValue({ name: 'Ana', email: 'ana@u.co' });
    fixture.detectChanges();
    perfilSpy.registrarPerfil.and.returnValue(throwError(() => new Error('500')));
    spyOn(console, 'error');
    const formMock = { invalid: false } as NgForm;
    component.onSubmit(formMock);
    expect(snackSpy.open).toHaveBeenCalledWith(
      'No se pudo completar el registro, intenta de nuevo',
      'Cerrar',
      jasmine.objectContaining({ duration: 6000 }),
    );
  });

  it('onSubmit() error: llama a console.error con el error', () => {
    oauthSpy.getIdentityClaims.and.returnValue(null as any);
    fixture.detectChanges();
    const err = new Error('fallo de red');
    perfilSpy.registrarPerfil.and.returnValue(throwError(() => err));
    const consoleSpy = spyOn(console, 'error');
    const formMock = { invalid: false } as NgForm;
    component.onSubmit(formMock);
    expect(consoleSpy).toHaveBeenCalledWith('Error al completar perfil:', err);
  });

  it('cancelar() llama a oauthService.logOut() y navega a /login', () => {
    oauthSpy.getIdentityClaims.and.returnValue(null as any);
    fixture.detectChanges();
    component.cancelar();
    expect(oauthSpy.logOut).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  describe('datos según el tipo de vínculo', () => {
    const FAC = 'Facultad de Ingeniería Civil';

    beforeEach(() => {
      oauthSpy.getIdentityClaims.and.returnValue({ name: 'Ana', email: 'ana@u.co' });
      fixture.detectChanges();
    });

    const campo = (nombre: string): Element | null => fixture.nativeElement.querySelector(`[name="${nombre}"]`);

    const elegir = (tipo: string): void => {
      component.perfil.tipoAlumno = tipo;
      component.onTipoChange();
      fixture.detectChanges();
    };

    const enviar = (): PerfilDTO => {
      perfilSpy.registrarPerfil.and.returnValue(of(perfilDummy));
      component.onSubmit({ invalid: false } as NgForm);
      return perfilSpy.registrarPerfil.calls.mostRecent().args[0];
    };

    it('ofrece los cuatro tipos de vínculo', () => {
      expect(component.tiposVinculo).toEqual(['Estudiante', 'Docente', 'Administrativo', 'Contratista']);
    });

    it('carga las facultades al iniciar', () => {
      expect(catalogoSpy.getFacultades).toHaveBeenCalledTimes(1);
      expect(component.facultades).toEqual(['Facultad de Artes', FAC]);
    });

    it('Estudiante: pide código, facultad y programa, y no pide dependencia', () => {
      elegir('Estudiante');
      expect(campo('codigo')).not.toBeNull();
      expect(campo('facultad')).not.toBeNull();
      expect(campo('programa')).not.toBeNull();
      expect(campo('dependencia')).toBeNull();
    });

    it('Docente: no pide código; pide facultad y programa', () => {
      elegir('Docente');
      expect(campo('codigo')).toBeNull();
      expect(campo('facultad')).not.toBeNull();
      expect(campo('programa')).not.toBeNull();
      expect(campo('dependencia')).toBeNull();
    });

    it('Administrativo y Contratista: solo piden dependencia', () => {
      ['Administrativo', 'Contratista'].forEach(tipo => {
        elegir(tipo);
        expect(campo('dependencia')).not.toBeNull();
        expect(campo('codigo')).toBeNull();
        expect(campo('facultad')).toBeNull();
        expect(campo('programa')).toBeNull();
      });
    });

    it('al cambiar de tipo se limpian los datos que ya no corresponden', () => {
      elegir('Estudiante');
      component.perfil.alumnoCodigo = '104612';
      component.perfil.facultad = FAC;
      component.perfil.programa = 'Ingeniería Civil';
      component.programas = ['Ingeniería Civil'];
      elegir('Administrativo');
      expect(component.perfil.alumnoCodigo).toBe('');
      expect(component.perfil.facultad).toBe('');
      expect(component.perfil.programa).toBe('');
      expect(component.programas).toEqual([]);
    });

    it('al cambiar a Docente se limpia el código pero se conservan facultad y programa', () => {
      elegir('Estudiante');
      component.perfil.alumnoCodigo = '104612';
      component.perfil.facultad = FAC;
      component.perfil.programa = 'Ingeniería Civil';
      elegir('Docente');
      expect(component.perfil.alumnoCodigo).toBe('');
      expect(component.perfil.facultad).toBe(FAC);
      expect(component.perfil.programa).toBe('Ingeniería Civil');
    });

    it('al elegir una facultad carga sus programas y reinicia el programa elegido', () => {
      component.perfil.programa = 'Otro';
      component.onFacultadChange(FAC);
      expect(catalogoSpy.getProgramas).toHaveBeenCalledWith(FAC);
      expect(component.programas).toEqual(['Ingeniería Civil']);
      expect(component.perfil.programa).toBe('');
      expect(component.sinProgramas).toBeFalse();
    });

    it('una facultad sin programas cargados lo avisa', () => {
      catalogoSpy.getProgramas.and.returnValue(of([]));
      elegir('Estudiante');
      component.onFacultadChange('Facultad de Artes');
      fixture.detectChanges();
      expect(component.sinProgramas).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('no tiene programas cargados');
    });

    it('si falla la carga de programas muestra el error y no deja programas', () => {
      catalogoSpy.getProgramas.and.returnValue(throwError(() => new Error('500')));
      component.onFacultadChange(FAC);
      expect(component.programas).toEqual([]);
      expect(component.errorCatalogo).toContain('programas');
      expect(component.sinProgramas).toBeFalse();
    });

    it('cargando programas de una facultad se descarta la respuesta de una selección anterior', () => {
      const lenta = new Subject<string[]>();
      catalogoSpy.getProgramas.and.returnValue(lenta.asObservable());
      component.onFacultadChange('Facultad de Artes');
      catalogoSpy.getProgramas.and.returnValue(of(['Ingeniería Civil']));
      component.onFacultadChange(FAC);
      lenta.next(['Programa de Artes']);
      expect(component.programas).toEqual(['Ingeniería Civil']);
    });

    it('Estudiante: envía código, facultad y programa', () => {
      elegir('Estudiante');
      Object.assign(component.perfil, { alumnoCodigo: '104612', facultad: FAC, programa: 'Ingeniería Civil', dependencia: 'x' });
      const enviado = enviar();
      expect(enviado.alumnoCodigo).toBe('104612');
      expect(enviado.facultad).toBe(FAC);
      expect(enviado.programa).toBe('Ingeniería Civil');
      expect(enviado.dependencia).toBe('');
      expect(enviado.role).toBe('');
    });

    it('Docente: envía facultad y programa, sin código ni dependencia', () => {
      elegir('Docente');
      Object.assign(component.perfil, { alumnoCodigo: '999', facultad: FAC, programa: 'Ingeniería Civil' });
      const enviado = enviar();
      expect(enviado.tipoAlumno).toBe('Docente');
      expect(enviado.alumnoCodigo).toBe('');
      expect(enviado.facultad).toBe(FAC);
      expect(enviado.programa).toBe('Ingeniería Civil');
      expect(enviado.dependencia).toBe('');
    });

    it('Administrativo y Contratista: envían solo la dependencia', () => {
      ['Administrativo', 'Contratista'].forEach(tipo => {
        elegir(tipo);
        Object.assign(component.perfil, { alumnoCodigo: '999', facultad: FAC, programa: 'Ingeniería Civil', dependencia: 'Oficina de Planeación' });
        const enviado = enviar();
        expect(enviado.tipoAlumno).toBe(tipo);
        expect(enviado.dependencia).toBe('Oficina de Planeación');
        expect(enviado.alumnoCodigo).toBe('');
        expect(enviado.facultad).toBe('');
        expect(enviado.programa).toBe('');
      });
    });

    it('un 422 del backend muestra su mensaje', () => {
      perfilSpy.registrarPerfil.and.returnValue(throwError(() => ({ status: 422, error: { mensaje: 'El programa X no existe' } })));
      spyOn(console, 'error');
      component.onSubmit({ invalid: false } as NgForm);
      expect(snackSpy.open).toHaveBeenCalledWith('El programa X no existe', 'Cerrar', jasmine.objectContaining({ duration: 6000 }));
    });
  });

  it('si falla la carga de facultades lo avisa', () => {
    catalogoSpy.getFacultades.and.returnValue(throwError(() => new Error('500')));
    oauthSpy.getIdentityClaims.and.returnValue(null as any);
    fixture.detectChanges();
    expect(component.facultades).toEqual([]);
    expect(component.errorCatalogo).toContain('facultades');
  });
});
