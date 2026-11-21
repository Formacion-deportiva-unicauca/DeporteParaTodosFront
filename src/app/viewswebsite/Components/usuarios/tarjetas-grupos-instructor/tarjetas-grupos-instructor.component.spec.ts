import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TarjetasGruposInstructorComponent } from './tarjetas-grupos-instructor.component';
import { MiGrupoInstructorDTO } from 'src/app/Models/DTOs/mis-cursos-dto';

const horario = (id: number, dia: string, ini: string, fin: string, escenario: string | null = 'Coliseo') =>
  ({ id, categoria: 'Recreativo', curso: 'X', anio: 2026, iterable: 1, dia, horaInicio: ini, horaFin: fin, escenario });

const grupo = (over: Partial<MiGrupoInstructorDTO> = {}): MiGrupoInstructorDTO => ({
  categoria: 'Recreativo', curso: 'Baloncesto', anio: 2026, iterable: 1, periodo: 2, cupos: 20,
  estadoCurso: 'ACTIVO', estadoInscripciones: 'ABIERTO', inscritos: 15, enEspera: 0,
  horarios: [horario(1, 'Lunes', '18:00:00', '20:00:00')], ...over,
});

/** Mis cursos del Instructor: tarjetas según el lineamiento UX-UI. */
describe('TarjetasGruposInstructorComponent', () => {
  let fixture: ComponentFixture<TarjetasGruposInstructorComponent>;
  let component: TarjetasGruposInstructorComponent;
  // 2026-11-04 es miércoles
  const miercoles = new Date(2026, 10, 4, 9, 0);

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(s: string): T => el().querySelector(s) as T;
  const qa = <T extends HTMLElement>(s: string): T[] => Array.from(el().querySelectorAll<T>(s));
  const poner = (grupos: MiGrupoInstructorDTO[]): void => { component.grupos = grupos; fixture.detectChanges(); };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TarjetasGruposInstructorComponent, NoopAnimationsModule] }).compileComponents();
    fixture = TestBed.createComponent(TarjetasGruposInstructorComponent);
    component = fixture.componentInstance;
    component.hoy = miercoles;
  });

  it('cada grupo es una tarjeta con categoría, curso, periodo y letra de grupo', () => {
    poner([grupo()]);
    expect(qa('.tarjeta').length).toBe(1);
    expect(q('.eyebrow').textContent?.trim()).toBe('Recreativo');
    expect(q('.curso').textContent?.trim()).toBe('Baloncesto');
    expect(q('.grupo').textContent?.trim()).toBe('2026-2 · Grupo A');
  });

  it('los horarios se muestran con hora de 12 h y escenario', () => {
    poner([grupo()]);
    const fila = q('.lista-horarios li').textContent!;
    expect(fila).toContain('Lunes');
    expect(fila).toContain('6:00 p. m. – 8:00 p. m.');
    expect(fila).toContain('Coliseo');
  });

  it('sin horario avisa que no se puede registrar asistencia y a quién avisar', () => {
    poner([grupo({ horarios: [] })]);
    expect(q('.sin-horario').textContent).toContain('Sin horario no se puede registrar asistencia');
  });

  it('un grupo con clase hoy lleva la insignia "Hoy" con su franja y el botón cambia a registrar asistencia', () => {
    poner([grupo({ horarios: [horario(2, 'Miércoles', '08:00:00', '10:00:00')] })]);
    expect(q('.insignia-hoy').textContent).toContain('Hoy');
    expect(q('.insignia-hoy').textContent).toContain('8:00 a. m. – 10:00 a. m.');
    expect(q('.tarjeta').classList).toContain('con-clase-hoy');
    expect(q('.lista-horarios li').classList).toContain('hoy');
    expect(q('.btn-grupo').textContent).toContain('Registrar asistencia de hoy');
    expect(q('.btn-grupo').getAttribute('aria-label')).toContain('Registrar asistencia de hoy: Baloncesto');
  });

  it('sin clase hoy el botón dice "Ver grupo" y no hay insignia', () => {
    poner([grupo()]);
    expect(el().querySelector('.insignia-hoy')).toBeNull();
    expect(q('.btn-grupo').textContent).toContain('Ver grupo');
  });

  it('los grupos con clase hoy aparecen primero; el resto va por orden alfabético', () => {
    poner([
      grupo({ curso: 'Zumba' }),
      grupo({ curso: 'Ajedrez' }),
      grupo({ curso: 'Natación', horarios: [horario(3, 'Miércoles', '07:00:00', '08:00:00')] }),
    ]);
    expect(qa('.curso').map(c => c.textContent?.trim())).toEqual(['Natación', 'Ajedrez', 'Zumba']);
  });

  it('el estado del curso y de las inscripciones son chips con texto; cerradas usa el naranja, nunca rojo', () => {
    poner([grupo({ estadoCurso: 'INACTIVO', estadoInscripciones: 'CERRADO' })]);
    expect(q('.chip-curso').textContent).toContain('Curso inactivo');
    const cerradas = q('.chip-inscripciones');
    expect(cerradas.textContent).toContain('Inscripciones cerradas');
    expect(getComputedStyle(cerradas).backgroundColor).toBe('rgb(255, 219, 202)');
  });

  it('la ocupación muestra "N de M cupos", la barra es un progressbar y la lista de espera se anuncia', () => {
    poner([grupo({ inscritos: 15, cupos: 20, enEspera: 3 })]);
    expect(q('.ocupacion-texto').textContent).toContain('15 de 20 cupos');
    expect(q('.barra').getAttribute('aria-valuenow')).toBe('75');
    expect(q('.en-espera').textContent).toContain('3 en lista de espera');
  });

  it('sin cupos definidos no inventa un porcentaje', () => {
    poner([grupo({ cupos: null, inscritos: 4 })]);
    expect(q('.ocupacion-texto').textContent).toContain('4 inscritos · sin cupos definidos');
    expect(q('.barra').getAttribute('aria-valuenow')).toBe('0');
  });

  it('el botón emite el grupo de su tarjeta y mide al menos 44px', () => {
    const otro = grupo({ curso: 'Ajedrez' });
    poner([grupo(), otro]);
    const emitidos: MiGrupoInstructorDTO[] = [];
    component.verGrupo.subscribe((g: MiGrupoInstructorDTO) => emitidos.push(g));
    const botones = qa<HTMLButtonElement>('button.btn-grupo');
    expect(parseFloat(getComputedStyle(botones[0]).height)).toBeGreaterThanOrEqual(44);
    botones[0].click();
    expect(emitidos).toEqual([otro]); // Ajedrez va primero por orden alfabético
  });

  it('cargando muestra el indicador y oculta tarjetas y mensaje vacío', () => {
    component.cargando = true;
    poner([grupo()]);
    expect(q('.cargando-wrapper').textContent).toContain('Cargando grupos...');
    expect(q('.cargando-wrapper').getAttribute('role')).toBe('status');
    expect(el().querySelector('.tarjeta')).toBeNull();
    expect(el().querySelector('.empty-msg')).toBeNull();
  });

  it('sin grupos muestra el mensaje (configurable) y ninguna tarjeta', () => {
    poner([]);
    expect(q('.empty-msg').textContent?.trim()).toBe('No tienes grupos a cargo todavía.');
    component.mensajeVacio = 'Este instructor no tiene grupos a cargo.';
    fixture.detectChanges();
    expect(q('.empty-msg').textContent?.trim()).toBe('Este instructor no tiene grupos a cargo.');
    expect(el().querySelector('.tarjeta')).toBeNull();
  });

  it('las tarjetas están en una lista con nombre accesible', () => {
    poner([grupo()]);
    expect(q('ul.rejilla').getAttribute('aria-label')).toBe('Grupos a cargo');
  });

  describe('clase de hoy no realizada (novedad activa)', () => {
    const conNovedad = (over: Partial<MiGrupoInstructorDTO> = {}): MiGrupoInstructorDTO =>
      grupo({ horarios: [horario(2, 'Miércoles', '18:00:00', '20:00:00')], novedadHoy: { codigo: 1, fecha: '2026-11-04', motivo: 'CLIMA', descripcion: null }, ...over });

    it('muestra "Clase de hoy no realizada · Motivo: ..." en lugar de "Hoy · horario" y el botón no invita a registrar asistencia', () => {
      poner([conNovedad()]);
      expect(q('.insignia-no-realizada').textContent).toContain('Clase de hoy no realizada · Motivo: Condiciones climáticas');
      expect(q('.insignia-no-realizada').getAttribute('role')).toBe('status');
      expect(el().querySelector('.insignia-hoy')).toBeNull();
      expect(el().textContent).not.toContain('Hoy · 6:00 p. m.');
      expect(q('.tarjeta').classList).not.toContain('con-clase-hoy');
      expect(q('.btn-grupo').textContent).toContain('Ver grupo');
      expect(q('.btn-grupo').textContent).not.toContain('Registrar asistencia de hoy');
      expect(q('.btn-grupo').getAttribute('aria-label')).toContain('(clase de hoy no realizada)');
    });

    it('incluye la descripción cuando la hay', () => {
      poner([conNovedad({ novedadHoy: { codigo: 1, fecha: '2026-11-04', motivo: 'OTRO', descripcion: ' Falla del transporte ' } })]);
      expect(q('.insignia-no-realizada').textContent).toContain('Motivo: Otro motivo · Falla del transporte');
    });

    it('aparece aunque el horario de hoy no esté cargado: la novedad es de hoy y eso es lo que importa', () => {
      poner([conNovedad({ horarios: [] })]);
      expect(q('.insignia-no-realizada')).not.toBeNull();
    });

    it('una novedad de otra fecha (p. ej. si el servidor y el navegador no coinciden en el día) se ignora', () => {
      poner([conNovedad({ novedadHoy: { codigo: 1, fecha: '2026-11-03', motivo: 'CLIMA', descripcion: null } })]);
      expect(el().querySelector('.insignia-no-realizada')).toBeNull();
      expect(q('.insignia-hoy')).not.toBeNull();
      expect(q('.btn-grupo').textContent).toContain('Registrar asistencia de hoy');
    });

    it('sin novedad (null o ausente) todo sigue igual', () => {
      poner([grupo({ horarios: [horario(2, 'Miércoles', '08:00:00', '10:00:00')], novedadHoy: null })]);
      expect(el().querySelector('.insignia-no-realizada')).toBeNull();
      expect(q('.insignia-hoy')).not.toBeNull();
    });

    it('el grupo con clase hoy que SÍ se dicta va antes que el de la clase no realizada', () => {
      poner([
        conNovedad({ curso: 'Ajedrez' }),
        grupo({ curso: 'Natación', horarios: [horario(3, 'Miércoles', '07:00:00', '08:00:00')] }),
      ]);
      expect(qa('.curso').map(c => c.textContent?.trim())).toEqual(['Natación', 'Ajedrez']);
    });
  });
});
