import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { ListDeportistasdeCursoComponent } from './list-deportistasde-curso.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { AlumnoDTO } from 'src/app/Models/DTOs/alumno-dto';
import { ClaseDTO } from 'src/app/Models/DTOs/clase-dto';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';

/**
 * Faltas acumuladas: el total lo calcula el backend (AlumnoDto.faltas en GET /alumnosGrupo). La tabla solo lo muestra.
 */
describe('ListDeportistasdeCursoComponent — faltas acumuladas del grupo', () => {
  let component: ListDeportistasdeCursoComponent;
  let fixture: ComponentFixture<ListDeportistasdeCursoComponent>;

  const alumno = (id: number, nombre: string, faltas?: number): AlumnoDTO => ({
    id, codigo: `U${id}`, tipo: 'Estudiante', nombre, correo: `${nombre}@t.co`.toLowerCase(), sexo: 'F', tipoid: 'CC', imagen: 0,
    ...(faltas === undefined ? {} : { faltas }),
  });
  const grupo: GrupoDTO = {
    categoria: 'Futbol', curso: 'Avanzado', anio: 2024, iterable: 1, imagenGrupo: 0,
    idInstructor: 'inst-1', nombreInstructor: '', cupos: 10, fechaCreacion: '',
  };
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const celdasFaltas = (): string[] =>
    Array.from(el().querySelectorAll('td.mat-column-Faltas')).map(c => c.textContent?.replace(/\s+/g, ' ').trim() ?? '');

  const montar = async (o: { rol: string; alumnos: AlumnoDTO[] | 'error'; idSesion?: string }): Promise<void> => {
    if (o.idSesion) sessionStorage.setItem('dpt_perfil_id', o.idSesion); else sessionStorage.removeItem('dpt_perfil_id');
    await TestBed.configureTestingModule({
      imports: [ListDeportistasdeCursoComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        DatePipe,
        { provide: PerfilService, useValue: { perfil$: new BehaviorSubject<string>(o.rol) } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ categoria: 'Futbol', curso: 'Avanzado', anio: '2024', iterable: '1' })) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ListDeportistasdeCursoComponent, { remove: { imports: [SidenavComponent] }, add: { schemas: [NO_ERRORS_SCHEMA] } })
      .compileComponents();

    fixture = TestBed.createComponent(ListDeportistasdeCursoComponent);
    component = fixture.componentInstance;
    spyOn(component['grupoService'], 'getGrupo').and.returnValue(of(grupo));
    spyOn(component['alumnoService'], 'getAlumnosGrupo')
      .and.returnValue(o.alumnos === 'error' ? throwError(() => new Error('red')) : of(o.alumnos));
    spyOn(component['inscripcionService'], 'getListaEspera').and.returnValue(of([]));
    spyOn(component['horarioSerive'], 'getHorarios').and.returnValue(of([]));
    spyOn(component['instructorService'], 'getInstructor').and.returnValue(of({ nombre: 'Prof' } as any));
    spyOn(component['claseService'], 'getClase').and.returnValue(of([]));
    spyOn(component['snackBar'], 'open').and.returnValue(null as any);
    spyOn(component['novedadClaseService'], 'obtenerNovedadesGrupo').and.returnValue(of([]));
    fixture.detectChanges();
  };

  afterEach(() => sessionStorage.removeItem('dpt_perfil_id'));

  describe('columna Faltas', () => {
    const lista = [alumno(1, 'Ana', 3), alumno(2, 'Beto', 0), alumno(3, 'Caro', 12)];

    for (const caso of [
      { nombre: 'Coordinador', o: { rol: 'Coordinador' } },
      { nombre: 'Instructor titular', o: { rol: 'Instructor', idSesion: 'inst-1' } },
      { nombre: 'Instructor de otro grupo (solo consulta)', o: { rol: 'Instructor', idSesion: 'otro' } },
    ]) {
      it(`${caso.nombre}: muestra el total de cada alumno, incluido el cero`, async () => {
        await montar({ ...caso.o, alumnos: lista });
        expect(celdasFaltas()).toEqual(['3', '0', '12']);
      });
    }

    it('el encabezado "Faltas" sigue en la tabla', async () => {
      await montar({ rol: 'Coordinador', alumnos: lista });
      expect(el().querySelector('th.mat-column-Faltas')?.textContent?.trim()).toBe('Faltas');
    });

    it('si el backend no envía el campo no se inventa un cero: se muestra un guion', async () => {
      await montar({ rol: 'Coordinador', alumnos: [alumno(1, 'Ana'), alumno(2, 'Beto', 2)] });
      expect(celdasFaltas()).toEqual(['—', '2']);
    });

    it('si falla la consulta de alumnos no se muestran filas ni ceros inventados', async () => {
      await montar({ rol: 'Coordinador', alumnos: 'error' });
      expect(celdasFaltas()).toEqual([]);
    });

    it('el valor se toma tal cual del backend (sin calcularlo en Angular)', async () => {
      await montar({ rol: 'Coordinador', alumnos: [alumno(1, 'Ana', 7)] });
      expect(component.alumnos.data[0].faltas).toBe(7);
      expect(celdasFaltas()).toEqual(['7']);
    });
  });

  describe('historial de clases', () => {
    const clase: ClaseDTO = { codigo: 7, idGrupoCategoria: 'Futbol', idGrupoCurso: 'Avanzado', idGrupoAnio: 2024, idGrupoIterable: 1,
      idInstructor: 'inst-1', fecha: '2026-10-15', horas: 1, minutos: 0, observacion: '', eliminado: 0 };

    beforeEach(() => montar({ rol: 'Coordinador', alumnos: [alumno(1, 'Ana', 1)] }));

    it('una clase sin ninguna fila (200 con GC-0002, listado vacío) se muestra como sin asistentes, sin romper', () => {
      spyOn(component['asistenciaService'], 'getAtencionesClase').and.returnValue(of({ codigoError: 'GC-0002', mensaje: 'Listado vacío' } as any));
      component.historialVisible = true;
      component.clases = [clase];
      component.toggleClase(clase);
      fixture.detectChanges();
      expect(component.clasesAtenciones[7]).toEqual([]);
      expect(el().textContent).toContain('Sin asistentes registrados');
    });

    const invalidas: [string, any][] = [
      ['otro código (GC-0099)', { codigoError: 'GC-0099', mensaje: 'x' }],
      ['null', null],
      ['una cadena', 'ok'],
      ['un objeto sin codigoError', { mensaje: 'sin código' }],
    ];
    const msgError = 'Error al cargar las atenciones';

    for (const [nombre, cuerpo] of invalidas) {
      it(`expandir una clase: ${nombre} no se toma como "sin asistentes", avisa del error y no guarda datos`, () => {
        spyOn(component['asistenciaService'], 'getAtencionesClase').and.returnValue(of(cuerpo));
        component.historialVisible = true;
        component.clases = [clase];
        component.toggleClase(clase);
        fixture.detectChanges();
        expect(component.clasesAtenciones[7]).toBeUndefined();
        expect(el().textContent).not.toContain('Sin asistentes registrados');
        expect(component['snackBar'].open).toHaveBeenCalledWith(msgError, 'Cerrar', jasmine.objectContaining({ panelClass: ['snack-error'] }));
      });

      it(`eliminar una asistencia: si al releer las atenciones llega ${nombre}, no se silencia ni se toma como lista vacía`, () => {
        spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of({ confirmado: true }) } as any);
        spyOn(component['asistenciaService'], 'getAtencionesClase').and.returnValue(of(cuerpo));
        component.clasesAtenciones[7] = [{ idPerfil: '1', idClase: 7, estaAtendido: true }];
        component.eliminarAtencion({ idPerfil: '1', idClase: 7, estaAtendido: true }, clase);
        expect(component.clasesAtenciones[7]).toEqual([{ idPerfil: '1', idClase: 7, estaAtendido: true }]);   // se conserva lo anterior
        expect(component['snackBar'].open).toHaveBeenCalledWith(msgError, 'Cerrar', jasmine.objectContaining({ panelClass: ['snack-error'] }));
      });
    }

    it('eliminar una asistencia: si al releer las atenciones falla la petición, también se avisa (no se silencia)', () => {
      spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of({ confirmado: true }) } as any);
      spyOn(component['asistenciaService'], 'getAtencionesClase').and.returnValue(throwError(() => new Error('red')));
      component.eliminarAtencion({ idPerfil: '1', idClase: 7, estaAtendido: true }, clase);
      expect(component['snackBar'].open).toHaveBeenCalledWith(msgError, 'Cerrar', jasmine.objectContaining({ panelClass: ['snack-error'] }));
    });

    it('eliminar una asistencia con GC-0002 al releer: la lista queda vacía sin error', () => {
      spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of({ confirmado: true }) } as any);
      spyOn(component['asistenciaService'], 'getAtencionesClase').and.returnValue(of({ codigoError: 'GC-0002' } as any));
      component.eliminarAtencion({ idPerfil: '1', idClase: 7, estaAtendido: true }, clase);
      expect(component.clasesAtenciones[7]).toEqual([]);
      expect(component['snackBar'].open).not.toHaveBeenCalledWith(msgError, jasmine.anything(), jasmine.anything());
    });

    it('la columna "Asistió" dice Sí o No (no un texto dañado)', () => {
      spyOn(component['asistenciaService'], 'getAtencionesClase').and.returnValue(of([
        { idPerfil: '1', idClase: 7, estaAtendido: true }, { idPerfil: '2', idClase: 7, estaAtendido: false },
      ]));
      component.historialVisible = true;
      component.clases = [clase];
      component.toggleClase(clase);
      fixture.detectChanges();
      const celdas = Array.from(el().querySelectorAll('.tabla-atenciones tbody tr td:nth-child(2)')).map(c => c.textContent?.trim());
      expect(celdas).toEqual(['Sí', 'No']);
    });

    it('al eliminar una asistencia del historial se recarga la lista de alumnos (las faltas pueden cambiar)', () => {
      spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of({ confirmado: true }) } as any);
      spyOn(component['asistenciaService'], 'getAtencionesClase').and.returnValue(of([]));
      const getAlumnos = component['alumnoService'].getAlumnosGrupo as jasmine.Spy;
      getAlumnos.calls.reset();
      component.eliminarAtencion({ idPerfil: '1', idClase: 7, estaAtendido: true }, clase);
      expect(getAlumnos).toHaveBeenCalledTimes(1);
    });
  });
});
