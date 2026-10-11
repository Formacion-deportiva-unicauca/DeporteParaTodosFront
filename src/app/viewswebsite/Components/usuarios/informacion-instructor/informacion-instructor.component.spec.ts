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
import { TablaGruposInstructorComponent } from '../tabla-grupos-instructor/tabla-grupos-instructor.component';

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
    spyOn(component['snackBar'], 'open').and.returnValue(null as any);

    fixture.detectChanges();
  });

  afterEach(() => sessionStorage.removeItem('dpt_perfil_id'));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('getMisGrupos() se llama y llena la tabla con 1 fila', () => {
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

  it('getMisGrupos falla → snackbar con snack-error', () => {
    (component['grupoService'].getMisGrupos as jasmine.Spy).and.returnValue(throwError(() => new Error('net')));
    component.cargarGrupos();
    expect(component['snackBar'].open).toHaveBeenCalledWith(
      jasmine.stringContaining('Error'),
      '',
      jasmine.objectContaining({ panelClass: 'snack-error' }),
    );
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

    it('getInstructor falla → snackbar con snack-error y datos vacíos', () => {
      (component['instructorService'].getInstructor as jasmine.Spy).and.returnValue(
        throwError(() => new Error('net')),
      );
      component.cargarInfoInstructor();
      expect(component.cargandoPerfil).toBeFalse();
      expect(component['snackBar'].open).toHaveBeenCalledWith(
        jasmine.stringContaining('información'),
        '',
        jasmine.objectContaining({ panelClass: 'snack-error' }),
      );
    });

    it('getInstructor falla → la tabla de grupos sigue funcionando', () => {
      (component['instructorService'].getInstructor as jasmine.Spy).and.returnValue(
        throwError(() => new Error('net')),
      );
      component.cargarInfoInstructor();
      fixture.detectChanges();
      expect(component.grupos.length).toBe(1);
    });
  });

  it('la tabla hija recibe los grupos y el estado de carga del padre', () => {
    const tabla = fixture.debugElement.query(By.directive(TablaGruposInstructorComponent))
      .componentInstance as TablaGruposInstructorComponent;
    expect(tabla.grupos).toBe(component.grupos);
    expect(tabla.grupos.length).toBe(1);
    expect(tabla.cargando).toBeFalse();
  });

  it('al recibir (verDeportistas) de la tabla navega con los 4 parámetros del grupo', () => {
    const tabla = fixture.debugElement.query(By.directive(TablaGruposInstructorComponent));
    (tabla.componentInstance as TablaGruposInstructorComponent).verDeportistas.emit(mockGrupo);
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
    spyOn(component['snackBar'], 'open').and.returnValue(null as any);

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
