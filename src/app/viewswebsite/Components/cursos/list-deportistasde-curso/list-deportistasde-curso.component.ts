import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { AlumnoService } from 'src/app/services/alumno.service';
import { ActivatedRoute } from '@angular/router';
import { AlumnoDTO } from 'src/app/Models/DTOs/alumno-dto';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { GrupoService } from 'src/app/services/grupo.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { HorarioService } from 'src/app/services/horario.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormInscripcionesComponent } from '../../usuarios/form-inscripciones/form-inscripciones.component';
import { DialogComponent } from '../../dialog/dialog.component';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { InscripcionDTO } from 'src/app/Models/DTOs/inscripcion-dto';
import { InscripcionEnEsperaDto } from 'src/app/Models/DTOs/inscripcion-en-espera-dto';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ClaseService } from 'src/app/services/clase.service';
import { AsistenciaService } from 'src/app/services/asistencia.service';
import { ClaseDTO } from 'src/app/Models/DTOs/clase-dto';
import { AtencionDTO } from 'src/app/Models/DTOs/atencion-dto';
import { PerfilService } from 'src/app/services/perfil.service';
import { fechaLarga, formatearFecha } from 'src/app/shared/fecha-grupo.util';
import {
  FranjaDia, diasConClase, duracionManualValida, esRolSinRestriccion, franjaDelDia, hoyTexto, textoDiasDeClase,
} from 'src/app/shared/ventana-registro.util';
import { ConfirmarSinAsistentesComponent } from './confirmar-sin-asistentes.component';
import { NovedadClaseService } from 'src/app/services/novedad-clase.service';
import { NovedadClaseDto, NovedadClaseRequestDto, MOTIVOS_NOVEDAD, motivoRequiereDescripcion, motivoNombre } from 'src/app/Models/DTOs/novedad-clase-dto';

@Component({
  selector: 'app-list-deportistasde-curso',
  standalone: true,
  imports: [
    CommonModule,
    SidenavComponent,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatCheckboxModule,
    MatSnackBarModule,
    ReactiveFormsModule,
  ],
  templateUrl: './list-deportistasde-curso.component.html',
  styleUrls: ['./list-deportistasde-curso.component.css'],
})
export class ListDeportistasdeCursoComponent implements OnInit {

  categoria: string | null = '';
  titulo: string | null = '';
  anio: number | null = null;
  iterable: number | null = null;
  alumnos = new MatTableDataSource<AlumnoDTO>([]);
  listaEspera: InscripcionEnEsperaDto[] = [];
  rol: string = '';
  clases: ClaseDTO[] = [];
  clasesAtenciones: Record<number, AtencionDTO[]> = {};
  clasesExpandidas = new Set<number>();
  historialVisible = false;
  displayedColumns: string[] = ['Código', 'Nombre', 'Correo', 'Faltas', 'Asistencia', 'Acciones'];
  displayedColumnsEspera: string[] = ['Posicion', 'Nombre', 'Correo', 'FechaInscripcion', 'Acciones'];

  // ── Registro de asistencia de HOY (SCRUM-80 corregido) ────────────────────
  // No hay calendario: la asistencia se registra siempre con la fecha de hoy y el sistema la valida con el horario
  // del grupo. La fecha se calcula en cada uso (ver hoy), no se guarda en una propiedad.
  estadoHorarios: 'cargando' | 'ok' | 'error' = 'cargando';
  justificacionCtrl = new FormControl<string>('', { nonNullable: true });
  horasCtrl = new FormControl<number | null>(null);
  minutosCtrl = new FormControl<number | null>(null);
  readonly maxJustificacion = 500;
  /** El servidor exigió justificación (GC-0021) aunque no se mostró la falta de franja (p. ej. el horario no cargó). */
  exigirFueraDeHorario = false;
  /** Alumnos que asistieron (por id); los demás quedan con falta. */
  asistieron = new Set<string>();
  /** Marcas ya registradas para el día en que se cargaron: base para aplicar solo la diferencia al guardar. */
  private marcasPrevias = new Set<string>();
  private fechaDeMarcas = '';
  cargandoMarcas = false;
  guardando = false;
  errorRegistro: string | null = null;
  avisoRegistro: string | null = null;
  errorNovedad: string | null = null;

  // ── Novedad de clase no realizada ─────────────────────────────────────────
  novedades: NovedadClaseDto[] = [];
  cargandoNovedades = false;
  mostrarFormNovedad = false;
  motivoCtrl = new FormControl<string>('', { nonNullable: true });
  descripcionCtrl = new FormControl<string>('', { nonNullable: true });
  fechaNovedadCtrl = new FormControl<string>('', { nonNullable: true });
  readonly motivos = MOTIVOS_NOVEDAD;
  readonly motivoNombre = motivoNombre;
  readonly maxDescripcion = 1000;

  grupo: GrupoDTO = {
    categoria: '',
    curso: '',
    anio: 0,
    iterable: 0,
    imagenGrupo: 0,
    idInstructor: '',
    nombreInstructor: '',
    cupos: 0,
    fechaCreacion: '',
    fechaFinalizacion: '',
    fechaInscripcionApertura: '',
    fechaIncripcionCierre: ''
  }

  constructor(
    private alumnoService: AlumnoService,
    private route: ActivatedRoute,
    private grupoService: GrupoService,
    private instructorService: InstructorServisce,
    private horarioSerive: HorarioService,
    private inscripcionService: InscripcionesService,
    private perfilService: PerfilService,
    private dialog: MatDialog,
    private claseService: ClaseService,
    private asistenciaService: AsistenciaService,
    private novedadClaseService: NovedadClaseService,
    private snackBar: MatSnackBar,
  ) { }

  ngOnInit(): void {
    this.perfilService.perfil$.subscribe(p => {
      this.rol = p;
      this.displayedColumns = p === 'Coordinador'
        ? ['Código', 'Nombre', 'Correo', 'Faltas', 'Asistencia', 'Acciones']
        : ['Código', 'Nombre', 'Correo', 'Faltas', 'Asistencia'];
    });
    this.route.paramMap.subscribe(
      (params) => {
        this.categoria = params.get('categoria');
        this.titulo = params.get('curso');
        this.anio = Number(params.get('anio'));
        this.iterable = Number(params.get('iterable'));
      }
    );
    this.cargarMarcasDeHoy();
    this.cargarDatos();
  }

  cargarDatos(): void {
    //Cargar información del grupo
    this.grupoService.getGrupo(this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe(
      (grupoTemp) => {
        this.grupo = grupoTemp;
        this.consultarInstructor(grupoTemp.idInstructor);
        this.estadoHorarios = 'cargando';
        this.horarioSerive.getHorarios(this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe({
          next: (horario) => {
            grupoTemp.horarios = horario;
            this.estadoHorarios = 'ok';
          },
          // Si el horario no se pudo cargar no se inventa nada: no se restringe y decide el servidor.
          error: () => { this.estadoHorarios = 'error'; },
        });
      }
    );

    this.alumnoService.getAlumnosGrupo(this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe(
      {
        next: (data) => {
          this.alumnos.data = Array.isArray(data) ? data : [];
        },
        error: (err) => {
          console.error('Error al traer alumnos:', err);
          this.alumnos.data = [];
        }
      }
    );

    if (this.rol === 'Coordinador') {
      this.inscripcionService.getListaEspera(this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe({
        next: (data) => { this.listaEspera = Array.isArray(data) ? data : []; },
        error: () => { this.listaEspera = []; }
      });
    }
  }

  consultarInstructor(id: string | null | undefined): void {
    if (id === null || id === undefined || id.trim() === '') {
      this.grupo.nombreInstructor = null;
      return;
    }
    this.instructorService.getInstructor(id).subscribe({
      next: (instructor) => { this.grupo.nombreInstructor = instructor?.nombre ?? null; },
      error: () => { this.grupo.nombreInstructor = null; },
    });
  }

  inscribirAlumno() {
    const dialogRef = this.dialog.open(FormInscripcionesComponent, {
      data: { modo: 'inscribir' }
    });

    dialogRef.afterClosed().subscribe(
      (resultado) => {
        if (resultado.confirmacionCreacion) {

          const inscripcion: InscripcionDTO = {
            fechaInscripcion: hoyTexto(this.ahora()),
            fechaDesvinculacion: '',
            alumnoId: resultado.idAlumno,
            categoria: this.categoria!,
            curso: this.titulo!,
            anio: this.anio!,
            iterable: this.iterable!,
            eliminado: 0,
          }
          this.inscripcionService.postInscripcion(inscripcion).subscribe(
            (response) => {
              if (response != null) {
                this.ngOnInit();
              }
            }
          );
        }
      });
  }

  letraDeIterable(n: number | null): string {
    if (!n || n < 1) return '?';
    return String.fromCharCode(64 + n);
  }

  editarAlumno(alumno: AlumnoDTO) {
    const dialogRef = this.dialog.open(FormInscripcionesComponent, {
      data: { modo: 'editar', alumno },
    });
    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado?.actualizado) {
        this.cargarDatos();
        this.snackBar.open('Datos del deportista actualizados', 'Cerrar', { duration: 3000, panelClass: ['snack-success'] });
      }
    });
  }

  eliminarAlumno(alumno: AlumnoDTO) {
    const dialogRef = this.dialog.open(DialogComponent, {
      data: {
        elemento: ' al estudiante',
        nombreElemento: this.titulo!,
        tipoElemento: 'inscripcion',
        categoria: this.categoria!,
        alumnoId: alumno.id,
        anio: this.anio!,
        iterable: this.iterable!,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmado) {
        this.cargarDatos();
        this.snackBar.open('Deportista desvinculado del grupo', 'Cerrar', { duration: 3000, panelClass: ['snack-success'] });
      } else if (result?.errorStatus !== undefined) {
        this.snackBar.open('Error al desvincular al deportista, intente de nuevo', 'Cerrar', { duration: 3000, panelClass: ['snack-error'] });
      }
    });
  }

  promover(alumno: InscripcionEnEsperaDto): void {
    this.inscripcionService.promoverAlumno(alumno.alumnoId, this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe({
      next: () => {
        this.snackBar.open(`${alumno.nombre} promovido al grupo`, 'Cerrar', { duration: 3000, panelClass: ['snack-success'] });
        this.cargarDatos();
      },
      error: (err) => {
        const msg = err?.status === 409 ? 'El alumno ya está inscrito en el grupo' : 'Error al promover, intente de nuevo';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-error'] });
      }
    });
  }

  cargarHistorial(): void {
    this.claseService.getClase(this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe({
      next: (clases) => {
        this.clases = clases;
        this.historialVisible = true;
        this.cargarNovedades();
      },
      error: () => {
        this.snackBar.open('Error al cargar el historial de clases', 'Cerrar', {
          duration: 3000, panelClass: ['snack-error'],
        });
      },
    });
  }

  cargarNovedades(): void {
    this.cargandoNovedades = true;
    this.novedadClaseService.obtenerNovedadesGrupo(this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe({
      next: (novedades) => {
        this.novedades = novedades;
        this.cargandoNovedades = false;
      },
      error: () => {
        this.cargandoNovedades = false;
        this.novedades = [];
      },
    });
  }

  toggleClase(clase: ClaseDTO): void {
    if (this.clasesExpandidas.has(clase.codigo)) {
      this.clasesExpandidas.delete(clase.codigo);
      return;
    }
    this.clasesExpandidas.add(clase.codigo);
    this.asistenciaService.getAtencionesClase(clase.codigo).subscribe({
      next: (atenciones) => { this.clasesAtenciones[clase.codigo] = atenciones; },
      error: () => {
        this.snackBar.open('Error al cargar las atenciones', 'Cerrar', {
          duration: 3000, panelClass: ['snack-error'],
        });
      },
    });
  }

  getNombreAlumno(perfId: string): string {
    const alumno = this.alumnos.data.find(a => String(a.id) === perfId);
    return alumno?.nombre ?? perfId;
  }

  eliminarAtencion(atencion: AtencionDTO, clase: ClaseDTO): void {
    const dialogRef = this.dialog.open(DialogComponent, {
      data: {
        elemento: 'la asistencia de',
        nombreElemento: this.getNombreAlumno(atencion.idPerfil),
        tipoElemento: 'asistencia',
        prmPerfId: atencion.idPerfil,
        prmClsCodigo: clase.codigo,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmado) {
        this.asistenciaService.getAtencionesClase(clase.codigo).subscribe({
          next: (atenciones) => { this.clasesAtenciones[clase.codigo] = atenciones; },
          error: () => {},
        });
        this.snackBar.open('Asistencia eliminada correctamente', 'Cerrar', {
          duration: 3000, panelClass: ['snack-success'],
        });
      } else if (result?.errorStatus !== undefined) {
        this.snackBar.open('Error al eliminar la asistencia, intente de nuevo', 'Cerrar', {
          duration: 3000, panelClass: ['snack-error'],
        });
      }
    });
  }

  // ── Hoy, horario y marcas ─────────────────────────────────────────────────

  /** Hora de la interfaz (reloj del navegador); un solo punto, sustituible en pruebas y luego por el servidor. */
  protected ahora(): Date {
    return new Date();
  }

  /** Hoy en texto yyyy-MM-dd (hora local). Se calcula en cada uso: no se congela al abrir la pantalla. */
  get hoy(): string {
    return hoyTexto(this.ahora());
  }

  /** "jueves, 15 de octubre de 2026" */
  get hoyLargo(): string {
    return fechaLarga(this.hoy);
  }

  /** Solo el Coordinador puede registrar un día sin clase; el resto solo registra en los días del horario. */
  private get restringeDias(): boolean {
    return !esRolSinRestriccion(this.rol);
  }

  get diasDeClase(): string[] {
    return diasConClase(this.grupo.horarios);
  }

  /** Franja del grupo para hoy (informativa; el servidor calcula la duración real). */
  get franja(): FranjaDia | null {
    return franjaDelDia(this.grupo.horarios, this.hoy);
  }

  /** "Este grupo tiene clases los martes y jueves" (vacío si no hay horario o aún no se cargó). */
  get textoDiasDeClase(): string {
    return this.estadoHorarios === 'ok' ? textoDiasDeClase(this.grupo.horarios) : '';
  }

  /** Cómo está hoy frente al horario del grupo. */
  get situacionHoy(): 'cargando' | 'desconocida' | 'con-franja' | 'sin-horario' | 'hoy-sin-clase' | 'fuera-de-horario' {
    if (this.estadoHorarios === 'cargando') return 'cargando';
    if (this.estadoHorarios === 'error') return 'desconocida';
    if (this.franja) return 'con-franja';
    if (!this.restringeDias) return 'fuera-de-horario';
    return this.diasDeClase.length === 0 ? 'sin-horario' : 'hoy-sin-clase';
  }

  /** Hoy no se puede registrar nada: no hay horario del grupo o hoy no es día de clase (no aplica al Coordinador). */
  get bloqueado(): boolean {
    const s = this.situacionHoy;
    return s === 'sin-horario' || s === 'hoy-sin-clase';
  }

  /** Mensaje para quien no tiene clase hoy: claro, con los días en que sí hay clase. */
  get textoHoySinClase(): string {
    const dias = this.textoDiasDeClase;
    return dias ? `Hoy no tienes clase asignada para este curso. ${dias}.` : 'Hoy no tienes clase asignada para este curso.';
  }

  /** Fuera de horario (solo Coordinador): hoy no hay franja, o el servidor exigió justificación. */
  get mostrarFueraDeHorario(): boolean {
    return !this.restringeDias && (this.situacionHoy === 'fuera-de-horario' || this.exigirFueraDeHorario);
  }

  /** Franja a mostrar como "Horario de hoy" (solo si no se pide justificación). */
  get franjaVisible(): FranjaDia | null {
    return this.situacionHoy === 'con-franja' && !this.mostrarFueraDeHorario ? this.franja : null;
  }

  get longitudJustificacion(): number {
    return this.justificacionCtrl.value.length;
  }

  private get fueraDeHorarioValido(): boolean {
    // Ya no hay campos de entrada en la sección fuera-de-horario: no hay nada que validar.
    return true;
  }

  get puedeRegistrar(): boolean {
    return !this.guardando && !this.cargandoMarcas && this.situacionHoy !== 'cargando' && !this.bloqueado
      && (!this.mostrarFueraDeHorario || this.fueraDeHorarioValido);
  }

  get textoBotonRegistrar(): string {
    return `Registrar asistencia del día ${formatearFecha(this.hoy)}`;
  }

  /** Si ya hay asistencia registrada hoy, precarga las marcas de quienes asistieron (para aplicar solo la diferencia). */
  private cargarMarcasDeHoy(): void {
    const fecha = this.hoy;
    this.cargandoMarcas = true;
    this.claseService.getClase(this.categoria!, this.titulo!, this.anio!, this.iterable!).pipe(
      switchMap(clases => {
        const clase = (Array.isArray(clases) ? clases : []).find(c => String(c.fecha).substring(0, 10) === fecha);
        return clase ? this.asistenciaService.getAtencionesClase(clase.codigo) : of(null);
      }),
      map(atenciones => atenciones ? atenciones.filter(a => a.estaAtendido).map(a => a.idPerfil) : null),
      // Si el historial no se puede leer no se bloquea: se registra con las marcas en blanco.
      catchError(() => of(null)),
    ).subscribe(marcadas => {
      this.cargandoMarcas = false;
      this.fechaDeMarcas = fecha;
      if (marcadas) {
        this.asistieron = new Set(marcadas);
        this.marcasPrevias = new Set(marcadas);
      }
    });
  }

  estaMarcado(alumno: AlumnoDTO): boolean {
    return this.asistieron.has(String(alumno.id));
  }

  alternarAsistencia(alumno: AlumnoDTO, marcado: boolean): void {
    const copia = new Set(this.asistieron);
    if (marcado) copia.add(String(alumno.id)); else copia.delete(String(alumno.id));
    this.asistieron = copia;
  }

  get totalAsistieron(): number {
    return this.alumnos.data.filter(a => this.asistieron.has(String(a.id))).length;
  }

  get textoContadores(): string {
    const n = this.totalAsistieron;
    return `Asistieron ${n}, Faltaron ${this.alumnos.data.length - n}`;
  }

  // ── Guardar ───────────────────────────────────────────────────────────────

  registrarAsistencia(): void {
    // `guardando` se activa de forma síncrona: una segunda pulsación no envía otra petición ni abre otra confirmación.
    if (!this.puedeRegistrar) return;
    if (this.asistieron.size === 0) {
      this.guardando = true;
      this.dialog.open(ConfirmarSinAsistentesComponent, { role: 'alertdialog' }).afterClosed().subscribe(continuar => {
        if (continuar === true) {
          this.ejecutarRegistro();
        } else {
          this.guardando = false;
        }
      });
      return;
    }
    this.ejecutarRegistro();
  }

  private ejecutarRegistro(): void {
    this.guardando = true;
    this.errorRegistro = null;
    this.avisoRegistro = null;

    const fecha = this.hoy;
    const franja = franjaDelDia(this.grupo.horarios, fecha);
    const clase: ClaseDTO = {
      codigo: 0,
      idGrupoCategoria: this.categoria!,
      idGrupoCurso: this.titulo!,
      idGrupoAnio: this.anio!,
      idGrupoIterable: this.iterable!,
      idInstructor: this.grupo.idInstructor!,
      fecha,
      horas: 0,
      minutos: 0,
      observacion: '',
      eliminado: 0,
    };
    if (franja) {
      // Informativas: si el grupo tiene franja ese día el servidor las ignora y calcula la duración.
      clase.horas = franja.horas;
      clase.minutos = franja.minutos;
    }

    const yaEliminadas: string[] = [];
    this.claseService.postClase(clase).pipe(
      switchMap(creada => this.aplicarDiferencia(creada, yaEliminadas, fecha)),
    ).subscribe({
      next: () => {
        // Lo guardado pasa a ser la nueva base para el siguiente guardado.
        this.marcasPrevias = new Set(this.asistieron);
        this.fechaDeMarcas = fecha;
        this.guardando = false;
        if (yaEliminadas.length > 0) {
          this.avisoRegistro = `La asistencia de ${yaEliminadas.join(', ')} ya estaba eliminada`;
        }
        this.snackBar.open('Asistencia registrada correctamente', 'Cerrar', { duration: 3000, panelClass: ['snack-success'] });
        if (this.historialVisible) this.cargarHistorial();
      },
      error: (err: HttpErrorResponse) => this.manejarErrorRegistro(err),
    });
  }

  /** POST solo de las marcas nuevas y DELETE solo de las desmarcadas (HE08-HU04); sin cambios no llama a nada. */
  private aplicarDiferencia(clase: ClaseDTO, yaEliminadas: string[], fecha: string): Observable<unknown> {
    // Las marcas previas solo sirven de base si son de este mismo día (si pasó la medianoche no se borra nada de ayer).
    const previas = fecha === this.fechaDeMarcas ? this.marcasPrevias : new Set<string>();
    const nuevas = [...this.asistieron].filter(id => !previas.has(id));
    const quitadas = [...previas].filter(id => !this.asistieron.has(id));
    const operaciones: Observable<unknown>[] = [];
    if (nuevas.length > 0) {
      const atenciones: AtencionDTO[] = nuevas.map(id => ({ idPerfil: id, idClase: clase.codigo, estaAtendido: true }));
      operaciones.push(this.asistenciaService.registrarAsistencias(clase.codigo, atenciones));
    }
    for (const id of quitadas) {
      operaciones.push(this.asistenciaService.eliminarAsistencia(id, clase.codigo).pipe(
        // 409 = ya estaba eliminada: no es un fallo, solo se informa.
        catchError((err: HttpErrorResponse) => {
          if (err?.status === 409) {
            yaEliminadas.push(this.getNombreAlumno(id));
            return of(null);
          }
          return throwError(() => err);
        }),
      ));
    }
    return operaciones.length > 0 ? forkJoin(operaciones) : of(null);
  }

  private manejarErrorRegistro(err: HttpErrorResponse): void {
    this.guardando = false;
    if (err?.status === 422 && err.error?.mensaje) {
      this.errorRegistro = err.error.mensaje;
      // GC-0021: el servidor exige justificación; se revela la sección y se conserva lo escrito.
      // (Solo Coordinador y Administrador: el Instructor nunca registra fuera de horario.)
      if (err.error?.codigoError === 'GC-0021' && !this.restringeDias) this.exigirFueraDeHorario = true;
      return;
    }
    this.errorRegistro = 'No se pudo registrar la asistencia. Intenta de nuevo.';
  }

  // ── Novedad de clase no realizada ─────────────────────────────────────────

  get puedeRegistrarNovedad(): boolean {
    return !this.cargandoNovedades && !this.mostrarFormNovedad;
  }

  abrirFormNovedad(fecha?: string, novedadExistente?: NovedadClaseDto): void {
    this.motivoCtrl.setValue(novedadExistente?.motivo ?? '');
    this.descripcionCtrl.setValue(novedadExistente?.descripcion ?? '');
    this.fechaNovedadCtrl.setValue(fecha ?? this.hoy);
    this.mostrarFormNovedad = true;
  }

  cerrarFormNovedad(): void {
    this.mostrarFormNovedad = false;
    this.motivoCtrl.setValue('');
    this.descripcionCtrl.setValue('');
    this.fechaNovedadCtrl.setValue('');
  }

  get descripcionObligatoria(): boolean {
    return motivoRequiereDescripcion(this.motivoCtrl.value);
  }

  get formNovedadValido(): boolean {
    const motivo = this.motivoCtrl.value.trim();
    const descripcion = this.descripcionCtrl.value.trim();
    if (!motivo) return false;
    if (motivoRequiereDescripcion(motivo) && !descripcion) return false;
    if (descripcion.length > this.maxDescripcion) return false;
    return true;
  }

  registrarNovedad(): void {
    if (!this.formNovedadValido) return;
    this.errorNovedad = null;

    const datos: NovedadClaseRequestDto = {
      categoria: this.categoria!,
      curso: this.titulo!,
      anio: this.anio!,
      iterable: this.iterable!,
      fecha: this.fechaNovedadCtrl.value,
      motivo: this.motivoCtrl.value.trim(),
      descripcion: this.descripcionCtrl.value.trim() || null,
    };

    this.novedadClaseService.registrarNovedad(datos).subscribe({
      next: () => {
        this.snackBar.open('Novedad registrada correctamente', 'Cerrar', {
          duration: 3000, panelClass: ['snack-success'],
        });
        this.cerrarFormNovedad();
        if (this.historialVisible) this.cargarNovedades();
      },
      error: (err) => {
        const msg = err?.status === 409
          ? 'Ya existe una novedad activa para este grupo y fecha'
          : err?.status === 422
            ? 'Fecha no permitida o fuera de la ventana de registro'
            : 'No se pudo registrar la novedad. Intenta de nuevo.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-error'] });
      },
    });
  }

  getNovedadParaFecha(fecha: string): NovedadClaseDto | null {
    const fechaSolo = String(fecha).substring(0, 10);
    return this.novedades.find(n => String(n.fecha).substring(0, 10) === fechaSolo) ?? null;
  }

}
