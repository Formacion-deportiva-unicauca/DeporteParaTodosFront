import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { SidenavStub } from 'src/app/testing/sidenav-stub';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { InscripcionGrupoComponent } from './inscripcion-grupo.component';
import { GrupoService } from 'src/app/services/grupo.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { HorarioService } from 'src/app/services/horario.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';

const TEXTO = 'Se cruza con Yoga, grupo A, lunes 18:00-19:30';

/** Inscripción del Alumno en otro curso (Yoga, grupo A, 2026-1, lunes 18:00-19:30). */
const yoga = (extra: object = {}): any => ({
  categoria: 'Recreativo', curso: 'Yoga', anio: 2026, iterable: 1, periodo: 1, estado: 'INSCRITO', nombreInstructor: null,
  grupoActivo: true, fechaFinalizacion: null,
  horarios: [{ id: 9, categoria: 'Recreativo', curso: 'Yoga', anio: 2026, iterable: 1, dia: 'LUNES', horaInicio: '18:00', horaFin: '19:30', escenario: null }],
  ...extra,
});

/** La misma inscripción pero en ESTE grupo (Baloncesto masculino, grupo A). */
const propia = (estado: 'INSCRITO' | 'EN_ESPERA'): any =>
  yoga({ curso: 'baloncesto masculino', estado, horarios: [] });

/** Pantalla de inscripción al grupo: aviso de cruce y botón deshabilitado para el Alumno (el backend sigue decidiendo). */
describe('InscripcionGrupoComponent › cruce de horarios', () => {
  let fixture: ComponentFixture<InscripcionGrupoComponent>;
  let component: InscripcionGrupoComponent;
  let inscripciones: jasmine.SpyObj<InscripcionesService>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(sel: string): T => el().querySelector(sel) as T;
  const boton = (): HTMLButtonElement => q<HTMLButtonElement>('.btn-inscribirse');

  async function montar(opciones: { rol?: string; misCursos?: any; horarios?: any[]; periodo?: number | null } = {}): Promise<void> {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    sessionStorage.setItem('dpt_role', opciones.rol ?? 'Alumno');
    inscripciones = jasmine.createSpyObj('InscripcionesService', ['postInscripcion', 'getDisponibilidad', 'validarInscripcion', 'eliminarInscripcion', 'getMisCursos']);
    inscripciones.getDisponibilidad.and.returnValue(of({ cuposTotales: 7, cuposDisponibles: 5, tamanoListaEspera: 0 }));
    inscripciones.validarInscripcion.and.returnValue(of(false));
    inscripciones.getMisCursos.and.returnValue(opciones.misCursos ?? of([yoga()]));
    const grupo = jasmine.createSpyObj('GrupoService', ['getGrupo']);
    grupo.getGrupo.and.returnValue(of({ anio: 2026, periodo: opciones.periodo === undefined ? 1 : opciones.periodo, iterable: 1, idInstructor: null, cupos: 7 } as any));
    const horarios = jasmine.createSpyObj('HorarioService', ['getHorarios']);
    horarios.getHorarios.and.returnValue(of(opciones.horarios ?? [{ id: 1, dia: 'LUNES', horaInicio: '18:00', horaFin: '20:00', escenario: 'Coliseo' }]));
    await TestBed.configureTestingModule({
      imports: [InscripcionGrupoComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        DatePipe,
        { provide: GrupoService, useValue: grupo },
        { provide: InscripcionesService, useValue: inscripciones },
        { provide: HorarioService, useValue: horarios },
        { provide: InstructorServisce, useValue: { getInstructor: () => of({}) } },
        { provide: CursodeportivoService, useValue: { getCurso: () => of({ nombre: 'baloncesto masculino', estadoCurso: 'ACTIVO', estadoInscripciones: 'ABIERTO' } as any) } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: PerfilService, useValue: { perfil$: of('') } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ categoria: 'Recreativo', curso: 'baloncesto masculino', anio: '2026', iterable: '1' })) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(InscripcionGrupoComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
      .compileComponents();
    fixture = TestBed.createComponent(InscripcionGrupoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    sessionStorage.removeItem('dpt_perfil_id');
    sessionStorage.removeItem('dpt_role');
  });

  it('con cruce: botón deshabilitado y aviso visible (role=status) con el texto del backend, antes de pulsar', async () => {
    await montar();
    const aviso = q('.aviso-cruce');
    expect(aviso.getAttribute('role')).toBe('status');
    expect(aviso.textContent).toContain('No puedes inscribirte: cruce de horario');
    expect(aviso.textContent).toContain(TEXTO);
    expect(boton().disabled).toBeTrue();
    // El motivo queda asociado al botón (no solo un tooltip).
    expect(boton().getAttribute('aria-describedby')).toBe('aviso-cruce');
    expect(q('#aviso-cruce').textContent).toContain(TEXTO);
    expect(inscripciones.postInscripcion).not.toHaveBeenCalled();
  });

  it('pide misCursos una sola vez', async () => {
    await montar();
    fixture.detectChanges();
    expect(inscripciones.getMisCursos).toHaveBeenCalledTimes(1);
  });

  it('sin cruce (borde exacto: el grupo empieza cuando Yoga termina): habilitado y sin aviso', async () => {
    await montar({ horarios: [{ id: 1, dia: 'LUNES', horaInicio: '19:30', horaFin: '21:00', escenario: 'Coliseo' }] });
    expect(q('.aviso-cruce')).toBeNull();
    expect(boton().disabled).toBeFalse();
    expect(boton().getAttribute('aria-describedby')).toBeNull();
  });

  it('mientras se verifica la inscripción: "Verificando…" deshabilitado y sin aviso; al llegar misCursos aparece el aviso', async () => {
    const cursos$ = new Subject<any[]>();
    await montar({ misCursos: cursos$ });
    expect(boton().disabled).toBeTrue();
    expect(boton().textContent).toContain('Verificando');
    expect(q('.aviso-cruce')).toBeNull();

    cursos$.next([yoga()]);
    fixture.detectChanges();
    expect(q('.aviso-cruce').textContent).toContain(TEXTO);
  });

  it('si misCursos falla: queda como antes (habilitado, sin aviso)', async () => {
    await montar({ misCursos: throwError(() => ({ status: 500 })) });
    expect(q('.aviso-cruce')).toBeNull();
    expect(boton().disabled).toBeFalse();
  });

  it('EN_ESPERA en el otro curso no cuenta; un grupo ya terminado, eliminado, de otro periodo o de otro año tampoco', async () => {
    for (const extra of [{ estado: 'EN_ESPERA' }, { fechaFinalizacion: '2000-01-01' }, { grupoActivo: false }, { periodo: 2 }, { anio: 2025 }]) {
      TestBed.resetTestingModule();
      await montar({ misCursos: of([yoga(extra)]) });
      expect(q('.aviso-cruce')).withContext(JSON.stringify(extra)).toBeNull();
      expect(boton().disabled).withContext(JSON.stringify(extra)).toBeFalse();
    }
  });

  it('sin periodo en el grupo: no calcula, no avisa y no bloquea', async () => {
    await montar({ periodo: null });
    expect(q('.aviso-cruce')).toBeNull();
    expect(boton().disabled).toBeFalse();
  });

  it('sin horarios en el grupo: no hay con qué cruzar', async () => {
    await montar({ horarios: [] });
    expect(q('.aviso-cruce')).toBeNull();
    expect(boton().disabled).toBeFalse();
  });

  it('ya inscrito en este grupo: panel "Estás inscrito" y ningún aviso de cruce', async () => {
    await montar({ misCursos: of([yoga(), propia('INSCRITO')]) });
    expect(q('.resultado-exito')).not.toBeNull();
    expect(q('.aviso-cruce')).toBeNull();
    expect(q('.btn-inscribirse')).toBeNull();
  });

  it('en lista de espera en este grupo: panel de espera y ningún aviso de cruce', async () => {
    await montar({ misCursos: of([yoga(), propia('EN_ESPERA')]) });
    expect(q('.resultado-espera')).not.toBeNull();
    expect(q('.aviso-cruce')).toBeNull();
    expect(q('.btn-inscribirse')).toBeNull();
  });

  for (const rol of ['Coordinador', 'Instructor', 'Administrador']) {
    it(`rol ${rol}: no pide misCursos, no hay aviso y el botón no cambia`, async () => {
      await montar({ rol });
      expect(inscripciones.getMisCursos).not.toHaveBeenCalled();
      expect(q('.aviso-cruce')).toBeNull();
      expect(boton().disabled).toBeFalse();
    });
  }

  it('respaldo: si el cálculo local no avisa y el backend responde 422, se muestra su mensaje tal cual', async () => {
    await montar({ misCursos: of([]) });
    expect(boton().disabled).toBeFalse();
    const mensaje = 'Cruce de horario, Se cruza con Yoga, grupo A, lunes 18:00-19:30';
    inscripciones.postInscripcion.and.returnValue(throwError(() => ({ status: 422, error: { mensaje } })));
    const error = spyOn(component['notificaciones'], 'error');

    boton().click();
    fixture.detectChanges();

    expect(error).toHaveBeenCalledWith('No se pudo completar la inscripción', mensaje);
    expect(component.yaInscrito).toBeFalse();
    expect(boton().disabled).toBeFalse();
  });
});
