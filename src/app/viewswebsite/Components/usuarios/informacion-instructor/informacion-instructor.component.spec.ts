import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { InformacinInstructorComponent } from './informacion-instructor.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { MiGrupoInstructorDTO } from 'src/app/Models/DTOs/mis-cursos-dto';
import { TarjetasGruposInstructorComponent } from '../tarjetas-grupos-instructor/tarjetas-grupos-instructor.component';

const mockGrupo: MiGrupoInstructorDTO = {
  categoria: 'Futbol',
  curso: 'Fútbol Avanzado',
  anio: 2026,
  iterable: 1,
  periodo: 1,
  cupos: 20,
  estadoCurso: 'ACTIVO',
  estadoInscripciones: 'ABIERTO',
  inscritos: 12,
  enEspera: 2,
  horarios: [
    {
      id: 1, categoria: 'Futbol', curso: 'Fútbol Avanzado',
      anio: 2026, iterable: 1, dia: 'Lunes',
      horaInicio: '08:00', horaFin: '10:00', escenario: 'Cancha A',
    },
  ],
};

describe('InformacinInstructorComponent — rol Instructor', () => {
  let component: InformacinInstructorComponent;
  let fixture: ComponentFixture<InformacinInstructorComponent>;
  let perfilSubject: BehaviorSubject<string>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    perfilSubject = new BehaviorSubject<string>('Instructor');
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    sessionStorage.setItem('dpt_perfil_id', '1061700114');

    await TestBed.configureTestingModule({
      imports: [InformacinInstructorComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: PerfilService, useValue: { perfil$: perfilSubject } },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(InformacinInstructorComponent, {
        remove: { imports: [SidenavComponent] },
        add: { schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(InformacinInstructorComponent);
    component = fixture.componentInstance;

    spyOn(component['grupoService'], 'getMisGrupos').and.returnValue(of([mockGrupo]));
    spyOn(component['instructorService'], 'getInstructor').and.returnValue(
      of({ id: '1061700114', nombre: 'Luis Alexis Mendez Rojas', correo: 'a@b.co', imagen: 0, tipoId: 'CC', sexo: 'M', rol: 'Instructor' }),
    );
    spyOn(component['notificaciones'], 'error').and.returnValue(null as any);

    fixture.detectChanges();
  });

  afterEach(() => sessionStorage.removeItem('dpt_perfil_id'));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('getMisGrupos() se llama y llena las tarjetas con 1 grupo', () => {
    expect(component['grupoService'].getMisGrupos).toHaveBeenCalled();
    expect(component.grupos.length).toBe(1);
    expect(component.grupos[0].curso).toBe('Fútbol Avanzado');
  });

  it('cargando pasa a false tras respuesta exitosa', () => {
    expect(component.cargando).toBeFalse();
  });

  it('getMisGrupos retorna [] → empty-msg visible', () => {
    (component['grupoService'].getMisGrupos as jasmine.Spy).and.returnValue(of([]));
    component.cargarGrupos();
    fixture.detectChanges();
    expect(component.grupos.length).toBe(0);
    expect((fixture.nativeElement as HTMLElement).querySelector('.empty-msg')).not.toBeNull();
  });

  it('getMisGrupos falla → notificación de error', () => {
    (component['grupoService'].getMisGrupos as jasmine.Spy).and.returnValue(throwError(() => new Error('net')));
    component.cargarGrupos();
    expect(component['notificaciones'].error).toHaveBeenCalledWith('No se pudieron cargar los grupos', jasmine.any(String));
  });

  it('getMisGrupos falla → cargando pasa a false', () => {
    (component['grupoService'].getMisGrupos as jasmine.Spy).and.returnValue(throwError(() => new Error('net')));
    component.cargarGrupos();
    expect(component.cargando).toBeFalse();
  });

  describe('Tu información (datos del instructor de la sesión)', () => {
    it('getInstructor() se llama con el dpt_perfil_id de la sesión', () => {
      expect(component['instructorService'].getInstructor).toHaveBeenCalledWith('1061700114');
    });

    it('carga el nombre completo y el código al entrar a la vista', () => {
      expect(component.nombreInstructor).toBe('Luis Alexis Mendez Rojas');
      expect(component.codigoInstructor).toBe('1061700114');
      expect(component.cargandoPerfil).toBeFalse();
    });

    it('muestra nombre, código y el rol en el bloque "Tu información"', () => {
      const texto = (fixture.nativeElement as HTMLElement).querySelector('.info-text')!.textContent!;
      expect(texto).toContain('Luis Alexis Mendez Rojas');
      expect(texto).toContain('1061700114');
      expect(texto).toContain('Instructor');
    });

    it('usa el id de la sesión como código si el backend no lo devuelve', () => {
      (component['instructorService'].getInstructor as jasmine.Spy).and.returnValue(
        of({ id: '', nombre: 'Luis Alexis Mendez Rojas', correo: 'a@b.co', imagen: 0, tipoId: 'CC', sexo: 'M', rol: 'Instructor' }),
      );
      component.cargarInfoInstructor();
      expect(component.codigoInstructor).toBe('1061700114');
    });

    it('sin dpt_perfil_id no llama al backend y muestra "No disponible"', () => {
      sessionStorage.removeItem('dpt_perfil_id');
      (component['instructorService'].getInstructor as jasmine.Spy).calls.reset();
      component.cargarInfoInstructor();
      fixture.detectChanges();
      expect(component['instructorService'].getInstructor).not.toHaveBeenCalled();
      expect(component.nombreInstructor).toBeNull();
      expect(component.codigoInstructor).toBeNull();
      const texto = (fixture.nativeElement as HTMLElement).querySelector('.info-text')!.textContent!;
      expect(texto).toContain('No disponible');
    });

    it('getInstructor falla → notificación de error y datos vacíos', () => {
      (component['instructorService'].getInstructor as jasmine.Spy).and.returnValue(
        throwError(() => new Error('net')),
      );
      component.cargarInfoInstructor();
      expect(component.cargandoPerfil).toBeFalse();
      expect(component['notificaciones'].error).toHaveBeenCalledWith('No se pudo cargar tu información', jasmine.any(String));
    });

    it('getInstructor falla → las tarjetas de grupos siguen funcionando', () => {
      (component['instructorService'].getInstructor as jasmine.Spy).and.returnValue(
        throwError(() => new Error('net')),
      );
      component.cargarInfoInstructor();
      fixture.detectChanges();
      expect(component.grupos.length).toBe(1);
    });
  });

  it('las tarjetas hijas reciben los grupos y el estado de carga del padre', () => {
    const tabla = fixture.debugElement.query(By.directive(TarjetasGruposInstructorComponent))
      .componentInstance as TarjetasGruposInstructorComponent;
    expect(tabla.grupos).toBe(component.grupos);
    expect(tabla.grupos.length).toBe(1);
    expect(tabla.cargando).toBeFalse();
  });

  it('al recibir (verGrupo) de las tarjetas navega con los 4 parámetros del grupo', () => {
    const tabla = fixture.debugElement.query(By.directive(TarjetasGruposInstructorComponent));
    (tabla.componentInstance as TarjetasGruposInstructorComponent).verGrupo.emit(mockGrupo);
    expect(routerSpy.navigate).toHaveBeenCalledOnceWith(
      ['/listaDeportistasCurso', mockGrupo.categoria, mockGrupo.curso, mockGrupo.anio, mockGrupo.iterable],
    );
  });

  it('verDeportistas(): navega a /listaDeportistasCurso con los 4 params correctos', () => {
    component.verDeportistas(mockGrupo);
    expect(routerSpy.navigate).toHaveBeenCalledWith(
      ['/listaDeportistasCurso', 'Futbol', 'Fútbol Avanzado', 2026, 1],
    );
  });
});

describe('InformacinInstructorComponent — rol no Instructor', () => {
  let component: InformacinInstructorComponent;
  let fixture: ComponentFixture<InformacinInstructorComponent>;
  let getInstructorSpy: jasmine.Spy;

  beforeEach(async () => {
    const perfilSubject = new BehaviorSubject<string>('Coordinador');
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    sessionStorage.setItem('dpt_perfil_id', '1061700114');

    await TestBed.configureTestingModule({
      imports: [InformacinInstructorComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: PerfilService, useValue: { perfil$: perfilSubject } },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(InformacinInstructorComponent, {
        remove: { imports: [SidenavComponent] },
        add: { schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(InformacinInstructorComponent);
    component = fixture.componentInstance;

    spyOn(component['grupoService'], 'getMisGrupos').and.returnValue(of([]));
    getInstructorSpy = spyOn(component['instructorService'], 'getInstructor').and.returnValue(
      of({ id: '1061700114', nombre: 'Luis Alexis Mendez Rojas', correo: 'a@b.co', imagen: 0, tipoId: 'CC', sexo: 'M', rol: 'Instructor' }),
    );
    spyOn(component['notificaciones'], 'error').and.returnValue(null as any);

    fixture.detectChanges();
  });

  afterEach(() => sessionStorage.removeItem('dpt_perfil_id'));

  it('getMisGrupos() NO se llama para rol Coordinador', () => {
    expect(component['grupoService'].getMisGrupos).not.toHaveBeenCalled();
  });

  it('getInstructor() NO se llama para rol Coordinador', () => {
    expect(getInstructorSpy).not.toHaveBeenCalled();
  });

  it('msg-rol visible para rol Coordinador', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('.msg-rol')).not.toBeNull();
  });
});

describe('InformacinInstructorComponent › diseño de la vista', () => {
  let fixture: ComponentFixture<InformacinInstructorComponent>;
  let component: InformacinInstructorComponent;
  let router: jasmine.SpyObj<Router>;
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(sel: string): T => el().querySelector(sel) as T;

  const hoyNombre = (): string => {
    const d = new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(new Date());
    return d.charAt(0).toUpperCase() + d.slice(1);
  };

  async function montar(rol: string, grupos: MiGrupoInstructorDTO[]): Promise<void> {
    router = jasmine.createSpyObj('Router', ['navigate']);
    sessionStorage.setItem('dpt_perfil_id', '1061700114');
    await TestBed.configureTestingModule({
      imports: [InformacinInstructorComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: PerfilService, useValue: { perfil$: new BehaviorSubject<string>(rol) } },
        { provide: Router, useValue: router },
      ],
    })
      .overrideComponent(InformacinInstructorComponent, { remove: { imports: [SidenavComponent] }, add: { schemas: [NO_ERRORS_SCHEMA] } })
      .compileComponents();
    fixture = TestBed.createComponent(InformacinInstructorComponent);
    component = fixture.componentInstance;
    spyOn(component['grupoService'], 'getMisGrupos').and.returnValue(of(grupos));
    spyOn(component['instructorService'], 'getInstructor').and.returnValue(
      of({ id: '1061700114', nombre: 'Luis Alexis Mendez Rojas', correo: 'a@b.co', imagen: 0, tipoId: 'CC', sexo: 'M', rol: 'Instructor' }));
    fixture.detectChanges();
  }

  afterEach(() => sessionStorage.removeItem('dpt_perfil_id'));

  it('muestra migas "Inicio › Mis cursos" y el título con la línea secundaria; "Inicio" navega a /home', async () => {
    await montar('Instructor', [mockGrupo]);
    expect(q('nav.migas [aria-current="page"]').textContent?.trim()).toBe('Mis cursos');
    expect(q('h1.titulo-pagina').textContent?.trim()).toBe('Mis cursos');
    expect(getComputedStyle(q('h1.titulo-pagina'), '::after').height).toBe('4px');
    q<HTMLAnchorElement>('nav.migas a').click();
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('la tarjeta de datos muestra avatar con iniciales, nombre, código y rol', async () => {
    await montar('Instructor', [mockGrupo]);
    expect(q('.avatar').textContent?.trim()).toBe('LA');
    expect(q('.nombre').textContent?.trim()).toBe('Luis Alexis Mendez Rojas');
    expect(q('.datos').textContent).toContain('1061700114');
    expect(q('.datos').textContent).toContain('Instructor');
  });

  it('el resumen cuenta grupos y personas inscritas', async () => {
    await montar('Instructor', [mockGrupo, { ...mockGrupo, iterable: 2, inscritos: 8 }]);
    const cifras = Array.from(el().querySelectorAll('.cifra')).map(c => [c.querySelector('dt')!.textContent!.trim(), c.querySelector('dd')!.textContent!.trim()]);
    expect(cifras[0]).toEqual(['Grupos a cargo', '2']);
    expect(cifras[1]).toEqual(['Personas inscritas', '20']);
  });

  it('si hay clase hoy lo anuncia arriba y lo cuenta; si no, no muestra el aviso', async () => {
    const hoy = { ...mockGrupo, horarios: [{ ...mockGrupo.horarios[0], dia: hoyNombre() }] };
    await montar('Instructor', [hoy, { ...mockGrupo, iterable: 2, horarios: [] }]);
    expect(component.gruposConClaseHoy).toBe(1);
    expect(q('.banner-hoy').textContent).toContain('tienes 1 clase');
    expect(q('.banner-hoy').getAttribute('role')).toBe('status');
    expect(Array.from(el().querySelectorAll('.cifra'))[2].textContent).toContain('1');
  });

  it('sin clases hoy no hay aviso de hoy', async () => {
    const otroDia = hoyNombre() === 'Lunes' ? 'Martes' : 'Lunes';
    await montar('Instructor', [{ ...mockGrupo, horarios: [{ ...mockGrupo.horarios[0], dia: otroDia }] }]);
    expect(el().querySelector('.banner-hoy')).toBeNull();
  });

  it('otro rol ve un aviso informativo (no una frase suelta) y ninguna tarjeta', async () => {
    await montar('Alumno', []);
    expect(q('.msg-rol').textContent).toContain('exclusiva para el rol Instructor');
    expect(el().querySelector('.tarjeta-perfil')).toBeNull();
    expect(el().querySelector('app-tarjetas-grupos-instructor')).toBeNull();
  });
});
