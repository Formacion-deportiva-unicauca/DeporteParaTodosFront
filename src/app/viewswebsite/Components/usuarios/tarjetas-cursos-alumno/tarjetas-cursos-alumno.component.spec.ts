import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TarjetasCursosAlumnoComponent } from './tarjetas-cursos-alumno.component';
import { FilaMisCursos } from 'src/app/Models/DTOs/mis-cursos-dto';

const horario = (id: number, dia: string, ini: string, fin: string, escenario: string | null = 'Piscina Olímpica') =>
  ({ id, categoria: 'Semillero', curso: 'x', anio: 2026, iterable: 1, dia, horaInicio: ini, horaFin: fin, escenario });

const curso = (over: Partial<FilaMisCursos> = {}): FilaMisCursos => ({
  categoria: 'Semillero', curso: 'natacion', anio: 2026, iterable: 2, periodo: 2, estado: 'INSCRITO',
  nombreInstructor: 'KATERINN NATALIA ARCOS DAZA', grupoActivo: true,
  horarios: [horario(1, 'MIERCOLES', '16:00:00', '18:00:00')],
  instructorNombre: 'KATERINN NATALIA ARCOS DAZA', instructorCodigo: '10023965391', ...over,
});

/** Mis cursos de Estudiante, Docente, Administrativo y Contratista: tarjetas según el lineamiento UX-UI. */
describe('TarjetasCursosAlumnoComponent', () => {
  let fixture: ComponentFixture<TarjetasCursosAlumnoComponent>;
  let component: TarjetasCursosAlumnoComponent;
  // 2026-11-04 es miércoles
  const miercoles = new Date(2026, 10, 4, 9, 0);

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(s: string): T => el().querySelector(s) as T;
  const qa = <T extends HTMLElement>(s: string): T[] => Array.from(el().querySelectorAll<T>(s));
  const poner = (cursos: FilaMisCursos[]): void => { component.cursos = cursos; fixture.detectChanges(); };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TarjetasCursosAlumnoComponent, NoopAnimationsModule] }).compileComponents();
    fixture = TestBed.createComponent(TarjetasCursosAlumnoComponent);
    component = fixture.componentInstance;
    component.hoy = miercoles;
  });

  it('cada curso es una tarjeta con categoría, curso y "periodo · Grupo letra"', () => {
    poner([curso()]);
    expect(qa('.tarjeta').length).toBe(1);
    expect(q('.eyebrow').textContent?.trim()).toBe('Semillero');
    expect(q('.curso').textContent?.trim()).toBe('Natacion');
    expect(q('.grupo').textContent?.trim()).toBe('2026-2 · Grupo B');
  });

  it('el iterable fuera de rango se muestra como "Grupo ?"', () => {
    poner([curso({ iterable: 0 })]);
    expect(q('.grupo').textContent).toContain('Grupo ?');
  });

  it('los horarios llevan la hora en formato de 12 h y el escenario', () => {
    poner([curso()]);
    const fila = q('.lista-horarios li').textContent!;
    expect(fila).toContain('Miércoles');
    expect(fila).toContain('4:00 p. m. – 6:00 p. m.');
    expect(fila).toContain('Piscina Olímpica');
  });

  it('un horario sin escenario no deja huecos y sin horarios dice "Horario por definir"', () => {
    poner([curso({ horarios: [horario(1, 'Lunes', '08:00:00', '10:00:00', null)] })]);
    expect(el().querySelector('.escenario')).toBeNull();
    poner([curso({ horarios: [] })]);
    expect(q('.sin-horario').textContent?.trim()).toBe('Horario por definir');
  });

  it('muestra el instructor con avatar de iniciales y su código', () => {
    poner([curso()]);
    expect(q('.avatar').textContent?.trim()).toBe('KN');
    expect(q('.instructor-nombre').textContent?.trim()).toBe('Katerinn Natalia Arcos Daza');
    expect(q('.instructor-codigo').textContent?.trim()).toBe('Cód. 10023965391');
  });

  it('sin instructor lo dice; sin código no muestra la línea del código', () => {
    poner([curso({ nombreInstructor: null, instructorNombre: null, instructorCodigo: null })]);
    expect(q('.instructor').textContent).toContain('Sin instructor asignado');
    expect(el().querySelector('.instructor-codigo')).toBeNull();
    poner([curso({ instructorCodigo: null })]);
    expect(el().querySelector('.instructor-codigo')).toBeNull();
  });

  it('el estado es un chip con icono y texto: Inscrito (verde) y En lista de espera (amarillo)', () => {
    poner([curso(), curso({ curso: 'tenis', estado: 'EN_ESPERA' })]);
    const chips = qa('.chip-estado');
    expect(chips.map(c => c.textContent?.replace(/check_circle|hourglass_empty/, '').trim())).toEqual(['Inscrito', 'En lista de espera']);
    expect(new Set(chips.map(c => getComputedStyle(c).backgroundColor)).size).toBe(2);
    expect(chips.every(c => !!c.querySelector('mat-icon'))).toBeTrue();
  });

  it('un grupo que ya no está disponible lo anuncia en naranja (nunca rojo) y no ofrece "Ver grupo"', () => {
    poner([curso({ grupoActivo: false })]);
    const chip = q('.chip-estado');
    expect(chip.textContent).toContain('Este grupo ya no está disponible');
    expect(chip.getAttribute('role')).toBe('status');
    expect(getComputedStyle(chip).backgroundColor).toBe('rgb(255, 219, 202)');
    expect(el().querySelector('.btn-grupo')).toBeNull();
    expect(q('.tarjeta').classList).toContain('no-disponible');
  });

  it('una clase de hoy lleva la insignia "Hoy" con su franja y resalta la fila del horario', () => {
    poner([curso()]);
    expect(q('.insignia-hoy').textContent).toContain('Hoy');
    expect(q('.insignia-hoy').textContent).toContain('4:00 p. m. – 6:00 p. m.');
    expect(q('.tarjeta').classList).toContain('con-clase-hoy');
    expect(q('.lista-horarios li').classList).toContain('hoy');
  });

  it('en lista de espera o con el grupo no disponible no se anuncia clase hoy (no puede asistir)', () => {
    poner([curso({ estado: 'EN_ESPERA' }), curso({ curso: 'otro', grupoActivo: false })]);
    expect(el().querySelector('.insignia-hoy')).toBeNull();
  });

  it('los nombres se presentan como nombre propio ("tenis de mesa" → "Tenis de Mesa")', () => {
    poner([curso({ curso: 'tenis de mesa' })]);
    expect(q('.curso').textContent?.trim()).toBe('Tenis de Mesa');
  });

  it('orden: clase hoy, inscrito, lista de espera y al final lo no disponible', () => {
    poner([
      curso({ curso: 'a-no-disponible', grupoActivo: false }),
      curso({ curso: 'b-espera', estado: 'EN_ESPERA' }),
      curso({ curso: 'c-inscrito', horarios: [horario(2, 'Lunes', '08:00:00', '09:00:00')] }),
      curso({ curso: 'd-hoy' }),
    ]);
    expect(qa('.curso').map(c => c.textContent?.trim())).toEqual(['D-hoy', 'C-inscrito', 'B-espera', 'A-no-disponible']);
  });

  it('"Ver grupo" emite el curso de su tarjeta, mide 44 px y nombra el grupo para lectores de pantalla', () => {
    const otro = curso({ curso: 'ajedrez', horarios: [] });
    poner([curso(), otro]);
    const emitidos: FilaMisCursos[] = [];
    component.verGrupo.subscribe((c: FilaMisCursos) => emitidos.push(c));
    const botones = qa<HTMLButtonElement>('button.btn-grupo');
    expect(botones[1].getAttribute('aria-label')).toBe('Ver grupo: Ajedrez, 2026-2 Grupo B');
    expect(parseFloat(getComputedStyle(botones[0]).height)).toBeGreaterThanOrEqual(44);
    botones[1].click();
    expect(emitidos).toEqual([otro]);
  });

  it('cargando muestra el indicador accesible y oculta tarjetas y estado vacío', () => {
    component.cargando = true;
    poner([curso()]);
    expect(q('.cargando-wrapper').textContent).toContain('Cargando cursos...');
    expect(q('.cargando-wrapper').getAttribute('role')).toBe('status');
    expect(el().querySelector('.tarjeta')).toBeNull();
    expect(el().querySelector('.empty-msg')).toBeNull();
  });

  it('sin cursos invita a explorar y el botón avisa a la página', () => {
    poner([]);
    expect(q('.empty-msg').textContent).toContain('No estás inscrito en ningún curso todavía');
    let pulsado = 0;
    component.explorar.subscribe(() => pulsado++);
    q<HTMLButtonElement>('.vacio .btn-principal').click();
    expect(pulsado).toBe(1);
    expect(el().querySelector('.tarjeta')).toBeNull();
  });

  it('las tarjetas van en una lista con nombre accesible', () => {
    poner([curso()]);
    expect(q('ul.rejilla').getAttribute('aria-label')).toBe('Cursos matriculados');
  });
});
