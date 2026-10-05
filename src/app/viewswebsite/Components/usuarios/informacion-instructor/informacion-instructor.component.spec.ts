import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { InformacinInstructorComponent } from './informacion-instructor.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { MiGrupoInstructorDTO } from 'src/app/Models/DTOs/mis-cursos-dto';

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
    spyOn(component['snackBar'], 'open').and.returnValue(null as any);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('getMisGrupos() se llama y llena la tabla con 1 fila', () => {
    expect(component['grupoService'].getMisGrupos).toHaveBeenCalled();
    expect(component.grupos.data.length).toBe(1);
    expect(component.grupos.data[0].curso).toBe('Fútbol Avanzado');
  });

  it('cargando pasa a false tras respuesta exitosa', () => {
    expect(component.cargando).toBeFalse();
  });

  it('getMisGrupos retorna [] → empty-msg visible', () => {
    (component['grupoService'].getMisGrupos as jasmine.Spy).and.returnValue(of([]));
    component.cargarGrupos();
    fixture.detectChanges();
    expect(component.grupos.data.length).toBe(0);
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

  describe('helpers de formato', () => {
    it('formatGrupo(): retorna "2026-1 · Grupo A"', () => {
      expect(component.formatGrupo(mockGrupo)).toBe('2026-1 · Grupo A');
    });

    it('formatHorario(): lista vacía → "Horario por definir"', () => {
      expect(component.formatHorario([])).toBe('Horario por definir');
    });

    it('formatHorario(): formatea "dia horaInicio - horaFin escenario"', () => {
      expect(component.formatHorario(mockGrupo.horarios)).toBe('Lunes 08:00 - 10:00 Cancha A');
    });

    it('formatCupos(): cupos null → "Sin cupos definidos"', () => {
      expect(component.formatCupos({ ...mockGrupo, cupos: null, enEspera: 0 })).toBe('Sin cupos definidos');
    });

    it('formatCupos(): cupos no null, enEspera=0 → "inscritos / cupos"', () => {
      expect(component.formatCupos({ ...mockGrupo, enEspera: 0 })).toBe('12 / 20');
    });

    it('formatCupos(): enEspera > 0 → agrega "· N en espera"', () => {
      expect(component.formatCupos(mockGrupo)).toBe('12 / 20 · 2 en espera');
    });
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

  beforeEach(async () => {
    const perfilSubject = new BehaviorSubject<string>('Coordinador');
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

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
    spyOn(component['snackBar'], 'open').and.returnValue(null as any);

    fixture.detectChanges();
  });

  it('getMisGrupos() NO se llama para rol Coordinador', () => {
    expect(component['grupoService'].getMisGrupos).not.toHaveBeenCalled();
  });

  it('msg-rol visible para rol Coordinador', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('.msg-rol')).not.toBeNull();
  });
});
