import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TablaGruposInstructorComponent } from './tabla-grupos-instructor.component';
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

describe('TablaGruposInstructorComponent', () => {
  let component: TablaGruposInstructorComponent;
  let fixture: ComponentFixture<TablaGruposInstructorComponent>;
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablaGruposInstructorComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(TablaGruposInstructorComponent);
    component = fixture.componentInstance;
  });

  it('should create con valores por defecto', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.grupos).toEqual([]);
    expect(component.cargando).toBeFalse();
    expect(component.mensajeVacio).toBe('No tienes grupos a cargo todavía.');
  });

  it('llena la tabla con una fila por grupo y las 8 columnas', () => {
    component.grupos = [mockGrupo, { ...mockGrupo, curso: 'Otro', iterable: 2 }];
    fixture.detectChanges();
    expect(el().querySelectorAll('tr.mat-mdc-row, tr[mat-row]').length).toBe(2);
    const cabeceras = Array.from(el().querySelectorAll('th')).map(t => t.textContent!.trim());
    expect(cabeceras).toEqual(['Curso', 'Categoría', 'Grupo', 'Horario', 'Cupos', 'Estado curso', 'Inscripciones', 'Acciones']);
    const celdas = Array.from(el().querySelector('tr[mat-row]')!.querySelectorAll('td')).map(t => t.textContent!.trim());
    expect(celdas.slice(0, 5)).toEqual(['Fútbol Avanzado', 'Futbol', '2026-1 · Grupo A', 'Lunes 08:00 - 10:00 Cancha A', '12 / 20 · 2 en espera']);
  });

  it('badges de estado: Activo/Abiertas y Inactivo/Cerradas con sus clases', () => {
    component.grupos = [mockGrupo, { ...mockGrupo, estadoCurso: 'INACTIVO', estadoInscripciones: 'CERRADO' }];
    fixture.detectChanges();
    const filas = el().querySelectorAll('tr[mat-row]');
    expect(filas[0].querySelector('.badge-activo')?.textContent?.trim()).toBe('Activo');
    expect(filas[0].querySelector('.badge-abiertas')?.textContent?.trim()).toBe('Abiertas');
    expect(filas[1].querySelector('.badge-inactivo')?.textContent?.trim()).toBe('Inactivo');
    expect(filas[1].querySelector('.badge-cerradas')?.textContent?.trim()).toBe('Cerradas');
  });

  it('cargando=true muestra el indicador y oculta tabla y mensaje vacío', () => {
    component.cargando = true;
    component.grupos = [mockGrupo];
    fixture.detectChanges();
    expect(el().querySelector('.cargando-wrapper')?.textContent).toContain('Cargando grupos...');
    expect(el().querySelector('table')).toBeNull();
    expect(el().querySelector('.empty-msg')).toBeNull();
  });

  it('sin grupos muestra el mensaje por defecto y sin tabla', () => {
    component.grupos = [];
    fixture.detectChanges();
    expect(el().querySelector('.empty-msg')?.textContent?.trim()).toBe('No tienes grupos a cargo todavía.');
    expect(el().querySelector('table')).toBeNull();
  });

  it('mensajeVacio es configurable (reutilizable para el detalle del Coordinador)', () => {
    component.mensajeVacio = 'Este instructor no tiene grupos a cargo.';
    fixture.detectChanges();
    expect(el().querySelector('.empty-msg')?.textContent?.trim()).toBe('Este instructor no tiene grupos a cargo.');
  });

  it('el botón "Ver deportistas" emite el grupo de su fila', () => {
    const otro = { ...mockGrupo, curso: 'Otro', iterable: 2 };
    component.grupos = [mockGrupo, otro];
    fixture.detectChanges();
    const emitidos: MiGrupoInstructorDTO[] = [];
    component.verDeportistas.subscribe((g: MiGrupoInstructorDTO) => emitidos.push(g));
    const botones = el().querySelectorAll('button.btn-ver');
    (botones[1] as HTMLButtonElement).click();
    expect(botones.length).toBe(2);
    expect(emitidos).toEqual([otro]);
    expect(emitidos[0]).toBe(otro);
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

    it('formatHorario(): sin escenario omite el escenario y une varios con coma', () => {
      const h2 = { ...mockGrupo.horarios[0], dia: 'Martes', escenario: null };
      expect(component.formatHorario([mockGrupo.horarios[0], h2])).toBe('Lunes 08:00 - 10:00 Cancha A, Martes 08:00 - 10:00');
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
});
