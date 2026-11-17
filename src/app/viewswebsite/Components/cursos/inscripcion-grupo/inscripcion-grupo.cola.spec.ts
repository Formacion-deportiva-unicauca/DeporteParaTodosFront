import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { SidenavStub } from 'src/app/testing/sidenav-stub';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
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

const CON_CUPO_Y_COLA = { cuposTotales: 7, cuposDisponibles: 2, tamanoListaEspera: 2 };

/**
 * Un grupo puede tener cupo libre Y lista de espera (el backend manda a la lista a quien llega nuevo si ya hay cola).
 * Ningún texto debe sugerir que el grupo está lleno ni hablar de cupos al quedar en la lista.
 */
describe('InscripcionGrupoComponent › lista de espera con cupo libre', () => {
  let fixture: ComponentFixture<InscripcionGrupoComponent>;
  let component: InscripcionGrupoComponent;
  let inscripciones: jasmine.SpyObj<InscripcionesService>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(sel: string): T => el().querySelector(sel) as T;
  const boton = (): HTMLButtonElement => q<HTMLButtonElement>('.btn-inscribirse');

  async function montar(opciones: { disp?: any; dispError?: boolean; misCursos?: any[]; horarios?: any[] } = {}): Promise<void> {
    sessionStorage.setItem('dpt_perfil_id', '12345');
    sessionStorage.setItem('dpt_role', 'Alumno');
    inscripciones = jasmine.createSpyObj('InscripcionesService', ['postInscripcion', 'getDisponibilidad', 'validarInscripcion', 'eliminarInscripcion', 'getMisCursos']);
    inscripciones.getDisponibilidad.and.returnValue(opciones.dispError ? throwError(() => ({ status: 500 })) : of(opciones.disp ?? CON_CUPO_Y_COLA));
    inscripciones.validarInscripcion.and.returnValue(of(false));
    inscripciones.getMisCursos.and.returnValue(of(opciones.misCursos ?? []));
    const grupo = jasmine.createSpyObj('GrupoService', ['getGrupo']);
    grupo.getGrupo.and.returnValue(of({ anio: 2026, periodo: 1, iterable: 1, idInstructor: null, cupos: 7 } as any));
    const horarios = jasmine.createSpyObj('HorarioService', ['getHorarios']);
    horarios.getHorarios.and.returnValue(of(opciones.horarios ?? []));
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

  it('cupo libre y cola: el botón dice "Unirme a la lista de espera" y el aviso explica que quedará al final (posición 3), sin decir "completo"', async () => {
    await montar();
    expect(boton().textContent).toContain('Unirme a la lista de espera');
    expect(boton().classList).toContain('btn-espera');
    const aviso = q('.aviso-cola');
    expect(aviso.getAttribute('role')).toBe('status');
    expect(aviso.textContent).toContain('Este grupo tiene lista de espera');
    expect(aviso.textContent).toContain('posición 3');
    expect(el().textContent).not.toContain('completo');
    expect(boton().getAttribute('aria-describedby')).toBe('aviso-cola');
    expect(boton().disabled).toBeFalse();
  });

  it('cupo libre y sin cola: "Inscribirme en este grupo" como siempre, sin aviso', async () => {
    await montar({ disp: { cuposTotales: 7, cuposDisponibles: 2, tamanoListaEspera: 0 } });
    expect(boton().textContent).toContain('Inscribirme en este grupo');
    expect(boton().classList).not.toContain('btn-espera');
    expect(q('.aviso-cola')).toBeNull();
    expect(boton().getAttribute('aria-describedby')).toBeNull();
  });

  it('grupo lleno: se conserva el aviso de "completo" y no aparece el de cola', async () => {
    await montar({ disp: { cuposTotales: 7, cuposDisponibles: 0, tamanoListaEspera: 2 } });
    expect(q('.aviso-espera').textContent).toContain('El grupo está completo');
    expect(q('.aviso-cola')).toBeNull();
    expect(boton().textContent).toContain('Unirme a la lista de espera');
  });

  it('si la disponibilidad no carga: no se afirma nada (botón normal, sin aviso)', async () => {
    await montar({ dispError: true });
    expect(q('.aviso-cola')).toBeNull();
    expect(boton().textContent).toContain('Inscribirme en este grupo');
  });

  it('con cruce de horarios manda el aviso de cruce: sin aviso de cola y botón deshabilitado', async () => {
    const yoga = {
      categoria: 'Recreativo', curso: 'Yoga', anio: 2026, iterable: 1, periodo: 1, estado: 'INSCRITO', nombreInstructor: null,
      grupoActivo: true, fechaFinalizacion: null,
      horarios: [{ id: 9, categoria: 'Recreativo', curso: 'Yoga', anio: 2026, iterable: 1, dia: 'LUNES', horaInicio: '18:00', horaFin: '19:30', escenario: null }],
    };
    await montar({ misCursos: [yoga], horarios: [{ id: 1, dia: 'LUNES', horaInicio: '18:00', horaFin: '20:00', escenario: 'C' }] });
    expect(q('.aviso-cruce')).not.toBeNull();
    expect(q('.aviso-cola')).toBeNull();
    expect(boton().disabled).toBeTrue();
  });

  it('al quedar en espera con cupo libre: el aviso y el panel no dicen "cupo", "lleno" ni "se libera"', async () => {
    await montar();
    inscripciones.postInscripcion.and.returnValue(of({ estado: 'EN_ESPERA' } as any));
    const info = spyOn(component['notificaciones'], 'info');
    spyOn(component['notificaciones'], 'exito');

    boton().click();
    fixture.detectChanges();

    expect(info).toHaveBeenCalledWith('Quedaste en la lista de espera de este grupo', 'Tu posición es la 3.', 8000);
    const [titulo, mensaje] = info.calls.mostRecent().args as [string, string];
    expect(`${titulo} ${mensaje}`).not.toMatch(/cupo|lleno|completo|libera/i);
    const panel = q('.resultado-espera');
    expect(panel.textContent).toContain('Estás en la lista de espera');
    expect(panel.textContent).toContain('Tu posición es la 3.');
    expect(panel.textContent).not.toMatch(/cupo|lleno|completo|libera/i);
  });

  it('si el backend responde INSCRITO (no había cola en realidad) se muestra la inscripción exitosa', async () => {
    await montar({ disp: { cuposTotales: 7, cuposDisponibles: 2, tamanoListaEspera: 0 } });
    inscripciones.postInscripcion.and.returnValue(of({ estado: 'INSCRITO' } as any));
    const exito = spyOn(component['notificaciones'], 'exito');

    boton().click();
    fixture.detectChanges();

    expect(exito).toHaveBeenCalled();
    expect(q('.resultado-exito')).not.toBeNull();
    expect(q('.resultado-espera')).toBeNull();
  });

  it('al volver estando en espera: el panel no habla de cupos ni de que se libere uno', async () => {
    await montar({ misCursos: [{ categoria: 'Recreativo', curso: 'baloncesto masculino', anio: 2026, iterable: 1, periodo: 1, estado: 'EN_ESPERA', grupoActivo: true, horarios: [] }] });
    const panel = q('.resultado-espera');
    expect(panel.textContent).toContain('Quedaste en la lista de espera de este grupo.');
    expect(panel.textContent).not.toMatch(/cupo|lleno|completo|libera/i);
  });
});
