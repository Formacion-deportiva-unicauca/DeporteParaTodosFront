import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, map, of, switchMap } from 'rxjs';
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
import { ConfirmacionAsistenciaRequestDTO } from 'src/app/Models/DTOs/confirmacion-asistencia-dto';
import { interpretarAtenciones } from 'src/app/shared/atenciones.util';
import { interpretarListado } from 'src/app/shared/listado-vacio.util';
import { PerfilService } from 'src/app/services/perfil.service';
import { avisoInscripcionGrupo, fechaLarga, formatearFecha } from 'src/app/shared/fecha-grupo.util';
import {
  FranjaDia, diasConClase, duracionManualValida, esRolSinRestriccion, franjaDelDia, hoyTexto, textoDiasDeClase,
} from 'src/app/shared/ventana-registro.util';
import { ConfirmarSinAsistentesComponent } from './confirmar-sin-asistentes.component';
import { NovedadClaseService } from 'src/app/services/novedad-clase.service';
import { NovedadClaseDto, NovedadClaseRequestDto, MOTIVOS_NOVEDAD, motivoRequiereDescripcion, motivoNombre } from 'src/app/Models/DTOs/novedad-clase-dto';
import { DisponibilidadDTO } from 'src/app/Models/DTOs/disponibilidad-dto';

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
  readonly minJustificacion = 10;
  readonly maxJustificacion = 500;
  /** El servidor exigió justificación (GC-0021) aunque no se mostró la falta de franja (p. ej. el horario no cargó). */
  exigirFueraDeHorario = false;
  /** Alumnos que asistieron (por id); los demás quedan con falta. */
  asistieron = new Set<string>();
  /** Día (yyyy-MM-dd) al que corresponden las marcas que se ven; '' mientras no se hayan leído bien. */
  private fechaDeMarcas = '';
  cargandoMarcas = false;
  /** No se pudo leer la asistencia ya registrada de hoy: guardar sobrescribiría lo que haya, así que se bloquea. */
  errorMarcas = false;
  /** Ya hay una clase de hoy (leída o recién creada): el servidor la reutiliza y no vuelve a pedir justificación ni duración. */
  private claseDeHoyExistente = false;
  /** La clase de hoy ya tiene su asistencia confirmada (la leyó el servidor, o se acaba de guardar). */
  private asistenciaConfirmadaHoy = false;
  guardando = false;
  errorRegistro: string | null = null;
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
  };
  disponibilidad: DisponibilidadDTO | null = null;
  /** El grupo ya se cargó: hasta entonces no se sabe de quién es, y no se muestra "solo consulta". */
  grupoCargado = false;
  /**
   * El backend autoriza al Instructor titular a inscribir, desvincular y editar alumnos de su grupo (403 si es ajeno;
   * el correo del alumno solo lo cambia el Coordinador). Interruptor por si hay que volver a restringirlo al Coordinador.
   */
  instructorGestionaDeportistas = true;

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
      this.actualizarColumnas();
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
        this.grupoCargado = true;
        this.actualizarColumnas();
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
        // Cargar disponibilidad de cupos para validar registro de asistencia y novedades
        this.inscripcionService.getDisponibilidad(this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe({
          next: (disponibilidad: DisponibilidadDTO) => {
            this.disponibilidad = disponibilidad;
          },
          error: () => {
            this.disponibilidad = { cuposTotales: 0, cuposDisponibles: 0, tamanoListaEspera: 0 };
          },
        });
      }
    );

    this.cargarAlumnos();

    if (this.rol === 'Coordinador') {
      this.inscripcionService.getListaEspera(this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe({
        next: (data) => { this.listaEspera = Array.isArray(data) ? data : []; },
        error: () => { this.listaEspera = []; }
      });
    }
  }

  /** Lista de alumnos del grupo con su total de faltas (lo calcula el backend). */
  cargarAlumnos(): void {
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

  /** Id del perfil con sesión iniciada (lo guarda el intercambio de token). */
  private idPerfilSesion(): string | null {
    try { return sessionStorage.getItem('dpt_perfil_id'); } catch { return null; }
  }

  /** El Instructor con sesión es el que dicta este grupo. */
  get esInstructorDelGrupo(): boolean {
    const id = this.idPerfilSesion();
    return this.rol === 'Instructor' && !!id && !!this.grupo.idInstructor && String(this.grupo.idInstructor) === id;
  }

  /** Registrar y eliminar asistencias y novedades: Coordinador en cualquier grupo; Instructor solo en el que dicta. */
  get puedeActuarEnElGrupo(): boolean {
    return this.rol === 'Coordinador' || this.esInstructorDelGrupo;
  }

  /** Agregar, editar y desvincular deportistas: Coordinador siempre; Instructor solo en su grupo y si ya está habilitado. */
  get puedeGestionarAlumnos(): boolean {
    return this.rol === 'Coordinador' || (this.instructorGestionaDeportistas && this.esInstructorDelGrupo);
  }

  /** Instructor viendo un grupo que no dicta: puede consultarlo, no registrar ni eliminar nada. */
  get soloConsulta(): boolean {
    return this.rol === 'Instructor' && this.grupoCargado && !this.esInstructorDelGrupo;
  }

  private actualizarColumnas(): void {
    const base = ['Código', 'Nombre', 'Correo', 'Faltas', 'Asistencia'];
    this.displayedColumns = this.puedeGestionarAlumnos ? [...base, 'Acciones'] : base;
  }

  /** El servidor sigue siendo la autoridad; esto evita abrir diálogos a quien no corresponde. */
  private autorizadoParaGestionar(permitido: boolean = this.puedeGestionarAlumnos): boolean {
    if (permitido) return true;
    const mensaje = this.esInstructorDelGrupo
      ? 'Por ahora solo el Coordinador puede agregar, editar o desvincular deportistas'
      : 'No puede gestionar grupos que no son de su cargo';
    this.snackBar.open(mensaje, 'Cerrar', { duration: 3000, panelClass: ['snack-error'] });
    return false;
  }

  /** "Las inscripciones de este grupo cerraron el dd/MM/yyyy" (o abren el...); null si están abiertas o el grupo no cargó. */
  get avisoInscripciones(): string | null {
    return this.grupoCargado ? avisoInscripcionGrupo(this.grupo) : null;
  }

  inscribirAlumno() {
    if (!this.autorizadoParaGestionar()) return;
    const aviso = this.avisoInscripciones;
    if (aviso) {
      this.snackBar.open(aviso, 'Cerrar', { duration: 5000, panelClass: ['snack-error'] });
      return;
    }
    this.abrirDialogInscribir();
  }

  private abrirDialogInscribir() {
    const dialogRef = this.dialog.open(FormInscripcionesComponent, {
      data: { modo: 'inscribir' }
    });

    dialogRef.afterClosed().subscribe(
      (resultado) => {
        if (resultado?.confirmacionCreacion) {

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
          this.inscripcionService.postInscripcion(inscripcion).subscribe({
            next: (response) => {
              if (response != null) {
                this.ngOnInit();
              }
            },
            error: (err: HttpErrorResponse) => {
              const mensaje = err?.error?.mensaje || 'No se pudo inscribir al deportista. Intente de nuevo.';
              this.snackBar.open(mensaje, 'Cerrar', { duration: 5000, panelClass: ['snack-error'] });
            },
          });
        }
      }
    );
  }

  letraDeIterable(n: number | null): string {
    if (!n || n < 1) return '?';
    return String.fromCharCode(64 + n);
  }

  editarAlumno(alumno: AlumnoDTO) {
    if (!this.autorizadoParaGestionar()) return;
    const dialogRef = this.dialog.open(FormInscripcionesComponent, {
      data: { modo: 'editar', alumno, bloquearCorreo: this.rol === 'Instructor' },
    });
    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado?.actualizado) {
        this.cargarDatos();
        this.snackBar.open('Datos del deportista actualizados', 'Cerrar', { duration: 3000, panelClass: ['snack-success'] });
      }
    });
  }

  eliminarAlumno(alumno: AlumnoDTO) {
    if (!this.autorizadoParaGestionar()) return;

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
        this.snackBar.open('Error al desvincular al deportista, intente de nuevo', 'Cerrar', { duration: 4000, panelClass: ['snack-error'] });
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
      next: (cuerpo) => {
        // Lista, o GC-0002 (grupo sin clases) = historial vacío. Cualquier otro cuerpo no se puede interpretar: se avisa
        // del error y se conserva lo que ya se veía, sin tomarlo por "no hay clases".
        const clases = interpretarListado<ClaseDTO>(cuerpo);
        if (clases === null) {
          this.avisarErrorHistorial();
          return;
        }
        this.clases = clases;
        this.historialVisible = true;
        this.cargarNovedades();
      },
      error: () => this.avisarErrorHistorial(),
    });
  }

  private avisarErrorHistorial(): void {
    this.snackBar.open('Error al cargar el historial de clases', 'Cerrar', { duration: 3000, panelClass: ['snack-error'] });
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
      next: (atenciones) => this.guardarAtenciones(clase.codigo, atenciones),
      error: () => this.avisarErrorAtenciones(),
    });
  }

  /** Guarda las atenciones de una clase solo si la respuesta se pudo interpretar (lista o GC-0002 = vacía); si no, avisa y no inventa datos. */
  private guardarAtenciones(codigoClase: number, cuerpo: unknown): void {
    const lista = interpretarAtenciones(cuerpo);
    if (lista === null) {
      this.avisarErrorAtenciones();
      return;
    }
    this.clasesAtenciones[codigoClase] = lista;
  }

  private avisarErrorAtenciones(): void {
    this.snackBar.open('Error al cargar las atenciones', 'Cerrar', { duration: 3000, panelClass: ['snack-error'] });
  }

  getNombreAlumno(perfId: string): string {
    const alumno = this.alumnos.data.find(a => String(a.id) === perfId);
    return alumno?.nombre ?? perfId;
  }

  eliminarAtencion(atencion: AtencionDTO, clase: ClaseDTO): void {
    if (!this.autorizadoParaGestionar(this.puedeActuarEnElGrupo)) return;
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
          next: (atenciones) => this.guardarAtenciones(clase.codigo, atenciones),
          error: () => this.avisarErrorAtenciones(),
        });
        this.cargarAlumnos();
        this.snackBar.open('Asistencia eliminada correctamente', 'Cerrar', {
          duration: 3000, panelClass: ['snack-success'],
        });
      } else if (result?.errorStatus !== undefined) {
        this.snackBar.open('Error al eliminar la asistencia, intente de nuevo', 'Cerrar', { duration: 3000, panelClass: ['snack-error'] });
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
    return !this.restringeDias && !this.claseDeHoyExistente && (this.situacionHoy === 'fuera-de-horario' || this.exigirFueraDeHorario);
  }

  /** Franja a mostrar como "Horario de hoy" (solo si no se pide justificación). */
  get franjaVisible(): FranjaDia | null {
    return this.situacionHoy === 'con-franja' && !this.mostrarFueraDeHorario ? this.franja : null;
  }

  /** Largo de la justificación sin espacios sobrantes (lo que se envía: el servidor rechaza espacios al inicio o al final). */
  get longitudJustificacion(): number {
    return this.justificacionCtrl.value.trim().length;
  }

  /** Clase fuera de horario (Coordinador): justificación de 10 a 500 caracteres y duración manual válida (mayor que 0, hasta 12 h). */
  private get fueraDeHorarioValido(): boolean {
    return this.justificacionValida && this.duracionValida;
  }

  private get justificacionValida(): boolean {
    const largo = this.longitudJustificacion;
    return largo >= this.minJustificacion && largo <= this.maxJustificacion;
  }

  private get duracionValida(): boolean {
    return duracionManualValida(this.horasCtrl.value, this.minutosCtrl.value);
  }

  /** Se pulsó "Registrar asistencia" con los datos de la clase fuera de horario incompletos: desde entonces se muestran los errores. */
  intentoFueraDeHorario = false;

  get errorJustificacion(): string | null {
    return this.intentoFueraDeHorario && !this.justificacionValida
      ? `La justificación es obligatoria: entre ${this.minJustificacion} y ${this.maxJustificacion} caracteres.` : null;
  }

  get errorDuracion(): string | null {
    return this.intentoFueraDeHorario && !this.duracionValida
      ? 'Indica la duración de la clase: mayor que 0 y de hasta 12 horas.' : null;
  }

  /**
   * La asistencia de hoy ya quedó registrada: se bloquean el registro y la novedad y se avisa. Solo vale para el día en que se
   * leyeron las marcas: si pasa la medianoche con la pantalla abierta el bloqueo se levanta y el siguiente clic recarga el día nuevo.
   */
  get asistenciaDeHoyRegistrada(): boolean {
    return this.asistenciaConfirmadaHoy && this.fechaDeMarcas === this.hoy;
  }

  get textoAsistenciaRegistrada(): string {
    return `La asistencia de hoy (${formatearFecha(this.hoy)}) ya fue registrada.`;
  }

  get puedeRegistrar(): boolean {
    return !this.asistenciaDeHoyRegistrada && !this.soloConsulta && !this.guardando && !this.cargandoMarcas && !this.marcasNoDisponibles && this.situacionHoy !== 'cargando' && !this.bloqueado
      && this.hayInscritos;
  }

  get textoBotonRegistrar(): string {
    return `Registrar asistencia del día ${formatearFecha(this.hoy)}`;
  }

  /**
   * Las marcas que se ven deben ser las de hoy y haberse leído bien: la confirmación envía el estado COMPLETO del grupo
   * (quien no va como presente queda ausente), así que guardar con marcas desconocidas o de otro día sobrescribiría lo registrado.
   */
  get marcasNoDisponibles(): boolean {
    return this.errorMarcas;
  }

  readonly textoMarcasNoDisponibles =
    'No se pudo leer la asistencia ya registrada de hoy. Para no sobrescribirla, vuelve a intentarlo antes de guardar.';

  /** Si ya hay asistencia registrada hoy, precarga las marcas de quienes asistieron. */
  cargarMarcasDeHoy(): void {
    const fecha = this.hoy;
    this.cargandoMarcas = true;
    this.errorRegistro = null;
    this.errorMarcas = false;
    this.asistenciaConfirmadaHoy = false;
    this.claseService.getClase(this.categoria!, this.titulo!, this.anio!, this.iterable!).pipe(
      switchMap(clases => {
        // Lista, o GC-0002 (grupo sin clases) = "no hay clase de hoy". Cualquier otra respuesta 200 no se puede interpretar:
        // no se asume que no hay clases (se bloquea el guardado vía catchError).
        const lista = interpretarListado<ClaseDTO>(clases);
        if (lista === null) throw new Error('Respuesta de clases no interpretable');
        const clase = lista.find(c => String(c.fecha).substring(0, 10) === fecha);
        this.claseDeHoyExistente = !!clase;
        this.asistenciaConfirmadaHoy = !!clase?.asistenciaConfirmadaEn;
        return clase ? this.asistenciaService.getAtencionesClase(clase.codigo) : of([]);
      }),
      map(atenciones => {
        // Lista, o GC-0002 (clase sin filas) = "sin marcas". Cualquier otra respuesta 200 no se puede interpretar: es un fallo.
        const lista = interpretarAtenciones(atenciones);
        if (lista === null) throw new Error('Respuesta de atenciones no interpretable');
        return lista.filter(a => a.estaAtendido).map(a => a.idPerfil);
      }),
      // null = no se pudo leer: no se inventan marcas ni se deja guardar.
      catchError(() => of(null)),
    ).subscribe(marcadas => {
      this.cargandoMarcas = false;
      if (marcadas === null) {
        this.errorMarcas = true;
        this.fechaDeMarcas = '';
        return;
      }
      this.fechaDeMarcas = fecha;
      this.asistieron = new Set(marcadas);
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
    // Si pasó la medianoche con la pantalla abierta, las marcas son del día anterior: se cargan las de hoy y se pide revisar.
    if (this.fechaDeMarcas !== '' && this.fechaDeMarcas !== this.hoy) {
      this.cargarMarcasDeHoy();
      this.errorRegistro = 'Cambió el día: se cargó la asistencia de hoy. Revisa las marcas y vuelve a guardar.';
      return;
    }
    // Clase fuera de horario (Coordinador): el botón está activo, pero sin justificación y duración válidas no se envía nada;
    // se explica qué falta y se lleva el foco al primer campo incorrecto.
    if (this.mostrarFueraDeHorario && !this.fueraDeHorarioValido) {
      this.intentoFueraDeHorario = true;
      document.getElementById(this.justificacionValida ? 'horasManual' : 'justificacion')?.focus();
      return;
    }
    if (this.asistieron.size === 0) {
      this.guardando = true;
      this.dialog.open(ConfirmarSinAsistentesComponent, { role: 'alertdialog' }).afterClosed().subscribe(continuar => {
        if (continuar === true) {
          this.ejecutarRegistro(true);
        } else {
          this.guardando = false;
        }
      });
      return;
    }
    this.ejecutarRegistro(false);
  }

  /** Crea (o reutiliza) la clase de hoy y confirma su asistencia con el estado completo del grupo, en una sola petición. */
  private ejecutarRegistro(confirmaTodosAusentes: boolean): void {
    this.guardando = true;
    this.errorRegistro = null;

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
    } else if (this.mostrarFueraDeHorario) {
      // Coordinador en un día sin clase: el servidor exige justificación (sin espacios sobrantes) y duración manual.
      clase.justificacion = this.justificacionCtrl.value.trim();
      clase.horas = this.horasCtrl.value ?? 0;
      clase.minutos = this.minutosCtrl.value ?? 0;
    }

    const cuerpo: ConfirmacionAsistenciaRequestDTO = {
      asistencias: this.alumnos.data.map(a => ({ idPerfil: String(a.id), estaAtendido: this.asistieron.has(String(a.id)) })),
      // Solo tras la confirmación explícita del usuario (diálogo) y cuando nadie asistió; el backend lo exige en ese caso.
      ...(confirmaTodosAusentes ? { confirmaTodosAusentes: true } : {}),
    };
    this.claseService.postClase(clase).pipe(
      switchMap(creada => this.asistenciaService.confirmarAsistencia(creada.codigo, cuerpo)),
    ).subscribe({
      next: () => {
        this.fechaDeMarcas = fecha;
        this.claseDeHoyExistente = true;
        this.asistenciaConfirmadaHoy = true;
        this.intentoFueraDeHorario = false;
        this.guardando = false;
        this.snackBar.open('Asistencia registrada correctamente', 'Cerrar', { duration: 3000, panelClass: ['snack-success'] });
        // Las faltas las calcula el backend: se vuelven a pedir con la lista.
        this.cargarAlumnos();
        if (this.historialVisible) this.cargarHistorial();
      },
      error: (err: HttpErrorResponse) => this.manejarErrorRegistro(err),
    });
  }

  private manejarErrorRegistro(err: HttpErrorResponse): void {
    this.guardando = false;
    this.errorRegistro = null;
    const mensaje: string | undefined = err?.error?.mensaje;
    // 422 reglas de negocio, 403 grupo ajeno, 404 clase inexistente: el servidor explica el motivo.
    if (mensaje && (err.status === 422 || err.status === 403 || err.status === 404)) {
      this.errorRegistro = mensaje;
      // GC-0021: el servidor exige justificación; se revela la sección y se conserva lo escrito.
      // (Solo Coordinador y Administrador: el Instructor nunca registra fuera de horario.)
      if (err.error?.codigoError === 'GC-0021' && !this.restringeDias) this.exigirFueraDeHorario = true;
      // GC-0027: la lista en pantalla ya no coincide con la del grupo.
      if (err.error?.codigoError === 'GC-0027') this.cargarAlumnos();
      return;
    }
    this.errorRegistro = 'No se pudo registrar la asistencia. Intenta de nuevo.';
  }

  // ── Novedad de clase no realizada ─────────────────────────────────────────

  get puedeRegistrarNovedad(): boolean {
    if (this.soloConsulta || this.asistenciaDeHoyRegistrada || this.cargandoNovedades || this.mostrarFormNovedad) return false;

    // El Instructor solo puede registrar novedades en días con horario asignado
    if (this.rol === 'Instructor') {
      const fecha = this.fechaNovedadCtrl.value || this.hoy;
      if (!fecha || !this.esDiaConHorarioParaFecha(fecha)) return false;
    }

    // Solo se puede registrar novedad si hay inscritos en el grupo
    if (!this.hayInscritos) return false;

    return true;
  }

  /** Indica si la fecha dada corresponde a un día con horario asignado para el grupo. */
  private esDiaConHorarioParaFecha(fecha: string | null | undefined): boolean {
    if (!fecha || !this.grupo.horarios) return false;
    return franjaDelDia(this.grupo.horarios, fecha) !== null;
  }

  /** Indica si hay al menos un alumno inscrito en el grupo (cuposDisponibles < cuposTotales).
   * Si no hay información de disponibilidad, asumimos que hay inscritos. */
  get hayInscritos(): boolean {
    if (!this.disponibilidad || this.disponibilidad.cuposTotales === null || this.disponibilidad.cuposTotales === 0) return true;
    return this.disponibilidad.cuposDisponibles < this.disponibilidad.cuposTotales;
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
    if (this.soloConsulta || !this.formNovedadValido) return;
    this.errorNovedad = null;

    // El Instructor solo puede registrar novedades en días con horario asignado
    if (this.rol === 'Instructor') {
      const fecha = this.fechaNovedadCtrl.value;
      if (!fecha || !this.esDiaConHorarioParaFecha(fecha)) {
        this.errorNovedad = 'No se puede registrar una novedad en un día que no tiene horario asignado para este grupo.';
        return;
      }
    }

    // Solo se puede registrar novedad si hay inscritos en el grupo
    if (!this.hayInscritos) {
      this.errorNovedad = 'No se puede registrar una novedad: el grupo no tiene alumnos inscritos.';
      return;
    }

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