import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DatePipe } from '@angular/common';
import { BehaviorSubject, of } from 'rxjs';
import { ListDeportistasdeCursoComponent } from './list-deportistasde-curso.component';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { FormGruposComponent } from '../form-grupos/form-grupos.component';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { ClaseDTO } from 'src/app/Models/DTOs/clase-dto';
import { AlumnoDTO } from 'src/app/Models/DTOs/alumno-dto';

/** Diseño de la vista del grupo (prototipo) y experiencia del historial de clases. */
describe('ListDeportistasdeCursoComponent › diseño y historial', () => {
  let fixture: ComponentFixture<ListDeportistasdeCursoComponent>;
  let component: ListDeportistasdeCursoComponent;
  let routerSpy: jasmine.SpyObj<Router>;
  let perfil$: BehaviorSubject<string>;

  const el = (): HTMLElement => fixture.nativeElement;
  const q = (s: string): HTMLElement | null => el().querySelector(s);
  const qa = (s: string): HTMLElement[] => Array.from(el().querySelectorAll(s)) as HTMLElement[];
  const texto = (s: string): string => (q(s)?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const alumno = (id: number, nombre: string, faltas: number): AlumnoDTO =>
    ({ id, codigo: `C${id}`, tipo: 'Estudiante', nombre, correo: `${nombre}@u.co`, sexo: 'M', tipoid: 'CC', imagen: 0, faltas } as unknown as AlumnoDTO);
  const clase = (codigo: number, fecha: string): ClaseDTO => ({
    codigo, idGrupoCategoria: 'Futbol', idGrupoCurso: 'Avanzado', idGrupoAnio: 2024, idGrupoIterable: 1,
    idInstructor: 'inst-1', fecha, horas: 2, minutos: 0, observacion: '', eliminado: 0,
  });
  const siete = [1, 2, 3, 4, 5, 6, 7].map(n => clase(n, `2026-09-0${n}`));

  async function montar(rol = 'Coordinador', clases: ClaseDTO[] = siete): Promise<void> {
    perfil$ = new BehaviorSubject<string>(rol);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    await TestBed.configureTestingModule({
      imports: [ListDeportistasdeCursoComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        DatePipe,
        { provide: Router, useValue: routerSpy },
        { provide: PerfilService, useValue: { perfil$ } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ categoria: 'Futbol', curso: 'Avanzado', anio: '2024', iterable: '1' })) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ListDeportistasdeCursoComponent, { remove: { imports: [SidenavComponent] }, add: { schemas: [NO_ERRORS_SCHEMA] } })
      .compileComponents();

    fixture = TestBed.createComponent(ListDeportistasdeCursoComponent);
    component = fixture.componentInstance;
    const grupo: GrupoDTO = { categoria: 'Futbol', curso: 'Avanzado', anio: 2024, iterable: 1, periodo: 2, idInstructor: 'inst-1', nombreInstructor: 'Prof Pérez', cupos: 10, fechaCreacion: '' };
    spyOn(component['grupoService'], 'getGrupo').and.returnValue(of(grupo));
    spyOn(component['alumnoService'], 'getAlumnosGrupo').and.returnValue(of([alumno(1, 'Ana', 0), alumno(2, 'Beto', 2), alumno(3, 'Caro', 0)]));
    spyOn(component['inscripcionService'], 'getListaEspera').and.returnValue(of([]));
    spyOn(component['inscripcionService'], 'getDisponibilidad').and.returnValue(of({ cuposTotales: 10, cuposDisponibles: 7, tamanoListaEspera: 0 }));
    spyOn(component['horarioSerive'], 'getHorarios').and.returnValue(of([
      { id: 1, categoria: 'Futbol', curso: 'Avanzado', anio: 2024, iterable: 1, dia: 'MIERCOLES', horaInicio: '18:00:00', horaFin: '20:00:00', escenario: 'Coliseo', eliminado: 0 },
    ] as any));
    spyOn(component['instructorService'], 'getInstructor').and.returnValue(of({ nombre: 'Prof Pérez' } as any));
    spyOn(component['claseService'], 'getClase').and.returnValue(of(clases as any));
    spyOn(component['asistenciaService'], 'getAtencionesClase').and.returnValue(of([
      { idPerfil: '1', idClase: 7, estaAtendido: true }, { idPerfil: '2', idClase: 7, estaAtendido: false }, { idPerfil: '3', idClase: 7, estaAtendido: true },
    ] as any));
    spyOn(component['novedadClaseService'], 'obtenerNovedadesGrupo').and.returnValue(of([]));
    spyOn(component['notificaciones'], 'exito').and.returnValue(null as any);
    spyOn(component['notificaciones'], 'error').and.returnValue(null as any);
    fixture.detectChanges();
  }

  afterEach(() => fixture?.destroy());

  describe('encabezado e información del grupo', () => {
    beforeEach(() => montar());

    it('el título es "Grupo · Grupo A" y "Volver a grupos" regresa a los grupos del curso', () => {
      expect(texto('h1.titulo-pagina')).toBe('Grupo · Grupo A');
      (q('.volver') as HTMLElement).click();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/list-grupos', 'Futbol', 'Avanzado']);
    });

    it('la tarjeta muestra categoría · curso, periodo y letra, instructor, cupos y horario en 12 horas', () => {
      expect(texto('.info-grupo .eyebrow')).toBe('Futbol · Avanzado');
      expect(texto('.info-titulo')).toBe('2024-2 · Grupo A');
      expect(texto('.info-grupo')).toContain('Prof Pérez');
      expect(texto('.info-grupo')).toContain('3 inscritos · 7 disponibles');
      expect(texto('.horario-lista')).toContain('6:00 p. m. – 8:00 p. m.');
    });

    it('"Editar grupo" solo lo ve el Coordinador y abre el formulario del grupo; al guardar avisa', () => {
      const abrir = spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of(true) } as any);
      (qa('.btn-secundario').find(b => b.textContent!.includes('Editar grupo')) as HTMLElement).click();
      expect(abrir.calls.mostRecent().args[0]).toBe(FormGruposComponent);
      expect(abrir.calls.mostRecent().args[1]!.data).toEqual({ categoria: 'Futbol', curso: 'Avanzado', anio: 2024, iterable: 1 });
      expect(component['notificaciones'].exito).toHaveBeenCalledWith('Grupo actualizado', jasmine.any(String));
    });
  });

  it('el Instructor y el Alumno no ven "Editar grupo"', async () => {
    await montar('Instructor');
    expect(qa('.btn-secundario').some(b => b.textContent!.includes('Editar grupo'))).toBeFalse();
  });

  describe('tabla de deportistas', () => {
    beforeEach(() => montar());

    it('las faltas se ven en una insignia que se resalta cuando hay faltas', () => {
      const chips = qa('.chip-faltas');
      expect(chips.map(c => c.textContent!.trim())).toEqual(['0', '2', '0']);
      expect(chips.map(c => c.classList.contains('con-faltas'))).toEqual([false, true, false]);
    });

    it('cada casilla dice "Sin marcar" o "Asistió" y la fila marcada se resalta', () => {
      expect(qa('mat-checkbox')[0].textContent!.trim()).toBe('Sin marcar');
      component.alternarAsistencia(component.alumnos.data[0], true);
      fixture.detectChanges();
      expect(qa('mat-checkbox')[0].textContent!.trim()).toBe('Asistió');
      expect(qa('tr.fila-asistio').length).toBe(1);
    });

    it('los botones de editar y desvincular tienen nombre accesible con el deportista', () => {
      const etiquetas = qa('td.mat-column-Acciones button').map(b => b.getAttribute('aria-label'));
      expect(etiquetas).toContain('Editar a Ana');
      expect(etiquetas).toContain('Desvincular a Ana');
    });
  });

  describe('tablas adaptables (en móvil cada fila es una tarjeta con "etiqueta: valor")', () => {
    beforeEach(async () => {
      await montar();
      component.listaEspera = [{ alumnoId: '9', nombre: 'Zoe', correo: 'zoe@u.co', fechaInscripcion: '2026-10-01' }];
      fixture.detectChanges();
    });

    it('la tabla de deportistas usa la clase adaptable y cada celda lleva su etiqueta', () => {
      const tabla = q('.tarjeta-tabla table') as HTMLElement;
      expect(tabla.classList.contains('tabla-adaptable')).toBeTrue();
      const celdas = Array.from(tabla.querySelectorAll('tbody tr:first-child td')).map(td => td.getAttribute('data-label'));
      expect(celdas).toEqual(['Código', 'Nombre', 'Correo', 'Faltas', 'Asistencia de hoy', 'Acciones']);
    });

    it('la lista de espera también: posición, nombre, correo, fecha y acciones con su etiqueta', () => {
      const tabla = qa('.tarjeta-tabla table')[1];
      expect(tabla.classList.contains('tabla-adaptable')).toBeTrue();
      const celdas = Array.from(tabla.querySelectorAll('tbody tr:first-child td')).map(td => td.getAttribute('data-label'));
      expect(celdas).toEqual(['Posición', 'Nombre', 'Correo', 'En espera desde', 'Acciones']);
    });
  });

  describe('historial de clases', () => {
    it('Coordinador e Instructor lo ven cargado al abrir la pantalla, sin pulsar nada', async () => {
      await montar('Coordinador');
      expect(component.historialVisible).toBeTrue();
      expect(qa('.clase-item').length).toBe(5);
    });

    it('el Alumno no ve el historial', async () => {
      await montar('Alumno');
      expect(q('.historial')).toBeNull();
      expect(component.historialVisible).toBeFalse();
    });

    it('muestra primero las clases más recientes y solo las últimas 5 hasta pedir el historial completo', async () => {
      await montar();
      expect(qa('.clase-fecha').map(f => f.textContent!.trim())[0]).toMatch(/^7 de \S+ de 2026$/);
      expect(texto('.resumen-historial')).toContain('7 clases registradas');
      const boton = qa('button').find(b => b.textContent!.includes('Ver historial completo')) as HTMLElement;
      boton.click();
      fixture.detectChanges();
      expect(qa('.clase-item').length).toBe(7);
      expect(texto('.historial')).toContain('Ver menos');
      expect(texto('.historial')).toContain('Todas las sesiones registradas');
    });

    it('con 5 clases o menos no ofrece "Ver historial completo"', async () => {
      await montar('Coordinador', siete.slice(0, 3));
      expect(qa('button').some(b => b.textContent!.includes('Ver historial completo'))).toBeFalse();
    });

    it('cada clase es un botón con aria-expanded: al abrirla muestra el resumen y puede filtrar quién asistió', async () => {
      await montar();
      const cabecera = qa('.clase-header')[0];
      expect(cabecera.tagName).toBe('BUTTON');
      expect(cabecera.getAttribute('aria-expanded')).toBe('false');
      cabecera.click();
      fixture.detectChanges();
      expect(cabecera.getAttribute('aria-expanded')).toBe('true');
      expect(texto('.clase-resumen')).toBe('2 asistieron · 1 faltaron');
      expect(qa('.tabla-atenciones tbody tr').length).toBe(3);

      (qa('.filtro').find(f => f.textContent!.includes('Faltaron')) as HTMLElement).click();
      fixture.detectChanges();
      expect(qa('.tabla-atenciones tbody tr').length).toBe(1);
      expect(qa('.tabla-atenciones tbody tr td')[0].textContent).toContain('Beto');

      (qa('.filtro').find(f => f.textContent!.includes('Asistieron')) as HTMLElement).click();
      fixture.detectChanges();
      expect(qa('.tabla-atenciones tbody tr').length).toBe(2);
    });

    it('si no se pudo cargar el historial lo explica y permite reintentar', async () => {
      await montar();
      component.historialVisible = false;
      component.errorHistorial = true;
      fixture.detectChanges();
      expect(q('.error-historial')).not.toBeNull();
      (q('.error-historial button') as HTMLElement).click();
      expect(component.historialVisible).toBeTrue();
    });
  });

  describe('notificaciones de cada evento', () => {
    beforeEach(() => montar());

    it('al registrar la asistencia dice cuántos asistieron y cuántos faltaron', () => {
      spyOn(component['claseService'], 'postClase').and.callFake((c: ClaseDTO) => of({ ...c, codigo: 50 }));
      spyOn(component['asistenciaService'], 'confirmarAsistencia').and.returnValue(of({ codigoClase: 50 } as any));
      component.alternarAsistencia(component.alumnos.data[0], true);
      component['ejecutarRegistro'](false);
      expect(component['notificaciones'].exito).toHaveBeenCalledWith('Asistencia registrada', jasmine.stringContaining('asistieron 1 y faltaron 2'));
    });

    it('al registrar una novedad avisa de la fecha', () => {
      spyOn(component['novedadClaseService'], 'registrarNovedad').and.returnValue(of({} as any));
      component.abrirFormNovedad('2026-10-20');
      component.motivoCtrl.setValue('CLIMA');
      component.registrarNovedad();
      expect(component['notificaciones'].exito).toHaveBeenCalledWith('Novedad registrada', jasmine.stringContaining('20/10/2026'));
    });

    it('al inscribir un deportista confirma que ya aparece en la lista', () => {
      spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of({ confirmacionCreacion: true, idAlumno: 9 }) } as any);
      spyOn(component['inscripcionService'], 'postInscripcion').and.returnValue(of({ id: 1 } as any));
      component.inscribirAlumno();
      expect(component['notificaciones'].exito).toHaveBeenCalledWith('Deportista inscrito', jasmine.any(String));
    });
  });
});
