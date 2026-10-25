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
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { FormInscripcionesComponent } from '../../usuarios/form-inscripciones/form-inscripciones.component';
import { DialogComponent } from '../../dialog/dialog.component';

/**
 * Agregar, editar y desvincular deportistas de un grupo:
 * el Coordinador en cualquier grupo; el Instructor solo en el grupo que dicta (idInstructor del grupo = perfil de la sesión).
 */
describe('ListDeportistasdeCursoComponent — gestión de deportistas del grupo', () => {
  let component: ListDeportistasdeCursoComponent;
  let fixture: ComponentFixture<ListDeportistasdeCursoComponent>;

  const alumno: AlumnoDTO = {
    id: 42, codigo: 'U001', tipo: 'Estudiante', nombre: 'Carlos Ruiz', correo: 'cruiz@test.com', sexo: 'M', tipoid: 'CC', imagen: 0,
  };
  const grupo = (idInstructor: string | null, extra: Partial<GrupoDTO> = {}): GrupoDTO => ({
    categoria: 'Futbol', curso: 'Avanzado', anio: 2024, iterable: 1, imagenGrupo: 0,
    idInstructor, nombreInstructor: '', cupos: 10, fechaCreacion: '', ...extra,
  });

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const iconosDeAcciones = (): string[] =>
    Array.from(el().querySelectorAll('td.mat-column-Acciones mat-icon')).map(i => i.textContent?.trim() ?? '');

  const montar = async (o: { rol: string; idSesion?: string | null; idInstructor?: string | null; instructorGestiona?: boolean; grupoExtra?: Partial<GrupoDTO> }): Promise<void> => {
    if (o.idSesion) sessionStorage.setItem('dpt_perfil_id', o.idSesion); else sessionStorage.removeItem('dpt_perfil_id');
    await TestBed.configureTestingModule({
      imports: [ListDeportistasdeCursoComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        DatePipe,
        { provide: PerfilService, useValue: { perfil$: new BehaviorSubject<string>(o.rol) } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ categoria: 'Futbol', curso: 'Avanzado', anio: '2024', iterable: '1' })) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ListDeportistasdeCursoComponent, {
        remove: { imports: [SidenavComponent] },
        add: { schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ListDeportistasdeCursoComponent);
    component = fixture.componentInstance;
    spyOn(component['grupoService'], 'getGrupo').and.returnValue(of(grupo(o.idInstructor === undefined ? 'inst-1' : o.idInstructor, o.grupoExtra)));
    spyOn(component['alumnoService'], 'getAlumnosGrupo').and.returnValue(of([alumno]));
    spyOn(component['inscripcionService'], 'getListaEspera').and.returnValue(of([]));
    spyOn(component['horarioSerive'], 'getHorarios').and.returnValue(of([]));
    spyOn(component['instructorService'], 'getInstructor').and.returnValue(of({ nombre: 'Test' } as any));
    spyOn(component['snackBar'], 'open').and.returnValue(null as any);
    spyOn(component['novedadClaseService'], 'obtenerNovedadesGrupo').and.returnValue(of([]));
    // Por defecto en estas pruebas el Instructor sí gestiona deportistas (el valor real del interruptor está probado más abajo).
    component.instructorGestionaDeportistas = o.instructorGestiona ?? true;
    fixture.detectChanges();
  };

  afterEach(() => sessionStorage.removeItem('dpt_perfil_id'));

  describe('quién puede gestionar', () => {
    it('Coordinador: siempre', async () => {
      await montar({ rol: 'Coordinador' });
      expect(component.puedeGestionarAlumnos).toBeTrue();
      expect(el().querySelector('.btnAgregar')).not.toBeNull();
      expect(component.displayedColumns).toContain('Acciones');
      expect(iconosDeAcciones()).toEqual(['edit', 'delete']);
    });

    it('Instructor del grupo (id de sesión = idInstructor): agregar, editar y eliminar', async () => {
      await montar({ rol: 'Instructor', idSesion: 'inst-1', idInstructor: 'inst-1' });
      expect(component.puedeGestionarAlumnos).toBeTrue();
      expect(el().querySelector('.btnAgregar')).not.toBeNull();
      expect(component.displayedColumns).toContain('Acciones');
      expect(iconosDeAcciones()).toEqual(['edit', 'delete']);
    });

    it('Instructor de otro grupo: sin botones ni columna Acciones', async () => {
      await montar({ rol: 'Instructor', idSesion: 'otro', idInstructor: 'inst-1' });
      expect(component.puedeGestionarAlumnos).toBeFalse();
      expect(el().querySelector('.btnAgregar')).toBeNull();
      expect(component.displayedColumns).not.toContain('Acciones');
    });

    it('Instructor sin id de sesión, o grupo sin instructor: no puede', async () => {
      await montar({ rol: 'Instructor', idSesion: null, idInstructor: 'inst-1' });
      expect(component.puedeGestionarAlumnos).toBeFalse();
      TestBed.resetTestingModule();
      await montar({ rol: 'Instructor', idSesion: 'inst-1', idInstructor: null });
      expect(component.puedeGestionarAlumnos).toBeFalse();
    });

    it('Alumno: no puede', async () => {
      await montar({ rol: 'Alumno', idSesion: 'inst-1' });
      expect(component.puedeGestionarAlumnos).toBeFalse();
      expect(el().querySelector('.btnAgregar')).toBeNull();
      expect(component.displayedColumns).not.toContain('Acciones');
    });
  });

  describe('Instructor ajeno al grupo: las acciones se rechazan aunque se invoquen', () => {
    beforeEach(() => montar({ rol: 'Instructor', idSesion: 'otro', idInstructor: 'inst-1' }));

    it('inscribirAlumno, editarAlumno y eliminarAlumno no abren diálogo y avisan', () => {
      const abrir = spyOn(component['dialog'], 'open');
      component.inscribirAlumno();
      component.editarAlumno(alumno);
      component.eliminarAlumno(alumno);
      expect(abrir).not.toHaveBeenCalled();
      expect(component['snackBar'].open).toHaveBeenCalledTimes(3);
      expect(component['snackBar'].open).toHaveBeenCalledWith(
        jasmine.stringContaining('no son de su cargo'), 'Cerrar', jasmine.objectContaining({ panelClass: ['snack-error'] }));
    });
  });

  describe('Instructor del grupo', () => {
    beforeEach(() => montar({ rol: 'Instructor', idSesion: 'inst-1', idInstructor: 'inst-1' }));

    it('inscribirAlumno: abre el formulario en modo inscribir y, al confirmar, inscribe en este grupo', () => {
      const abrir = spyOn(component['dialog'], 'open').and.returnValue({
        afterClosed: () => of({ confirmacionCreacion: true, idAlumno: 77 }),
      } as any);
      const post = spyOn(component['inscripcionService'], 'postInscripcion').and.returnValue(of({} as any));

      component.inscribirAlumno();

      expect(abrir).toHaveBeenCalledWith(FormInscripcionesComponent, jasmine.objectContaining({ data: { modo: 'inscribir' } }));
      expect(post).toHaveBeenCalledOnceWith(jasmine.objectContaining({
        alumnoId: 77, categoria: 'Futbol', curso: 'Avanzado', anio: 2024, iterable: 1,
      }));
    });

    it('inscribirAlumno: si cierran el diálogo sin confirmar no pasa nada', () => {
      spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);
      const post = spyOn(component['inscripcionService'], 'postInscripcion');
      expect(() => component.inscribirAlumno()).not.toThrow();
      expect(post).not.toHaveBeenCalled();
    });

    it('editarAlumno: abre el formulario en modo editar con el alumno y recarga al actualizar', () => {
      const abrir = spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of({ actualizado: true }) } as any);
      component.editarAlumno(alumno);
      expect(abrir).toHaveBeenCalledWith(FormInscripcionesComponent, jasmine.objectContaining({ data: { modo: 'editar', alumno, bloquearCorreo: true } }));
      expect(component['alumnoService'].getAlumnosGrupo).toHaveBeenCalledTimes(2);
    });

    it('editarAlumno: el Coordinador no tiene el correo bloqueado', async () => {
      TestBed.resetTestingModule();
      await montar({ rol: 'Coordinador' });
      const abrir = spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of(null) } as any);
      component.editarAlumno(alumno);
      expect(abrir).toHaveBeenCalledWith(FormInscripcionesComponent, jasmine.objectContaining({ data: { modo: 'editar', alumno, bloquearCorreo: false } }));
    });

    it('eliminarAlumno: pide confirmación (tipo inscripcion) y recarga al confirmar', () => {
      const abrir = spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of({ confirmado: true }) } as any);
      component.eliminarAlumno(alumno);
      expect(abrir).toHaveBeenCalledWith(DialogComponent, jasmine.objectContaining({
        data: jasmine.objectContaining({ tipoElemento: 'inscripcion', alumnoId: 42, categoria: 'Futbol' }),
      }));
      expect(component['alumnoService'].getAlumnosGrupo).toHaveBeenCalledTimes(2);
      expect(component['snackBar'].open).toHaveBeenCalledWith(
        'Deportista desvinculado del grupo', 'Cerrar', jasmine.objectContaining({ panelClass: ['snack-success'] }));
    });

    it('eliminarAlumno: si el servidor rechaza, muestra el error y no recarga', () => {
      spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of({ confirmado: false, errorStatus: 403 }) } as any);
      component.eliminarAlumno(alumno);
      expect(component['snackBar'].open).toHaveBeenCalledWith(
        jasmine.stringContaining('Error al desvincular'), 'Cerrar', jasmine.objectContaining({ panelClass: ['snack-error'] }));
      expect(component['alumnoService'].getAlumnosGrupo).toHaveBeenCalledTimes(1);
    });
  });

  // El Instructor puede VER cualquier grupo, pero solo gestionar el que dicta: asistencia, novedades y su historial incluidos.
  describe('Instructor de otro grupo: solo consulta', () => {
    beforeEach(() => montar({ rol: 'Instructor', idSesion: 'otro', idInstructor: 'inst-1' }));

    it('soloConsulta es verdadero y no se puede registrar asistencia ni novedad', () => {
      expect(component.soloConsulta).toBeTrue();
      expect(component.puedeRegistrar).toBeFalse();
      expect(component.puedeRegistrarNovedad).toBeFalse();
    });

    it('registrarAsistencia y registrarNovedad no llaman al servidor aunque se invoquen', () => {
      const postClase = spyOn(component['claseService'], 'postClase');
      const novedad = spyOn(component['novedadClaseService'], 'registrarNovedad');
      component.motivoCtrl.setValue('OTRO'); component.descripcionCtrl.setValue('x'); component.fechaNovedadCtrl.setValue('2024-08-20');
      component.registrarAsistencia();
      component.registrarNovedad();
      expect(postClase).not.toHaveBeenCalled();
      expect(novedad).not.toHaveBeenCalled();
    });

    it('eliminarAtencion no abre el diálogo y avisa', () => {
      const abrir = spyOn(component['dialog'], 'open');
      component.eliminarAtencion({ idPerfil: '42', idClase: 7, estaAtendido: true }, { codigo: 7 } as any);
      expect(abrir).not.toHaveBeenCalled();
      expect(component['snackBar'].open).toHaveBeenCalledWith(
        jasmine.stringContaining('no son de su cargo'), 'Cerrar', jasmine.objectContaining({ panelClass: ['snack-error'] }));
    });

    it('la pantalla no ofrece registrar y explica que es solo consulta; las casillas quedan deshabilitadas', () => {
      expect(el().querySelector('.btn-registrar')).toBeNull();
      expect(el().querySelector('.btn-novedad')).toBeNull();
      expect(el().querySelector('.solo-consulta')?.textContent).toContain('no está a su cargo');
      expect(el().querySelectorAll('mat-checkbox.mat-mdc-checkbox-disabled').length).toBe(1);
    });

    it('en el historial no aparece el botón de eliminar asistencia', () => {
      component.historialVisible = true;
      component.clases = [{ codigo: 7, fecha: '2024-08-20', horas: 1, minutos: 0 } as any];
      component.clasesExpandidas.add(7);
      component.clasesAtenciones[7] = [{ idPerfil: '42', idClase: 7, estaAtendido: true }];
      fixture.detectChanges();
      expect(el().querySelector('.tabla-atenciones')).not.toBeNull();
      expect(el().querySelector('button[title="Eliminar asistencia"]')).toBeNull();
    });
  });

  describe('Quien sí gestiona el grupo conserva el registro', () => {
    for (const caso of [
      { nombre: 'Instructor del grupo', o: { rol: 'Instructor', idSesion: 'inst-1', idInstructor: 'inst-1' } },
      { nombre: 'Coordinador', o: { rol: 'Coordinador' } },
    ]) {
      it(`${caso.nombre}: no es solo consulta, ve los botones y el de eliminar asistencia`, async () => {
        await montar(caso.o);
        expect(component.soloConsulta).toBeFalse();
        expect(el().querySelector('.btn-registrar')).not.toBeNull();
        expect(el().querySelector('.btn-novedad')).not.toBeNull();
        expect(el().querySelector('.solo-consulta')).toBeNull();
        component.historialVisible = true;
        component.clases = [{ codigo: 7, fecha: '2024-08-20', horas: 1, minutos: 0 } as any];
        component.clasesExpandidas.add(7);
        component.clasesAtenciones[7] = [{ idPerfil: '42', idClase: 7, estaAtendido: true }];
        fixture.detectChanges();
        expect(el().querySelector('button[title="Eliminar asistencia"]')).not.toBeNull();
      });
    }

    it('mientras el grupo no ha cargado no se avisa "solo consulta" (evita el parpadeo)', async () => {
      await montar({ rol: 'Instructor', idSesion: 'otro', idInstructor: 'inst-1' });
      component.grupoCargado = false;
      expect(component.soloConsulta).toBeFalse();
    });
  });

  // Mientras el backend no autorice al Instructor en inscripción, desvinculación y edición, esas acciones quedan solo
  // para el Coordinador; el resto del trabajo del Instructor titular (asistencia, novedades) no cambia.
  describe('interruptor temporal: el Instructor aún no gestiona deportistas', () => {
    it('por defecto está encendido: el backend ya autoriza al Instructor titular', async () => {
      await montar({ rol: 'Coordinador' });
      TestBed.resetTestingModule();
      expect(new ListDeportistasdeCursoComponent(null as any, null as any, null as any, null as any, null as any, null as any,
        null as any, null as any, null as any, null as any, null as any, null as any).instructorGestionaDeportistas).toBeTrue();
    });

    describe('Instructor titular con el interruptor apagado', () => {
      beforeEach(() => montar({ rol: 'Instructor', idSesion: 'inst-1', idInstructor: 'inst-1', instructorGestiona: false }));

      it('no ve "Agregar deportista +" ni la columna Acciones, y las acciones se rechazan con un aviso claro', () => {
        expect(component.puedeGestionarAlumnos).toBeFalse();
        expect(el().querySelector('.btnAgregar')).toBeNull();
        expect(component.displayedColumns).not.toContain('Acciones');
        const abrir = spyOn(component['dialog'], 'open');
        component.inscribirAlumno();
        component.editarAlumno(alumno);
        component.eliminarAlumno(alumno);
        expect(abrir).not.toHaveBeenCalled();
        expect(component['snackBar'].open).toHaveBeenCalledWith(
          jasmine.stringContaining('solo el Coordinador'), 'Cerrar', jasmine.objectContaining({ panelClass: ['snack-error'] }));
      });

      it('sigue pudiendo registrar asistencia y eliminar asistencias de su grupo', () => {
        expect(component.soloConsulta).toBeFalse();
        expect(el().querySelector('.btn-registrar')).not.toBeNull();
        const abrir = spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of(null) } as any);
        component.eliminarAtencion({ idPerfil: '42', idClase: 7, estaAtendido: true }, { codigo: 7 } as any);
        expect(abrir).toHaveBeenCalled();
      });
    });

    it('el Coordinador no depende del interruptor', async () => {
      await montar({ rol: 'Coordinador', instructorGestiona: false });
      expect(component.puedeGestionarAlumnos).toBeTrue();
      expect(el().querySelector('.btnAgregar')).not.toBeNull();
    });
  });

  // Inscribir en un grupo cuyas inscripciones cerraron: aviso claro con la fecha, para Coordinador e Instructor.
  describe('inscripciones cerradas del grupo', () => {
    const cerrado: Partial<GrupoDTO> = { inscripcionesAbiertas: false, motivoInscripcion: 'CERRADAS', fechaIncripcionCierre: '2026-06-14' };
    const casos = [
      { nombre: 'Coordinador', o: { rol: 'Coordinador' } },
      { nombre: 'Instructor titular', o: { rol: 'Instructor', idSesion: 'inst-1', idInstructor: 'inst-1' } },
    ];
    const avisoEnPantalla = (): string | null =>
      el().querySelector('.aviso-inscripciones-cerradas span')?.textContent?.replace(/\s+/g, ' ').trim() ?? null;

    for (const caso of casos) {
      describe(caso.nombre, () => {
        it('al intentar inscribir avisa que cerraron en la fecha y no abre el formulario', async () => {
          await montar({ ...caso.o, grupoExtra: cerrado });
          const abrir = spyOn(component['dialog'], 'open');
          component.inscribirAlumno();
          expect(abrir).not.toHaveBeenCalled();
          expect(component['snackBar'].open).toHaveBeenCalledWith(
            'Las inscripciones de este grupo cerraron el 14/06/2026', 'Cerrar', jasmine.objectContaining({ panelClass: ['snack-error'] }));
        });

        it('muestra el estado del grupo junto a "Agregar deportista +"', async () => {
          await montar({ ...caso.o, grupoExtra: cerrado });
          expect(avisoEnPantalla()).toBe('Las inscripciones de este grupo cerraron el 14/06/2026');
          expect(el().querySelector('.aviso-inscripciones-cerradas')?.getAttribute('role')).toBe('status');
        });

        it('si las inscripciones aún no abren, avisa cuándo abren', async () => {
          await montar({ ...caso.o, grupoExtra: { inscripcionesAbiertas: false, motivoInscripcion: 'NO_ABIERTAS', fechaInscripcionApertura: '2026-07-01' } });
          const abrir = spyOn(component['dialog'], 'open');
          component.inscribirAlumno();
          expect(abrir).not.toHaveBeenCalled();
          expect(component['snackBar'].open).toHaveBeenCalledWith(
            'Las inscripciones de este grupo abren el 01/07/2026', 'Cerrar', jasmine.objectContaining({ panelClass: ['snack-error'] }));
        });

        it('sin fecha de cierre usa el aviso genérico', async () => {
          await montar({ ...caso.o, grupoExtra: { inscripcionesAbiertas: false, motivoInscripcion: 'CERRADAS' } });
          expect(avisoEnPantalla()).toBe('Las inscripciones de este grupo están cerradas');
        });

        it('con el grupo abierto, o sin el campo del backend, no hay aviso y el formulario abre', async () => {
          for (const extra of [{ inscripcionesAbiertas: true, motivoInscripcion: 'ABIERTAS' as const }, {}]) {
            TestBed.resetTestingModule();
            await montar({ ...caso.o, grupoExtra: extra });
            expect(avisoEnPantalla()).toBeNull();
            const abrir = spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);
            component.inscribirAlumno();
            expect(abrir).toHaveBeenCalled();
          }
        });

        it('si el servidor rechaza la inscripción muestra su mensaje (o uno genérico)', async () => {
          await montar(caso.o);
          spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of({ confirmacionCreacion: true, idAlumno: 77 }) } as any);
          const post = spyOn(component['inscripcionService'], 'postInscripcion');
          post.and.returnValue(throwError(() => ({ status: 422, error: { mensaje: 'Las inscripciones de este grupo están cerradas' } })));
          component.inscribirAlumno();
          expect(component['snackBar'].open).toHaveBeenCalledWith(
            'Las inscripciones de este grupo están cerradas', 'Cerrar', jasmine.objectContaining({ panelClass: ['snack-error'] }));
          post.and.returnValue(throwError(() => ({ status: 500 })));
          component.inscribirAlumno();
          expect(component['snackBar'].open).toHaveBeenCalledWith(
            'No se pudo inscribir al deportista. Intente de nuevo.', 'Cerrar', jasmine.objectContaining({ panelClass: ['snack-error'] }));
        });
      });
    }

    it('Instructor ajeno: no ve el aviso (no puede inscribir de todos modos)', async () => {
      await montar({ rol: 'Instructor', idSesion: 'otro', idInstructor: 'inst-1', grupoExtra: cerrado });
      expect(avisoEnPantalla()).toBeNull();
    });
  });
});
